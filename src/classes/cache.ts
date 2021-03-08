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

  readonly itemSize: number;
  readonly saveData: boolean;
  readonly cacheOnReload: boolean;
  readonly logger: Logger;
  private items: Map<number, ItemCache<Data>>;

  constructor(itemSize: number, saveData: boolean, cacheOnReload: boolean, logger: Logger) {
    this.itemSize = itemSize;
    this.saveData = saveData;
    this.cacheOnReload = cacheOnReload;
    this.logger = logger;
    this.averageSizeFloat = itemSize;
    this.averageSize = itemSize;
    this.recalculateAverage = new RecalculateAverage();
    this.items = new Map<number, ItemCache<Data>>();
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

  get size(): number {
    return this.items.size;
  }

  get(index: number): ItemCache<Data> | undefined {
    return this.items.get(index);
  }

  getItemSize(index: number): number {
    const item = this.get(index);
    return item ? item.size : 0;
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

  /**
   * Adds item to Set, replaces existed one if $index matches.
   * Maintains min/max indexes and average item size via recalculateAverage lists.
   *
   * @param {Item<Data>} item A Buffer item to be cached, an objects with { $index, data, size } props.
   */
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
        } else {
          this.recalculateAverage.newItems.push({ size: item.size });
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

  /**
   * Removes items from Set, shifts indexes of items that remain.
   * Maintains min/max indexes and average item size via recalculateAverage lists.
   *
   * @param {number[]} toRemove List of indexes to be removed.
   * @param {boolean} fixRight Defines indexes shifting strategy.
   * If false, indexes that are greater than the removed ones will be decreased.
   * If true, indexes that are less than than the removed ones will be increased.
   */
  removeItems(toRemove: number[], fixRight: boolean): void {
    const items = new Map<number, ItemCache<Data>>();
    let min = Infinity, max = -Infinity;
    this.items.forEach(item => {
      if (toRemove.some(index => index === item.$index)) {
        if (this.averageSize !== item.size && item.size !== void 0) {
          this.recalculateAverage.removed.push({ size: item.size });
        }
        return;
      }
      const diff = fixRight
        ? toRemove.reduce((acc, index) => acc + (item.$index < index ? 1 : 0), 0)
        : toRemove.reduce((acc, index) => acc - (item.$index > index ? 1 : 0), 0);
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
   * Destructively updates cache items Set based on subset (before-after) changes.
   * Maintains min/max indexes and average item size via recalculateAverage lists.
   * Only removed items participate in recalculateAverage.
   * Inserted and replaced items will be taken into account on Cache.set async calls.
   *
   * @param {number[]} before Initial subset of indexes to be replaced by "after". Must be incremental.
   * @param {Item<Data>[]} after Transformed subset that replaces "before". Must be be $index-incremental.
   * Must contain at least 1 $index from "before" or be empty.
   * @param {boolean} fixRight This is to fix right indexes during subset collapsing. Acts only if "after" is empty.
   */
  updateSubset(before: number[], after: Item<Data>[], fixRight?: boolean): void {
    if (!this.size || !before.length) {
      return;
    }
    const minB = before[0], maxB = before[before.length - 1];
    let leftDiff: number, rightDiff: number, found;
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
    before.forEach(index => { // push removed items to recalculateAverage.removed
      if (!after.some(({ $index }) => index === $index) && (found = this.get(index))) {
        this.recalculateAverage.removed.push({ size: found.size });
      }
    });
    this.minIndex += leftDiff;
    this.maxIndex += rightDiff;
    this.items = items;
  }
}
