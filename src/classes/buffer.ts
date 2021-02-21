import { Cache } from './cache';
import { Item } from './item';
import { Settings } from './settings';
import { Logger } from './logger';
import { Reactive } from './reactive';
import { Direction } from '../inputs/index';
import { OnDataChanged, BufferUpdater } from '../interfaces/index';

export class Buffer<Data> {

  private _items: Item<Data>[] = [];
  private _absMinIndex: number;
  private _absMaxIndex: number;
  bof: Reactive<boolean>;
  eof: Reactive<boolean>;

  changeItems: OnDataChanged<Data>;
  minIndexUser: number;
  maxIndexUser: number;
  startIndexUser: number;
  startIndex: number;

  private pristine: boolean;
  private cache: Cache<Data>;
  readonly logger: Logger;

  constructor(settings: Settings, onDataChanged: OnDataChanged<Data>, logger: Logger) {
    this.logger = logger;
    this.changeItems = onDataChanged;
    this.bof = new Reactive<boolean>(false);
    this.eof = new Reactive<boolean>(false);
    this.cache = new Cache<Data>(settings.itemSize, settings.cacheData, settings.cacheOnReload, logger);
    this.startIndexUser = settings.startIndex;
    this.minIndexUser = settings.minIndex;
    this.maxIndexUser = settings.maxIndex;
    this.reset(true);
  }

  dispose(): void {
    this.bof.dispose();
    this.eof.dispose();
  }

  reset(force: boolean, startIndex?: number): void {
    this.items.forEach(item => item.hide());
    this.pristine = true;
    this.items = [];
    this.cache.reset(force);
    this.absMinIndex = this.minIndexUser;
    this.absMaxIndex = this.maxIndexUser;
    this.setCurrentStartIndex(startIndex);
    this.bof.set(false);
    this.eof.set(false);
    this.pristine = false;
  }

  setCurrentStartIndex(newStartIndex?: unknown): void {
    const min = this.minIndexUser;
    const max = this.maxIndexUser;
    const start = this.startIndexUser;
    let index = Number(newStartIndex);
    if (Number.isNaN(index)) {
      this.logger.log(() => `fallback startIndex to settings.startIndex (${start})`);
      index = start;
    }
    if (index < min) {
      this.logger.log(() => `setting startIndex to settings.minIndex (${min}) because ${index} < ${min}`);
      index = min;
    }
    if (index > max) {
      this.logger.log(() => `setting startIndex to settings.maxIndex (${max}) because ${index} > ${max}`);
      index = max;
    }
    this.startIndex = index;
  }

  set items(items: Item<Data>[]) {
    this._items = items;
    this.changeItems(items);
    if (!this.pristine) {
      this.checkBOF();
      this.checkEOF();
    }
  }

  get items(): Item<Data>[] {
    return this._items;
  }

  set absMinIndex(value: number) {
    if (this._absMinIndex !== value) {
      this._absMinIndex = value;
    }
    if (!this.pristine) {
      this.checkBOF();
    }
  }

  get absMinIndex(): number {
    return this._absMinIndex;
  }

  set absMaxIndex(value: number) {
    if (this._absMaxIndex !== value) {
      this._absMaxIndex = value;
    }
    if (!this.pristine) {
      this.checkEOF();
    }
  }

  get absMaxIndex(): number {
    return this._absMaxIndex;
  }

  private checkBOF() {
    // since bof has no setter, need to call checkBOF() on items and absMinIndex change
    const bof = this.items.length
      ? (this.items[0].$index === this.absMinIndex)
      : isFinite(this.absMinIndex);
    this.bof.set(bof);
  }

  private checkEOF() {
    // since eof has no setter, need to call checkEOF() on items and absMaxIndex change
    const eof = this.items.length
      ? (this.items[this.items.length - 1].$index === this.absMaxIndex)
      : isFinite(this.absMaxIndex);
    this.eof.set(eof);
  }

  get size(): number {
    return this._items.length;
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  get averageSize(): number {
    return this.cache.averageSize;
  }

  get hasItemSize(): boolean {
    return this.averageSize > 0;
  }

  get minIndex(): number {
    return isFinite(this.cache.minIndex) ? this.cache.minIndex : this.startIndex;
  }

  get maxIndex(): number {
    return isFinite(this.cache.maxIndex) ? this.cache.maxIndex : this.startIndex;
  }

  get firstIndex(): number {
    return this.items.length ? this.items[0].$index : NaN;
  }

  get lastIndex(): number {
    return this.items.length ? this.items[this.items.length - 1].$index : NaN;
  }

  get finiteAbsMinIndex(): number {
    return isFinite(this.absMinIndex) ? this.absMinIndex : this.minIndex;
  }

  get finiteAbsMaxIndex(): number {
    return isFinite(this.absMaxIndex) ? this.absMaxIndex : this.maxIndex;
  }

  get($index: number): Item<Data> | undefined {
    return this.items.find(item => item.$index === $index);
  }

  setItems(items: Item<Data>[]): boolean {
    if (!this.items.length) {
      this.items = [...items];
    } else if (this.items[0].$index > items[items.length - 1].$index) {
      this.items = [...items, ...this.items];
    } else if (items[0].$index > this.items[this.items.length - 1].$index) {
      this.items = [...this.items, ...items];
    } else {
      return false;
    }
    return true;
  }

  clip(): void {
    this.items = this.items.filter(({ toRemove }) => !toRemove);
  }

  append(items: Item<Data>[]): void {
    this.items = [...this.items, ...items];
  }

  prepend(items: Item<Data>[]): void {
    this.items = [...items, ...this.items];
  }

  private shiftExtremum(amount: number, fixLeft: boolean) {
    if (fixLeft) {
      this.absMaxIndex += amount;
    } else {
      this.absMinIndex -= amount;
      this.startIndex -= amount;
    }
  }

  removeItems(indexes: number[], immutableTop: boolean, virtual = false): void {
    const result: Item<Data>[] = [];
    const toRemove: number[] = virtual ? indexes : [];
    const length = this.items.length;
    let shifted = false;
    for (
      let i = immutableTop ? 0 : length - 1;
      immutableTop ? i < length : i >= 0;
      immutableTop ? i++ : i--
    ) {
      const item = this.items[i];
      if (!virtual && indexes.indexOf(item.$index) >= 0) {
        toRemove.push(item.$index);
        continue;
      }
      const diff = toRemove.reduce((acc, index) => acc + (immutableTop
        ? (item.$index > index ? -1 : 0)
        : (item.$index < index ? 1 : 0)
      ), 0);
      shifted = shifted || !!diff;
      item.updateIndex(item.$index + diff);
      if (!virtual) {
        if (immutableTop) {
          result.push(item);
        } else {
          result.unshift(item);
        }
      }
    }
    this.shiftExtremum(-toRemove.length, immutableTop);
    if (!virtual) {
      this.items = result;
    } else if (shifted) {
      this.items = [...this.items];
    }
    this.cache.removeItems(toRemove, immutableTop);
  }

  insertItems(items: Item<Data>[], from: Item<Data>, addition: number, immutableTop: boolean): void {
    const count = items.length;
    const index = this.items.indexOf(from) + addition;
    const itemsBefore = this.items.slice(0, index);
    const itemsAfter = this.items.slice(index);
    if (immutableTop) {
      itemsAfter.forEach(item => item.updateIndex(item.$index + count));
    } else {
      itemsBefore.forEach(item => item.updateIndex(item.$index - count));
    }
    const result = [
      ...itemsBefore,
      ...items,
      ...itemsAfter
    ];
    this.shiftExtremum(count, immutableTop);
    this.items = result;
    this.cache.insertItems(from.$index + addition, count, immutableTop);
  }

  updateItems(
    predicate: BufferUpdater<Data>, generator: (index: number, data: Data) => Item<Data>, fixRight?: boolean
  ): void {
    if (!this.size || isNaN(this.firstIndex)) {
      return;
    }
    let index = fixRight ? this.lastIndex : this.firstIndex;
    const items: Item<Data>[] = [];
    const diff = fixRight ? -1 : 1;
    const original = [...this.items];
    (fixRight ? this.items.reverse() : this.items).forEach(item => {
      const result = predicate(item);
      // falsy or empty array -> delete
      if (!result || (Array.isArray(result) && !result.length)) {
        item.toRemove = true;
        this.shiftExtremum(-1, !fixRight);
        return;
      }
      // truthy but not array -> pass
      if (!Array.isArray(result)) {
        item.updateIndex(index);
        items.push(item);
        index += diff;
        return;
      }
      // non-empty array -> insert
      let toRemove = true;
      (fixRight ? [...result].reverse() : result).forEach((data, i) => {
        let newItem: Item<Data>;
        if (item.data === data) {
          item.updateIndex(index + i * diff);
          newItem = item;
          toRemove = false;
        } else {
          newItem = generator(index + i * diff, data);
        }
        items.push(newItem);
      });
      item.toRemove = toRemove;
      index += diff * result.length;
      if (result.length > 1) {
        this.shiftExtremum(result.length - 1, !fixRight);
      }
    });
    const after = fixRight ? items.reverse() : items;
    this.items = after;
    this.cache.updateSubset(original, after, fixRight);
  }

  cacheItem(item: Item<Data>): void {
    this.cache.add(item);
  }

  getFirstVisibleItemIndex(): number {
    const length = this.items.length;
    for (let i = 0; i < length; i++) {
      if (!this.items[i].invisible) {
        return i;
      }
    }
    return -1;
  }

  getLastVisibleItemIndex(): number {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (!this.items[i].invisible) {
        return i;
      }
    }
    return -1;
  }

  getFirstVisibleItem(): Item<Data> | undefined {
    const index = this.getFirstVisibleItemIndex();
    if (index >= 0) {
      return this.items[index];
    }
  }

  getLastVisibleItem(): Item<Data> | undefined {
    const index = this.getLastVisibleItemIndex();
    if (index >= 0) {
      return this.items[index];
    }
  }

  getEdgeVisibleItem(direction: Direction, opposite?: boolean): Item<Data> | undefined {
    return direction === (!opposite ? Direction.forward : Direction.backward) ?
      this.getLastVisibleItem() : this.getFirstVisibleItem();
  }

  getVisibleItemsCount(): number {
    return this.items.reduce((acc: number, item) => acc + (item.invisible ? 0 : 1), 0);
  }

  getSizeByIndex(index: number): number {
    const item = this.cache.get(index);
    return item ? item.size : this.averageSize;
  }

  checkAverageSize(): boolean {
    return this.cache.recalculateAverageSize();
  }

  getIndexToAppend(eof?: boolean): number {
    return (!eof
      ? (this.size ? this.items[this.size - 1].$index : this.maxIndex)
      : this.absMaxIndex
    ) + (this.size ? 1 : 0);
  }

  getIndexToPrepend(bof?: boolean): number {
    return (!bof
      ? (this.size ? this.items[0].$index : this.minIndex)
      : this.absMinIndex
    ) - (this.size ? 1 : 0);
  }

  getIndexToAdd(eof: boolean, prepend: boolean): number {
    return prepend ? this.getIndexToPrepend(eof) : this.getIndexToAppend(eof);
  }

}
