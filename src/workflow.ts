import { Scroller } from './scroller';
import { runStateMachine } from './workflow-transducer';
import { Reactive } from './classes/reactive';
import { Item } from './classes/item';
import { AdapterProcess, CommonProcess, ProcessStatus as Status, } from './processes/index';
import { WORKFLOW, validate } from './inputs/index';
import {
  WorkflowParams,
  ProcessName,
  ProcessPayload,
  ProcessClass,
  ProcessSubject,
  WorkflowError,
  InterruptParams,
  StateMachineMethods,
  ScrollerWorkflow,
} from './interfaces/index';

export class Workflow<ItemData = unknown> {

  isInitialized: boolean;
  disposed: boolean;
  initTimer: ReturnType<typeof setTimeout> | null;
  adapterRun$: Reactive<ProcessSubject>;
  cyclesDone: number;
  interruptionCount: number;
  errors: WorkflowError[];

  private offScroll: () => void;
  readonly propagateChanges: WorkflowParams<ItemData>['run'];
  readonly stateMachineMethods: StateMachineMethods<ItemData>;

  scroller: Scroller<ItemData>;

  constructor(params: WorkflowParams<ItemData>) {
    const { element, datasource, consumer, run, Routines } = params;

    const validationResult = validate(params, WORKFLOW);
    if (!validationResult.isValid) {
      throw new Error(`Invalid Workflow params: ${validationResult.errors.join(', ')}.`);
    }

    this.isInitialized = false;
    this.disposed = false;
    this.initTimer = null;
    this.adapterRun$ = new Reactive();
    this.cyclesDone = 0;
    this.interruptionCount = 0;
    this.errors = [];
    this.offScroll = () => null;
    this.propagateChanges = run;
    this.stateMachineMethods = {
      run: this.runProcess(),
      interrupt: this.interrupt.bind(this),
      done: this.done.bind(this),
      onError: this.onError.bind(this)
    };

    this.scroller = new Scroller<ItemData>({
      element, datasource, consumer, workflow: this.getUpdater(), Routines
    });

    if (this.scroller.settings.initializeDelay) {
      this.initTimer = setTimeout(() => {
        this.initTimer = null;
        this.init();
      }, this.scroller.settings.initializeDelay);
    } else {
      this.init();
    }
  }

  init(): void {
    this.scroller.init(this.adapterRun$);

    // set up scroll event listener
    const { routines } = this.scroller;
    const onScrollHandler: EventListener =
      event => this.callWorkflow({
        process: CommonProcess.scroll,
        status: Status.start,
        payload: { event }
      });
    this.offScroll = routines.onScroll(onScrollHandler);

    // run the Workflow
    this.isInitialized = true;
    this.callWorkflow({
      process: CommonProcess.init,
      status: Status.start
    });
  }

  changeItems(items: Item<ItemData>[]): void {
    this.propagateChanges(items);
  }

  callWorkflow(processSubject: ProcessSubject): void {
    if (!this.isInitialized) {
      return;
    }
    const { process, status } = processSubject;
    // if the scroller is paused, any process other than "pause" and "reset" should be blocked
    if (this.scroller.state.paused.get() && process !== AdapterProcess.pause && process !== AdapterProcess.reset) {
      this.scroller.logger.log('scroller is paused: ' + process + ' process is ignored');
      return;
    }
    if (process && process.startsWith('adapter') && status !== Status.next) {
      this.adapterRun$.set(processSubject);
    }
    this.process(processSubject);
  }

  getUpdater(): ScrollerWorkflow<ItemData> {
    return {
      call: this.callWorkflow.bind(this),
      onDataChanged: this.changeItems.bind(this),
    };
  }

  process(data: ProcessSubject): void {
    const { status, process, payload } = data;
    if (this.scroller.settings.logProcessRun) {
      this.scroller.logger.log(() => [
        '%cfire%c', ...['color: #cc7777;', 'color: #000000;'],
        process, `"${status}"`, ...(payload !== void 0 ? [payload] : [])
      ]);
    }
    this.scroller.logger.logProcess(data);

    if (process === CommonProcess.end) {
      this.scroller.finalize();
    }
    runStateMachine({
      input: data,
      methods: this.stateMachineMethods as StateMachineMethods<unknown>
    });
  }

  runProcess() {
    return ({ run, process, name }: ProcessClass) =>
      (...args: unknown[]): void => {
        if (this.scroller.settings.logProcessRun) {
          this.scroller.logger.log(() => [
            '%crun%c', ...['color: #333399;', 'color: #000000;'],
            process || name, ...args
          ]);
        }
        run(this.scroller as Scroller, ...args);
      };
  }

  onError(process: ProcessName, payload?: ProcessPayload): void {
    const message: string = payload && String(payload.error) || '';
    const { time, cycle } = this.scroller.state;
    this.errors.push({
      process,
      message,
      time,
      loop: cycle.loopIdNext
    });
    this.scroller.logger.logError(message);
  }

  interrupt({ process, finalize, datasource }: InterruptParams<ItemData>): void {
    if (finalize) {
      const { workflow, logger } = this.scroller;
      // we are going to create a new reference for the scroller.workflow object
      // calling the old version of the scroller.workflow by any outstanding async processes will be skipped
      workflow.call = (_: ProcessSubject) => // eslint-disable-line @typescript-eslint/no-unused-vars
        logger.log('[skip wf call]');
      workflow.call.interrupted = true;
      this.scroller.workflow = this.getUpdater();
      this.interruptionCount++;
      logger.log(() => `workflow had been interrupted by the ${process} process (${this.interruptionCount})`);
    }
    if (datasource) { // Scroller re-initialization case
      const reInit = () => {
        this.scroller.logger.log('new Scroller instantiation');
        const scroller = new Scroller<ItemData>({ datasource, scroller: this.scroller });
        this.scroller.dispose();
        this.scroller = scroller;
        this.scroller.init();
      };
      if (this.scroller.state.cycle.busy.get()) {
        // todo: think about immediate re-initialization even is there are pending processes
        this.scroller.adapter.relax(reInit.bind(this));
      } else {
        reInit();
      }
    }
  }

  done(): void {
    const { state, logger } = this.scroller;
    this.cyclesDone++;
    logger.logCycle(false);
    state.endWorkflowCycle(this.cyclesDone + 1);
    this.finalize();
  }

  dispose(): void {
    this.scroller.logger.log(() => 'disposing workflow');
    if (this.initTimer) {
      clearTimeout(this.initTimer);
    }
    this.offScroll();
    this.adapterRun$.dispose();
    this.scroller.dispose(true);
    Object.getOwnPropertyNames(this).forEach(prop => {
      delete (this as Record<string, unknown>)[prop];
    });
    this.disposed = true;
  }

  finalize(): void {
  }

}
