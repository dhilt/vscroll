import {
  ScrollEventData as IScrollEventData,
  ScrollState as IScrollState
} from '../../interfaces/index';

export class ScrollState implements IScrollState {
  previous: IScrollEventData | null;
  current: IScrollEventData | null;

  scrollTimer: ReturnType<typeof setTimeout> | null;

  syntheticPosition: number | null;
  syntheticFulfill: boolean;
  cancelAnimation: (() => void) | null;
  positionBeforeAsync: number | null;
  positionBeforeAdjust: number | null;
  positionAfterAdjust: number | null;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.previous = null;
    this.current = null;
    this.syntheticPosition = null;
    this.syntheticFulfill = false;
    this.positionBeforeAsync = null;
    this.positionBeforeAdjust = null;
    this.positionAfterAdjust = null;
    this.stop();
  }

  stop(): void {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
    if (this.cancelAnimation) {
      this.cancelAnimation();
      this.cancelAnimation = null;
    }
  }

  hasPositionChanged(position: number): boolean {
    const before = this.positionBeforeAdjust;
    const after = this.positionAfterAdjust;
    return before === null || before !== position || after === null || after !== position;
  }
}
