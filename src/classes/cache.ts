import { Item } from './item';
import { Settings } from './settings';
import { Logger } from './logger';
import { SizeStrategy } from '../inputs/index';

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

export class SizesRecalculation {
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
  frequentSize: number;
  minIndex: number;
  maxIndex: number;
  recalculateAverage: SizesRecalculation;
  recalculateFrequent: SizesRecalculation;

  readonly itemSize: number;
  readonly saveData: boolean;
  readonly cacheOnReload: boolean;
  readonly sizeStrategy: SizeStrategy;
  readonly logger: Logger;
  private items: Map<number, ItemCache<Data>>;
  private sizeMap: Map<number, number>;

  constructor({ itemSize, cacheData, cacheOnReload, sizeStrategy }: Settings, logger: Logger) {
    this.itemSize = itemSize;
    this.saveData = cacheData;
    this.cacheOnReload = cacheOnReload;
    this.sizeStrategy = sizeStrategy;
    this.logger = logger;
    this.recalculateAverage = new SizesRecalculation();
    this.recalculateFrequent = new SizesRecalculation();
    this.items = new Map<number, ItemCache<Data>>();
    this.sizeMap = new Map<number, number>();
    this.reset(true);
  }

  reset(force: boolean): void {
    if (force || !this.cacheOnReload) {
      this.minIndex = +Infinity;
      this.maxIndex = -Infinity;
      this.items.clear();
      this.sizeMap.clear();
      this.averageSizeFloat = this.itemSize;
      this.averageSize = this.itemSize;
      this.frequentSize = this.itemSize;
    }
    this.recalculateAverage.reset();
    this.recalculateFrequent.reset();
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

  recalculateAverageSize(): void {
    const { oldItems, newItems, removed } = this.recalculateAverage;
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
  }

  recalculateFrequentSize(): void {
    const { oldItems, newItems, removed } = this.recalculateFrequent;
    const oldFrequentSizeCount = this.sizeMap.get(this.frequentSize);
    if (newItems.length) {
      newItems.forEach(({ size }) => this.sizeMap.set(size, (this.sizeMap.get(size) || 0) + 1));
    }
    if (oldItems.length) {
      oldItems.forEach(({ size }) => this.sizeMap.set(size, Math.max((this.sizeMap.get(size) || 0) - 1, 0)));
      oldItems.forEach(({ newSize: s }) => this.sizeMap.set(s as number, (this.sizeMap.get(s as number) || 0) + 1));
    }
    if (removed.length) {
      removed.forEach(({ size }) => this.sizeMap.set(size, Math.max((this.sizeMap.get(size) || 0) - 1, 0)));
    }
    const sorted = [...this.sizeMap.entries()].sort((a, b) => b[1] - a[1]);
    const mostFrequentCount = sorted[0][1];
    const listEqual = sorted.filter(i => i[1] === mostFrequentCount);
    if (listEqual.length > 1 && listEqual.find(i => i[0] === oldFrequentSizeCount)) {
      // if there are more than 1 most frequent sizes, but the old one is present
      return;
    }
    this.frequentSize = sorted[0][0];
  }

  recalculateDefaultSize(): boolean {
    const { oldItems, newItems, removed } = this.sizesRecalculation;
    if (!oldItems.length && !newItems.length && !removed.length) {
      return false;
    }
    if (this.sizeStrategy === SizeStrategy.Average) {
      this.recalculateAverageSize();
    } else {
      this.recalculateFrequentSize();
    }
    this.sizesRecalculation.reset();
    this.logger.log(() => `default size has been updated: ${this.defaultSize}`);
    return true;
  }

  get defaultSize(): number {
    if (this.sizeStrategy === SizeStrategy.Average) {
      return this.averageSize;
    }
    return this.frequentSize;
  }

  get sizesRecalculation(): SizesRecalculation {
    if (this.sizeStrategy === SizeStrategy.Average) {
      return this.recalculateAverage;
    }
    return this.recalculateFrequent;
  }

  /**
   * Adds item to Set, replaces existed one if $index matches.
   * Maintains min/max indexes and average/frequent item size.
   *
   * @param {Item<Data>} item A Buffer item to be cached, an objects with { $index, data, size } props.
   */
  add(item: Item<Data>): ItemCache<Data> {
    let itemCache = this.get(item.$index);
    if (itemCache) { // adding item is already cached
      if (this.saveData) {
        itemCache.data = item.data;
      }
      if (itemCache.size !== item.size) { // size changes
        if (itemCache.size !== void 0) {
          this.sizesRecalculation.oldItems.push({
            size: itemCache.size,
            newSize: item.size
          });
        } else {
          this.sizesRecalculation.newItems.push({ size: item.size });
        }
        itemCache.size = item.size;
      }
    } else {
      itemCache = new ItemCache<Data>(item, this.saveData);
      this.items.set(item.$index, itemCache);
      this.sizesRecalculation.newItems.push({ size: itemCache.size });
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
   * Maintains min/max indexes and average/frequent item size.
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
        if (item.size !== void 0) {
          this.sizesRecalculation.removed.push({ size: item.size });
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
   * Maintains min/max indexes. Maintains average/frequent item size on remove.
   * Inserted and replaced items will be taken into account on Cache.set async calls after render.
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
    before.forEach(index => { // removed items immediately affect average/frequent size
      if (!after.some(({ $index }) => index === $index) && (found = this.get(index))) {
        this.sizesRecalculation.removed.push({ size: found.size });
      }
    });
    this.minIndex += leftDiff;
    this.maxIndex += rightDiff;
    this.items = items;
  }
}
