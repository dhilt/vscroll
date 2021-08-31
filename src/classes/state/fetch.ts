import { Item } from '../item';
import { Direction } from '../../inputs/index';

class Positions {
  startDelta: number;
  before: number;
  relative: number;
  start: number;
  end: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.startDelta = 0;
    this.before = 0;
  }
}

class First {
  index: number;
  indexBuffer: number;
  position: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.index = NaN;
    this.indexBuffer = NaN;
    this.position = NaN;
  }
}

class Last {
  index: number;
  indexBuffer: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.index = NaN;
    this.indexBuffer = NaN;
  }
}

class FirstVisible {
  index: number;
  delta: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.index = NaN;
    this.delta = 0;
  }
}

export class FetchModel {
  private _newItemsData: unknown[] | null; // there are public setter and getter

  items: Item[];
  positions: Positions;
  first: First;
  last: Last;
  hasAnotherPack: boolean;
  callCount: number;
  minIndex: number;
  firstVisible: FirstVisible;
  negativeSize: number;
  direction: Direction | null;
  cancel: (() => void) | null;

  simulate: boolean;
  isPrepend: boolean;
  isCheck: boolean;
  doRemove: boolean;

  constructor() {
    this.callCount = 0;
    this.positions = new Positions();
    this.first = new First();
    this.last = new Last();
    this.firstVisible = new FirstVisible();
    this.reset();
  }

  reset(): void {
    this._newItemsData = null;
    this.items = [];
    this.positions.reset();
    this.first.reset();
    this.last.reset();
    this.firstVisible.reset();
    this.hasAnotherPack = false;
    this.negativeSize = 0;
    this.direction = null;
    this.cancel = null;
    this.simulate = false;
    this.isPrepend = false;
    this.isCheck = false;
    this.doRemove = false;
  }

  get newItemsData(): unknown[] | null {
    return this._newItemsData;
  }

  set newItemsData(items: unknown[] | null) {
    this._newItemsData = items;
    if (items && items.length) {
      this.callCount++;
    }
  }

  get shouldFetch(): boolean {
    return !!this.count;
  }

  get hasNewItems(): boolean {
    return !!((this._newItemsData && this._newItemsData.length));
  }

  get index(): number {
    return this.first.index;
  }

  get count(): number {
    return !isNaN(this.first.index) && !isNaN(this.last.index) ? this.last.index - this.first.index + 1 : 0;
  }

  startSimulate(items: Item[]): void {
    this.simulate = true;
    this._newItemsData = items.map(item => item.data);
    this.items = items;
    this.hasAnotherPack = false;
    this.negativeSize = 0;
  }

  stopSimulate(): void {
    this.simulate = false;
    this.isPrepend = false;
    this.isCheck = false;
    this.doRemove = false;
  }

  append(items: Item[]): void {
    this.startSimulate(items);
    this.last.index = items[items.length - 1].$index;
    this.first.index = items[0].$index;
    this.direction = Direction.forward;
  }

  prepend(items: Item[]): void {
    this.startSimulate(items);
    this.last.index = items[0].$index;
    this.first.index = items[items.length - 1].$index;
    this.direction = Direction.backward;
    this.isPrepend = true;
  }

  check(items: Item[]): void {
    this.startSimulate(items);
    this.last.index = items[0].$index;
    this.first.index = items[items.length - 1].$index;
    this.isCheck = true;
  }

  remove(): void {
    this.startSimulate([]);
    this.doRemove = true;
    // firstVisibleIndex & delta should be set inside process
  }

  update(index: number, delta: number, items: Item[], itemsToRemove: Item[]): void {
    this.startSimulate(items);
    this.firstVisible.index = index;
    this.firstVisible.delta = delta;
    this.doRemove = itemsToRemove.length > 0;
  }
}
