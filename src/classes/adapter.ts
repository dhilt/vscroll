import { Logger } from './logger';
import { Buffer } from './buffer';
import { Reactive } from './reactive';
import {
  AdapterPropName,
  AdapterPropType,
  EMPTY_ITEM,
  getDefaultAdapterProps,
  methodPausedResult,
  methodPreResult,
  reactiveConfigStorage
} from './adapter/props';
import { wantedUtils } from './adapter/wanted';
import { Viewport } from './viewport';
import { Direction } from '../inputs/index';
import { AdapterProcess, ProcessStatus } from '../processes/index';
import {
  WorkflowGetter,
  IAdapterProp,
  AdapterMethodResult,
  IAdapter,
  ItemAdapter,
  ItemsPredicate,
  AdapterPrependOptions,
  AdapterAppendOptions,
  AdapterRemoveOptions,
  AdapterClipOptions,
  AdapterInsertOptions,
  AdapterReplaceOptions,
  AdapterUpdateOptions,
  AdapterFixOptions,
  ScrollerWorkflow,
  IDatasourceOptional,
  IPackages,
  IBufferInfo,
  State,
  ProcessSubject,
} from '../interfaces/index';

type MethodResolver = (...args: unknown[]) => Promise<AdapterMethodResult>;
type InitializationParams<Item> = {
  buffer: Buffer<Item>,
  state: State,
  viewport: Viewport,
  logger: Logger,
  adapterRun$?: Reactive<ProcessSubject>,
  getWorkflow?: WorkflowGetter<Item>
}

const ADAPTER_PROPS_STUB = getDefaultAdapterProps();
const ALLOWED_METHODS_WHEN_PAUSED = ADAPTER_PROPS_STUB.filter(v => !!v.allowedWhenPaused).map(v => v.name);

const _has = (obj: unknown, prop: string): boolean =>
  !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, prop);

const convertAppendArgs = <Item>(prepend: boolean, options: unknown, eof?: boolean) => {
  let result = options as AdapterAppendOptions<Item> & AdapterPrependOptions<Item>;
  if (!_has(options, 'items')) {
    const items = !Array.isArray(options) ? [options] : options;
    result = prepend ? { items, bof: eof } : { items, eof: eof };
  }
  return result;
};

const convertRemoveArgs = <Item>(options: AdapterRemoveOptions<Item> | ItemsPredicate<Item>) => {
  if (!(_has(options, 'predicate') || _has(options, 'indexes'))) {
    const predicate = options as ItemsPredicate<Item>;
    options = { predicate };
  }
  return options;
};

export class Adapter<Item = unknown> implements IAdapter<Item> {
  private externalContext: IAdapter<Item>;
  private logger: Logger;
  private getWorkflow: WorkflowGetter<Item>;
  private reloadCounter: number;
  private source: { [key: string]: Reactive<unknown> } = {}; // for Reactive props
  private box: { [key: string]: unknown } = {}; // for Scalars over Reactive props
  private demand: { [key: string]: unknown } = {}; // for Scalars on demand
  private disposed: boolean;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setFirstOrLastVisible = (_: { first?: boolean, last?: boolean, workflow?: ScrollerWorkflow }) => { };

  get workflow(): ScrollerWorkflow<Item> {
    return this.getWorkflow();
  }
  get reloadCount(): number {
    return this.reloadCounter;
  }
  get reloadId(): string {
    return this.id + '.' + this.reloadCounter;
  }

  id: number;
  mock: boolean;
  augmented: boolean;
  version: string;
  init: boolean;
  init$: Reactive<boolean>;
  packageInfo: IPackages;
  itemsCount: number;
  bufferInfo: IBufferInfo;
  isLoading: boolean;
  isLoading$: Reactive<boolean>;
  loopPending: boolean;
  loopPending$: Reactive<boolean>;
  firstVisible: ItemAdapter<Item>;
  firstVisible$: Reactive<ItemAdapter<Item>>;
  lastVisible: ItemAdapter<Item>;
  lastVisible$: Reactive<ItemAdapter<Item>>;
  bof: boolean;
  bof$: Reactive<boolean>;
  eof: boolean;
  eof$: Reactive<boolean>;
  paused: boolean;
  paused$: Reactive<boolean>;

  private relax$: Reactive<AdapterMethodResult> | null;
  private relaxRun: Promise<AdapterMethodResult> | null;

  private shouldIgnorePausedMethod(method: MethodResolver) {
    const methodName = method.name as AdapterPropName;
    return this.paused && !ALLOWED_METHODS_WHEN_PAUSED.includes(methodName);
  }

  private getPausedMethodResult(method: MethodResolver) {
    this.logger?.log?.(() => 'scroller is paused: ' + method.name + ' method is ignored');
    return Promise.resolve(methodPausedResult);
  }

  private getPromisifiedMethod(method: MethodResolver, args: unknown[]) {
    return new Promise<AdapterMethodResult>(resolve => {
      if (this.relax$) {
        this.relax$.once(value => resolve(value));
      }
      method.apply(this, args);
    });
  }

  private getWorkflowRunnerMethod(method: MethodResolver, defaultMethod: MethodResolver) {
    return (...args: unknown[]): Promise<AdapterMethodResult> =>
      !this.relax$
        ? defaultMethod.apply(this, args)
        : this.shouldIgnorePausedMethod(method)
          ? this.getPausedMethodResult(method)
          : this.getPromisifiedMethod(method, args);
  }

  constructor(context: IAdapter<Item> | null, getWorkflow: WorkflowGetter<Item>, logger: Logger) {
    this.getWorkflow = getWorkflow;
    this.logger = logger;
    this.relax$ = null;
    this.relaxRun = null;
    this.reloadCounter = 0;
    const contextId = context?.id || -1;

    // public context (if exists) should provide access to Reactive props config by id
    const reactivePropsStore = context && reactiveConfigStorage.get(context.id) || {};

    // the Adapter initialization should not trigger "wanted" props setting;
    // after the initialization is completed, "wanted" functionality must be unblocked
    wantedUtils.setBlock(true, contextId);

    // make array of the original values from public context if present
    const adapterProps = context
      ? ADAPTER_PROPS_STUB.map(prop => {
        let value = context[prop.name];
        // if context is augmented, we need to replace external reactive props with inner ones
        if (context.augmented) {
          const reactiveProp = reactivePropsStore[prop.name];
          if (reactiveProp) {
            value = reactiveProp.default as Reactive<boolean>; // boolean doesn't matter here
          }
        }
        return ({ ...prop, value });
      })
      : getDefaultAdapterProps();

    // restore default reactive props if they were configured
    Object.entries(reactivePropsStore).forEach(([key, value]) => {
      const prop = adapterProps.find(({ name }) => name === key);
      if (prop && value) {
        prop.value = value.default;
      }
    });

    // Scalar permanent props
    adapterProps
      .filter(({ type, permanent }) => type === AdapterPropType.Scalar && permanent)
      .forEach(({ name, value }: IAdapterProp) =>
        Object.defineProperty(this, name, {
          configurable: true,
          get: () => value
        })
      );

    // Reactive props: store original values in "source" container, to avoid extra .get() calls on scalar twins set
    adapterProps
      .filter(prop => prop.type === AdapterPropType.Reactive)
      .forEach(({ name, value }: IAdapterProp) => {
        this.source[name] = value as Reactive<unknown>;
        Object.defineProperty(this, name, {
          configurable: true,
          get: () => this.source[name]
        });
      });

    // for "wanted" props that can be explicitly requested for the first time after the Adapter initialization,
    // an implicit calculation of the initial value is required;
    // so this method should be called when accessing the "wanted" props through one of the following getters
    const processWanted = (prop: IAdapterProp) => {
      if (wantedUtils.setBox(prop, contextId)) {
        if ([AdapterPropName.firstVisible, AdapterPropName.firstVisible$].some(n => n === prop.name)) {
          this.setFirstOrLastVisible({ first: true });
        } else if ([AdapterPropName.lastVisible, AdapterPropName.lastVisible$].some(n => n === prop.name)) {
          this.setFirstOrLastVisible({ last: true });
        }
      }
    };

    // Scalar props that have Reactive twins
    // 1) reactive props (from "source") should be triggered on set
    // 2) scalars should use "box" container on get
    // 3) "wanted" scalars should also run wanted-related logic on get
    adapterProps
      .filter(prop => prop.type === AdapterPropType.Scalar && !!prop.reactive)
      .forEach((prop: IAdapterProp) => {
        const { name, value, reactive } = prop;
        this.box[name] = value;
        Object.defineProperty(this, name, {
          configurable: true,
          set: (newValue: unknown) => {
            if (newValue !== this.box[name]) {
              this.box[name] = newValue;
              this.source[reactive as AdapterPropName].set(newValue);
              // need to emit new value through the configured reactive prop if present
              const reactiveProp = reactivePropsStore[reactive as AdapterPropName];
              if (reactiveProp) {
                reactiveProp.emit(reactiveProp.source, newValue);
              }
            }
          },
          get: () => {
            processWanted(prop);
            return this.box[name];
          }
        });
      });

    // Scalar props on-demand
    // these scalars should use "demand" container
    // setting defaults should be overridden on init()
    adapterProps
      .filter(prop => prop.type === AdapterPropType.Scalar && prop.onDemand)
      .forEach(({ name, value }: IAdapterProp) => {
        this.demand[name] = value;
        Object.defineProperty(this, name, {
          configurable: true,
          get: () => this.demand[name]
        });
      });

    if (!context) {
      return;
    }

    // Adapter public context augmentation
    adapterProps
      .forEach((prop: IAdapterProp) => {
        const { name, type, value: defaultValue, permanent } = prop;
        let value = (this as IAdapter)[name];
        if (type === AdapterPropType.Function) {
          value = (value as () => void).bind(this);
        } else if (type === AdapterPropType.WorkflowRunner) {
          value = this.getWorkflowRunnerMethod(value as MethodResolver, defaultValue as MethodResolver);
        } else if (type === AdapterPropType.Reactive && reactivePropsStore[name]) {
          value = (context as IAdapter)[name];
        } else if (name === AdapterPropName.augmented) {
          value = true;
        }
        const nonPermanentScalar = !permanent && type === AdapterPropType.Scalar;
        Object.defineProperty(context, name, {
          configurable: true,
          get: () => {
            processWanted(prop); // consider accessing "wanted" Reactive props
            if (nonPermanentScalar) {
              return (this as IAdapter)[name]; // non-permanent Scalars should be taken in runtime
            }
            return value; // other props (Reactive/Functions/WorkflowRunners) can be defined once
          }
        });
      });

    this.externalContext = context;
    wantedUtils.setBlock(false, contextId);
  }

  initialize(
    { buffer, state, viewport, logger, adapterRun$, getWorkflow }: InitializationParams<Item>
  ): void {
    // buffer
    Object.defineProperty(this.demand, AdapterPropName.itemsCount, {
      get: () => buffer.getVisibleItemsCount()
    });
    Object.defineProperty(this.demand, AdapterPropName.bufferInfo, {
      get: (): IBufferInfo => ({
        firstIndex: buffer.firstIndex,
        lastIndex: buffer.lastIndex,
        minIndex: buffer.minIndex,
        maxIndex: buffer.maxIndex,
        absMinIndex: buffer.absMinIndex,
        absMaxIndex: buffer.absMaxIndex,
        defaultSize: buffer.defaultSize,
      })
    });
    this.bof = buffer.bof.get();
    buffer.bof.on(bof => this.bof = bof);
    this.eof = buffer.eof.get();
    buffer.eof.on(eof => this.eof = eof);

    // state
    Object.defineProperty(this.demand, AdapterPropName.packageInfo, {
      get: () => state.packageInfo
    });
    this.loopPending = state.cycle.innerLoop.busy.get();
    state.cycle.innerLoop.busy.on(busy => this.loopPending = busy);
    this.isLoading = state.cycle.busy.get();
    state.cycle.busy.on(busy => this.isLoading = busy);
    this.paused = state.paused.get();
    state.paused.on(paused => this.paused = paused);

    //viewport
    this.setFirstOrLastVisible = ({ first, last, workflow }) => {
      if ((!first && !last) || workflow?.call?.interrupted) {
        return;
      }
      const token = first ? AdapterPropName.firstVisible : AdapterPropName.lastVisible;
      if (!wantedUtils.getBox(this.externalContext?.id)?.[token]) {
        return;
      }
      if (buffer.items.some(({ element }) => !element)) {
        logger.log('skipping first/lastVisible set because not all buffered items are rendered at this moment');
        return;
      }
      const direction = first ? Direction.backward : Direction.forward;
      const { item } = viewport.getEdgeVisibleItem(buffer.items, direction);
      if (!item || item.element !== this[token].element) {
        this[token] = (item ? item.get() : EMPTY_ITEM) as ItemAdapter<Item>;
      }
    };

    // logger
    this.logger = logger;

    // self-pending subscription; set up only on the very first init
    if (adapterRun$) {
      if (!this.relax$) {
        this.relax$ = new Reactive();
      }
      const relax$ = this.relax$;
      adapterRun$.on(({ status, payload }) => {
        let unSubRelax = () => { };
        if (status === ProcessStatus.start) {
          unSubRelax = this.isLoading$.on(value => {
            if (!value) {
              unSubRelax();
              relax$.set({ success: true, immediate: false, details: null });
            }
          });
        } else if (status === ProcessStatus.done || status === ProcessStatus.error) {
          unSubRelax();
          relax$.set({
            success: status !== ProcessStatus.error,
            immediate: true,
            details: status === ProcessStatus.error && payload ? String(payload.error) : null
          });
        }
      });
    }

    // workflow getter
    if (getWorkflow) {
      this.getWorkflow = getWorkflow;
    }

    // init
    this.init = true;
  }

  dispose(): void {
    if (this.relax$) {
      this.relax$.dispose();
    }
    if (this.externalContext) {
      this.resetContext();
    }
    Object.getOwnPropertyNames(this).forEach(prop => {
      delete (this as Record<string, unknown>)[prop];
    });
    this.disposed = true;
  }

  resetContext(): void {
    const reactiveStore = reactiveConfigStorage.get(this.externalContext?.id);
    ADAPTER_PROPS_STUB
      .forEach(({ type, permanent, name, value }) => {
        // assign initial values to non-reactive non-permanent props
        if (type !== AdapterPropType.Reactive && !permanent) {
          Object.defineProperty(this.externalContext, name, {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reset(options?: IDatasourceOptional): any {
    this.reloadCounter++;
    this.logger.logAdapterMethod('reset', options, ` of ${this.reloadId}`);
    this.workflow.call({
      process: AdapterProcess.reset,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reload(options?: number | string): any {
    this.reloadCounter++;
    this.logger.logAdapterMethod('reload', options, ` of ${this.reloadId}`);
    this.workflow.call({
      process: AdapterProcess.reload,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  append(_options: AdapterAppendOptions<Item> | unknown, eof?: boolean): any {
    const options = convertAppendArgs(false, _options, eof); // support old signature
    this.logger.logAdapterMethod('append', [options.items, options.eof]);
    this.workflow.call({
      process: AdapterProcess.append,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepend(_options: AdapterPrependOptions<Item> | unknown, bof?: boolean): any {
    const options = convertAppendArgs(true, _options, bof); // support old signature
    this.logger.logAdapterMethod('prepend', [options.items, options.bof]);
    this.workflow.call({
      process: AdapterProcess.prepend,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check(): any {
    this.logger.logAdapterMethod('check');
    this.workflow.call({
      process: AdapterProcess.check,
      status: ProcessStatus.start
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remove(options: AdapterRemoveOptions<Item> | ItemsPredicate<Item>): any {
    options = convertRemoveArgs(options); // support old signature
    this.logger.logAdapterMethod('remove', options);
    this.workflow.call({
      process: AdapterProcess.remove,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clip(options?: AdapterClipOptions): any {
    this.logger.logAdapterMethod('clip', options);
    this.workflow.call({
      process: AdapterProcess.clip,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(options: AdapterInsertOptions<Item>): any {
    this.logger.logAdapterMethod('insert', options);
    this.workflow.call({
      process: AdapterProcess.insert,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replace(options: AdapterReplaceOptions<Item>): any {
    this.logger.logAdapterMethod('replace', options);
    this.workflow.call({
      process: AdapterProcess.replace,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(options: AdapterUpdateOptions<Item>): any {
    this.logger.logAdapterMethod('update', options);
    this.workflow.call({
      process: AdapterProcess.update,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pause(): any {
    this.logger.logAdapterMethod('pause');
    this.workflow.call({
      process: AdapterProcess.pause,
      status: ProcessStatus.start
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resume(): any {
    this.logger.logAdapterMethod('resume');
    this.workflow.call({
      process: AdapterProcess.pause,
      status: ProcessStatus.start,
      payload: { options: { resume: true } }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fix(options: AdapterFixOptions<Item>): any {
    this.logger.logAdapterMethod('fix', options);
    this.workflow.call({
      process: AdapterProcess.fix,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  relaxUnchained(callback: (() => void) | undefined, reloadId: string): Promise<AdapterMethodResult> {
    const runCallback = () => typeof callback === 'function' && reloadId === this.reloadId && callback();
    if (!this.isLoading) {
      runCallback();
    }
    return new Promise<boolean>(resolve => {
      if (!this.isLoading) {
        resolve(true);
        return;
      }
      this.isLoading$.once(() => {
        runCallback();
        resolve(false);
      });
    }).then(immediate => {
      if (this.disposed) {
        return {
          immediate,
          success: false,
          details: 'Adapter was disposed'
        };
      }
      const success = reloadId === this.reloadId;
      this.logger?.log?.(() => !success ? `relax promise cancelled due to ${reloadId} != ${this.reloadId}` : void 0);
      return {
        immediate,
        success,
        details: !success ? 'Interrupted by reload or reset' : null
      };
    });
  }

  relax(callback?: () => void): Promise<AdapterMethodResult> {
    const reloadId = this.reloadId;
    this.logger.logAdapterMethod('relax', callback, ` of ${reloadId}`);
    if (!this.init) {
      return Promise.resolve(methodPreResult);
    }
    return this.relaxRun = this.relaxRun
      ? this.relaxRun.then(() => this.relaxUnchained(callback, reloadId))
      : this.relaxUnchained(callback, reloadId).then((result) => {
        this.relaxRun = null;
        return result;
      });
  }

  showLog(): void {
    this.logger.logAdapterMethod('showLog');
    this.logger.logForce();
  }
}
