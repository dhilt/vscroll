import { DatasourceGeneric, makeDatasource } from './classes/datasource';
import { Settings } from './classes/settings';
import { Logger } from './classes/logger';
import { Routines } from './classes/domRoutines';
import { Viewport } from './classes/viewport';
import { Buffer } from './classes/buffer';
import { State } from './classes/state';
import { Adapter } from './classes/adapter';
import { Reactive } from './classes/reactive';
import { validate, DATASOURCE } from './inputs/index';
import core from './version';
import {
  ScrollerWorkflow, IDatasource, IDatasourceConstructed, ScrollerParams, IPackages, ProcessSubject
} from './interfaces/index';

export const INVALID_DATASOURCE_PREFIX = 'Invalid datasource:';

let instanceCount = 0;

export class Scroller<Data = unknown> {
  public datasource: IDatasourceConstructed<Data>;
  public workflow: ScrollerWorkflow<Data>;

  public settings: Settings<Data>;
  public logger: Logger;
  public routines: Routines;
  public viewport: Viewport;
  public buffer: Buffer<Data>;
  public state: State;
  public adapter: Adapter<Data>;

  constructor({ datasource, consumer, element, workflow, scroller }: ScrollerParams<Data>) {
    const { params: { get } } = validate(datasource, DATASOURCE);
    if (!get.isValid) {
      throw new Error(`${INVALID_DATASOURCE_PREFIX} ${get.errors[0]}`);
    }

    const packageInfo = scroller ? scroller.state.packageInfo : ({ consumer, core } as IPackages);
    element = scroller ? scroller.viewport.element : (element as HTMLElement);
    workflow = scroller ? scroller.workflow : (workflow as ScrollerWorkflow<Data>);

    this.workflow = workflow;
    this.settings = new Settings<Data>(datasource.settings, datasource.devSettings, ++instanceCount);
    this.logger = new Logger(this as Scroller, packageInfo, datasource.adapter);
    this.routines = new Routines(this.settings);
    this.state = new State(packageInfo, this.settings, scroller ? scroller.state : void 0);
    this.buffer = new Buffer<Data>(this.settings, workflow.onDataChanged, this.logger);
    this.viewport = new Viewport(element, this.settings, this.routines, this.state, this.logger);
    this.logger.object('vscroll settings object', this.settings, true);

    this.initDatasource(datasource, scroller);
  }

  initDatasource(datasource: IDatasource<Data>, scroller?: Scroller<Data>): void {
    if (scroller) { // scroller re-instantiating case
      this.datasource = datasource as IDatasourceConstructed<Data>;
      this.adapter = scroller.adapter;
      // todo: what about (this.settings.adapter !== scroller.setting.adapter) case?
      return;
    }
    // scroller is being instantiated for the first time
    const constructed = datasource instanceof DatasourceGeneric;
    const mockAdapter = !constructed && !this.settings.adapter;
    if (constructed) { // datasource is already instantiated
      this.datasource = datasource as IDatasourceConstructed<Data>;
    } else { // datasource as POJO
      const DS = makeDatasource(() => ({ mock: mockAdapter }));
      this.datasource = new DS<Data>(datasource);
      if (this.settings.adapter) {
        datasource.adapter = this.datasource.adapter;
      }
    }
    const publicContext = !mockAdapter ? this.datasource.adapter : null;
    this.adapter = new Adapter<Data>(publicContext, () => this.workflow, this.logger);
  }

  init(adapterRun$?: Reactive<ProcessSubject>): void {
    this.viewport.reset(this.buffer.startIndex);
    this.logger.stat('initialization');
    this.adapter.initialize(this.buffer, this.state, this.logger, adapterRun$);
  }

  dispose(forever?: boolean): void {
    if (forever) { // Adapter is not re-instantiated on reset
      this.adapter.dispose();
    }
    this.buffer.dispose();
    this.state.dispose();
  }

  finalize(): void {
  }

}
