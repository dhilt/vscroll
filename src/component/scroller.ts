import { Observable, Subscription, Observer, Subject } from 'rxjs';

import { Datasource } from './classes/datasource';
import { Settings } from './classes/settings';
import { Logger } from './classes/logger';
import { Routines } from './classes/domRoutines';
import { Viewport } from './classes/viewport';
import { Buffer } from './classes/buffer';
import { State } from './classes/state';
import { Adapter } from './classes/adapter';
import { AdapterContext } from './classes/adapterContext';
import { checkDatasource } from './utils/index';

import { ScrollerWorkflow, IAdapter, IDatasource, CallWorkflow } from './interfaces/index';

let instanceCount = 0;

export class Scroller {
  public workflow: ScrollerWorkflow;

  public datasource: Datasource;
  public settings: Settings;
  public logger: Logger;
  public routines: Routines;
  public viewport: Viewport;
  public buffer: Buffer;
  public state: State;
  public adapter: Adapter;

  public innerLoopSubscriptions: Array<Subscription>;

  constructor(
    element: HTMLElement,
    datasource: Datasource | IDatasource,
    version: string,
    callWorkflow: CallWorkflow,
    scroller?: Scroller // for re-initialization
  ) {
    checkDatasource(datasource);

    const $items = scroller ? scroller.buffer.$items : void 0;
    this.workflow = <ScrollerWorkflow>{ call: callWorkflow };
    this.innerLoopSubscriptions = [];

    this.settings = new Settings(datasource.settings, datasource.devSettings, ++instanceCount);
    this.logger = new Logger(this, version);
    this.routines = new Routines(this.settings);
    this.state = new State(this.settings, version, this.logger);
    this.buffer = new Buffer(this.settings, this.state.startIndex, this.logger, $items);
    this.viewport = new Viewport(element, this.settings, this.routines, this.state, this.logger);
    this.logger.object('uiScroll settings object', this.settings, true);

    this.initDatasource(datasource, scroller);
  }

  initDatasource(datasource: Datasource | IDatasource, scroller?: Scroller) {
    const call = () => this.workflow;
    const constructed = datasource instanceof Datasource;
    const mockAdapter = !constructed && !this.settings.adapter;
    if (!scroller) { // scroller is being instantiated for the first time
      if (!constructed) { // datasource as POJO case
        this.datasource = new Datasource(datasource, mockAdapter);
        if (this.settings.adapter) {
          datasource.adapter = this.datasource.adapter;
        }
      } else { // instantiated datasource case
        this.datasource = datasource as Datasource;
      }
      const publicContext = !mockAdapter ? this.datasource.adapter : null;
      this.adapter = new Adapter(publicContext, call, this.logger);
    } else { // scroller re-instantiating case
      const adapterContext = datasource.adapter as AdapterContext;
      if (!constructed) {
        this.datasource = new Datasource(datasource, adapterContext.mock);
      } else {
        this.datasource = datasource as Datasource;
      }
      this.adapter = scroller.adapter;
    }
  }

  init(dispose$: Subject<void>) {
    this.viewport.reset(0);
    this.logger.stat('initialization');
    this.adapter.init(this.state, this.buffer, this.logger, dispose$);
  }

  bindData(): Observable<any> {
    return new Observable((observer: Observer<any>) => {
      setTimeout(() => {
        observer.next(true);
        observer.complete();
      });
    });
  }

  purgeInnerLoopSubscriptions() {
    this.innerLoopSubscriptions.forEach((item: Subscription) => item.unsubscribe());
    this.innerLoopSubscriptions = [];
  }

  purgeScrollTimers(localOnly?: boolean) {
    const { state: { scrollState } } = this;
    if (scrollState.scrollTimer) {
      clearTimeout(scrollState.scrollTimer);
      scrollState.scrollTimer = null;
    }
    if (!localOnly && scrollState.workflowTimer) {
      clearTimeout(scrollState.workflowTimer);
      scrollState.workflowTimer = null;
    }
  }

  dispose(forever?: boolean) {
    if (this.adapter) {
      this.adapter.dispose();
    }
    this.buffer.dispose(forever);
    this.purgeInnerLoopSubscriptions();
    this.purgeScrollTimers();
  }

  finalize() {
  }

}
