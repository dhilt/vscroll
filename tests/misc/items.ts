import { Item } from '../../src/classes/item';
import { ItemCache } from '../../src/classes/cache';
import { Data } from './types';

export const generateItem = (id: number | string): Data => ({
  id,
  text: 'item #' + id,
});

export const generateBufferItem = (index: number, data: Data): Item<Data> =>
  new Item(index, data, {} as never);

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
