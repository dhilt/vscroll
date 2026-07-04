const minSize = 1;
const maxSize = 100;
const initialSize = 20;

export const getDynamicSize = (index: number): number =>
  Math.max(minSize, Math.min(maxSize, initialSize + index));
