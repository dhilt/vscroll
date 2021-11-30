import { Paddings } from './paddings';
import { Settings } from './settings';
import { Routines } from './domRoutines';
import { Item } from './item';
import { State } from './state';
import { Logger } from './logger';
import { Direction } from '../inputs/index';

export class Viewport {

  offset: number;
  paddings: Paddings;

  readonly element: HTMLElement;
  readonly settings: Settings;
  readonly routines: Routines;
  readonly state: State;
  readonly logger: Logger;

  readonly hostElement: HTMLElement;
  readonly scrollEventReceiver: HTMLElement | Window;

  constructor(element: HTMLElement, settings: Settings, routines: Routines, state: State, logger: Logger) {
    this.element = element;
    this.settings = settings;
    this.routines = routines;
    this.state = state;
    this.logger = logger;

    this.hostElement = this.routines.getHostElement(this.element);
    this.scrollEventReceiver = this.routines.getScrollEventReceiver(this.element);

    if (settings.windowViewport) {
      this.routines.setupScrollRestoration();
    }
    if (settings.dismissOverflowAnchor) {
      this.routines.dismissOverflowAnchor(this.hostElement);
    }

    this.paddings = new Paddings(this.element, this.routines, settings);
  }

  reset(startIndex: number): void {
    this.setOffset();
    this.paddings.reset(this.getSize(), startIndex, this.offset);
    this.scrollPosition = this.paddings.backward.size || 0;
    this.state.scroll.reset();
  }

  setPosition(value: number): number {
    const oldPosition = this.scrollPosition;
    if (oldPosition === value) {
      this.logger.log(() => ['setting scroll position at', value, '[cancelled]']);
      return value;
    }
    this.routines.setScrollPosition(this.hostElement, value);
    const position = this.scrollPosition;
    this.logger.log(() => [
      'setting scroll position at', position, ...(position !== value ? [`(${value})`] : [])
    ]);
    return position;
  }

  get scrollPosition(): number {
    return this.routines.getScrollPosition(this.hostElement);
  }

  set scrollPosition(value: number) {
    this.setPosition(value);
  }

  getSize(): number {
    return this.routines.getSize(this.hostElement, true);
  }

  getScrollableSize(): number {
    return this.routines.getSize(this.element);
  }

  getMaxScrollPosition(): number {
    return this.getScrollableSize() - this.getSize();
  }

  getBufferPadding(): number {
    return this.getSize() * this.settings.padding;
  }

  getEdge(direction: Direction): number {
    return this.routines.getEdge(this.hostElement, direction, true);
  }

  setOffset(): void {
    this.offset = this.routines.getOffset(this.element);
    if (!this.settings.windowViewport) {
      this.offset -= this.routines.getOffset(this.hostElement);
    }
  }

  findItemElementById(id: string): HTMLElement | null {
    return this.routines.findItemElement(this.element, id);
  }

  getEdgeVisibleItem(items: Item[], direction: Direction): { item?: Item, index: number, diff: number } {
    const bwd = direction === Direction.backward;
    const opposite = bwd ? Direction.forward : Direction.backward;
    const viewportEdge = this.getEdge(direction);
    let item, diff = 0;
    for (
      let i = bwd ? 0 : items.length - 1;
      bwd ? i <= items.length - 1 : i >= 0;
      i += bwd ? 1 : -1
    ) {
      const itemEdge = this.routines.getEdge(items[i].element, opposite);
      diff = itemEdge - viewportEdge;
      if (bwd && diff > 0 || !bwd && diff < 0) {
        item = items[i];
        break;
      }
    }
    return { item, index: item ? item.$index : NaN, diff };
  }

}
