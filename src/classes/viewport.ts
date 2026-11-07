import { Paddings } from './paddings';
import { Settings } from './settings';
import { Routines } from './domRoutines';
import { Item } from './item';
import { State } from './state';
import { Logger } from './logger';
import { Direction } from '../inputs/index';

// Browsers limit element sizes (Firefox to ~17.9M px), so for a larger virtual size the paddings
// render only a part of it. Native scrolling stays 1:1 (logical = native + shift), while the native
// position is kept close to a target proportional to the virtual size, so the scrollbar reflects it.
const MAX_SIZE = 15_000_000;
const EDGE = MAX_SIZE / 100; // unscaled distance at both ends
const TOLERANCE = MAX_SIZE / 1000; // allowed deviation of the native position from the target

export class Viewport {
  offset: number;
  paddings: Paddings;
  private shift = 0; // logical scroll position minus the native one
  private excess = 0; // logical size of the paddings that is not rendered
  private nativePosition = 0; // last known native position, to tell jumps from steps
  private anchor = { native: NaN, position: NaN }; // large native positions may be rounded
  private insets = 0; // content padding and border along the scrolling axis

  readonly settings: Settings;
  readonly routines: Routines;
  readonly state: State;
  readonly logger: Logger;

  constructor(settings: Settings, routines: Routines, state: State, logger: Logger) {
    this.settings = settings;
    this.routines = routines;
    this.state = state;
    this.logger = logger;
    this.paddings = new Paddings(this.routines, settings);
  }

  reset(startIndex: number): void {
    this.setOffset();
    this.paddings.reset(this.getSize(), startIndex, this.offset);
    this.scrollPosition = this.paddings.backward.size || 0;
    this.updateInsets();
    this.state.scroll.reset();
  }

  updateInsets(): boolean {
    const insets = this.routines.getScrollerInsets();
    const changed = insets !== this.insets;
    this.insets = insets;
    return changed;
  }

  setPosition(value: number): number {
    const { shift } = this;
    this.fit(value);
    if (this.shift === shift && this.scrollPosition === value) {
      this.logger.log(() => ['setting scroll position at', value, '[cancelled]']);
      return value;
    }
    const nativeValue = value - this.shift;
    this.routines.setScrollPosition(nativeValue);
    if (Number.isInteger(nativeValue) && this.routines.getScrollPosition() < nativeValue) {
      // a rounded native position must not expose a sliver of the preceding row (Firefox)
      this.routines.setScrollPosition(nativeValue + 1);
    }
    this.nativePosition = this.routines.getScrollPosition();
    const exact = this.excess && Math.abs(this.nativePosition - nativeValue) <= 1;
    this.anchor = exact ? { native: this.nativePosition, position: value } : { native: NaN, position: NaN };
    const position = this.scrollPosition;
    this.logger.log(() => [
      'setting scroll position at',
      position,
      ...(position !== value ? [`(${value})`] : [])
    ]);
    return position;
  }

  get scrollPosition(): number {
    const native = this.routines.getScrollPosition();
    return native === this.anchor.native ? this.anchor.position : native + this.shift;
  }

  set scrollPosition(value: number) {
    this.setPosition(value);
  }

  // A native jump into the empty space is proportional to the virtual size, other moves are 1:1.
  // Each pixel of the scrollbar track moves the native position by about MAX_SIZE / viewport size,
  // far more than wheel, keyboard or touch input per frame.
  syncScrollPosition(): number {
    const native = this.routines.getScrollPosition();
    const size = this.excess && this.getSize();
    if (
      size &&
      Math.abs(native - this.nativePosition) > Math.max(size, MAX_SIZE / size / 2) &&
      !this.hasContentInView()
    ) {
      this.shift = Math.round(this.convert(native, this.getScrollableSize(), true)) - native;
      this.anchor = { native: NaN, position: NaN };
      this.renderPaddings();
    }
    this.nativePosition = native;
    return this.scrollPosition;
  }

  getSize(): number {
    return this.routines.getViewportSize();
  }

  getScrollableSize(): number {
    const { routines } = this;
    const { backward, forward } = this.paddings;
    if (this.excess) {
      // Large native offsets make rects imprecise (Firefox), so only the rendered items are measured
      const items =
        routines.getEdge(forward.element, Direction.backward) -
        routines.getEdge(backward.element, Direction.forward);
      return backward.size + Math.round(items) + forward.size + this.insets;
    }
    return (
      routines.getScrollerSize() +
      (backward.size - backward.renderedSize) +
      (forward.size - forward.renderedSize)
    );
  }

  // Rendered content keeps its logical position unless it is far from the native one, e.g. on jumps.
  renderPaddings(): void {
    const { backward, forward } = this.paddings;
    const size = backward.size + forward.size - this.excess;
    const backwardSize = Math.min(Math.max(backward.size - this.shift, 0), size);
    backward.renderedSize = backwardSize;
    forward.renderedSize = size - backwardSize;
  }

  // Updates the shift for a logical position: only if the native one deviates from the target.
  private fit(position: number): void {
    const size = this.getScrollableSize();
    this.excess = Math.max(0, size - MAX_SIZE);
    if (!this.excess) {
      this.shift = 0;
    } else {
      const target = this.convert(position, size);
      const nativeMax = this.offset + MAX_SIZE - this.getSize();
      const tolerance = Math.min(TOLERANCE, target / 2, (nativeMax - target) / 2);
      if (Math.abs(position - this.shift - target) > tolerance) {
        this.shift = Math.round(position - target);
      }
      this.shift = Math.min(Math.max(this.shift, 0), this.excess);
    }
    this.renderPaddings();
  }

  // Unscaled near both ends, proportional in between.
  private convert(value: number, size: number, toLogical = false): number {
    const start = this.offset + EDGE;
    const end = this.offset + size - this.getSize() - EDGE;
    const [from, to] = toLogical ? [end - this.excess, end] : [end, end - this.excess];
    if (value <= start) {
      return value;
    }
    if (value >= from) {
      return value - from + to;
    }
    return start + ((value - start) * (to - start)) / (from - start);
  }

  private hasContentInView(): boolean {
    const { routines, paddings } = this;
    return (
      routines.getEdge(paddings.backward.element, Direction.forward) <
        this.getEdge(Direction.forward) &&
      routines.getEdge(paddings.forward.element, Direction.backward) >
        this.getEdge(Direction.backward)
    );
  }

  getMaxScrollPosition(): number {
    return this.getScrollableSize() - this.getSize();
  }

  getBufferPadding(): number {
    return this.getSize() * this.settings.padding;
  }

  getEdge(direction: Direction): number {
    return this.routines.getViewportEdge(direction);
  }

  setOffset(): void {
    this.offset = this.routines.getOffset();
  }

  findItemElementById(id: string): HTMLElement | null {
    return this.routines.findItemElement(id);
  }

  getEdgeVisibleItem(
    items: Item[],
    direction: Direction
  ): { item?: Item; index: number; diff: number } {
    const bwd = direction === Direction.backward;
    const opposite = bwd ? Direction.forward : Direction.backward;
    const viewportEdge = this.getEdge(direction);
    let item,
      diff = 0;
    for (
      let i = bwd ? 0 : items.length - 1;
      bwd ? i <= items.length - 1 : i >= 0;
      i += bwd ? 1 : -1
    ) {
      const itemEdge = this.routines.getEdge(items[i].element as HTMLElement, opposite);
      diff = itemEdge - viewportEdge;
      if ((bwd && diff > 0) || (!bwd && diff < 0)) {
        item = items[i];
        break;
      }
    }
    return { item, index: item ? item.$index : NaN, diff };
  }
}
