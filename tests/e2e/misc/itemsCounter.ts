
import { Page } from '@playwright/test';
import { Direction } from '../../../src/inputs/common';
import { TESTS } from './types';

export type ScrollResult = {
  edgeItemIndex: (number | undefined)[],
  oppositeItemIndex: (number | undefined)[],
  paddingSize: (number | undefined)[],
  oppositePaddingSize: (number | undefined)[],
}

export type ItemsCounter = {
  invertDirection: (direction: Direction) => void,
  doScrollMax: (direction: Direction) => void,
  getInitialItemsCounter: () => void,
  getCurrentItemsCounter: (direction: Direction) => void,
  getExpectations: (direction: Direction) => ScrollResult,
}

export const initializeItemsCounter = (page: Page) => page.evaluate(() => {
  const { workflow: { scroller } } = window['__vscroll__'];
  const forward = 'forward' as Direction;
  const backward = 'backward' as Direction;
  let itemsCounter: ItemsCounter;

  class ItemsDirCounter {
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

  class ItemsCounter {
    direction: Direction | null; // direction per calculations
    backward: ItemsDirCounter;
    forward: ItemsDirCounter;
    average: number;

    get total(): number {
      return this.forward.index - this.backward.index + 1;
      // return this.backward.count + this.forward.count;
    }

    get paddings(): number {
      return this.forward.padding + this.backward.padding;
    }

    constructor(direction?: Direction) {
      this.direction = direction || null;
      this.forward = new ItemsDirCounter();
      this.backward = new ItemsDirCounter();
      this.average = NaN;
    }

    get(token: Direction): ItemsDirCounter {
      return token === backward ? this.backward : this.forward;
    }

    set(token: Direction, value: ItemsDirCounter): void {
      if (token === backward) {
        Object.assign(this.backward, value);
      } else {
        Object.assign(this.forward, value);
      }
    }
  }

  const invertDirection = (direction: Direction) => {
    const _forward = direction === forward;
    direction = _forward ? backward : forward;
  };

  const doScrollMax = (direction: Direction) => {
    if (direction === forward) {
      scroller.adapter.fix({ scrollPosition: Infinity });
    } else {
      scroller.adapter.fix({ scrollPosition: 0 });
    }
  };

  const getInitialItemsCounter = () => {
    const { startIndex } = scroller.settings;
    const edgeItem = scroller.buffer.getEdgeVisibleItem(forward);
    const oppositeItem = scroller.buffer.getEdgeVisibleItem(backward);
    const result = new ItemsCounter();
    if (!edgeItem || !oppositeItem) {
      return result;
    }
    result.set(forward, {
      count: edgeItem.$index - startIndex + 1,
      index: edgeItem.$index,
      padding: 0,
      size: 0
    });
    result.set(backward, {
      count: startIndex - oppositeItem.$index,
      index: oppositeItem.$index,
      padding: 0,
      size: NaN
    });
    itemsCounter = result;
  };

  const getFullHouseDiff = (
    viewportSize: number, paddingDelta: number, itemSize: number, bufferSize: number
  ): number => {
    const sizeToFill = viewportSize + 2 * paddingDelta; // size to fill the viewport + padding deltas
    const itemsToFillNotRounded = sizeToFill / itemSize;
    const itemsToFillRounded = Math.ceil(sizeToFill / itemSize);
    const itemsToFill = itemsToFillRounded + (itemsToFillNotRounded === itemsToFillRounded ? 0 : 1);
    const bufferSizeDiff = bufferSize - itemsToFill;
    return Math.max(0, bufferSizeDiff);
  };


  const getCurrentItemsCounter = (direction: Direction) => {
    const previous = itemsCounter;
    const { bufferSize, padding } = scroller.settings;
    const viewportSize = scroller.viewport.getSize();
    const itemSize = scroller.buffer.defaultSize;
    const fwd = direction === forward;
    const opposite = fwd ? backward : forward;
    const delta = viewportSize * padding;

    // handle direction (fetch)
    const fullHouseDiff = getFullHouseDiff(viewportSize, delta, itemSize, bufferSize);
    const _singleFetchCount = Math.ceil(delta / itemSize);
    const singleFetchCount = Math.max(bufferSize, _singleFetchCount);
    const itemsToFetch = previous.direction && previous.direction !== direction ?
      (_singleFetchCount + fullHouseDiff) : singleFetchCount;
    const previousEdgeIndex = previous.get(direction).index;
    const paddingItems = (fwd ? 1 : -1) * (previous.get(direction).padding / itemSize);
    const newItemsPack = (fwd ? 1 : -1) * itemsToFetch;
    const newDirIndex = previousEdgeIndex + paddingItems + newItemsPack;

    // handle opposite (clip)
    const oppPadding = previous.get(opposite).padding;
    const previousTotalSize = previous.total * itemSize + previous.paddings;
    const sizeToClip = previousTotalSize - oppPadding - viewportSize - delta;
    const itemsToClip = Math.floor(sizeToClip / itemSize);
    const newOppIndex = previous.get(opposite).index + (fwd ? 1 : -1) * itemsToClip;
    const newOppPadding = itemsToClip * itemSize + oppPadding;

    const result = new ItemsCounter(direction);
    result.set(direction, {
      index: newDirIndex,
      padding: 0,
      count: NaN,
      size: NaN
    });
    result.set(opposite, {
      index: newOppIndex,
      padding: newOppPadding,
      count: NaN,
      size: NaN
    });
    itemsCounter = result;
  };

  const getExpectations = (direction: Direction): ScrollResult => {
    const opposite = direction === forward ? backward : forward;
    const edgeItem = scroller.buffer.getEdgeVisibleItem(direction);
    const oppositeItem = scroller.buffer.getEdgeVisibleItem(opposite);
    const edgeItemIndex = itemsCounter.get(direction).index;
    const oppositeItemIndex = itemsCounter.get(opposite).index;
    const paddingSize = scroller.viewport.paddings.byDirection(direction).size;
    const oppositePaddingSize = scroller.viewport.paddings.byDirection(direction, true).size;

    return {
      edgeItemIndex: [edgeItemIndex, edgeItem?.$index],
      oppositeItemIndex: [oppositeItemIndex, oppositeItem?.$index],
      paddingSize: [itemsCounter.get(direction).padding, paddingSize],
      oppositePaddingSize: [itemsCounter.get(opposite).padding, oppositePaddingSize]
    };
  };

  const ItemsCounterUtils: TESTS['ItemsCounter'] = {
    invertDirection,
    doScrollMax,
    getInitialItemsCounter,
    getCurrentItemsCounter,
    getExpectations
  };

  window['__tests__'] ??= {} as TESTS;
  window['__tests__'].ItemsCounter = ItemsCounterUtils;
});