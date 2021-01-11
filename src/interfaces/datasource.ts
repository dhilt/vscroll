import { Settings, DevSettings } from './settings';
import { IAdapter } from './adapter';

type SuccessCallback = (data: unknown[]) => void;
type ErrorCallback = (error: unknown) => void;

export interface ObservableLike {
  subscribe(next: SuccessCallback, error: ErrorCallback, complete: () => void): { unsubscribe: () => void };
}

type DatasourceGetCallback = (index: number, count: number, success: SuccessCallback, fail?: ErrorCallback) => void;
type DatasourceGetObservable = (index: number, count: number) => ObservableLike;
type DatasourceGetPromise = (index: number, count: number) => PromiseLike<unknown[]>;

export type DatasourceGet = DatasourceGetCallback | DatasourceGetObservable | DatasourceGetPromise;

export interface IDatasourceOptional {
  get?: DatasourceGet;
  settings?: Settings;
  devSettings?: DevSettings;
}

export interface IDatasourceGeneric<A> extends Omit<IDatasourceOptional, 'get'> {
  get: DatasourceGet;
  adapter?: A;
}

export interface IDatasourceConstructedGeneric<A> extends Omit<IDatasourceGeneric<A>, 'adapter'> {
  adapter: A;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDatasource extends IDatasourceGeneric<IAdapter> { }

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDatasourceConstructed extends IDatasourceConstructedGeneric<IAdapter> { }

export interface IDatasourceClass<A> extends IDatasourceConstructedGeneric<A> {
  new(datasource: IDatasourceGeneric<A>): IDatasourceConstructedGeneric<A>;
}
