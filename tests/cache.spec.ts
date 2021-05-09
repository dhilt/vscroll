import { Cache } from '../src/classes/buffer/cache';
import { Item } from '../src/classes/item';

import { Data, Id, IndexIdList, IndexSizeList } from './misc/types';
import { generateBufferItem, generateBufferItems, generateItem } from './misc/items';
import { SizeStrategy } from '../src/inputs';

const loggerMock = { log: () => null };

const make = (list: IndexIdList): Item<Data>[] =>
  list.map(current => {
    const index = Number(Object.keys(current)[0]);
    const id = current[index];
    return generateBufferItem(index, generateItem(id));
  });

describe('Cache Spec', () => {

  const settings = {
    itemSize: NaN,
    cacheData: true,
    cacheOnReload: true,
    sizeStrategy: SizeStrategy.Average
  };

  describe('Remove', () => {
    const MIN = 1, COUNT = 5;
    const items = generateBufferItems(MIN, COUNT);
    let cache: Cache<Data>;

    const check = (idList: (number | null)[]) =>
      idList.forEach((id, index) => {
        const item = cache.get(index + MIN);
        const idCached = item && item.data ? item.data.id : null;
        expect(idCached).toEqual(id);
      });

    beforeEach(() => {
      cache = new Cache(settings as never, loggerMock as never);
      items.forEach(item => cache.add(item));
    });

    it('should not remove when out of the right border & fixRight = false', () => {
      cache.removeItems([99], false);
      check([1, 2, 3, 4, 5]);
    });

    it('should increase all indexes when out of the right border & fixRight = true', () => {
      cache.removeItems([99], true);
      check([null, 1, 2, 3, 4, 5]);
    });

    it('should not remove when out of the left border & fixRight = true', () => {
      cache.removeItems([-99], true);
      check([1, 2, 3, 4, 5]);
    });

    it('should decrease all indexes when out of the left border & fixRight = false', () => {
      cache.removeItems([-99], false);
      check([2, 3, 4, 5]);
    });

    it('should decrease bottom indexes when removing from top & fixRight = false', () => {
      cache.removeItems([1, 2], false);
      check([3, 4, 5, null, null]);
    });

    it('should not shift indexes when removing from top & fixRight = true', () => {
      cache.removeItems([1, 2], true);
      check([null, null, 3, 4, 5]);
    });

    it('should not shift indexes when removing from bottom & fixRight = false', () => {
      cache.removeItems([4, 5], false);
      check([1, 2, 3, null, null]);
    });

    it('should increase top indexes when removing from bottom & fixRight = true', () => {
      cache.removeItems([4, 5], true);
      check([null, null, 1, 2, 3]);
    });

    it('should decrease the below indexes when removing from center & fixRight = false', () => {
      cache.removeItems([3], false);
      check([1, 2, 4, 5, null]);
    });

    it('should shift increase the above indexes when removing from center & fixRight = true', () => {
      cache.removeItems([3], true);
      check([null, 1, 2, 4, 5]);
    });

    it('should remove non-sequenced list', () => {
      cache.removeItems([1, 3, 5], false);
      check([2, 4, null, null, null]);
    });
  });

  describe('Update', () => {
    const MIN = 1, COUNT = 7;
    const items = generateBufferItems(MIN, COUNT);
    const subset = items.slice(2, 5).map(({ $index }) => $index); // [3, 4, 5]
    let cache: Cache<Data>;

    const checkUpdate = (list: IndexIdList) => {
      // console.log(Array.from((cache as unknown as { items: Map<number, Item<Data>> }).items).map(i => i[1].data));
      expect(cache.size).toEqual(list.length);
      list.forEach((current, index) => {
        const $index = Number(Object.keys(current)[0]);
        if (index === 0) {
          expect(cache.minIndex).toEqual($index);
        }
        if (index === list.length - 1) {
          expect(cache.maxIndex).toEqual($index);
        }
        const id = current[$index];
        const item = cache.get($index);
        expect(item.$index).toEqual($index);
        expect(item.data.id).toEqual(id);
      });
    };

    beforeEach(() => {
      cache = new Cache(settings as never, loggerMock as never);
      items.forEach(item => cache.add(item));
    });

    it('should not change', () => {
      const after = [{ 3: 3 }, { 4: 4 }, { 5: 5 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 3 }, { 4: 4 }, { 5: 5 }, { 6: 6 }, { 7: 7 }]);
    });

    it('should clear', () => {
      cache.updateSubset(subset, []);
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 6 }, { 4: 7 }]);
    });

    it('should clear (fixRight)', () => {
      cache.updateSubset(subset, [], true);
      checkUpdate([{ 4: 1 }, { 5: 2 }, { 6: 6 }, { 7: 7 }]);
    });

    it('should remove left', () => {
      const after = [{ 3: 4 }, { 4: 5 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 4 }, { 4: 5 }, { 5: 6 }, { 6: 7 }]);
    });

    it('should remove left (fixRight)', () => {
      const after = [{ 4: 4 }, { 5: 5 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 2: 1 }, { 3: 2 }, { 4: 4 }, { 5: 5 }, { 6: 6 }, { 7: 7 }]);
    });

    it('should remove right', () => {
      const after = [{ 3: 3 }, { 4: 4 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 3 }, { 4: 4 }, { 5: 6 }, { 6: 7 }]);
    });

    it('should remove right (fixRight)', () => {
      const after = [{ 4: 3 }, { 5: 4 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 2: 1 }, { 3: 2 }, { 4: 3 }, { 5: 4 }, { 6: 6 }, { 7: 7 }]);
    });

    it('should remove left & right', () => {
      const after = [{ 3: 4 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 4 }, { 4: 6 }, { 5: 7 }]);
    });

    it('should remove left & right (fixRight)', () => {
      const after = [{ 5: 4 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 3: 1 }, { 4: 2 }, { 5: 4 }, { 6: 6 }, { 7: 7 }]);
    });

    it('should insert left', () => {
      const after = [{ 3: 'xxx' }, { 4: 3 }, { 5: 4 }, { 6: 5 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 'xxx' }, { 4: 3 }, { 5: 4 }, { 6: 5 }, { 7: 6 }, { 8: 7 }]);
    });

    it('should insert left (fixRight)', () => {
      const after = [{ 2: 'xxx' }, { 3: 3 }, { 4: 4 }, { 5: 5 }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 0: 1 }, { 1: 2 }, { 2: 'xxx' }, { 3: 3 }, { 4: 4 }, { 5: 5 }, { 6: 6 }, { 7: 7 }]);
    });

    it('should insert right', () => {
      const after = [{ 3: 3 }, { 4: 4 }, { 5: 5 }, { 6: 'xxx' }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 3 }, { 4: 4 }, { 5: 5 }, { 6: 'xxx' }, { 7: 6 }, { 8: 7 }]);
    });

    it('should insert right (fixRight)', () => {
      const after = [{ 2: 3 }, { 3: 4 }, { 4: 5 }, { 5: 'xxx' }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 0: 1 }, { 1: 2 }, { 2: 3 }, { 3: 4 }, { 4: 5 }, { 5: 'xxx' }, { 6: 6 }, { 7: 7 }]);
    });

    it('should insert left & right', () => {
      const after = [{ 3: 'xxx' }, { 4: 3 }, { 5: 4 }, { 6: 5 }, { 7: 'xxx' }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ 1: 1 }, { 2: 2 }, { 3: 'xxx' }, { 4: 3 }, { 5: 4 }, { 6: 5 }, { 7: 'xxx' }, { 8: 6 }, { 9: 7 }]);
    });

    it('should insert left & right (fixRight)', () => {
      const after = [{ 1: 'x' }, { 2: 3 }, { 3: 4 }, { 4: 5 }, { 5: 'y' }];
      cache.updateSubset(subset, make(after));
      checkUpdate([{ '-1': 1 }, { 0: 2 }, { 1: 'x' }, { 2: 3 }, { 3: 4 }, { 4: 5 }, { 5: 'y' }, { 6: 6 }, { 7: 7 }]);
    });
  });

  describe('Average size', () => {
    const averageSizeSettings = {
      ...settings,
      sizeStrategy: SizeStrategy.Average
    };

    const prepareAverage = (
      { length, toRemove, toAdd }: { length: number, toRemove?: Id[], toAdd?: IndexSizeList }
    ) => {
      const beforeTotal = Array.from({ length }).reduce((acc: number, j, i) => acc + i + 1, 0);
      const before = Math.round(beforeTotal / length);
      let after;
      if (toRemove) {
        after = Math.round(
          Array.from({ length }).reduce(
            (acc: number, j, i) => acc + (toRemove.includes(i + 1) ? 0 : (i + 1)), 0
          ) / (length - toRemove.length));
      } else if (toAdd) {
        let countNew = 0, sizeNew = 0, sizeOld = 0, sizeOldBefore = 0;
        toAdd.forEach(r => {
          const key = Number(Object.keys(r)[0]);
          const size = r[key];
          if (key > length) {
            countNew++;
            sizeNew += size;
          } else {
            sizeOld += size;
            sizeOldBefore += key;
          }
        });
        after = Math.round((beforeTotal + sizeNew + sizeOld - sizeOldBefore) / (length + countNew));
      }
      const cache = new Cache(averageSizeSettings as never, loggerMock as never);
      const items = generateBufferItems(1, length);
      items.forEach(item => cache.add(item));
      cache.recalculateDefaultSize();
      return { items, cache, average: { after, before } };
    };

    describe('On add', () => {
      const checkAdd = (toAdd: IndexSizeList) => {
        const { cache, average } = prepareAverage({ length: 50, toAdd });
        expect(cache.getDefaultSize()).toBe(average.before);

        toAdd.forEach(r => {
          const key = Number(Object.keys(r)[0]);
          cache.add({ $index: key, size: r[key], data: {} } as Item);
        });
        cache.recalculateDefaultSize();
        expect(cache.getDefaultSize()).toBe(average.after);
      };

      it('should maintain average size on add (increase, new)', () => {
        checkAdd([{ 51: 101 }, { 52: 102 }, { 53: 103 }]);
      });

      it('should maintain average size on add (decrease, new)', () => {
        checkAdd([{ 51: 1 }, { 52: 2 }, { 53: 3 }]);
      });

      it('should maintain average size on add (increase, mixed)', () => {
        checkAdd([{ 1: 101 }, { 2: 102 }, { 3: 103 }]);
      });

      it('should maintain average size on add (decrease, mixed)', () => {
        checkAdd([{ 50: 3 }, { 49: 2 }, { 48: 1 }]);
      });
    });

    describe('On remove', () => {
      it('should maintain average size on remove', () => {
        const toRemove = [10, 20, 30, 40, 50];
        const { cache, average } = prepareAverage({ length: 50, toRemove });

        expect(cache.getDefaultSize()).toBe(average.before);

        cache.removeItems(toRemove, true);
        cache.recalculateDefaultSize();
        expect(cache.getDefaultSize()).toBe(average.after);
      });

      it('should maintain average size on remove via update', () => {
        const toRemove = [5, 8, 10];
        const { items, cache, average } = prepareAverage({ length: 10, toRemove });
        const listAfter = [{ 1: 1 }, { 2: 2 }, { 3: 3 }, { 4: 4 }, { 5: 6 }, { 6: 7 }, { 7: 9 }];
        const subset = items.slice(toRemove[0], toRemove[toRemove.length - 1] + 1).map(({ $index }) => $index);

        expect(cache.getDefaultSize()).toBe(average.before);

        cache.updateSubset(subset, make(listAfter));
        cache.recalculateDefaultSize();
        expect(cache.getDefaultSize()).toBe(average.after);
      });
    });

  });

  interface ICheckDefaultSize {
    sizeStrategy: SizeStrategy;
    cacheSize: number;
    itemSize: number;
    setItemSize: (item: Item, defaultSize?: number) => unknown;
    updateCache: (cache: Cache) => void;
    before?: number;
    after?: number;
  }

  const checkDefaultSize = ({
    sizeStrategy, cacheSize, setItemSize, updateCache, itemSize, before, after
  }: ICheckDefaultSize) => {
    const cache = new Cache({
      ...settings,
      itemSize,
      sizeStrategy
    } as never, loggerMock as never);
    const items = generateBufferItems(1, cacheSize);
    items.forEach(item => setItemSize(item, cache.itemSize) && cache.add(item));
    cache.recalculateDefaultSize();
    before = before === void 0 ? cache.itemSize : before;
    expect(cache.getDefaultSize()).toBe(before);
    updateCache(cache);
    cache.recalculateDefaultSize();
    expect(cache.getDefaultSize()).toBe(after === void 0 ? before : after);
  };

  describe('Frequent size', () => {

    const checkFrequentOnInit = (list: IndexSizeList, before: number, after?: number) =>
      checkDefaultSize({
        sizeStrategy: SizeStrategy.Frequent,
        cacheSize: list.length,
        itemSize: before,
        setItemSize: (item, defaultSize) => item.size =
          list.reduce((a, i) => item.$index === Number(Object.keys(i)[0]) ? Object.values(i)[0] : a, defaultSize),
        updateCache: () => null,
        before,
        after
      });

    const checkFrequentOnAdd = (toAdd: IndexSizeList, newSize?: number) =>
      checkDefaultSize({
        sizeStrategy: SizeStrategy.Frequent,
        cacheSize: 10,
        itemSize: 12,
        setItemSize: item => item.size = 12,
        updateCache: cache => toAdd.forEach(r => {
          const key = Number(Object.keys(r)[0]);
          cache.add({ $index: key, size: r[key], data: {} } as Item);
        }),
        after: newSize
      });

    const checkFrequentOnRemove = (toRemove: number[], newSize?: number) =>
      checkDefaultSize({
        sizeStrategy: SizeStrategy.Frequent,
        cacheSize: 10,
        itemSize: 12,
        setItemSize: item => item.size = item.$index % 2 === 0 ? 5 : 12, // 1 - 12, 2 - 5, ...
        updateCache: cache => cache.removeItems(toRemove, false),
        after: newSize
      });

    describe('On init', () => {
      it('should set frequent', () =>
        checkFrequentOnInit([{ 1: 15 }, { 2: 16 }, { 3: 15 }], 15)
      );

      it('should set first', () =>
        checkFrequentOnInit([{ 1: 15 }, { 2: 16 }, { 3: 17 }], 15)
      );

      it('should set first frequent', () =>
        checkFrequentOnInit([{ 1: 15 }, { 2: 16 }, { 3: 15 }, { 4: 16 }], 15)
      );
    });

    describe('On add', () => {
      it('should increase frequent size on add (existed)', () =>
        checkFrequentOnAdd([{ 1: 20 }, { 2: 20 }, { 3: 20 }, { 4: 20 }, { 5: 20 }, { 6: 20 }], 20)
      );

      it('should decrease frequent size on add (existed)', () =>
        checkFrequentOnAdd([{ 1: 5 }, { 2: 5 }, { 3: 5 }, { 4: 5 }, { 5: 5 }, { 6: 5 }], 5)
      );

      it('should not change frequent size on add (existed, smaller)', () =>
        checkFrequentOnAdd([{ 1: 5 }, { 2: 5 }, { 3: 5 }, { 4: 5 }])
      );

      it('should not change frequent size on add (existed, bigger)', () =>
        checkFrequentOnAdd([{ 1: 25 }, { 2: 25 }, { 3: 25 }, { 4: 25 }])
      );

      it('should not change frequent size on add (new, less)', () =>
        checkFrequentOnAdd(Array.from({ length: 9 }).map((j, i) => ({ [100 + i]: 20 })))
      );

      it('should not change frequent size on add (new, equal)', () =>
        checkFrequentOnAdd(Array.from({ length: 10 }).map((j, i) => ({ [100 + i]: 20 })))
      );

      it('should change frequent size on add (new, more)', () =>
        checkFrequentOnAdd(Array.from({ length: 11 }).map((j, i) => ({ [100 + i]: 20 })), 20)
      );

      it('should change frequent size on add (new, equal, double)', () =>
        checkFrequentOnAdd([
          ...Array.from({ length: 11 }).map((j, i) => ({ [100 + i]: 20 })),
          ...Array.from({ length: 11 }).map((j, i) => ({ [200 + i]: 30 })),
        ], 20)
      );
    });

    describe('On remove', () => {
      it('should not change frequent size on remove (empty)', () =>
        checkFrequentOnRemove([])
      );

      it('should change frequent size on remove (many)', () =>
        checkFrequentOnRemove([1, 2, 3, 4, 5], 5)
      );

      it('should change frequent size on remove (single)', () =>
        checkFrequentOnRemove([1], 5)
      );

      it('should not change frequent size on remove (many)', () =>
        checkFrequentOnRemove([2, 4, 6, 8, 10])
      );

      it('should not change frequent size on remove (single)', () =>
        checkFrequentOnRemove([2])
      );

      it('should not change frequent size on remove (all)', () =>
        checkFrequentOnRemove([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      );
    });
  });

  describe('Constant size', () => {

    const checkConstantOnInit = (list: IndexSizeList, updateCache: (c) => void, itemSize: number) =>
      checkDefaultSize({
        sizeStrategy: SizeStrategy.Constant,
        cacheSize: list.length,
        itemSize,
        setItemSize: (item, defaultSize) => item.size =
          list.reduce((a, i) => item.$index === Number(Object.keys(i)[0]) ? Object.values(i)[0] : a, defaultSize),
        updateCache,
        before: itemSize || Object.values(list[0])[0]
      });

    const checkConstantOnRemove = (list: IndexSizeList, toRemove: number[], itemSize: number) =>
      checkConstantOnInit(list, cache => cache.removeItems(toRemove, false), itemSize);

    const checkConstantOnAdd = (list: IndexSizeList, toAdd: IndexSizeList, itemSize: number) =>
      checkConstantOnInit(list, cache => toAdd.forEach(r => {
        const key = Number(Object.keys(r)[0]);
        cache.add({ $index: key, size: r[key], data: {} } as Item);
      }), itemSize);

    [12, NaN].forEach(itemSize => {
      it('should not change default size on init', () =>
        checkConstantOnInit([{ 1: 15 }, { 2: 16 }, { 3: 15 }], () => null, itemSize)
      );

      it('should not change default size on init (2)', () =>
        checkConstantOnInit([{ 1: 15 }, { 2: 16 }, { 3: 17 }], () => null, itemSize)
      );

      it('should not change default size on remove (1)', () =>
        checkConstantOnRemove([{ 1: 5 }, { 2: 6 }, { 3: 7 }], [], itemSize)
      );

      it('should not change default size on remove (2)', () =>
        checkConstantOnRemove([{ 1: 10 }, { 2: 11 }, { 3: 12 }], [1], itemSize)
      );

      it('should not change default size on add (1)', () =>
        checkConstantOnAdd([{ 1: 5 }, { 2: 6 }], [{ 1: 5 }, { 2: 5 }, { 3: 5 }], itemSize)
      );

      it('should not change default size on add (2)', () =>
        checkConstantOnAdd([{ 1: 10 }, { 2: 10 }], [{ 1: 5 }, { 2: 5 }, { 3: 5 }], itemSize)
      );
    });
  });

});
