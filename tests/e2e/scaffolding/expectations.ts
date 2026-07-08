import { Direction } from './vscroll';
import { TestHost } from './TestHost';
import type { TestItem } from '../types';

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Assertions over a TestHost's state, reached via `misc.expect`. */
export class Expectations<Data extends TestItem> {
  constructor(private readonly host: TestHost<Data>) {}

  /** DOM padding elements render exactly the model's padding sizes. */
  paddingsReflectModel(): void {
    const { host } = this;
    const domSize = (direction: Direction): number => {
      const element = host.contentElement.querySelector(
        `[data-padding-${direction}]`
      ) as HTMLElement | null;
      const rect = element?.getBoundingClientRect();
      return rect ? (host.horizontal ? rect.width : rect.height) : NaN;
    };
    const { paddings } = host.scroller.viewport;
    expect(domSize(Direction.backward)).toBe(paddings.backward.size);
    expect(domSize(Direction.forward)).toBe(paddings.forward.size);
  }

  /** DOM and Buffer contain the same contiguous indexed items. */
  domIndexesMatchBuffer(): void {
    const { host } = this;
    const domIndexes = host.getElements().map(el => host.getElementIndex(el));
    const bufferIndexes = host.scroller.buffer.items.map(item => item.$index);

    expect(domIndexes).toEqual(bufferIndexes);
    this.paddingsReflectModel();

    if (!bufferIndexes.length) {
      return;
    }
    const { firstIndex, lastIndex } = host.adapter.bufferInfo;
    expect(bufferIndexes).toEqual(range(firstIndex, lastIndex));
  }

  /** Also verifies the standard test datasource content for every item. */
  domMatchesBuffer(): void {
    const { host } = this;
    this.domIndexesMatchBuffer();
    host
      .getElements()
      .map(el => host.getElementIndex(el))
      .forEach(index =>
        expect(host.checkElementContentByIndex(index)).toBe(true)
      );
  }

  /** Bounded-side paddings for uniform-size data. */
  uniformPaddings(): void {
    const { host } = this;
    if (!host.scroller.buffer.items.length) {
      return;
    }
    const { firstIndex, lastIndex, absMinIndex, absMaxIndex } =
      host.adapter.bufferInfo;
    const size = host.scroller.buffer.defaultSize;

    if (Number.isFinite(absMinIndex)) {
      expect(host.padding[Direction.backward].getSize()).toBe(
        (firstIndex - absMinIndex) * size
      );
    }
    if (Number.isFinite(absMaxIndex)) {
      expect(host.padding[Direction.forward].getSize()).toBe(
        (absMaxIndex - lastIndex) * size
      );
    }
  }

  consistent(): void {
    this.domMatchesBuffer();
    this.uniformPaddings();
  }

  startVisible(startIndex: number): void {
    const { host } = this;
    expect(host.adapter.firstVisible.$index).toBe(startIndex);
    expect(host.checkElementContentByIndex(startIndex)).toBe(true);
  }

  /** Exact Buffer edges without predicting fetch and clip decisions. */
  bufferRange([firstIndex, lastIndex]: [number, number]): void {
    const info = this.host.adapter.bufferInfo;
    expect(info.firstIndex).toBe(firstIndex);
    expect(info.lastIndex).toBe(lastIndex);
  }

  noForwardGap(): void {
    const { host } = this;
    const children = host.contentElement.children;
    const lastItem = children[children.length - 2] as HTMLElement;
    const viewport = host.viewportElement.getBoundingClientRect();
    const item = lastItem.getBoundingClientRect();
    const gap = host.horizontal
      ? Math.max(0, viewport.right - item.right)
      : Math.max(0, viewport.bottom - item.bottom);

    expect(gap).toBe(0);
    expect(host.padding[Direction.forward].getSize()).toBe(0);
  }

  /** Rendered items cover both viewport edges. */
  viewportFilled(): void {
    const { host } = this;
    this.domMatchesBuffer();

    const elements = host.getElements();
    expect(elements.length).toBeGreaterThan(0);

    const first = elements[0].getBoundingClientRect();
    const last = elements[elements.length - 1].getBoundingClientRect();
    const viewport = host.viewportElement.getBoundingClientRect();

    if (host.horizontal) {
      expect(first.left).toBeLessThanOrEqual(viewport.left + 1);
      expect(last.right).toBeGreaterThanOrEqual(viewport.right - 1);
    } else {
      expect(first.top).toBeLessThanOrEqual(viewport.top + 1);
      expect(last.bottom).toBeGreaterThanOrEqual(viewport.bottom - 1);
    }
  }

  /** The visible window stays within the buffered index range. */
  visibleWithinBuffer(): void {
    const { adapter } = this.host;
    const { firstIndex, lastIndex } = adapter.bufferInfo;
    expect(adapter.firstVisible.$index).toBeGreaterThanOrEqual(firstIndex);
    expect(adapter.lastVisible.$index).toBeLessThanOrEqual(lastIndex);
  }

  uniqueItems(
    items: ReadonlyArray<{ uid: number }> = this.host.scroller.buffer.items
  ): void {
    expect(new Set(items.map(({ uid }) => uid)).size).toBe(items.length);
  }

  itemsIdentity(
    before: ReadonlyArray<{ uid: number; data: { id: number } }>,
    after: ReadonlyArray<{
      uid: number;
      data: { id: number };
    }> = this.host.scroller.buffer.items
  ): void {
    after.forEach(item => {
      const previous = before.find(({ data }) => data.id === item.data.id);
      expect(previous?.uid).toBe(item.uid);
    });
    this.uniqueItems(after);
  }
}