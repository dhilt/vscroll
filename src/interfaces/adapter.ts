import { AdapterPropName, AdapterPropType } from '../classes/adapter/props';
import { Reactive } from '../classes/reactive';
import { IDatasourceOptional } from './datasource';

export interface IReactivePropConfig {
  source: unknown;
  emit: (source: unknown, value: unknown) => void;
}

interface IReactivePropStore extends IReactivePropConfig {
  default: unknown;
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

export interface ItemAdapter<ItemData = unknown> {
  $index: number;
  data: ItemData;
  element?: HTMLElement;
}

export type ItemsPredicate<T = unknown> = (item: ItemAdapter<T>) => boolean;
export type ItemsLooper<T = unknown> = (item: ItemAdapter<T>) => void;
export type ItemsProcessor<T = unknown> = (items: ItemAdapter<T>[]) => void;

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
}

export interface AdapterAppendOptions<Item = unknown> {
  items: Item[];
  eof?: boolean;
}

export interface AdapterPrependOptions<Item = unknown> {
  items: Item[];
  bof?: boolean;
}

export interface AdapterRemoveOptions<Item = unknown> {
  predicate?: ItemsPredicate<Item>;
  indexes?: number[];
  increase?: boolean;
}

export interface AdapterClipOptions {
  forwardOnly?: boolean;
  backwardOnly?: boolean;
}

export interface AdapterInsertOptions<Item = unknown> {
  items: Item[];
  before?: ItemsPredicate<Item>;
  after?: ItemsPredicate<Item>;
  decrease?: boolean;
}

export interface AdapterReplaceOptions<Item = unknown> {
  items: Item[];
  predicate: ItemsPredicate<Item>;
  fixRight?: boolean;
}

export interface AdapterFixOptions<Item = unknown> {
  scrollPosition?: number;
  minIndex?: number;
  maxIndex?: number;
  updater?: ItemsLooper<Item>;
  scrollToItem?: ItemsPredicate<Item>;
  scrollToItemOpt?: boolean | ScrollIntoViewOptions;
}

export interface AdapterMethodResult {
  success: boolean;
  immediate: boolean;
  details: string | null;
}
type MethodResult = Promise<AdapterMethodResult>;

export interface IAdapter<Item = unknown> {
  readonly id: number;
  readonly mock: boolean;
  readonly version: string;
  readonly packageInfo: IPackages;
  readonly itemsCount: number;
  readonly bufferInfo: IBufferInfo;
  readonly isLoading: boolean;
  readonly isLoading$: Reactive<boolean>;
  readonly loopPending: boolean;
  readonly loopPending$: Reactive<boolean>;
  readonly firstVisible: ItemAdapter<Item>;
  readonly firstVisible$: Reactive<ItemAdapter<Item>>;
  readonly lastVisible: ItemAdapter<Item>;
  readonly lastVisible$: Reactive<ItemAdapter<Item>>;
  readonly bof: boolean;
  readonly bof$: Reactive<boolean>;
  readonly eof: boolean;
  readonly eof$: Reactive<boolean>;
  reset(datasource?: IDatasourceOptional): MethodResult;
  reload(reloadIndex?: number | string): MethodResult;
  append(options: AdapterAppendOptions<Item>): MethodResult;
  append(items: Item | Item[], eof?: boolean): MethodResult; // old signature
  prepend(options: AdapterPrependOptions<Item>): MethodResult;
  prepend(items: Item | Item[], bof?: boolean): MethodResult; // old signature
  check(): MethodResult;
  remove(args: AdapterRemoveOptions<Item>): MethodResult;
  remove(args: ItemsPredicate<Item>): MethodResult; // old signature
  clip(options?: AdapterClipOptions): MethodResult;
  insert(options: AdapterInsertOptions<Item>): MethodResult;
  replace(options: AdapterReplaceOptions<Item>): MethodResult;
  fix(options: AdapterFixOptions<Item>): MethodResult; // experimental
  relax(callback?: () => void): MethodResult;
  showLog(): void;
}
