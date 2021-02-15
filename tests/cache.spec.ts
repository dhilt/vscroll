import { Cache } from '../src/classes/cache';
import { Item } from '../src/classes/item';

import { Data } from './misc/types';
import { generateBufferItem, generateBufferItems, generateItem } from './misc/items';

describe('Cache Spec', () => {

  describe('Remove', () => {
    const loggerMock = { log: () => null };
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
      cache = new Cache(NaN, true, loggerMock as never);
      items.forEach(item => cache.add(item));
    });

    it('should not remove when out of the right border & immutableTop = true', (done) => {
      cache.removeItems([99], true);
      check([1, 2, 3, 4, 5]);
      done();
    });

    it('should increase all indexes when out of the right border & immutableTop = false', (done) => {
      cache.removeItems([99], false);
      check([null, 1, 2, 3, 4, 5]);
      done();
    });

    it('should not remove when out of the left border & immutableTop = false', (done) => {
      cache.removeItems([-99], false);
      check([1, 2, 3, 4, 5]);
      done();
    });

    it('should decrease all indexes when out of the left border & immutableTop = true', (done) => {
      cache.removeItems([-99], true);
      check([2, 3, 4, 5]);
      done();
    });

    it('should decrease bottom indexes when removing from top & immutableTop = true', (done) => {
      cache.removeItems([1, 2], true);
      check([3, 4, 5, null, null]);
      done();
    });

    it('should not shift indexes when removing from top & immutableTop = false', (done) => {
      cache.removeItems([1, 2], false);
      check([null, null, 3, 4, 5]);
      done();
    });

    it('should not shift indexes when removing from bottom & immutableTop = true', (done) => {
      cache.removeItems([4, 5], true);
      check([1, 2, 3, null, null]);
      done();
    });

    it('should increase top indexes when removing from bottom & immutableTop = false', (done) => {
      cache.removeItems([4, 5], false);
      check([null, null, 1, 2, 3]);
      done();
    });

    it('should decrease the below indexes when removing from center & immutableTop = true', (done) => {
      cache.removeItems([3], true);
      check([1, 2, 4, 5, null]);
      done();
    });

    it('should shift increase the above indexes when removing from center & immutableTop = false', (done) => {
      cache.removeItems([3], false);
      check([null, 1, 2, 4, 5]);
      done();
    });

    it('should remove non-sequenced list', (done) => {
      cache.removeItems([1, 3, 5], true);
      check([2, 4, null, null, null]);
      done();
    });
  });

  describe('Update', () => {
    const loggerMock = { log: () => null };
    const MIN = 1, COUNT = 7;
    const items = generateBufferItems(MIN, COUNT);
    const subset = items.slice(2, 5); // [3, 4, 5]

    let cache: Cache<Data>;

    const make = (list: { [key: string]: number | string }[]): Item<Data>[] =>
      list.map(current => {
        const index = Number(Object.keys(current)[0]);
        const id = current[index];
        return generateBufferItem(index, generateItem(id));
      });

    const checkUpdate = (list: { [key: string]: number | string }[]) => {
      // console.log(Array.from((cache as unknown as { items: Map<number, Item<Data>> }).items).map(i => i[1].data));
      expect(cache.size).toEqual(list.length);
      list.forEach((current, index) => {
        const $index = Number(Object.keys(current)[0]);
        // if (index === 0) {
        //   expect(cache.minIndex).toEqual($index);
        // }
        // if (index === list.length - 1) {
        //   expect(cache.maxIndex).toEqual($index);
        // }
        const id = current[$index];
        const item = cache.get($index);
        expect(item.$index).toEqual($index);
        expect(item.data.id).toEqual(id);
      });
    };

    beforeEach(() => {
      cache = new Cache(NaN, true, loggerMock as never);
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

});
