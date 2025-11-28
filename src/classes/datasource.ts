import { AdapterContext } from './adapter/context';
import { reactiveConfigStorage, AdapterPropType, getDefaultAdapterProps } from './adapter/props';
import { wantedStorage } from './adapter/wanted';
import { Reactive } from './reactive';
import {
  IDatasourceParams,
  IDatasourceConstructed,
  DatasourceGet,
  Settings,
  DevSettings,
  IAdapter,
  IAdapterConfig,
  IReactivePropConfig
} from '../interfaces/index';

const getDefaultAdapterConfig = (): IAdapterConfig => {
  const reactive = getDefaultAdapterProps()
    .filter(({ type }) => type === AdapterPropType.Reactive)
    .reduce(
      (acc, { name, value }) => {
        acc[name] = {
          source: value,
          emit: (source, val) => (source as Reactive<unknown>).set(val)
        };
        return acc;
      },
      {} as Record<string, IReactivePropConfig>
    );

  return { mock: false, reactive };
};

export class DatasourceGeneric<Data> implements IDatasourceConstructed<Data> {
  get: DatasourceGet<Data>;
  settings?: Settings<Data>;
  devSettings?: DevSettings;
  adapter: IAdapter<Data>;

  constructor(datasource: IDatasourceParams<Data>, config?: IAdapterConfig) {
    this.get = datasource.get;
    this.settings = datasource.settings;
    this.devSettings = datasource.devSettings;
    const adapterContext = new AdapterContext(config || { mock: false });
    this.adapter = adapterContext as unknown as IAdapter<Data>;
  }

  // todo: should it be published?
  dispose(): void {
    reactiveConfigStorage.delete(this.adapter.id);
    wantedStorage.delete(this.adapter.id);
  }
}

export const makeDatasource = <DSClassType = typeof DatasourceGeneric>(
  getAdapterConfig?: () => IAdapterConfig
) =>
  class<Data = unknown> extends DatasourceGeneric<Data> {
    constructor(datasource: IDatasourceParams<Data>) {
      const config =
        typeof getAdapterConfig === 'function' ? getAdapterConfig() : getDefaultAdapterConfig();
      super(datasource, config);
    }
  } as DSClassType;

export const Datasource = makeDatasource();
