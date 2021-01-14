import { Logger } from './logger';
import { Buffer } from './buffer';
import { Reactive } from './reactive';
import { AdapterPropName, AdapterPropType, getDefaultAdapterProps } from './adapter/props';
import { AdapterContext } from './adapter/context';
import { AdapterProcess, ProcessStatus } from '../processes/index';
import {
  WorkflowGetter,
  IAdapterProp,
  IReactivePropsStore,
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
  AdapterFixOptions,
  ScrollerWorkflow,
  IDatasourceOptional,
  IPackages,
  IBufferInfo,
  State,
  ProcessSubject,
} from '../interfaces/index';

const ADAPTER_PROPS_STUB = getDefaultAdapterProps();

const _has = (obj: unknown, prop: string): boolean =>
  typeof obj === 'object' && obj !== null && Object.prototype.hasOwnProperty.call(obj, prop);

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

const adapterMethodPreResult: AdapterMethodResult = {
  success: false,
  immediate: true,
  details: 'Adapter is not initialized'
};

export class Adapter<Item = unknown> implements IAdapter<Item> {
  private logger: Logger;
  private getWorkflow: WorkflowGetter<Item>;
  private reloadCounter: number;
  private source: { [key: string]: Reactive<unknown> } = {}; // for Reactive props
  private box: { [key: string]: unknown } = {}; // for Scalars over Reactive props
  private demand: { [key: string]: unknown } = {}; // for Scalars on demand
  public wanted: { [key: string]: boolean } = {};

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

  private relax$: Reactive<AdapterMethodResult> | null;
  private relaxRun: Promise<AdapterMethodResult> | null;

  private getPromisifiedMethod(method: (...args: any[]) => void) {
    return (...args: any[]): Promise<AdapterMethodResult> =>
      new Promise(resolve => {
        if (this.relax$) {
          this.relax$.once(value => resolve(value));
        }
        method.apply(this, args);
        if (!this.relax$) {
          resolve(adapterMethodPreResult);
        }
      });
  }

  constructor(publicContext: IAdapter<Item> | null, getWorkflow: WorkflowGetter<Item>, logger: Logger) {
    this.getWorkflow = getWorkflow;
    this.logger = logger;
    this.relax$ = null;
    this.relaxRun = null;
    this.reloadCounter = 0;
    const context: AdapterContext | null = publicContext ? (publicContext as unknown as AdapterContext) : null;

    // public context stores Reactive props configuration
    const reactivePropsStore: IReactivePropsStore =
      context && context.reactiveConfiguredProps || {};

    // make array of the original values from public context if present
    const adapterProps = context
      ? ADAPTER_PROPS_STUB.map(prop => ({
        ...prop,
        value: context[prop.name]
      }))
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
          get: () => value
        })
      );

    // Reactive props
    // 1) store original values in "source" container, to avoid extra .get() calls on scalar twins set
    // 2) "wanted" container is bound with scalars; get() updates it
    adapterProps
      .filter(prop => prop.type === AdapterPropType.Reactive)
      .forEach(({ name, value }: IAdapterProp) => {
        this.source[name] = value as Reactive<unknown>;
        Object.defineProperty(this, name, {
          get: () => {
            const scalarWanted = ADAPTER_PROPS_STUB.find(
              ({ wanted, reactive }) => wanted && reactive === name
            );
            if (scalarWanted) {
              this.wanted[scalarWanted.name] = true;
            }
            return this.source[name];
          }
        });
      });

    // Scalar props that have Reactive twins
    // 1) scalars should use "box" container
    // 2) "wanted" should be updated on get
    // 3) reactive props (from "source") are triggered on set
    adapterProps
      .filter(prop => prop.type === AdapterPropType.Scalar && !!prop.reactive)
      .forEach(({ name, value, reactive, wanted }: IAdapterProp) => {
        if (wanted) {
          this.wanted[name] = false;
        }
        this.box[name] = value;
        Object.defineProperty(this, name, {
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
            if (wanted) {
              this.wanted[name] = true;
            }
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
          get: () => this.demand[name]
        });
      });

    if (!context) {
      return;
    }

    // Adapter public context augmentation
    adapterProps
      .forEach(({ name, type }: IAdapterProp) => {
        let value = (this as IAdapter)[name];
        if (type === AdapterPropType.Function) {
          value = (value as () => void).bind(this);
        } else if (type === AdapterPropType.WorkflowRunner) {
          value = this.getPromisifiedMethod(value as () => void);
        } else if (type === AdapterPropType.Reactive && reactivePropsStore[name]) {
          value = context[name];
        }
        Object.defineProperty(context, name, {
          configurable: false,
          get: () => type === AdapterPropType.Scalar
            ? (this as IAdapter)[name] // Scalars should be taken in runtime
            : value // Reactive props and methods (Functions/WorkflowRunners) can be defined once
        });
      });

    // public context cleanup
    delete context.reactiveConfiguredProps;
  }

  initialize(buffer: Buffer<Item>, state: State, logger: Logger, adapterRun$?: Reactive<ProcessSubject>): void {
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
        }
        if (status === ProcessStatus.done || status === ProcessStatus.error) {
          unSubRelax();
          relax$.set({
            success: status !== ProcessStatus.error,
            immediate: true,
            details: status === ProcessStatus.error && payload ? String(payload.error) : null
          });
        }
      });
    }

    // init
    this.init = true;
  }

  dispose(): void {
    if (this.relax$) {
      this.relax$.dispose();
    }
    Object.values(this.source).forEach(reactive => reactive.dispose());
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
  fix(options: AdapterFixOptions<Item>): any {
    this.logger.logAdapterMethod('fix', options);
    this.workflow.call({
      process: AdapterProcess.fix,
      status: ProcessStatus.start,
      payload: { options }
    });
  }

  async relaxUnchained(callback: (() => void) | undefined, reloadId: string): Promise<AdapterMethodResult> {
    const runCallback = () => typeof callback === 'function' && reloadId === this.reloadId && callback();
    if (!this.isLoading) {
      runCallback();
    }
    const immediate: boolean = await (
      new Promise(resolve => {
        if (!this.isLoading) {
          resolve(true);
          return;
        }
        this.isLoading$.once(() => {
          runCallback();
          resolve(false);
        });
      })
    );
    const success = reloadId === this.reloadId;
    this.logger.log(() => !success ? `relax promise cancelled due to ${reloadId} != ${this.reloadId}` : void 0);
    return {
      immediate,
      success,
      details: !success ? 'Interrupted by reload or reset' : null
    };
  }

  relax(callback?: () => void): Promise<AdapterMethodResult> {
    const reloadId = this.reloadId;
    this.logger.logAdapterMethod('relax', callback, ` of ${reloadId}`);
    if (!this.init) {
      return Promise.resolve(adapterMethodPreResult);
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
