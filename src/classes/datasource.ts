import { AdapterContext } from './adapter/context';
import { AdapterPropType, getDefaultAdapterProps, reactiveConfigStorage } from './adapter/props';
import {
  IDatasource,
  IDatasourceConstructed,
  DatasourceGet,
  Settings,
  DevSettings,
  IAdapter,
  IAdapterConfig,
} from '../interfaces/index';

export class DatasourceGeneric<Data> implements IDatasourceConstructed<Data> {
  get: DatasourceGet<Data>;
  settings?: Settings<Data>;
  devSettings?: DevSettings;
  adapter: IAdapter<Data>;

  constructor(datasource: IDatasource<Data>, config?: IAdapterConfig) {
    this.get = datasource.get;
    if (datasource.settings) {
      this.settings = datasource.settings;
    }
    if (datasource.devSettings) {
      this.devSettings = datasource.devSettings;
    }
    const adapterContext = new AdapterContext(config || { mock: false });
    this.adapter = adapterContext as IAdapter<Data>;
  }
  dispose(): void { // todo: should it be published?
    reactiveConfigStorage.delete(this.adapter.id);
  }

  reset(): void { // todo: should it be published?
    const reactiveStore = reactiveConfigStorage.get(this.adapter.id);
    getDefaultAdapterProps()
      .forEach(({ type, permanent, name, value }) => {
        // assign defaults to non-reactive non-permanent props
        if (type !== AdapterPropType.Reactive && !permanent) {
          Object.defineProperty(this.adapter, name, {
            configurable: true,
            get: () => value
          });
        }
        // reset reactive props
        if (type === AdapterPropType.Reactive && reactiveStore) {
          const property = reactiveStore[name];
          if (property) {
            property.default.reset();
            property.emit(property.source, property.default.get());
          }
        }
      });
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const makeDatasource = (getConfig?: () => IAdapterConfig) =>
  class <Data = unknown> extends DatasourceGeneric<Data> {
    constructor(datasource: IDatasource<Data>) {
      const config = typeof getConfig === 'function' ? getConfig() : void 0;
      super(datasource, config);
    }
  };

export const Datasource = makeDatasource();
