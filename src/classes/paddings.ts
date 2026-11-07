import { Routines } from './domRoutines';
import { Settings } from './settings';
import { Direction } from '../inputs/index';

export class Padding {
  element: HTMLElement;
  direction: Direction;
  routines: Routines;
  private value = 0;
  private rendered?: number; // reading the style back is imprecise for large values

  constructor(direction: Direction, routines: Routines) {
    const found = routines.findPaddingElement(direction);
    routines.checkElement(found as HTMLElement);
    this.element = found as HTMLElement;
    this.direction = direction;
    this.routines = routines;
  }

  reset(size?: number): void {
    this.size = size || 0;
  }

  // Logical size, Viewport renders it
  get size(): number {
    return this.value;
  }

  set size(value: number) {
    if (isFinite(value)) {
      this.value = Math.max(0, Math.round(value));
    }
  }

  get renderedSize(): number {
    return this.rendered ?? this.routines.getSizeStyle(this.element);
  }

  set renderedSize(value: number) {
    this.rendered = Math.max(0, Math.round(value));
    this.routines.setSizeStyle(this.element, this.rendered);
  }
}

export class Paddings {
  settings: Settings;
  forward: Padding;
  backward: Padding;

  constructor(routines: Routines, settings: Settings) {
    this.settings = settings;
    this.forward = new Padding(Direction.forward, routines);
    this.backward = new Padding(Direction.backward, routines);
  }

  byDirection(direction: Direction, opposite?: boolean): Padding {
    return direction === Direction.backward
      ? opposite
        ? this.forward
        : this.backward
      : opposite
        ? this.backward
        : this.forward;
  }

  reset(viewportSize: number, startIndex: number, offset: number): void {
    const positive = this.getPositiveSize(startIndex, viewportSize, offset);
    const negative = this.getNegativeSize(startIndex);
    this.forward.reset(positive);
    this.backward.reset(negative);
    const diff = viewportSize - this.forward.size - offset;
    if (diff > 0) {
      this.backward.size -= diff;
      this.forward.size += diff;
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
