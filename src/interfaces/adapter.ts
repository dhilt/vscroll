import { AdapterPropName, AdapterPropType } from '../classes/adapter/props';
import { Reactive } from '../classes/reactive';
import { IDatasourceOptional } from './datasource';
import { IValidatedData } from './validation';

export interface IReactivePropConfig {
  source: unknown;
  emit: (source: unknown, value: unknown) => void;
}

interface IReactivePropStore extends IReactivePropConfig {
  default: Reactive<unknown>;
}

export type IReactivePropsConfig = {
  [key in AdapterPropName]?: IReactivePropConfig;
};

export type IReactivePropsStore = {
  [key in AdapterPropName]?: IReactivePropStore;
};

export interface IAdapterConfig {
  mock: boolean;
  reactive?: IReactivePropsConfig;
}

export interface IAdapterProp {
  name: AdapterPropName;
  type: AdapterPropType;
  value: unknown;
  reactive?: AdapterPropName;
  wanted?: boolean;
  onDemand?: boolean;
  permanent?: boolean;
}

export interface ItemAdapter<Data = unknown> {
  $index: number;
  data: Data;
  element?: HTMLElement;
}

export type ItemsPredicate<T = unknown> = (item: ItemAdapter<T>) => boolean;
export type ItemsUpdater<T = unknown> = (item: ItemAdapter<T>, update: () => void) => void;
export type ItemsProcessor<T = unknown> = (items: ItemAdapter<T>[]) => void;
export type BufferUpdater<T = unknown> = (item: ItemAdapter<T>) => unknown;

export interface IPackage {
  name: string;
  version: string;
}

export interface IPackages {
  core: IPackage;
  consumer: IPackage;
}

export interface IBufferInfo {
  firstIndex: number;
  lastIndex: number;
  minIndex: number;
  maxIndex: number;
  absMinIndex: number;
  absMaxIndex: number;
  defaultSize: number;
}

export interface IAdapterInput<T> {
  data: IValidatedData;
  params?: T;
}

export interface AdapterAppendOptions<Data = unknown> {
  items: Data[];
  eof?: boolean;
  decrease?: boolean;
}

export interface AdapterPrependOptions<Data = unknown> {
  items: Data[];
  bof?: boolean;
  increase?: boolean;
}

export interface AdapterRemoveOptions<Data = unknown> {
  predicate?: ItemsPredicate<Data>;
  indexes?: number[];
  increase?: boolean;
}

export interface AdapterClipOptions {
  forwardOnly?: boolean;
  backwardOnly?: boolean;
}

export interface AdapterInsertOptions<Data = unknown> {
  items: Data[];
  before?: ItemsPredicate<Data>;
  after?: ItemsPredicate<Data>;
  beforeIndex?: number;
  afterIndex?: number;
  decrease?: boolean;
}

export interface AdapterReplaceOptions<Data = unknown> {
  items: Data[];
  predicate: ItemsPredicate<Data>;
  fixRight?: boolean;
}

export interface AdapterUpdateOptions<Data = unknown> {
  predicate: BufferUpdater<Data>;
  fixRight?: boolean;
}

export interface AdapterFixOptions<Data = unknown> {
  scrollPosition?: number;
  minIndex?: number;
  maxIndex?: number;
  updater?: ItemsUpdater<Data>;
  scrollToItem?: ItemsPredicate<Data>;
  scrollToItemOpt?: boolean | ScrollIntoViewOptions;
}

export interface AdapterMethodResult {
  success: boolean;
  immediate: boolean;
  details: string | null;
}
type MethodResult = Promise<AdapterMethodResult>;

export interface IAdapter<Data = unknown> {
  readonly id: number;
  readonly mock: boolean;
  readonly augmented: boolean;
  readonly version: string;
  readonly init: boolean;
  readonly init$: Reactive<boolean>;
  readonly packageInfo: IPackages;
  readonly itemsCount: number;
  readonly bufferInfo: IBufferInfo;
  readonly isLoading: boolean;
  readonly isLoading$: Reactive<boolean>;
  readonly loopPending: boolean;
  readonly loopPending$: Reactive<boolean>;
  readonly firstVisible: ItemAdapter<Data>;
  readonly firstVisible$: Reactive<ItemAdapter<Data>>;
  readonly lastVisible: ItemAdapter<Data>;
  readonly lastVisible$: Reactive<ItemAdapter<Data>>;
  readonly bof: boolean;
  readonly bof$: Reactive<boolean>;
  readonly eof: boolean;
  readonly eof$: Reactive<boolean>;
  reset(datasource?: IDatasourceOptional): MethodResult;
  reload(reloadIndex?: number | string): MethodResult;
  append(options: AdapterAppendOptions<Data>): MethodResult;
  append(items: Data | Data[], eof?: boolean): MethodResult; // old signature
  prepend(options: AdapterPrependOptions<Data>): MethodResult;
  prepend(items: Data | Data[], bof?: boolean): MethodResult; // old signature
  check(): MethodResult;
  remove(args: AdapterRemoveOptions<Data>): MethodResult;
  remove(args: ItemsPredicate<Data>): MethodResult; // old signature
  clip(options?: AdapterClipOptions): MethodResult;
  insert(options: AdapterInsertOptions<Data>): MethodResult;
  replace(options: AdapterReplaceOptions<Data>): MethodResult;
  update(options: AdapterUpdateOptions<Data>): MethodResult;
  fix(options: AdapterFixOptions<Data>): MethodResult; // experimental
  relax(callback?: () => void): MethodResult;
  showLog(): void;
}
