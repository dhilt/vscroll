import type { TestItem } from '../types';

export const makeItem = (id: number): TestItem => ({ id, text: `item #${id}` });

export const makeItems = (firstId: number, count: number): TestItem[] =>
  Array.from({ length: count }, (_, offset) => makeItem(firstId + offset));

const minSize = 1;
const maxSize = 100;
const initialSize = 20;

// Deterministic per-index size profile used by dynamic-size scenarios.
export const getDynamicSize = (index: number): number =>
  Math.max(minSize, Math.min(maxSize, initialSize + index));
