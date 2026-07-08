import type { DatasourceGet } from './vscroll';
import type { TestItem } from '../types';

export const makeItem = (id: number): TestItem => ({ id, text: `item #${id}` });

export const makeItems = (firstId: number, count: number): TestItem[] =>
  Array.from({ length: count }, (_, offset) => makeItem(firstId + offset));

// A datasource `get` that appends ' *' to each item's text. Reset specs use it
// to prove the workflow adopts a brand-new data-producing function.
export const starGet = ((
  index: number,
  count: number,
  success: (items: unknown[]) => void
): void => {
  success(makeItems(index, count).map(item => ({ ...item, text: `${item.text} *` })));
}) as DatasourceGet<unknown>;

const minSize = 1;
const maxSize = 100;
const initialSize = 20;

// Deterministic per-index size profile used by dynamic-size scenarios.
export const getDynamicSize = (index: number): number =>
  Math.max(minSize, Math.min(maxSize, initialSize + index));
