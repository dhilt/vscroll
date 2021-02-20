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
  size: number;
  newSize?: number;
}

export class RecalculateAverage {
  newItems: ItemSize[];
  oldItems: ItemSize[];
  removed: ItemSize[];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.newItems = [];
    this.oldItems = [];
    this.removed = [];
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
  readonly cacheOnReload: boolean;

  constructor(itemSize: number, saveData: boolean, cacheOnReload: boolean, logger: Logger) {
    this.averageSizeFloat = itemSize;
    this.averageSize = itemSize;
    this.itemSize = itemSize;
    this.saveData = saveData;
    this.cacheOnReload = cacheOnReload;
    this.items = new Map<number, ItemCache<Data>>();
    this.recalculateAverage = new RecalculateAverage();
    this.logger = logger;
    this.reset(true);
  }

  reset(force: boolean): void {
    if (force || !this.cacheOnReload) {
      this.minIndex = +Infinity;
      this.maxIndex = -Infinity;
      this.items.clear();
      this.averageSizeFloat = this.itemSize;
      this.averageSize = this.itemSize;
    }
    this.recalculateAverage.reset();
  }

  recalculateAverageSize(): boolean {
    const { oldItems, newItems, removed } = this.recalculateAverage;
    if (!oldItems.length && !newItems.length && !removed.length) {
      return false;
    }
    const length = this.items.size;
    if (oldItems.length) {
      const oldSize = this.recalculateAverage.oldItems.reduce((acc, item) => acc + item.size, 0);
      const newSize = this.recalculateAverage.oldItems.reduce((acc, item) => acc + (item.newSize as number), 0);
      const averageSize = this.averageSizeFloat || 0;
      this.averageSizeFloat = averageSize - (oldSize - newSize) / (length - newItems.length);
    }
    if (newItems.length) {
      const newSize = this.recalculateAverage.newItems.reduce((acc, item) => acc + item.size, 0);
      const averageSize = this.averageSizeFloat || 0;
      this.averageSizeFloat = ((length - newItems.length) * averageSize + newSize) / length;
    }
    if (removed.length) {
      const removedSize = this.recalculateAverage.removed.reduce((acc, item) => acc + item.size, 0);
      const averageSize = this.averageSizeFloat || 0;
      this.averageSizeFloat = ((length + removed.length) * averageSize - removedSize) / length;
    }
    this.averageSize = Math.round(this.averageSizeFloat);
    this.recalculateAverage.reset();
    this.logger.log(() => `average size has been updated: ${this.averageSize}`);
    return true;
  }

  add(item: Item<Data>): ItemCache<Data> {
    let itemCache = this.get(item.$index);
    if (itemCache) {
      if (this.saveData) {
        itemCache.data = item.data;
      }
      if (itemCache.size !== item.size) {
        if (itemCache.size !== void 0) {
          this.recalculateAverage.oldItems.push({
            size: itemCache.size,
            newSize: item.size
          });
        }
        itemCache.size = item.size;
      }
    } else {
      itemCache = new ItemCache<Data>(item, this.saveData);
      this.items.set(item.$index, itemCache);
      if (this.averageSize !== itemCache.size) {
        this.recalculateAverage.newItems.push({ size: itemCache.size });
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

  /**
   * Removes items from Set, shifts indexes of items that remain.
   *
   * @param {number[]} toRemove List of indexes to be removed.
   * @param {boolean} fixLeft Defines indexes shifting strategy.
   * If true, indexes that are greater than the removed ones will be decreased.
   * If false, indexes that are less than than the removed ones will be increased.
   */
  removeItems(toRemove: number[], fixLeft: boolean): void {
    const items = new Map<number, ItemCache<Data>>();
    let min = Infinity, max = -Infinity;
    this.items.forEach(item => {
      if (toRemove.some(index => index === item.$index)) {
        if (this.averageSize !== item.size && item.size !== void 0) {
          this.recalculateAverage.removed.push({ size: item.size });
        }
        return;
      }
      const diff = fixLeft
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

  /**
   * Prepares Set for inserting new items.
   * Does not provide the actual insertion, but shifts the indexes of existed items.
   * Insertion must be performed by Cache.add call.
   *
   * @param {number} index Index of insertion.
   * @param {number} after How many items will be inserted after the "index".
   * @param {boolean} fixLeft Defines indexes shifting strategy.
   * If true, indexes that are greater than "index" will be increased.
   * If false, indexes that are less than "index" will be decreased.
   */
  insertItems(index: number, count: number, fixLeft: boolean): void {
    const items = new Map<number, ItemCache<Data>>();
    let min = Infinity, max = -Infinity;
    this.items.forEach(item => {
      const { $index } = item;
      if ($index < index) {
        if (!fixLeft) {
          item.changeIndex($index - count);
        }
        items.set(item.$index, item);
      } else {
        if (fixLeft) {
          item.changeIndex($index + count);
        }
        items.set(item.$index, item);
      }
      min = item.$index < min ? item.$index : min;
      max = item.$index > max ? item.$index : max;
    });
    this.items = items;
    this.minIndex = min;
    this.maxIndex = max;
  }

  /**
   * Destructively updates Set (this.items) based on subset (before-after) changes.
   *
   * @param {Item<Data>[]} before Initial subset to be replaced by "after". Must be be $index-incremental.
   * @param {Item<Data>[]} after Transformed subset that replaces "before". Must be be $index-incremental.
   * Must contain at least 1 $index from "before" or be empty.
   * @param {boolean} fixRight This is to fix right indexes during subset collapsing. Acts only if "after" is empty.
   */
  updateSubset(before: Item<Data>[], after: Item<Data>[], fixRight?: boolean): void {
    if (!this.size || !before.length) {
      return;
    }
    const minB = before[0].$index, maxB = before[before.length - 1].$index;
    let leftDiff: number, rightDiff: number;
    if (after.length) {
      const minA = after[0].$index, maxA = after[after.length - 1].$index;
      leftDiff = minA - minB;
      rightDiff = maxA - maxB;
    } else {
      leftDiff = fixRight ? maxB - minB + 1 : 0;
      rightDiff = fixRight ? 0 : minB - maxB - 1;
    }
    const items = new Map<number, ItemCache<Data>>();
    this.items.forEach(item => {
      if (item.$index < minB) { // items before subset
        item.changeIndex(item.$index + leftDiff);
        items.set(item.$index, item);
        return;
      } else if (item.$index > maxB) { // items after subset
        item.changeIndex(item.$index + rightDiff);
        items.set(item.$index, item);
        return;
      }
    });
    after.forEach(item => // subset items
      items.set(item.$index, new ItemCache<Data>(item, this.saveData))
    );
    this.minIndex += leftDiff;
    this.maxIndex += rightDiff;
    this.items = items;
    // todo: calculate average size
  }
}
