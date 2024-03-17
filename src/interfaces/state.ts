import { Direction } from '../inputs/index';
import { Reactive } from '../classes/reactive';
import { WorkflowCycleModel } from '../classes/state/cycle';
import { FetchModel } from '../classes/state/fetch';
import { ClipModel } from '../classes/state/clip';
import { RenderModel } from '../classes/state/render';
import { ScrollModel } from '../classes/state/scroll';
import { IPackages } from './adapter';

export interface ScrollEventData {
  time: number;
  position: number;
  direction: Direction | null;
}

export interface State {
  packageInfo: IPackages;
  initTime: number;
  paused: Reactive<boolean>;
  cycle: WorkflowCycleModel;
  fetch: FetchModel;
  clip: ClipModel;
  render: RenderModel;
  scroll: ScrollModel;
  time: number;
}
