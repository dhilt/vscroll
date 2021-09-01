import { Settings } from './settings';
import { WorkflowCycleModel } from './state/cycle';
import { FetchModel } from './state/fetch';
import { ClipModel } from './state/clip';
import { RenderModel } from './state/render';
import { ScrollState } from './state/scroll';
import { State as IState, IPackages, ScrollState as IScrollState, ProcessName } from '../interfaces/index';

export class State implements IState {

  readonly packageInfo: IPackages;
  private settings: Settings;

  initTime: number;

  cycle: WorkflowCycleModel;

  fetch: FetchModel;
  clip: ClipModel;
  render: RenderModel;

  scrollState: IScrollState;

  get time(): number {
    return Number(new Date()) - this.initTime;
  }

  constructor(packageInfo: IPackages, settings: Settings, state?: IState) {
    this.packageInfo = packageInfo;
    this.settings = settings;

    this.initTime = Number(new Date());

    this.cycle = new WorkflowCycleModel(this.settings.instanceIndex, state ? state.cycle : void 0);

    this.fetch = new FetchModel(settings.directionPriority);
    this.clip = new ClipModel();
    this.render = new RenderModel();

    this.scrollState = new ScrollState();
  }

  endInnerLoop(): void {
    const { fetch, render, cycle } = this;
    if (fetch.cancel) {
      fetch.cancel();
      fetch.cancel = null;
    }
    if (render.renderTimer) {
      clearTimeout(render.renderTimer);
      render.renderTimer = null;
    }
    cycle.innerLoop.done();
  }

  startInnerLoop(): { process?: ProcessName, doRender?: boolean } {
    const { cycle, scrollState: scroll, fetch, render, clip } = this;

    cycle.innerLoop.start();
    scroll.positionBeforeAsync = null;

    if (!fetch.simulate) {
      fetch.reset();
    }
    clip.reset(clip.force);
    render.reset();

    return {
      ...(cycle.innerLoop.first ? {
        process: cycle.initiator,
        doRender: fetch.simulate && fetch.items.length > 0
      } : {})
    };
  }

  dispose(): void {
    this.cycle.dispose();
    this.endInnerLoop();
    this.scrollState.cleanupTimers();
  }

}
