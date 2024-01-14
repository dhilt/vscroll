import { AdapterContext } from './adapter/context';
import { reactiveConfigStorage } from './adapter/props';
import { wantedStorage } from './adapter/wanted';
import {
  IDatasourceParams,
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

  constructor(datasource: IDatasourceParams<Data>, config?: IAdapterConfig) {
    this.get = datasource.get;
    this.settings = datasource.settings;
    this.devSettings = datasource.devSettings;
    const adapterContext = new AdapterContext(config || { mock: false });
    this.adapter = adapterContext as unknown as IAdapter<Data>;
  }

  dispose(): void { // todo: should it be published?
    reactiveConfigStorage.delete(this.adapter.id);
    wantedStorage.delete(this.adapter.id);
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const makeDatasource = <DSClassType = typeof DatasourceGeneric>(
  getConfig?: () => IAdapterConfig
) =>
  class <Data = unknown> extends DatasourceGeneric<Data> {
    constructor(datasource: IDatasourceParams<Data>) {
      const config = typeof getConfig === 'function' ? getConfig() : void 0;
      super(datasource, config);
    }
  } as DSClassType;

export const Datasource = makeDatasource();
