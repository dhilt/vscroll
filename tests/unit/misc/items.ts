import { Item } from '../../../src/classes/item';
import { ItemCache } from '../../../src/classes/buffer/cache';
import { Id, Data } from './types';

const MIN_SIZE = 1;
const DEF_SIZE = 10;

export const generateItem = (id: Id): Data => {
  let size = Number(id);
  if (Number.isNaN(size)) {
    size = DEF_SIZE;
  }
  if (size < MIN_SIZE) {
    size = MIN_SIZE;
  }
  return {
    id,
    text: 'item #' + id,
    size
  };
};

export const generateBufferItem = (index: number, data: Data): Item<Data> => {
  const item = new Item(index, data, {} as never);
  item.size = data.size;
  return item;
};

export const generateItems = (start: number, length: number): Data[] =>
  Array.from({ length }).map((j, i) => generateItem(start + i));

export const generateBufferItems = (start: number, length: number): Item<Data>[] =>
  generateItems(start, length).map((item, index) =>
    generateBufferItem(start + index, item)
  );

export const generateCacheItems = (start: number, length: number): ItemCache<Data>[] =>
  generateItems(start, length).map((item, index) =>
    new ItemCache(generateBufferItem(start + index, item), false)
  );
