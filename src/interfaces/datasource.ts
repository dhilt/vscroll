import { Settings, DevSettings } from './settings';
import { IAdapter } from './adapter';

type SuccessFn<T = unknown> = (data: T[]) => void;
type ErrorFn = (error: unknown) => void;

export interface ObservableLike<T = unknown> {
  subscribe(next: SuccessFn<T>, error: ErrorFn, complete: () => void): { unsubscribe: () => void };
}

type DSGetCallback<T> = (
  index: number,
  count: number,
  success: SuccessFn<T>,
  fail?: ErrorFn
) => void;
type DSGetObservable<T> = (index: number, count: number) => ObservableLike<T[]>;
type DSGetPromise<T> = (index: number, count: number) => PromiseLike<T[]>;

export type DatasourceGet<T> = DSGetCallback<T> | DSGetObservable<T> | DSGetPromise<T>;

export interface IDatasourceParams<T = unknown> {
  get: DatasourceGet<T>;
  settings?: Settings<T>;
  devSettings?: DevSettings;
}

export interface IDatasourceOptional<T = unknown> extends Omit<IDatasourceParams<T>, 'get'> {
  get?: DatasourceGet<T>;
}

export interface IDatasource<T = unknown> extends IDatasourceParams<T> {
  adapter?: IAdapter<T>;
}

export interface IDatasourceConstructed<T = unknown> extends IDatasource<T> {
  adapter: IAdapter<T>;
}
