import { AdapterContext } from './adapter/context';
import {
  IDatasourceConstructedGeneric,
  DatasourceGet,
  Settings,
  DevSettings,
  IDatasourceGeneric,
  IAdapterConfig,
  IAdapter,
} from '../interfaces/index';

export class DatasourceGeneric<A> implements IDatasourceConstructedGeneric<A> {
  get: DatasourceGet;
  settings?: Settings;
  devSettings?: DevSettings;
  adapter: A;

  constructor(datasource: IDatasourceGeneric<A>, config?: IAdapterConfig) {
    this.get = datasource.get;
    if (datasource.settings) {
      this.settings = datasource.settings;
    }
    if (datasource.devSettings) {
      this.devSettings = datasource.devSettings;
    }
    const adapterContext = new AdapterContext(config || { mock: false });
    this.adapter = adapterContext as A;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const makeDatasource = <A>(getConfig?: () => IAdapterConfig) =>
  class <T = A> extends DatasourceGeneric<T> {
    constructor(datasource: IDatasourceGeneric<T>) {
      const config = typeof getConfig === 'function' ? getConfig() : void 0;
      super(datasource, config);
    }
  };

export const Datasource = makeDatasource<IAdapter>();
