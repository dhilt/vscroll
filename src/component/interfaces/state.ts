import { BehaviorSubject, Subject } from 'rxjs';

import { Direction, ItemAdapter } from './index';
import { FetchModel } from '../classes/state/fetch';
import { ClipModel } from '../classes/state/clip';
import { RenderModel } from '../classes/state/render';

export interface WindowScrollState {
  delta: number;
  positionToUpdate: number;

  reset: Function;
}

export interface ScrollEventData {
  time: number;
  position: number;
  positionBefore: number | null;
  direction: Direction;
  handled: boolean;
}

export interface ScrollEventData2 {
  time: number;
  position: number;
  direction: Direction | null;
}

export interface ScrollState {
  previous: ScrollEventData2;
  current: ScrollEventData2;

  firstScroll: boolean;
  firstScrollTime: number;
  lastScrollTime: number;
  scrollTimer: ReturnType<typeof setTimeout> | null;
  workflowTimer: ReturnType<typeof setTimeout> | null;
  scroll: boolean;
  window: WindowScrollState;

  position: number;
  time: number;
  direction: Direction;
  positionBefore: number;

  syntheticPosition: number | null;
  syntheticFulfill: boolean;
  animationFrameId: number;

  reset: Function;
  getData: Function;
  setData: Function;
}

export interface WorkflowOptions {
  empty: boolean;
  scroll: boolean;
  keepScroll: boolean;
  byTimer: boolean;
  noFetch: boolean;

  reset: Function;
}

export interface State {
  version: string;

  initTime: number;
  innerLoopCount: number;
  isInitialLoop: boolean;
  workflowCycleCount: number;
  isInitialWorkflowCycle: boolean;
  countDone: number;
  workflowOptions: WorkflowOptions;

  fetch: FetchModel;
  clip: ClipModel;
  render: RenderModel;
  startIndex: number;
  lastPosition: number;
  preFetchPosition: number;
  preAdjustPosition: number;
  bwdPaddingAverageSizeItemsCount: number;

  scrollState: ScrollState;

  time: number;
  loop: string;
  loopNext: string;
}
