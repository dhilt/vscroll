import { Misc } from '../miscellaneous/misc';
import { Direction } from '../miscellaneous/vscroll';

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Verifies that DOM and Buffer contain the same contiguous indexed items. */
export const expectDomIndexesMatchBuffer = (misc: Misc): void => {
  const domIndexes = misc.getElements().map(el => misc.getElementIndex(el));
  const bufferIndexes = misc.scroller.buffer.items.map(item => item.$index);

  expect(domIndexes).toEqual(bufferIndexes);

  if (!bufferIndexes.length) {
    return;
  }

  const { firstIndex, lastIndex } = misc.adapter.bufferInfo;

  expect(bufferIndexes).toEqual(range(firstIndex, lastIndex));
};

/** Also verifies the standard test datasource content for every item. */
export const expectDomMatchesBuffer = (misc: Misc): void => {
  expectDomIndexesMatchBuffer(misc);
  misc
    .getElements()
    .map(element => misc.getElementIndex(element))
    .forEach(index =>
      expect(misc.checkElementContentByIndex(index)).toBe(true)
    );
};

/** Verifies bounded paddings for uniform-size data. */
export const expectUniformPaddings = (misc: Misc): void => {
  if (!misc.scroller.buffer.items.length) {
    return;
  }
  const { firstIndex, lastIndex, absMinIndex, absMaxIndex } =
    misc.adapter.bufferInfo;
  const size = misc.scroller.buffer.defaultSize;

  if (Number.isFinite(absMinIndex)) {
    expect(misc.padding[Direction.backward].getSize()).toBe(
      (firstIndex - absMinIndex) * size
    );
  }
  if (Number.isFinite(absMaxIndex)) {
    expect(misc.padding[Direction.forward].getSize()).toBe(
      (absMaxIndex - lastIndex) * size
    );
  }
};

export const expectConsistent = (misc: Misc): void => {
  expectDomMatchesBuffer(misc);
  expectUniformPaddings(misc);
};

export const expectStartVisible = (misc: Misc, startIndex: number): void => {
  expect(misc.adapter.firstVisible.$index).toBe(startIndex);
  expect(misc.checkElementContentByIndex(startIndex)).toBe(true);
};

/** Verifies exact Buffer edges without predicting fetch and clip decisions. */
export const expectBufferRange = (
  misc: Misc,
  [firstIndex, lastIndex]: [number, number]
): void => {
  expect(misc.adapter.bufferInfo.firstIndex).toBe(firstIndex);
  expect(misc.adapter.bufferInfo.lastIndex).toBe(lastIndex);
};

export const expectNoForwardGap = (misc: Misc): void => {
  const children = misc.contentElement.children;
  // the last child is the forward padding element, the item precedes it
  const lastItem = children[children.length - 2] as HTMLElement;
  const viewport = misc.viewportElement.getBoundingClientRect();
  const item = lastItem.getBoundingClientRect();
  const gap = misc.horizontal
    ? Math.max(0, viewport.right - item.right)
    : Math.max(0, viewport.bottom - item.bottom);

  expect(gap).toBe(0);
  expect(misc.padding[Direction.forward].getSize()).toBe(0);
};

/** Verifies that rendered items cover both viewport edges. */
export const expectViewportFilled = (misc: Misc): void => {
  expectDomMatchesBuffer(misc);

  const elements = misc.getElements();
  expect(elements.length).toBeGreaterThan(0);

  const first = elements[0].getBoundingClientRect();
  const last = elements[elements.length - 1].getBoundingClientRect();
  const viewport = misc.viewportElement.getBoundingClientRect();

  if (misc.horizontal) {
    expect(first.left).toBeLessThanOrEqual(viewport.left + 1);
    expect(last.right).toBeGreaterThanOrEqual(viewport.right - 1);
  } else {
    expect(first.top).toBeLessThanOrEqual(viewport.top + 1);
    expect(last.bottom).toBeGreaterThanOrEqual(viewport.bottom - 1);
  }
};
