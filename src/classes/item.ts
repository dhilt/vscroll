import { Routines } from './domRoutines';
import { Direction } from '../inputs/index';
import { Item as _Item, ItemAdapter } from '../interfaces/index';

export class Item<Data = unknown> implements _Item<Data> {
  nodeId: string;
  routines: Routines;
  preSize: number; // estimated size
  size: number; // real size
  invisible: boolean;
  toRemove: boolean;
  toInsert: boolean;
  removeDirection: Direction;

  private container: ItemAdapter<Data>;

  get $index(): number {
    return this.container.$index;
  }
  set $index(value: number) {
    this.container.$index = value;
  }

  get data(): Data {
    return this.container.data;
  }
  set data(value: Data) {
    this.container.data = value;
  }

  get element(): HTMLElement {
    return this.container.element as HTMLElement;
  }
  set element(value: HTMLElement) {
    this.container.element = value;
  }

  constructor($index: number, data: Data, routines: Routines) {
    this.container = {
      $index,
      data
    };
    this.nodeId = String($index);
    this.routines = routines;
    this.invisible = true;
    this.toRemove = false;
    this.toInsert = false;
  }

  dispose(): void {
    delete this.container.element;
  }

  setSize(preSize = 0): void {
    this.preSize = preSize;
    this.size = this.routines.getSize(this.element);
  }

  hide(): void {
    if (this.element) {
      this.routines.hideElement(this.element);
    }
  }

  scrollTo(argument?: boolean | ScrollIntoViewOptions): void {
    if (this.element) {
      this.routines.scrollTo(this.element, argument);
    }
  }

  updateIndex(index: number): void {
    this.$index = index;
    this.nodeId = String(index);
  }

  get(): ItemAdapter<Data> {
    return this.container;
  }
}
