import { Item } from './item';
import { Logger } from './logger';

export class ItemCache<Data = unknown> {
  $index: number;
  nodeId: string;
  data: Data | null;
  size: number;
  position: number;

  constructor(item: Item<Data>, saveData: boolean) {
    this.$index = item.$index;
    this.nodeId = item.nodeId;
    this.data = saveData ? item.data : null;
    this.size = item.size;
  }

  changeIndex(value: number): void {
    this.$index = value;
    this.nodeId = String(value);
  }
}

interface ItemSize {
  $index: number;
  size: number;
  newSize?: number;
}

export class RecalculateAverage {
  newItems: ItemSize[];
  oldItems: ItemSize[];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.newItems = [];
    this.oldItems = [];
  }
}

export class Cache<Data = unknown> {
  averageSizeFloat: number;
  averageSize: number;
  minIndex: number;
  maxIndex: number;
  recalculateAverage: RecalculateAverage;

  private items: Map<number, ItemCache<Data>>;
  readonly logger: Logger;
  readonly itemSize: number;
  readonly saveData: boolean;

  constructor(itemSize: number, saveData: boolean, logger: Logger) {
    this.averageSizeFloat = itemSize;
    this.averageSize = itemSize;
    this.itemSize = itemSize;
    this.saveData = saveData;
    this.items = new Map<number, ItemCache<Data>>();
    this.recalculateAverage = new RecalculateAverage();
    this.reset();
    this.logger = logger;
  }

  reset(): void {
    this.minIndex = +Infinity;
    this.maxIndex = -Infinity;
    this.items.clear();
    this.averageSizeFloat = this.itemSize;
    this.averageSize = this.itemSize;
    this.recalculateAverage.reset();
  }

  recalculateAverageSize(): boolean {
    const { oldItems: { length: oldItemsLength }, newItems: { length: newItemsLength } } = this.recalculateAverage;
    if (!oldItemsLength && !newItemsLength) {
      return false;
    }
    if (oldItemsLength) {
      const oldItemsSize = this.recalculateAverage.oldItems.reduce((acc, item) => acc + item.size, 0);
      const newItemsSize = this.recalculateAverage.oldItems.reduce((acc, item) => acc + (item.newSize as number), 0);
      const averageSize = this.averageSizeFloat || 0;
      this.averageSizeFloat = averageSize - (oldItemsSize - newItemsSize) / (this.items.size - newItemsLength);
    }
    if (newItemsLength) {
      const newItemsSize = this.recalculateAverage.newItems.reduce((acc, item) => acc + item.size, 0);
      const averageSize = this.averageSizeFloat || 0;
      const averageSizeLength = this.items.size - newItemsLength;
      this.averageSizeFloat = (averageSizeLength * averageSize + newItemsSize) / this.items.size;
    }
    this.averageSize = Math.round(this.averageSizeFloat);
    this.recalculateAverage.reset();
    this.logger.log(() => `average size has been updated: ${this.averageSize}`);
    return true;
  }

  add(item: Item<Data>): ItemCache<Data> {
    let itemCache = this.get(item.$index);
    if (itemCache) {
      itemCache.data = item.data;
      if (itemCache.size !== item.size) {
        this.recalculateAverage.oldItems.push({
          $index: item.$index,
          size: itemCache.size,
          newSize: item.size
        });
        itemCache.size = item.size;
      }
    } else {
      itemCache = new ItemCache<Data>(item, this.saveData);
      this.items.set(item.$index, itemCache);
      if (this.averageSize !== itemCache.size) {
        this.recalculateAverage.newItems.push({ $index: item.$index, size: itemCache.size });
      }
    }
    if (item.$index < this.minIndex) {
      this.minIndex = item.$index;
    }
    if (item.$index > this.maxIndex) {
      this.maxIndex = item.$index;
    }
    return itemCache;
  }

  getItemSize(index: number): number {
    const item = this.get(index);
    return item ? item.size : 0;
  }

  get(index: number): ItemCache<Data> | undefined {
    return this.items.get(index);
  }

  get size(): number {
    return this.items.size;
  }

  removeItems(toRemove: number[], immutableTop: boolean): void {
    const items = new Map<number, ItemCache<Data>>();
    let min = Infinity, max = -Infinity;
    this.items.forEach(item => {
      if (toRemove.some(index => index === item.$index)) {
        return;
      }
      const diff = immutableTop
        ? toRemove.reduce((acc, index) => acc - (item.$index > index ? 1 : 0), 0)
        : toRemove.reduce((acc, index) => acc + (item.$index < index ? 1 : 0), 0);
      item.changeIndex(item.$index + diff);
      items.set(item.$index, item);
      min = item.$index < min ? item.$index : min;
      max = item.$index > max ? item.$index : max;
    });
    this.items = items;
    this.minIndex = min;
    this.maxIndex = max;
  }

  insertItems(index: number, count: number, immutableTop: boolean): void {
    // we do not insert new items here, we just shift indexes of the existed items
    // new items adding must be performed via Cache.add
    const items = new Map<number, ItemCache<Data>>();
    this.items.forEach(item => {
      const { $index } = item;
      if ($index < index) {
        if (!immutableTop) {
          item.changeIndex($index - count);
        }
        items.set(item.$index, item);
      } else {
        if (immutableTop) {
          item.changeIndex($index + count);
        }
        items.set(item.$index, item);
      }
      if (item.$index < this.minIndex) {
        this.minIndex = item.$index;
      }
      if (item.$index > this.maxIndex) {
        this.maxIndex = item.$index;
      }
    });
    this.items = items;
  }

  updateSubset(before: Item<Data>[], after: Item<Data>[], fixRight?: boolean): void {
    if (!this.size || !before.length) {
      return;
    }
    const minB = before[0].$index, maxB = before[before.length - 1].$index;
    let minDiff: number, maxDiff: number;
    if (after.length) {
      const minA = after[0].$index, maxA = after[after.length - 1].$index;
      minDiff = minA - minB;
      maxDiff = maxA - maxB;
    } else {
      minDiff = fixRight ? maxB - minB + 1 : 0;
      maxDiff = fixRight ? 0 : minB - maxB - 1;
    }
    const items = new Map<number, ItemCache<Data>>();
    this.items.forEach(item => {
      if (item.$index < minB) { // items before subset
        item.changeIndex(item.$index + minDiff);
        items.set(item.$index, item);
        return;
      } else if (item.$index > maxB) { // items after subset
        item.changeIndex(item.$index + maxDiff);
        items.set(item.$index, item);
        return;
      }
    });
    after.forEach(item => // subset items
      items.set(item.$index, new ItemCache<Data>(item, this.saveData))
    );
    this.items = items;
    // todo: set min/max indexes
    // todo: calculate average size from scratch
  }
}
