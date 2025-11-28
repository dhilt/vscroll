import { Settings } from './settings';
import { Reactive } from './reactive';
import { WorkflowCycleModel } from './state/cycle';
import { FetchModel } from './state/fetch';
import { ClipModel } from './state/clip';
import { RenderModel } from './state/render';
import { ScrollModel } from './state/scroll';
import { State as IState, IPackages, ProcessName } from '../interfaces/index';

export class State implements IState {
  readonly packageInfo: IPackages;
  private settings: Settings;
  initTime: number;
  paused: Reactive<boolean>;

  cycle: WorkflowCycleModel;
  fetch: FetchModel;
  clip: ClipModel;
  render: RenderModel;
  scroll: ScrollModel;

  get time(): number {
    return Number(new Date()) - this.initTime;
  }

  constructor(packageInfo: IPackages, settings: Settings, state?: IState) {
    this.packageInfo = packageInfo;
    this.settings = settings;
    this.initTime = Number(new Date());
    this.paused = new Reactive(false);

    this.cycle = new WorkflowCycleModel(this.settings.instanceIndex, state ? state.cycle : void 0);
    this.fetch = new FetchModel(settings.directionPriority);
    this.clip = new ClipModel();
    this.render = new RenderModel();
    this.scroll = new ScrollModel();
  }

  startWorkflowCycle(isInitial: boolean, initiator: ProcessName): void {
    this.cycle.start(isInitial, initiator);
  }

  endWorkflowCycle(count: number): void {
    this.cycle.end(count);
  }

  startInnerLoop(): { process?: ProcessName; doRender?: boolean } {
    const { cycle, scroll: scroll, fetch, render, clip } = this;

    cycle.innerLoop.start();
    scroll.positionBeforeAsync = null;

    if (!fetch.simulate) {
      fetch.reset();
    }
    clip.reset(clip.force);
    render.reset();

    return {
      ...(cycle.innerLoop.first
        ? {
            process: cycle.initiator,
            doRender: fetch.simulate && fetch.items.length > 0
          }
        : {})
    };
  }

  endInnerLoop(): void {
    const { fetch, clip, render, cycle } = this;
    fetch.stopSimulate();
    clip.reset(true);
    if (fetch.cancel) {
      fetch.cancel();
      fetch.cancel = null;
    }
    if (render.cancel) {
      render.cancel();
      render.cancel = null;
    }
    cycle.innerLoop.done();
  }

  dispose(): void {
    this.scroll.stop();
    this.cycle.dispose();
    this.paused.dispose();
    this.endInnerLoop();
  }
}
