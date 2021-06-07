import { DefaultSize } from './defaultSize';
import { Item } from '../item';
import { Settings } from '../settings';
import { Logger } from '../logger';
import { SizeStrategy } from '../../inputs/index';

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

export class Cache<Data = unknown> {
  minIndex: number;
  maxIndex: number;

  readonly itemSize: number;
  readonly saveData: boolean;
  readonly cacheOnReload: boolean;
  readonly sizeStrategy: SizeStrategy;
  readonly logger: Logger;
  private items: Map<number, ItemCache<Data>>;
  private defaultSize: DefaultSize;

  constructor({ itemSize, cacheData, cacheOnReload, sizeStrategy }: Settings, logger: Logger) {
    this.itemSize = itemSize;
    this.saveData = cacheData;
    this.cacheOnReload = cacheOnReload;
    this.sizeStrategy = sizeStrategy;
    this.logger = logger;
    this.items = new Map<number, ItemCache<Data>>();
    this.defaultSize = new DefaultSize(itemSize, sizeStrategy);
    this.reset(true);
  }

  reset(force: boolean): void {
    force = force || !this.cacheOnReload;
    if (force) {
      this.minIndex = +Infinity;
      this.maxIndex = -Infinity;
      this.items.clear();
    }
    this.defaultSize.reset(force);
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

  getDefaultSize(): number {
    return this.defaultSize.get();
  }

  recalculateDefaultSize(): boolean {
    if (this.defaultSize.recalculate(this.size)) {
      this.logger.log(() => `default size has been updated: ${this.defaultSize.get()}`);
      return true;
    }
    return false;
  }

  /**
   * Adds item to Set by $index, replaces existed item if $index matches.
   * Maintains min/max indexes and default item size.
   *
   * @param {Item<Data>} item A Buffer item to be cached, an objects with { $index, data, size } props.
   * 
   * @returns {ItemCache<Data>} Cached item.
   */
  add(item: Item<Data>): ItemCache<Data> {
    let itemCache = this.get(item.$index);
    if (itemCache) { // adding item is already cached
      if (this.saveData) {
        itemCache.data = item.data;
      }
      if (itemCache.size !== item.size) { // size changes
        if (itemCache.size !== void 0) {
          this.defaultSize.setExisted(itemCache, item);
        } else {
          this.defaultSize.setNew(item);
        }
        itemCache.size = item.size;
      }
    } else {
      itemCache = new ItemCache<Data>(item, this.saveData);
      this.items.set(item.$index, itemCache);
      this.defaultSize.setNew(itemCache);
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
   * Removes items from Set, shifts $indexes of items that remain.
   * Replaces current Set with a new one with new regular $indexes.
   * Maintains min/max indexes and default item size.
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
          this.defaultSize.setRemoved(item);
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
   * Destructively updates Set based on subset (before-after) changes.
   * Replaces current Set with a new one with new regular $indexes.
   * Maintains min/max indexes. Maintains default item size on remove only.
   * Inserted and replaced items will be taken into account on Cache.add async calls after render.
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
      if (item.$index < minB) { // items to the left of the subset
        item.changeIndex(item.$index + leftDiff);
        items.set(item.$index, item);
        return;
      } else if (item.$index > maxB) { // items to the right of the subset
        item.changeIndex(item.$index + rightDiff);
        items.set(item.$index, item);
        return;
      }
    });
    after.forEach(item => // subset items
      items.set(item.$index, new ItemCache<Data>(item, this.saveData))
    );
    before.forEach(index => { // removed items immediately affect the default size
      if (!after.some(({ $index }) => index === $index) && (found = this.get(index))) {
        this.defaultSize.setRemoved(found);
      }
    });
    this.minIndex += leftDiff;
    this.maxIndex += rightDiff;
    this.items = items;
  }
}
