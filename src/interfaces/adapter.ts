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

export interface ItemAdapter {
  $index: number;
  data: unknown;
  element?: HTMLElement;
}

export type ItemsPredicate = (item: ItemAdapter) => boolean;
export type ItemsLooper = (item: ItemAdapter) => void;
export type ItemsProcessor = (items: ItemAdapter[]) => void;

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

export interface AdapterAppendOptions {
  items: unknown[];
  eof?: boolean;
}

export interface AdapterPrependOptions {
  items: unknown[];
  bof?: boolean;
}

export interface AdapterRemoveOptions {
  predicate?: ItemsPredicate;
  indexes?: number[];
  increase?: boolean;
}

export interface AdapterClipOptions {
  forwardOnly?: boolean;
  backwardOnly?: boolean;
}

export interface AdapterInsertOptions {
  items: unknown[];
  before?: ItemsPredicate;
  after?: ItemsPredicate;
  decrease?: boolean;
}

export interface AdapterReplaceOptions {
  items: unknown[];
  predicate: ItemsPredicate;
  fixRight?: boolean;
}

export interface AdapterFixOptions {
  scrollPosition?: number;
  minIndex?: number;
  maxIndex?: number;
  updater?: ItemsLooper;
  scrollToItem?: ItemsPredicate;
  scrollToItemOpt?: boolean | ScrollIntoViewOptions;
}

export interface AdapterMethodResult {
  success: boolean;
  immediate: boolean;
  details: string | null;
}
type MethodResult = Promise<AdapterMethodResult>;

export interface IAdapter {
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
  readonly firstVisible: ItemAdapter;
  readonly firstVisible$: Reactive<ItemAdapter>;
  readonly lastVisible: ItemAdapter;
  readonly lastVisible$: Reactive<ItemAdapter>;
  readonly bof: boolean;
  readonly bof$: Reactive<boolean>;
  readonly eof: boolean;
  readonly eof$: Reactive<boolean>;
  reset(datasource?: IDatasourceOptional): MethodResult;
  reload(reloadIndex?: number | string): MethodResult;
  append(options: AdapterAppendOptions): MethodResult;
  append(items: unknown, eof?: boolean): MethodResult; // old signature
  prepend(options: AdapterPrependOptions): MethodResult;
  prepend(items: unknown, bof?: boolean): MethodResult; // old signature
  check(): MethodResult;
  remove(args: AdapterRemoveOptions | ItemsPredicate): MethodResult; // + old signature
  clip(options?: AdapterClipOptions): MethodResult;
  insert(options: AdapterInsertOptions): MethodResult;
  replace(options: AdapterReplaceOptions): MethodResult;
  fix(options: AdapterFixOptions): MethodResult; // experimental
  relax(callback?: () => void): MethodResult;
  showLog(): void;
}
