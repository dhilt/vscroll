import { Buffer } from '../src/classes/buffer';

import { Data, BufferParams } from './misc/types';
import { generateItem, generateBufferItem as cb, generateBufferItems } from './misc/items';

const loggerMock = { log: () => null };

const makeBuffer = ({ min, max, start }: BufferParams): Buffer<Data> => {
  const buffer = new Buffer<Data>({
    itemSize: NaN,
    cacheData: false,
    startIndex: Number.isInteger(start) ? start : 1,
    minIndex: min,
    maxIndex: max,
  } as never, () => null, loggerMock as never);
  buffer.items = generateBufferItems(min, max - min + 1);
  return buffer;
};

describe('Buffer Spec', () => {

  describe('Update', () => {

    const check = (buffer: Buffer<Data>, list: { [key: string]: number }[]) => {
      // console.log(buffer.items.map(i => i.get()));
      expect(buffer.size).toEqual(list.length);
      list.forEach((current, index) => {
        const $index = Number(Object.keys(current)[0]);
        if (index === 0) {
          expect(buffer.firstIndex).toEqual($index);
          expect(buffer.absMinIndex).toEqual($index);
        }
        if (index === list.length - 1) {
          expect(buffer.lastIndex).toEqual($index);
          expect(buffer.absMaxIndex).toEqual($index);
        }
        const id = current[$index];
        const item = buffer.items[index];
        expect(item.$index).toEqual($index);
        expect(item.data.id).toEqual(id);
      });
    };

    it('should pass all (simple)', () => {
      const buffer = makeBuffer({ min: 1, max: 3 });
      buffer.updateItems(() => true, cb);
      check(buffer, [{ 1: 1 }, { 2: 2 }, { 3: 3 }]);
    });

    it('should pass all (truthy)', () => {
      const buffer = makeBuffer({ min: 1, max: 10 });
      buffer.updateItems(({ $index }) => {
        switch ($index) {
          case 1: return 1;
          case 2: return 'test';
          case 3: return {};
          case 4: return () => null;
          case 5: return class { };
          case 6: return new Map();
          case 7: return new Set();
          case 8: return Symbol();
          case 9: return new Date();
          case 10: return new RegExp('');
        }
      }, cb);
      check(buffer, Array.from({ length: 10 }).map((j, i) => ({ [i + 1]: i + 1 })));
    });

    it('should remove all (simple)', () => {
      const buffer = makeBuffer({ min: 1, max: 3 });
      buffer.updateItems(() => false, cb);
      check(buffer, []);
    });

    it('should remove all (empty array)', () => {
      const buffer = makeBuffer({ min: 1, max: 10 });
      buffer.updateItems(() => [], cb);
      check(buffer, []);
    });

    it('should remove all (falsy)', () => {
      const buffer = makeBuffer({ min: 1, max: 10 });
      buffer.updateItems(({ $index }) => {
        switch ($index) {
          case 1: return 0;
          case 2: return -0;
          case 3: return '';
          case 4: return NaN;
          case 5: return null;
          case 6: return void 0;
        }
      }, cb);
      check(buffer, []);
    });

    [false, true].forEach(fixRight => {
      const token = fixRight ? ' (fixRight)' : '';

      it('should remove left item' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 3 });
        buffer.updateItems(({ $index }) => $index !== 1, cb, fixRight);
        check(buffer, fixRight
          ? [{ 2: 2 }, { 3: 3 }]
          : [{ 1: 2 }, { 2: 3 }]
        );
      });

      it('should remove right item' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 3 });
        buffer.updateItems(({ $index }) => $index !== 3, cb, fixRight);
        check(buffer, fixRight
          ? [{ 2: 1 }, { 3: 2 }]
          : [{ 1: 1 }, { 2: 2 }]
        );
      });

      it('should remove some middle items' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 5 });
        buffer.updateItems(({ $index }) => $index !== 2 && $index !== 4, cb, fixRight);
        check(buffer, fixRight
          ? [{ 3: 1 }, { 4: 3 }, { 5: 5 }]
          : [{ 1: 1 }, { 2: 3 }, { 3: 5 }]
        );
      });

      it('should prepend' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 2 });
        buffer.updateItems(({ $index, data }) => $index === 1 ? [
          generateItem(0), data
        ] : true, cb, fixRight);
        check(buffer, fixRight
          ? [{ 0: 0 }, { 1: 1 }, { 2: 2 }]
          : [{ 1: 0 }, { 2: 1 }, { 3: 2 }]
        );
      });

      it('should append' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 2 });
        buffer.updateItems(({ $index, data }) => $index === 2 ? [
          data, generateItem(3)
        ] : true, cb, fixRight);
        check(buffer, fixRight
          ? [{ 0: 1 }, { 1: 2 }, { 2: 3 }]
          : [{ 1: 1 }, { 2: 2 }, { 3: 3 }]
        );
      });

      it('should insert in left-center' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 3 });
        buffer.updateItems(({ $index, data }) => $index === 2 ? [
          generateItem(99), data
        ] : true, cb, fixRight);
        check(buffer, fixRight
          ? [{ 0: 1 }, { 1: 99 }, { 2: 2 }, { 3: 3 }]
          : [{ 1: 1 }, { 2: 99 }, { 3: 2 }, { 4: 3 }]
        );
      });

      it('should insert in right-center' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 3 });
        buffer.updateItems(({ $index, data }) => $index === 2 ? [
          data, generateItem(99)
        ] : true, cb, fixRight);
        check(buffer, fixRight
          ? [{ 0: 1 }, { 1: 2 }, { 2: 99 }, { 3: 3 }]
          : [{ 1: 1 }, { 2: 2 }, { 3: 99 }, { 4: 3 }]
        );
      });

      it('should replace middle item' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 3 });
        buffer.updateItems(({ $index }) => $index === 2 ? [
          generateItem(99)
        ] : true, cb, fixRight);
        check(buffer, [{ 1: 1 }, { 2: 99 }, { 3: 3 }]);
      });

      it('should replace left item' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 3 });
        buffer.updateItems(({ $index }) => $index === 1 ? [
          generateItem(99)
        ] : true, cb, fixRight);
        check(buffer, [{ 1: 99 }, { 2: 2 }, { 3: 3 }]);
      });

      it('should replace and insert' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 3 });
        buffer.updateItems(({ $index }) => $index === 2 ? [
          generateItem(97), generateItem(98), generateItem(99)
        ] : true, cb, fixRight);
        check(buffer, fixRight
          ? [{ '-1': 1 }, { 0: 97 }, { 1: 98 }, { 2: 99 }, { 3: 3 }]
          : [{ 1: 1 }, { 2: 97 }, { 3: 98 }, { 4: 99 }, { 5: 3 }]
        );
      });

      it('should perform complex update' + token, () => {
        const buffer = makeBuffer({ min: 1, max: 5 });
        buffer.updateItems(({ $index, data }) => {
          switch ($index) {
            case 1: return [generateItem(0), data];
            case 2: return [];
            case 3: return [generateItem(2), generateItem(4)];
            case 4: return [];
            case 5: return [data, generateItem(6)];
          }
        }, cb, fixRight);
        check(buffer, fixRight
          ? [{ 0: 0 }, { 1: 1 }, { 2: 2 }, { 3: 4 }, { 4: 5 }, { 5: 6 }]
          : [{ 1: 0 }, { 2: 1 }, { 3: 2 }, { 4: 4 }, { 5: 5 }, { 6: 6 }]
        );
      });
    });

  });

});
