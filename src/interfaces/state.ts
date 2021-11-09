import { Direction } from '../inputs/index';
import { WorkflowCycleModel } from '../classes/state/cycle';
import { FetchModel } from '../classes/state/fetch';
import { ClipModel } from '../classes/state/clip';
import { RenderModel } from '../classes/state/render';
import { IPackages } from './adapter';

export interface ScrollEventData {
  time: number;
  position: number;
  direction: Direction | null;
}

export interface ScrollState {
  previous: ScrollEventData | null;
  current: ScrollEventData | null;

  scrollTimer: ReturnType<typeof setTimeout> | null;
  cancelAnimation: (() => void) | null;

  syntheticPosition: number | null;
  syntheticFulfill: boolean;
  positionBeforeAsync: number | null;
  positionBeforeAdjust: number | null;
  positionAfterAdjust: number | null;

  reset: () => void;
  stop: () => void;
  hasPositionChanged: (position: number) => boolean;
}

export interface State {
  packageInfo: IPackages;
  initTime: number;
  cycle: WorkflowCycleModel;
  fetch: FetchModel;
  clip: ClipModel;
  render: RenderModel;
  scrollState: ScrollState;
  time: number;
}
