import { DefaultSize } from './defaultSize';
import { Item } from '../item';
import { Settings } from '../settings';
import { Logger } from '../logger';
import { SizeStrategy, Direction } from '../../inputs/index';

interface ItemToCache<Data> {
  $index: number;
  data: Data;
  size?: number;
}

interface ItemUpdate {
  $index: number;
  size: number;
  toRemove?: boolean;
}

interface IndexPosition {
  index: number;
  position: number;
}

// Known sizes are summed per this many indexes, so that ranges are measured without cache scans
const BUCKET = 256;

export class ItemCache<Data = unknown> {
  $index: number;
  data: Data | null;
  size?: number;
  position: number;

  constructor(item: ItemToCache<Data>, saveData: boolean) {
    this.$index = item.$index;
    this.data = saveData ? item.data : null;
    this.size = item.size;
  }

  changeIndex(value: number): void {
    this.$index = value;
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
  private buckets: Map<number, { count: number; size: number }>;
  private defaultSize: DefaultSize;

  constructor({ itemSize, cacheData, cacheOnReload, sizeStrategy }: Settings, logger: Logger) {
    this.itemSize = itemSize;
    this.saveData = cacheData;
    this.cacheOnReload = cacheOnReload;
    this.sizeStrategy = sizeStrategy;
    this.logger = logger;
    this.items = new Map<number, ItemCache<Data>>();
    this.buckets = new Map();
    this.defaultSize = new DefaultSize(itemSize, sizeStrategy);
    this.reset(true);
  }

  reset(force: boolean): void {
    force = force || !this.cacheOnReload;
    if (force) {
      this.minIndex = +Infinity;
      this.maxIndex = -Infinity;
      this.items.clear();
      this.buckets.clear();
    }
    this.defaultSize.reset(force);
  }

  get size(): number {
    return this.items.size;
  }

  get(index: number): ItemCache<Data> | undefined {
    return this.items.get(index);
  }

  getSizeByIndex(index: number): number {
    const item = this.get(index);
    return (item && item.size) || this.defaultSize.get();
  }

  getDefaultSize(): number {
    return this.defaultSize.get();
  }

  getRangeSize(first: number, last: number): number {
    if (last < first) return 0;
    const fallback = this.defaultSize.get();
    let size = (last - first + 1) * fallback;
    const visit = (from: number, to: number) => {
      const end = Math.min(to, this.maxIndex);
      for (let index = Math.max(from, this.minIndex); index <= end; index++) {
        const item = this.items.get(index);
        if (item && item.size) {
          size += item.size - fallback;
        }
      }
    };
    // Buckets inside the range are taken by their sums, the edges item by item
    const from = Math.ceil(first / BUCKET);
    const to = Math.floor((last + 1) / BUCKET) - 1;
    if (from > to) {
      visit(first, last);
      return size;
    }
    this.buckets.forEach((bucket, key) => {
      if (key >= from && key <= to) {
        size += bucket.size - bucket.count * fallback;
      }
    });
    visit(first, from * BUCKET - 1);
    visit((to + 1) * BUCKET, last);
    return size;
  }

  getIndexAtOffset(origin: number, offset: number): IndexPosition {
    const backward = offset < 0;
    const direction = backward ? -1 : 1;
    let index = origin;
    let position = 0;
    const advance = (size: number): IndexPosition | undefined => {
      const distance = Math.abs(offset) - position;
      if (backward ? size >= distance : size > distance) {
        const steps = backward ? Math.ceil(distance / size) : Math.floor(distance / size);
        return {
          index: index + direction * steps,
          position: direction * (position + steps * size)
        };
      }
      index += direction;
      position += size;
    };

    // Nearby positions need only Map lookups, even when the size cache is large.
    for (let step = 0; step < 32; step++) {
      const found = advance(this.getSizeByIndex(index - (backward ? 1 : 0)));
      if (found) return found;
    }
    if (!(this.defaultSize.get() > 0)) {
      return { index, position: direction * position }; // unknown spans have no size to search by
    }

    // The item at a far offset is the last one starting at or before it: bracket it, then bisect.
    const start = (target: number): number =>
      target < origin
        ? -this.getRangeSize(target, origin - 1)
        : this.getRangeSize(origin, target - 1);
    let [low, high] = [index, index];
    for (let step = 1; backward ? start(low) > offset : start(high) <= offset; step *= 2) {
      [low, high] = backward ? [index - step, low] : [high, index + step];
    }
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      [low, high] = start(middle) <= offset ? [middle, high] : [low, middle];
    }
    return { index: low, position: start(low) };
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
   * @returns {ItemCache<Data>} Cached item.
   */
  add(item: Item<Data>): ItemCache<Data> {
    let itemCache = this.get(item.$index);
    if (itemCache) {
      // adding item is already cached
      if (this.saveData) {
        itemCache.data = item.data;
      }
      if (itemCache.size !== item.size) {
        if (itemCache.size) {
          this.defaultSize.setExisted(itemCache.size, item.size);
        } else {
          this.defaultSize.setNew(item.size);
        }
        this.countSize(item.$index, itemCache.size, -1);
        itemCache.size = item.size;
        this.countSize(item.$index, itemCache.size, 1);
      }
    } else {
      itemCache = new ItemCache<Data>(item, this.saveData);
      this.items.set(item.$index, itemCache);
      this.countSize(item.$index, itemCache.size, 1);
      this.defaultSize.setNew(item.size);
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
   * Inserts items to Set, shifts $indexes of items that remain.
   * Replaces current Set with a new one with new regular $indexes.
   * Maintains min/max indexes.
   *
   * @param {Data[]} toInsert List of non-indexed items to be inserted.
   * @param {number} index The index before/after which the insertion is performed.
   * @param {Direction} direction Determines the direction of insertion.
   * @param {boolean} fixRight Defines indexes shifting strategy.
   * If false, indexes that are greater than the inserted ones are increased.
   * If true, indexes that are less than than the inserted ones are decreased.
   */
  insertItems(toInsert: Data[], index: number, direction: Direction, fixRight: boolean): void {
    const items = new Map<number, ItemCache<Data>>();
    const length = toInsert.length;
    let min = Infinity,
      max = -Infinity;
    const set = (item: ItemCache<Data>) => {
      items.set(item.$index, item);
      min = item.$index < min ? item.$index : min;
      max = item.$index > max ? item.$index : max;
    };
    this.items.forEach(item => {
      let shift = 0;
      if (direction === Direction.backward) {
        if (item.$index < index && fixRight) {
          shift = -length;
        } else if (item.$index >= index && !fixRight) {
          shift = length;
        }
      } else if (direction === Direction.forward) {
        if (item.$index <= index && fixRight) {
          shift = -length;
        } else if (item.$index > index && !fixRight) {
          shift = length;
        }
      }
      if (shift) {
        item.changeIndex(item.$index + shift);
      }
      set(item);
    });
    if (this.saveData) {
      // persist data with no sizes
      toInsert.forEach((data, i) => {
        const $index =
          index + i - (fixRight ? length : 0) + (direction === Direction.forward ? 1 : 0);
        const item = new ItemCache<Data>({ $index, data }, this.saveData);
        set(item);
      });
    }
    this.items = items;
    this.minIndex = min;
    this.maxIndex = max;
    this.recountSizes();
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
    let min = Infinity,
      max = -Infinity;
    this.items.forEach(item => {
      if (toRemove.some(index => index === item.$index)) {
        if (item.size) {
          this.defaultSize.setRemoved(item.size);
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
    this.recountSizes();
  }

  /**
   * Destructively updates Set based on subset (before-after) changes.
   * Replaces current Set with a new one with new regular $indexes.
   * Maintains min/max indexes. Maintains default item size on remove only.
   *
   * @param {ItemUpdate[]} before Initial subset of items to be replaced by "after".
   * Each element is an object with { $index, size, toRemove } props. Must be $index-incremental.
   * Items to be removed must have toRemove flag: before[].toRemove = true.
   * @param {Item<Data>[]} after Transformed subset that replaces "before". Must be $index-incremental.
   * Must contain at least 1 $index from "before" or be empty.
   * @param {boolean} fixRight This is to fix right indexes during subset collapsing. Acts only if "after" is empty.
   */
  updateSubset(before: ItemUpdate[], after: Item<Data>[], fixRight?: boolean): void {
    if (!this.size || !before.length) {
      return;
    }
    const minB = before[0].$index,
      maxB = before[before.length - 1].$index;
    let leftDiff: number, rightDiff: number;
    if (after.length) {
      const minA = after[0].$index,
        maxA = after[after.length - 1].$index;
      leftDiff = minA - minB;
      rightDiff = maxA - maxB;
    } else {
      leftDiff = fixRight ? maxB - minB + 1 : 0;
      rightDiff = fixRight ? 0 : minB - maxB - 1;
    }
    const items = new Map<number, ItemCache<Data>>();
    this.items.forEach(item => {
      if (item.$index < minB) {
        // items to the left of the subset
        item.changeIndex(item.$index + leftDiff);
        items.set(item.$index, item);
        return;
      } else if (item.$index > maxB) {
        // items to the right of the subset
        item.changeIndex(item.$index + rightDiff);
        items.set(item.$index, item);
        return;
      }
    });
    after.forEach(
      (
        item // subset items
      ) => items.set(item.$index, new ItemCache<Data>(item, this.saveData))
    );
    before // to maintain default size on remove
      .filter(item => item.toRemove)
      .forEach(item => this.defaultSize.setRemoved(item.size));
    this.minIndex += leftDiff;
    this.maxIndex += rightDiff;
    this.items = items;
    this.recountSizes();
  }

  /**
   * Shifts all indexes by some value.
   * Replaces current Set with a new one with new regular $indexes.
   * Maintains min/max indexes.
   *
   * @param {number} delta A shift value.
   */
  shiftIndexes(delta: number): void {
    const items = new Map<number, ItemCache<Data>>();
    let min = Infinity,
      max = -Infinity;
    this.items.forEach(item => {
      item.changeIndex(item.$index + delta);
      items.set(item.$index, item);
      min = item.$index < min ? item.$index : min;
      max = item.$index > max ? item.$index : max;
    });
    this.items = items;
    this.minIndex = min;
    this.maxIndex = max;
    this.recountSizes();
  }

  private countSize(index: number, size: number | undefined, sign: number): void {
    if (!size) {
      return;
    }
    const key = Math.floor(index / BUCKET);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, size: 0 };
      this.buckets.set(key, bucket);
    }
    bucket.count += sign;
    bucket.size += sign * size;
    if (!bucket.count) {
      this.buckets.delete(key);
    }
  }

  private recountSizes(): void {
    this.buckets.clear();
    let key = NaN;
    let bucket = { count: 0, size: 0 };
    this.items.forEach(({ $index, size }) => {
      if (!size) {
        return;
      }
      if (Math.floor($index / BUCKET) !== key) {
        // neighboring items usually share a bucket
        key = Math.floor($index / BUCKET);
        bucket = this.buckets.get(key) || { count: 0, size: 0 };
        this.buckets.set(key, bucket);
      }
      bucket.count++;
      bucket.size += size;
    });
  }
}
