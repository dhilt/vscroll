import { AdapterContext } from './adapter/context';
import { reactiveConfigStorage } from './adapter/props';
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
    this.adapter = adapterContext as unknown as IAdapter<Data>;
  }

  dispose(): void { // todo: should it be published?
    reactiveConfigStorage.delete(this.adapter.id);
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
