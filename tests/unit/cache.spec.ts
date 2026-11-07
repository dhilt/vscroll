import { Cache } from '../../src/classes/buffer/cache';
import { Item } from '../../src/classes/item';

import { Data, Id, IndexIdList, IndexSizeList } from './misc/types';
import {
  generateBufferItem,
  generateBufferItems,
  generateItem
} from './misc/items';
import { Direction, SizeStrategy } from '../../src/inputs';

interface ActionCacheConfig {
  title: string;
  action: () => void;
  result: IndexIdList;
  debug?: boolean;
}

const settings = {
  itemSize: NaN,
  cacheData: true,
  cacheOnReload: true,
  sizeStrategy: SizeStrategy.Average
};

const loggerMock = { log: () => null };

const make = (list: IndexIdList): Item<Data>[] =>
  list.map(current => {
    const index = Number(Object.keys(current)[0]);
    const id = current[index];
    return generateBufferItem(index, generateItem(id));
  });

const checkCache = (cache: Cache<Data>, config: ActionCacheConfig) => {
  if (config.debug) {
    console.log(
      Array.from(
        (cache as unknown as { items: Map<number, Item<Data>> }).items
      ).map(([_, item]) => item.$index + ': ' + item.data.id)
    );
  }
  const list = config.result;
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
    expect(item?.$index).toEqual($index);
    expect(item?.data?.id).toEqual(id);
  });
};

describe('Cache Spec', () => {
  describe('Remove', () => {
    const MIN = 1,
      COUNT = 5;
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
    const MIN = 1,
      COUNT = 7;
    const items = generateBufferItems(MIN, COUNT);
    const subset = items.slice(2, 5); // [3, 4, 5]
    let cache: Cache<Data>;

    beforeEach(() => {
      cache = new Cache(settings as never, loggerMock as never);
      items.forEach(item => cache.add(item));
    });

    const updateConfigList: ActionCacheConfig[] = [
      {
        title: 'should not change',
        action: () => {
          const after: IndexIdList = [{ 3: 3 }, { 4: 4 }, { 5: 5 }];
          cache.updateSubset(subset, make(after));
        },
        result: [
          { 1: 1 },
          { 2: 2 },
          { 3: 3 },
          { 4: 4 },
          { 5: 5 },
          { 6: 6 },
          { 7: 7 }
        ]
      },
      {
        title: 'should clear',
        action: () => {
          cache.updateSubset(subset, []);
        },
        result: [{ 1: 1 }, { 2: 2 }, { 3: 6 }, { 4: 7 }]
      },
      {
        title: 'should clear (fixRight)',
        action: () => {
          cache.updateSubset(subset, [], true);
        },
        result: [{ 4: 1 }, { 5: 2 }, { 6: 6 }, { 7: 7 }]
      },
      {
        title: 'should remove left',
        action: () => {
          const after: IndexIdList = [{ 3: 4 }, { 4: 5 }];
          cache.updateSubset(subset, make(after));
        },
        result: [{ 1: 1 }, { 2: 2 }, { 3: 4 }, { 4: 5 }, { 5: 6 }, { 6: 7 }]
      },
      {
        title: 'should remove left (fixRight)',
        action: () => {
          const after: IndexIdList = [{ 4: 4 }, { 5: 5 }];
          cache.updateSubset(subset, make(after));
        },
        result: [{ 2: 1 }, { 3: 2 }, { 4: 4 }, { 5: 5 }, { 6: 6 }, { 7: 7 }]
      },
      {
        title: 'should remove right',
        action: () => {
          const after: IndexIdList = [{ 3: 3 }, { 4: 4 }];
          cache.updateSubset(subset, make(after));
        },
        result: [{ 1: 1 }, { 2: 2 }, { 3: 3 }, { 4: 4 }, { 5: 6 }, { 6: 7 }]
      },
      {
        title: 'should remove right (fixRight)',
        action: () => {
          const after: IndexIdList = [{ 4: 3 }, { 5: 4 }];
          cache.updateSubset(subset, make(after));
        },
        result: [{ 2: 1 }, { 3: 2 }, { 4: 3 }, { 5: 4 }, { 6: 6 }, { 7: 7 }]
      },
      {
        title: 'should remove left & right',
        action: () => {
          const after = [{ 3: 4 }];
          cache.updateSubset(subset, make(after));
        },
        result: [{ 1: 1 }, { 2: 2 }, { 3: 4 }, { 4: 6 }, { 5: 7 }]
      },
      {
        title: 'should remove left & right (fixRight)',
        action: () => {
          const after = [{ 5: 4 }];
          cache.updateSubset(subset, make(after));
        },
        result: [{ 3: 1 }, { 4: 2 }, { 5: 4 }, { 6: 6 }, { 7: 7 }]
      },
      {
        title: 'should insert left',
        action: () => {
          const after: IndexIdList = [
            { 3: 'xxx' },
            { 4: 3 },
            { 5: 4 },
            { 6: 5 }
          ];
          cache.updateSubset(subset, make(after));
        },
        result: [
          { 1: 1 },
          { 2: 2 },
          { 3: 'xxx' },
          { 4: 3 },
          { 5: 4 },
          { 6: 5 },
          { 7: 6 },
          { 8: 7 }
        ]
      },
      {
        title: 'should insert left (fixRight)',
        action: () => {
          const after: IndexIdList = [
            { 2: 'xxx' },
            { 3: 3 },
            { 4: 4 },
            { 5: 5 }
          ];
          cache.updateSubset(subset, make(after));
        },
        result: [
          { 0: 1 },
          { 1: 2 },
          { 2: 'xxx' },
          { 3: 3 },
          { 4: 4 },
          { 5: 5 },
          { 6: 6 },
          { 7: 7 }
        ]
      },
      {
        title: 'should insert right',
        action: () => {
          const after: IndexIdList = [
            { 3: 3 },
            { 4: 4 },
            { 5: 5 },
            { 6: 'xxx' }
          ];
          cache.updateSubset(subset, make(after));
        },
        result: [
          { 1: 1 },
          { 2: 2 },
          { 3: 3 },
          { 4: 4 },
          { 5: 5 },
          { 6: 'xxx' },
          { 7: 6 },
          { 8: 7 }
        ]
      },
      {
        title: 'should insert right (fixRight)',
        action: () => {
          const after: IndexIdList = [
            { 2: 3 },
            { 3: 4 },
            { 4: 5 },
            { 5: 'xxx' }
          ];
          cache.updateSubset(subset, make(after));
        },
        result: [
          { 0: 1 },
          { 1: 2 },
          { 2: 3 },
          { 3: 4 },
          { 4: 5 },
          { 5: 'xxx' },
          { 6: 6 },
          { 7: 7 }
        ]
      },
      {
        title: 'should insert left & right',
        action: () => {
          const after: IndexIdList = [
            { 3: 'xxx' },
            { 4: 3 },
            { 5: 4 },
            { 6: 5 },
            { 7: 'xxx' }
          ];
          cache.updateSubset(subset, make(after));
        },
        result: [
          { 1: 1 },
          { 2: 2 },
          { 3: 'xxx' },
          { 4: 3 },
          { 5: 4 },
          { 6: 5 },
          { 7: 'xxx' },
          { 8: 6 },
          { 9: 7 }
        ]
      },
      {
        title: 'should insert left & right (fixRight)',
        action: () => {
          const after: IndexIdList = [
            { 1: 'x' },
            { 2: 3 },
            { 3: 4 },
            { 4: 5 },
            { 5: 'y' }
          ];
          cache.updateSubset(subset, make(after));
        },
        result: [
          { '-1': 1 },
          { 0: 2 },
          { 1: 'x' },
          { 2: 3 },
          { 3: 4 },
          { 4: 5 },
          { 5: 'y' },
          { 6: 6 },
          { 7: 7 }
        ]
      }
    ];

    updateConfigList.forEach(config =>
      it(config.title, () => {
        config.action();
        checkCache(cache, config);
      })
    );
  });

  describe('Average size', () => {
    const averageSizeSettings = {
      ...settings,
      sizeStrategy: SizeStrategy.Average
    };

    const prepareAverage = ({
      length,
      toRemove,
      toAdd
    }: {
      length: number;
      toRemove?: Id[];
      toAdd?: IndexSizeList;
    }) => {
      const beforeTotal = Array.from({ length }).reduce(
        (acc: number, j, i) => acc + i + 1,
        0
      );
      const before = Math.round(beforeTotal / length);
      let after;
      if (toRemove) {
        after = Math.round(
          Array.from({ length }).reduce(
            (acc: number, j, i) => acc + (toRemove.includes(i + 1) ? 0 : i + 1),
            0
          ) /
            (length - toRemove.length)
        );
      } else if (toAdd) {
        let countNew = 0,
          sizeNew = 0,
          sizeOld = 0,
          sizeOldBefore = 0;
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
        after = Math.round(
          (beforeTotal + sizeNew + sizeOld - sizeOldBefore) /
            (length + countNew)
        );
      }
      const cache = new Cache(
        averageSizeSettings as never,
        loggerMock as never
      );
      const items = generateBufferItems(1, length);
      items.forEach(item => {
        item.toRemove = !!toRemove?.includes(item.$index);
        cache.add(item);
      });
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
        const { items, cache, average } = prepareAverage({
          length: 10,
          toRemove
        });
        const listAfter: IndexIdList = [
          { 1: 1 },
          { 2: 2 },
          { 3: 3 },
          { 4: 4 },
          { 5: 6 },
          { 6: 7 },
          { 7: 9 }
        ];
        const subset = items.slice(
          toRemove[0],
          toRemove[toRemove.length - 1] + 1
        );

        expect(cache.getDefaultSize()).toBe(average.before);

        cache.updateSubset(subset, make(listAfter));
        cache.recalculateDefaultSize();
        expect(cache.getDefaultSize()).toBe(average.after);
      });

      it('should maintain average size on remove via update (explicit)', () => {
        const INDEX_TO_REMOVE = 10;
        const cache = new Cache(
          averageSizeSettings as never,
          loggerMock as never
        );
        const items = generateBufferItems(1, 15);
        items.forEach(item => {
          item.size = item.data.size =
            item.$index === INDEX_TO_REMOVE ? 100 : 20;
          item.toRemove = item.$index === INDEX_TO_REMOVE;
          cache.add(item);
        });
        cache.recalculateDefaultSize();
        expect(cache.getDefaultSize()).toBe(25);

        const before = items.filter(({ $index }) =>
          [10, 11, 12, 13, 14, 15].includes($index)
        );
        const after = make([
          { 10: 11 },
          { 11: 12 },
          { 12: 13 },
          { 13: 14 },
          { 14: 15 }
        ]);
        after.forEach(item => (item.size = item.data.size = 20));

        cache.updateSubset(before, after);
        cache.recalculateDefaultSize();
        expect(cache.getDefaultSize()).toBe(20);
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
    sizeStrategy,
    cacheSize,
    setItemSize,
    updateCache,
    itemSize,
    before,
    after
  }: ICheckDefaultSize) => {
    const cache = new Cache(
      {
        ...settings,
        itemSize,
        sizeStrategy
      } as never,
      loggerMock as never
    );
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
    const checkFrequentOnInit = (
      list: IndexSizeList,
      before: number,
      after?: number
    ) =>
      checkDefaultSize({
        sizeStrategy: SizeStrategy.Frequent,
        cacheSize: list.length,
        itemSize: before,
        setItemSize: (item, defaultSize) =>
          (item.size = list.reduce(
            (a, i) =>
              item.$index === Number(Object.keys(i)[0])
                ? Object.values(i)[0]
                : a,
            defaultSize as number
          )),
        updateCache: () => null,
        before,
        after
      });

    const checkFrequentOnAdd = (toAdd: IndexSizeList, newSize?: number) =>
      checkDefaultSize({
        sizeStrategy: SizeStrategy.Frequent,
        cacheSize: 10,
        itemSize: 12,
        setItemSize: item => (item.size = 12),
        updateCache: cache =>
          toAdd.forEach(r => {
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
        setItemSize: item => (item.size = item.$index % 2 === 0 ? 5 : 12), // 1 - 12, 2 - 5, ...
        updateCache: cache => cache.removeItems(toRemove, false),
        after: newSize
      });

    describe('On init', () => {
      it('should set frequent', () =>
        checkFrequentOnInit([{ 1: 15 }, { 2: 16 }, { 3: 15 }], 15));

      it('should set first', () =>
        checkFrequentOnInit([{ 1: 15 }, { 2: 16 }, { 3: 17 }], 15));

      it('should set first frequent', () =>
        checkFrequentOnInit([{ 1: 15 }, { 2: 16 }, { 3: 15 }, { 4: 16 }], 15));
    });

    describe('On add', () => {
      it('should increase frequent size on add (existed)', () =>
        checkFrequentOnAdd(
          [{ 1: 20 }, { 2: 20 }, { 3: 20 }, { 4: 20 }, { 5: 20 }, { 6: 20 }],
          20
        ));

      it('should decrease frequent size on add (existed)', () =>
        checkFrequentOnAdd(
          [{ 1: 5 }, { 2: 5 }, { 3: 5 }, { 4: 5 }, { 5: 5 }, { 6: 5 }],
          5
        ));

      it('should not change frequent size on add (existed, smaller)', () =>
        checkFrequentOnAdd([{ 1: 5 }, { 2: 5 }, { 3: 5 }, { 4: 5 }]));

      it('should not change frequent size on add (existed, bigger)', () =>
        checkFrequentOnAdd([{ 1: 25 }, { 2: 25 }, { 3: 25 }, { 4: 25 }]));

      it('should not change frequent size on add (new, less)', () =>
        checkFrequentOnAdd(
          Array.from({ length: 9 }).map((j, i) => ({ [100 + i]: 20 }))
        ));

      it('should not change frequent size on add (new, equal)', () =>
        checkFrequentOnAdd(
          Array.from({ length: 10 }).map((j, i) => ({ [100 + i]: 20 }))
        ));

      it('should keep frequent size on a tie regardless of insertion order', () =>
        checkDefaultSize({
          sizeStrategy: SizeStrategy.Frequent,
          cacheSize: 3,
          itemSize: 12,
          setItemSize: item => (item.size = item.$index === 1 ? 20 : 12),
          updateCache: cache =>
            cache.add({ $index: 4, size: 20, data: {} } as Item),
          before: 12
        }));

      it('should change frequent size on add (new, more)', () =>
        checkFrequentOnAdd(
          Array.from({ length: 11 }).map((j, i) => ({ [100 + i]: 20 })),
          20
        ));

      it('should change frequent size on add (new, equal, double)', () =>
        checkFrequentOnAdd(
          [
            ...Array.from({ length: 11 }).map((j, i) => ({ [100 + i]: 20 })),
            ...Array.from({ length: 11 }).map((j, i) => ({ [200 + i]: 30 }))
          ],
          20
        ));
    });

    describe('On remove', () => {
      it('should not change frequent size on remove (empty)', () =>
        checkFrequentOnRemove([]));

      it('should change frequent size on remove (many)', () =>
        checkFrequentOnRemove([1, 2, 3, 4, 5], 5));

      it('should change frequent size on remove (single)', () =>
        checkFrequentOnRemove([1], 5));

      it('should not change frequent size on remove (many)', () =>
        checkFrequentOnRemove([2, 4, 6, 8, 10]));

      it('should not change frequent size on remove (single)', () =>
        checkFrequentOnRemove([2]));

      it('should not change frequent size on remove (all)', () =>
        checkFrequentOnRemove([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    });
  });

  describe('Constant size', () => {
    const checkConstantOnInit = (
      list: IndexSizeList,
      updateCache: (c) => void,
      itemSize: number
    ) =>
      checkDefaultSize({
        sizeStrategy: SizeStrategy.Constant,
        cacheSize: list.length,
        itemSize,
        setItemSize: (item, defaultSize) =>
          (item.size = list.reduce(
            (a, i) =>
              item.$index === Number(Object.keys(i)[0])
                ? Object.values(i)[0]
                : a,
            defaultSize as number
          )),
        updateCache,
        before: itemSize || Object.values(list[0])[0]
      });

    const checkConstantOnRemove = (
      list: IndexSizeList,
      toRemove: number[],
      itemSize: number
    ) =>
      checkConstantOnInit(
        list,
        cache => cache.removeItems(toRemove, false),
        itemSize
      );

    const checkConstantOnAdd = (
      list: IndexSizeList,
      toAdd: IndexSizeList,
      itemSize: number
    ) =>
      checkConstantOnInit(
        list,
        cache =>
          toAdd.forEach(r => {
            const key = Number(Object.keys(r)[0]);
            cache.add({ $index: key, size: r[key], data: {} } as Item);
          }),
        itemSize
      );

    [12, NaN].forEach(itemSize => {
      it('should not change default size on init', () =>
        checkConstantOnInit(
          [{ 1: 15 }, { 2: 16 }, { 3: 15 }],
          () => null,
          itemSize
        ));

      it('should not change default size on init (2)', () =>
        checkConstantOnInit(
          [{ 1: 15 }, { 2: 16 }, { 3: 17 }],
          () => null,
          itemSize
        ));

      it('should not change default size on remove (1)', () =>
        checkConstantOnRemove([{ 1: 5 }, { 2: 6 }, { 3: 7 }], [], itemSize));

      it('should not change default size on remove (2)', () =>
        checkConstantOnRemove(
          [{ 1: 10 }, { 2: 11 }, { 3: 12 }],
          [1],
          itemSize
        ));

      it('should not change default size on add (1)', () =>
        checkConstantOnAdd(
          [{ 1: 5 }, { 2: 6 }],
          [{ 1: 5 }, { 2: 5 }, { 3: 5 }],
          itemSize
        ));

      it('should not change default size on add (2)', () =>
        checkConstantOnAdd(
          [{ 1: 10 }, { 2: 10 }],
          [{ 1: 5 }, { 2: 5 }, { 3: 5 }],
          itemSize
        ));
    });
  });

  describe('Insert', () => {
    const MIN = 1,
      COUNT = 4;
    const items = generateBufferItems(MIN, COUNT);
    let cache: Cache<Data>;

    beforeEach(() => {
      cache = new Cache(settings as never, loggerMock as never);
      items.forEach(item => cache.add(item));
    });

    const make = (idList: Id[]): Data[] => idList.map(id => generateItem(id));

    const insertConfigList: ActionCacheConfig[] = [
      {
        title: 'not insert, empty case',
        action: () => cache.insertItems(make([]), 3, Direction.backward, false),
        result: [{ 1: 1 }, { 2: 2 }, { 3: 3 }, { 4: 4 }]
      },
      {
        title: 'insert in existed range, before 3',
        action: () =>
          cache.insertItems(make(['A', 'B']), 3, Direction.backward, false),
        result: [{ 1: 1 }, { 2: 2 }, { 3: 'A' }, { 4: 'B' }, { 5: 3 }, { 6: 4 }]
      },
      {
        title: 'insert in existed range, before 3 (fixRight)',
        action: () =>
          cache.insertItems(make(['A', 'B']), 3, Direction.backward, true),
        result: [
          { '-1': 1 },
          { 0: 2 },
          { 1: 'A' },
          { 2: 'B' },
          { 3: 3 },
          { 4: 4 }
        ]
      },
      {
        title: 'insert in existed range, after 3',
        action: () =>
          cache.insertItems(make(['A', 'B']), 3, Direction.forward, false),
        result: [{ 1: 1 }, { 2: 2 }, { 3: 3 }, { 4: 'A' }, { 5: 'B' }, { 6: 4 }]
      },
      {
        title: 'insert in existed range, after 3',
        action: () =>
          cache.insertItems(make(['A', 'B']), 3, Direction.forward, true),
        result: [
          { '-1': 1 },
          { 0: 2 },
          { 1: 3 },
          { 2: 'A' },
          { 3: 'B' },
          { 4: 4 }
        ]
      },
      {
        title: 'insert out of existed range, before 10',
        action: () =>
          cache.insertItems(make(['A', 'B']), 10, Direction.backward, false),
        result: [
          { 1: 1 },
          { 2: 2 },
          { 3: 3 },
          { 4: 4 },
          { 10: 'A' },
          { 11: 'B' }
        ]
      },
      {
        title: 'insert out of existed range, before 10 (fixRight)',
        action: () =>
          cache.insertItems(make(['A', 'B']), 10, Direction.backward, true),
        result: [
          { '-1': 1 },
          { 0: 2 },
          { 1: 3 },
          { 2: 4 },
          { 8: 'A' },
          { 9: 'B' }
        ]
      },
      {
        title: 'insert out of existed range, after 10',
        action: () =>
          cache.insertItems(make(['A', 'B']), 10, Direction.forward, false),
        result: [
          { 1: 1 },
          { 2: 2 },
          { 3: 3 },
          { 4: 4 },
          { 11: 'A' },
          { 12: 'B' }
        ]
      },
      {
        title: 'insert out of existed range, after 10 (fixRight)',
        action: () =>
          cache.insertItems(make(['A', 'B']), 10, Direction.forward, true),
        result: [
          { '-1': 1 },
          { 0: 2 },
          { 1: 3 },
          { 2: 4 },
          { 9: 'A' },
          { 10: 'B' }
        ]
      },
      {
        title: 'insert out of existed range, before -10',
        action: () =>
          cache.insertItems(make(['A', 'B']), -10, Direction.backward, false),
        result: [
          { '-10': 'A' },
          { '-9': 'B' },
          { 3: 1 },
          { 4: 2 },
          { 5: 3 },
          { 6: 4 }
        ]
      },
      {
        title: 'insert out of existed range, before -10 (fixRight)',
        action: () =>
          cache.insertItems(make(['A', 'B']), -10, Direction.backward, true),
        result: [
          { '-12': 'A' },
          { '-11': 'B' },
          { 1: 1 },
          { 2: 2 },
          { 3: 3 },
          { 4: 4 }
        ]
      },
      {
        title: 'insert out of existed range, after -10',
        action: () =>
          cache.insertItems(make(['A', 'B']), -10, Direction.forward, false),
        result: [
          { '-9': 'A' },
          { '-8': 'B' },
          { 3: 1 },
          { 4: 2 },
          { 5: 3 },
          { 6: 4 }
        ]
      },
      {
        title: 'insert out of existed range, after -10 (fixRight)',
        action: () =>
          cache.insertItems(make(['A', 'B']), -10, Direction.forward, true),
        result: [
          { '-11': 'A' },
          { '-10': 'B' },
          { 1: 1 },
          { 2: 2 },
          { 3: 3 },
          { 4: 4 }
        ]
      }
    ];

    insertConfigList.forEach(config =>
      it('should ' + config.title, () => {
        config.action();
        checkCache(cache, config);
      })
    );
  });

  describe('Range size', () => {
    let cache: Cache<Data>;

    beforeEach(() => {
      cache = new Cache(
        {
          ...settings,
          itemSize: 10,
          sizeStrategy: SizeStrategy.Constant
        } as never,
        loggerMock as never
      );
      [
        { index: -2, size: 35 },
        { index: 2, size: 0 },
        { index: 8, size: 5 }
      ].forEach(({ index, size }) =>
        cache.add(generateBufferItem(index, { ...generateItem(index), size }))
      );
    });

    [
      { first: 1, last: 0, size: 0 },
      { first: 1, last: 1, size: 10 },
      { first: -2, last: -2, size: 35 },
      { first: 2, last: 2, size: 10 },
      { first: -2, last: 8, size: 130 },
      { first: 3, last: 5, size: 30 },
      { first: -1000000000, last: 1000000000, size: 20000000030 }
    ].forEach(({ first, last, size }) =>
      it(`should calculate the size of [${first}, ${last}]`, () => {
        expect(cache.getRangeSize(first, last)).toBe(size);
      })
    );
  });

  describe('Index at offset', () => {
    let cache: Cache<Data>;
    const row = (index: number, size: number) =>
      generateBufferItem(index, { ...generateItem(index), size });
    // Deliberately unsorted, including fallback sizes and fractional measurements.
    const rows = [
      [40, 30],
      [-2, 35],
      [100, 1.25],
      [2, 0],
      [-100, 5],
      [8, 5],
      [-40, 25],
      [90, 10]
    ];

    beforeEach(() => {
      cache = new Cache(
        {
          ...settings,
          itemSize: 10,
          sizeStrategy: SizeStrategy.Constant
        } as never,
        loggerMock as never
      );
      rows.forEach(([index, size]) => cache.add(row(index, size)));
    });

    const checkGeometry = (at = (index: number) => index) => {
      const sum = (first: number, last: number) => {
        let result = 0;
        for (let index = first; index <= last; index++) {
          result += cache.getSizeByIndex(index);
        }
        return result;
      };
      [-160, -10, 0, 20, 160].map(at).forEach(origin => {
        [
          -120, -100, -99, -40, -39, -3, -2, -1, 0, 2, 8, 9, 40, 41, 99, 100,
          101, 120
        ].forEach(base => {
          const index = at(base);
          const position =
            index >= origin ? sum(origin, index - 1) : -sum(index, origin - 1);
          const size = cache.getSizeByIndex(index);
          [0, size / 2, size - 0.25].forEach(delta => {
            expect(cache.getIndexAtOffset(origin, position + delta)).toEqual({
              index,
              position
            });
          });
          expect(
            cache.getRangeSize(Math.min(origin, index), Math.max(origin, index))
          ).toBe(sum(Math.min(origin, index), Math.max(origin, index)));
        });
      });
    };

    it('should resolve exact boundaries and row interiors in both directions', () =>
      checkGeometry());

    it('should use neighboring measurements without scanning the cache', () => {
      const items = (cache as unknown as { items: Map<number, unknown> }).items;
      const scan = jest.spyOn(items, 'values');
      expect(cache.getIndexAtOffset(0, 20)).toEqual({ index: 2, position: 20 });
      expect(cache.getIndexAtOffset(0, -45)).toEqual({
        index: -2,
        position: -45
      });
      expect(scan).not.toHaveBeenCalled();
    });

    it('should sum whole size buckets instead of scanning the cache', () => {
      // spread over many buckets, so that ranges take whole buckets and visit only the edges
      const spread = (index: number) => index * 37;
      cache.reset(true);
      rows.forEach(([index, size]) => cache.add(row(spread(index), size)));
      const items = (cache as unknown as { items: Map<number, unknown> }).items;
      const scans = [jest.spyOn(items, 'values'), jest.spyOn(items, 'forEach')];
      checkGeometry(spread);
      scans.forEach(scan => expect(scan).not.toHaveBeenCalled());
      cache.add(row(spread(8), 45));
      cache.add(row(spread(-90), 0));
      checkGeometry(spread);
      cache.removeItems([spread(-40)], true);
      checkGeometry(spread);
      cache.shiftIndexes(-300);
      checkGeometry(spread);
    });

    it('should skip enormous unknown spans without walking individual indexes', () => {
      cache.reset(true);
      const read = jest.spyOn(cache, 'getSizeByIndex');
      [-5_000_000_000, 5_000_000_000].forEach(offset => {
        read.mockClear();
        expect(cache.getIndexAtOffset(-250_000_000, offset)).toEqual({
          index: -250_000_000 + offset / 10,
          position: offset
        });
        expect(read.mock.calls.length).toBeLessThan(100);
      });
    });

    it('should reflect measurements, mutations and resets without stale geometry', () => {
      checkGeometry();
      cache.add(row(8, 45));
      cache.add(row(-90, 0));
      checkGeometry();
      cache.insertItems(
        [generateItem(1), generateItem(2)],
        0,
        Direction.backward,
        false
      );
      checkGeometry();
      cache.removeItems([-40, 10], true);
      checkGeometry();
      const before = [row(20, 12), row(21, 15)];
      before.forEach(item => cache.add(item));
      cache.updateSubset(before, [row(20, 7), row(21, 8), row(22, 9)]);
      checkGeometry();
      cache.shiftIndexes(-30);
      checkGeometry();
      cache.reset(false);
      checkGeometry();
      cache.reset(true);
      checkGeometry();
    });

    it('should use the current default estimate after it changes', () => {
      cache = new Cache(
        { ...settings, itemSize: 10 } as never,
        loggerMock as never
      );
      cache.add(row(-100, 10));
      cache.add(row(100, 20));
      cache.recalculateDefaultSize();
      expect(cache.getDefaultSize()).toBe(15);
      checkGeometry();
      cache.add(row(-100, 30));
      cache.recalculateDefaultSize();
      expect(cache.getDefaultSize()).toBe(25);
      checkGeometry();
    });
  });
});
