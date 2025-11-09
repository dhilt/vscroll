import { Direction, type DirectionType } from '../fixture/VScrollFixture.js';

/**
 * Helper class to track item counts in forward and backward directions
 */
export class ItemsDirCounter {
  count: number;
  index: number;
  padding: number;
  paddingShift?: number;
  size: number;

  constructor(count = 0, padding = 0) {
    this.count = count;
    this.padding = padding;
    this.paddingShift = 0;
    this.index = NaN;
    this.size = NaN;
  }
}

/**
 * Helper class for tracking expected buffer state during scroll tests
 */
export class ItemsCounter {
  direction: DirectionType | null;
  backward: ItemsDirCounter;
  forward: ItemsDirCounter;
  average: number;

  get total(): number {
    return this.forward.index - this.backward.index + 1;
  }

  get paddings(): number {
    return this.forward.padding + this.backward.padding;
  }

  constructor(direction?: DirectionType) {
    this.direction = direction || null;
    this.forward = new ItemsDirCounter();
    this.backward = new ItemsDirCounter();
    this.average = NaN;
  }

  get(token: DirectionType): ItemsDirCounter {
    return token === Direction.backward ? this.backward : this.forward;
  }

  set(token: DirectionType, value: Partial<ItemsDirCounter>): void {
    if (token === Direction.backward) {
      Object.assign(this.backward, value);
    } else {
      Object.assign(this.forward, value);
    }
  }
}

