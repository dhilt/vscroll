import { Routines } from './domRoutines';
import { Settings } from './settings';
import { Direction } from '../inputs/index';

export class Padding {

  element: HTMLElement;
  direction: Direction;
  routines: Routines;

  constructor(element: HTMLElement, direction: Direction, routines: Routines) {
    const found = routines.findPaddingElement(element, direction);
    routines.checkElement(found as HTMLElement);
    this.element = found as HTMLElement;
    this.direction = direction;
    this.routines = routines;
  }

  reset(size?: number): void {
    this.size = size || 0;
  }

  get size(): number {
    return this.routines.getSizeStyle(this.element);
  }

  set size(value: number) {
    this.routines.setSizeStyle(this.element, value);
  }

}

export class Paddings {
  settings: Settings;
  forward: Padding;
  backward: Padding;

  constructor(element: HTMLElement, routines: Routines, settings: Settings) {
    this.settings = settings;
    this.forward = new Padding(element, Direction.forward, routines);
    this.backward = new Padding(element, Direction.backward, routines);
  }

  byDirection(direction: Direction, opposite?: boolean): Padding {
    return direction === Direction.backward
      ? (opposite ? this.forward : this.backward)
      : (opposite ? this.backward : this.forward);
  }

  reset(viewportSize: number, startIndex: number, offset: number): void {
    const positive = this.getPositiveSize(startIndex, viewportSize, offset);
    const negative = this.getNegativeSize(startIndex);
    if (this.settings.inverse) {
      this.forward.reset(negative);
      this.backward.reset(positive);
      const diff = viewportSize - this.backward.size - offset;
      if (diff > 0) {
        this.backward.size += diff;
        this.forward.size -= diff;
      }
    } else {
      this.forward.reset(positive);
      this.backward.reset(negative);
      const diff = viewportSize - this.forward.size - offset;
      if (diff > 0) {
        this.backward.size -= diff;
        this.forward.size += diff;
      }
    }

  }

  getPositiveSize(startIndex: number, viewportSize: number, offset: number): number {
    const { settings } = this;
    let positiveSize = viewportSize;
    if (isFinite(settings.maxIndex)) {
      positiveSize = (settings.maxIndex - startIndex + 1) * settings.itemSize;
    }
    if (offset) {
      positiveSize = Math.max(positiveSize - offset, 0);
    }
    return positiveSize;
  }

  getNegativeSize(startIndex: number): number {
    const { settings } = this;
    let negativeSize = 0;
    if (isFinite(settings.minIndex)) {
      negativeSize = (startIndex - settings.minIndex) * settings.itemSize;
    }
    return negativeSize;
  }
}
