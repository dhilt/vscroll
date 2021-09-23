import { Buffer } from '../src/classes/buffer';

import { Direction } from '../src/inputs';
import { generateItem as makeItem, generateBufferItem as cb, generateBufferItems, generateItem } from './misc/items';
import {
  Data, BufferParams, BufferUpdateConfig, BufferUpdateTrackConfig, BufferAppendConfig, BufferInsertConfig
} from './misc/types';

const loggerMock = { log: () => null };

const makeBuffer = (params: BufferParams): Buffer<Data> => {
  const { min, max, minCache, maxCache, absMin, absMax, start } = params;
  const _minCache = Number.isInteger(minCache) ? minCache : min;
  const _maxCache = Number.isInteger(maxCache) ? maxCache : max;
  const _absMin = Number.isInteger(absMin) ? absMin : _minCache;
  const _absMax = Number.isInteger(absMax) ? absMax : _maxCache;
  const buffer = new Buffer<Data>({
    itemSize: NaN,
    cacheData: false,
    startIndex: Number.isInteger(start) ? start : 1,
    minIndex: _absMin,
    maxIndex: _absMax,
  } as never, () => null, loggerMock as never);
  buffer.setItems(generateBufferItems(min, max - min + 1));
  generateBufferItems(_minCache, _maxCache - _minCache + 1).forEach(item => buffer.cacheItem(item));
  return buffer;
};

const checkUpdate = ({ min, max, predicate, fixRight, list }: BufferUpdateConfig) => () => {
  const buffer = makeBuffer({ min, max });
  buffer.updateItems(predicate, cb, void 0, fixRight);
  // console.log(buffer.items.map(i => i.get()));
  expect(buffer.size).toEqual(list.length);
  list.forEach((current, index) => {
    const $index = Number(Object.keys(current)[0]);
    if (index === 0) {
      expect(buffer.firstIndex).toEqual($index);
      expect(buffer.minIndex).toEqual($index);
      expect(buffer.absMinIndex).toEqual($index);
    }
    if (index === list.length - 1) {
      expect(buffer.lastIndex).toEqual($index);
      expect(buffer.maxIndex).toEqual($index);
      expect(buffer.absMaxIndex).toEqual($index);
    }
    const id = current[$index];
    const item = buffer.items[index];
    expect(item.$index).toEqual($index);
    expect(item.data.id).toEqual(id);
  });
};

const checkIndexTrackingOnUpdate = (params: BufferUpdateTrackConfig) => () => {
  const { index, predicate, fixRight, result, debug = false } = params;
  const buffer = makeBuffer(params);
  const item = buffer.get(index);
  const _item = debug && item ? JSON.parse(JSON.stringify(item.get())) : null;
  const dump = debug && JSON.parse(JSON.stringify(buffer.items.map(i => i.get())));
  const absMinBefore = debug && buffer.finiteAbsMinIndex, absMaxBefore = debug && buffer.finiteAbsMaxIndex;
  const minBefore = debug && buffer.minIndex, maxBefore = debug && buffer.maxIndex;

  const { trackedIndex } = buffer.updateItems(predicate, cb, index, fixRight);

  if (debug) {
    const trackedItem = buffer.get(trackedIndex);
    console.log(`item to track: ${_item.$index}~${_item.data.id}
abs before: [${absMinBefore}..${absMaxBefore}]
cache before: [${minBefore}..${maxBefore}]
initial: ${dump.map(i => `${i.$index}~${i.data.id}`).join(' ')}
updated: ${buffer.items.map(i => `${i.$index}~${i.data.id}`).join(' ')}
cache after: [${buffer.minIndex}..${buffer.maxIndex}]
abs after: [${buffer.finiteAbsMinIndex}..${buffer.finiteAbsMaxIndex}]
tracked index: ${trackedIndex ? `${trackedIndex}~${trackedItem ? trackedItem.get().data.id : '?'}` : 'undefined'}`);
  }

  expect(trackedIndex).toBe(result);
};

const checkAppend = (params: BufferAppendConfig) => () => {
  const buffer = makeBuffer(params);
  const firstIndex = buffer.items[0].$index;
  const firstId = buffer.items[0].data.id;
  let indexShift = 0;
  if (params.prepend) {
    buffer.prependVirtually(params.amount, params.fixRight);
    if (!params.fixRight) {
      indexShift += params.amount;
    }
  } else {
    buffer.appendVirtually(params.amount, params.fixRight);
    if (params.fixRight) {
      indexShift -= params.amount;
    }
  }
  expect(buffer.absMinIndex).toEqual(params.absMin - (params.fixRight ? params.amount : 0));
  expect(buffer.absMaxIndex).toEqual(params.absMax + (params.fixRight ? 0 : params.amount));
  expect(buffer.items[0].$index).toEqual(firstIndex + indexShift);
  expect(buffer.items[0].data.id).toEqual(firstId);
};

const checkInsert = (params: BufferInsertConfig) => () => {
  const bufferBefore = makeBuffer(params);
  const buffer = makeBuffer(params);
  const { result } = params;
  const items = params.items.map(id => generateItem(id));
  buffer.insertVirtually(items, params.index, params.direction, params.fixRight);

  buffer.items.forEach((item, i) => {
    const $index = result ? Number(Object.keys(result.list[i])[0]) : bufferBefore.items[i].$index;
    const id = result ? result.list[i][$index] : bufferBefore.items[i].data.id;
    expect(item.$index).toBe($index);
    expect(item.data.id).toBe(id);
  });

  expect(buffer.absMinIndex).toEqual(result ? result.absMin : bufferBefore.absMinIndex);
  expect(buffer.absMaxIndex).toEqual(result ? result.absMax : bufferBefore.absMaxIndex);
};

describe('Buffer Spec', () => {

  describe('Update', () => [
    {
      title: 'should pass all (simple)',
      min: 1, max: 3, fixRight: false,
      predicate: () => true,
      list: [{ 1: 1 }, { 2: 2 }, { 3: 3 }],
    }, {
      title: 'should pass all (truthy)',
      min: 1, max: 10, fixRight: false,
      predicate: ({ $index }) => {
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
      },
      list: Array.from({ length: 10 }).map((j, i) => ({ [i + 1]: i + 1 })),
    }, {
      title: 'should remove all (simple)',
      min: 1, max: 3, fixRight: false,
      predicate: () => false,
      list: [],
    }, {
      title: 'should remove all (empty array)',
      min: 1, max: 10, fixRight: false,
      predicate: () => [],
      list: [],
    }, {
      title: 'should remove all (falsy)',
      min: 1, max: 10, fixRight: false,
      predicate: ({ $index }) => {
        switch ($index) {
          case 1: return 0;
          case 2: return -0;
          case 3: return '';
          case 4: return NaN;
          case 5: return null;
          case 6: return void 0;
        }
      },
      list: [],
    }, {
      title: 'should remove left item',
      min: 1, max: 3, fixRight: false,
      predicate: ({ $index }) => $index !== 1,
      list: [{ 1: 2 }, { 2: 3 }],
    }, {
      title: 'should remove left item (fixRight)',
      min: 1, max: 3, fixRight: true,
      predicate: ({ $index }) => $index !== 1,
      list: [{ 2: 2 }, { 3: 3 }],
    }, {
      title: 'should remove right item',
      min: 1, max: 3, fixRight: false,
      predicate: ({ $index }) => $index !== 3,
      list: [{ 1: 1 }, { 2: 2 }],
    }, {
      title: 'should remove right item (fixRight)',
      min: 1, max: 3, fixRight: true,
      predicate: ({ $index }) => $index !== 3,
      list: [{ 2: 1 }, { 3: 2 }],
    }, {
      title: 'should remove some middle items',
      min: 1, max: 5, fixRight: false,
      predicate: ({ $index }) => $index !== 2 && $index !== 4,
      list: [{ 1: 1 }, { 2: 3 }, { 3: 5 }],
    }, {
      title: 'should remove some middle items (fixRight)',
      min: 1, max: 5, fixRight: true,
      predicate: ({ $index }) => $index !== 2 && $index !== 4,
      list: [{ 3: 1 }, { 4: 3 }, { 5: 5 }],
    }, {
      title: 'should prepend',
      min: 1, max: 2, fixRight: false,
      predicate: ({ $index, data }) => $index === 1 ? [makeItem(0), data] : true,
      list: [{ 1: 0 }, { 2: 1 }, { 3: 2 }],
    }, {
      title: 'should prepend (fixRight)',
      min: 1, max: 2, fixRight: true,
      predicate: ({ $index, data }) => $index === 1 ? [makeItem(0), data] : true,
      list: [{ 0: 0 }, { 1: 1 }, { 2: 2 }],
    }, {
      title: 'should append',
      min: 1, max: 2, fixRight: false,
      predicate: ({ $index, data }) => $index === 2 ? [data, makeItem(3)] : true,
      list: [{ 1: 1 }, { 2: 2 }, { 3: 3 }],
    }, {
      title: 'should append (fixRight)',
      min: 1, max: 2, fixRight: true,
      predicate: ({ $index, data }) => $index === 2 ? [data, makeItem(3)] : true,
      list: [{ 0: 1 }, { 1: 2 }, { 2: 3 }],
    }, {
      title: 'should insert in left-center',
      min: 1, max: 3, fixRight: false,
      predicate: ({ $index, data }) => $index === 2 ? [makeItem(99), data] : true,
      list: [{ 1: 1 }, { 2: 99 }, { 3: 2 }, { 4: 3 }],
    }, {
      title: 'should insert in left-center (fixRight)',
      min: 1, max: 3, fixRight: true,
      predicate: ({ $index, data }) => $index === 2 ? [makeItem(99), data] : true,
      list: [{ 0: 1 }, { 1: 99 }, { 2: 2 }, { 3: 3 }],
    }, {
      title: 'should insert in right-center',
      min: 1, max: 3, fixRight: false,
      predicate: ({ $index, data }) => $index === 2 ? [data, makeItem(99)] : true,
      list: [{ 1: 1 }, { 2: 2 }, { 3: 99 }, { 4: 3 }],
    }, {
      title: 'should insert in right-center (fixRight)',
      min: 1, max: 3, fixRight: true,
      predicate: ({ $index, data }) => $index === 2 ? [data, makeItem(99)] : true,
      list: [{ 0: 1 }, { 1: 2 }, { 2: 99 }, { 3: 3 }],
    }, {
      title: 'should replace middle item',
      min: 1, max: 3, fixRight: false,
      predicate: ({ $index }) => $index === 2 ? [makeItem(99)] : true,
      list: [{ 1: 1 }, { 2: 99 }, { 3: 3 }],
    }, {
      title: 'should replace middle item (fixRight)',
      min: 1, max: 3, fixRight: true,
      predicate: ({ $index }) => $index === 2 ? [makeItem(99)] : true,
      list: [{ 1: 1 }, { 2: 99 }, { 3: 3 }],
    }, {
      title: 'should replace left item',
      min: 1, max: 3, fixRight: false,
      predicate: ({ $index }) => $index === 1 ? [makeItem(99)] : true,
      list: [{ 1: 99 }, { 2: 2 }, { 3: 3 }],
    }, {
      title: 'should replace left item (fixRight)',
      min: 1, max: 3, fixRight: true,
      predicate: ({ $index }) => $index === 1 ? [makeItem(99)] : true,
      list: [{ 1: 99 }, { 2: 2 }, { 3: 3 }],
    }, {
      title: 'should replace and insert',
      min: 1, max: 3, fixRight: false,
      predicate: ({ $index }) => $index === 2 ? [makeItem(97), makeItem(98), makeItem(99)] : true,
      list: [{ 1: 1 }, { 2: 97 }, { 3: 98 }, { 4: 99 }, { 5: 3 }],
    }, {
      title: 'should replace and insert (fixRight)',
      min: 1, max: 3, fixRight: true,
      predicate: ({ $index }) => $index === 2 ? [makeItem(97), makeItem(98), makeItem(99)] : true,
      list: [{ '-1': 1 }, { 0: 97 }, { 1: 98 }, { 2: 99 }, { 3: 3 }],
    }, {
      title: 'should perform complex update',
      min: 1, max: 5, fixRight: false,
      predicate: ({ $index, data }) => {
        switch ($index) {
          case 1: return [makeItem(0), data];
          case 2: return [];
          case 3: return [makeItem(2), makeItem(4)];
          case 4: return [];
          case 5: return [data, makeItem(6)];
        }
      },
      list: [{ 1: 0 }, { 2: 1 }, { 3: 2 }, { 4: 4 }, { 5: 5 }, { 6: 6 }],
    }, {
      title: 'should perform complex update (fixRight)',
      min: 1, max: 5, fixRight: true,
      predicate: ({ $index, data }) => {
        switch ($index) {
          case 1: return [makeItem(0), data];
          case 2: return [];
          case 3: return [makeItem(2), makeItem(4)];
          case 4: return [];
          case 5: return [data, makeItem(6)];
        }
      },
      list: [{ 0: 0 }, { 1: 1 }, { 2: 2 }, { 3: 4 }, { 4: 5 }, { 5: 6 }],
    }]
    .forEach(config => it(config.title, checkUpdate(config)))
  );

  describe('Index tracking on Update', () => [
    {
      title: 'remove 1 item before',
      min: 1, max: 10, fixRight: false, index: 5, result: 4,
      predicate: ({ $index }) => $index !== 3,
    }, {
      title: 'remove 3 items before',
      min: 1, max: 10, fixRight: false, index: 5, result: 2,
      predicate: ({ $index }) => $index < 2 || $index > 4,
    }, {
      title: 'remove 3 items before (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 5,
      predicate: ({ $index }) => $index < 1 || $index > 3,
    }, {
      title: 'remove 1 item after',
      min: 1, max: 10, fixRight: false, index: 5, result: 5,
      predicate: ({ $index }) => $index !== 7,
    }, {
      title: 'remove 3 items after',
      min: 1, max: 10, fixRight: false, index: 5, result: 5,
      predicate: ({ $index }) => $index < 7 || $index > 9,
    }, {
      title: 'remove 3 items after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 8,
      predicate: ({ $index }) => $index < 7 || $index > 9,
    }, {
      title: 'remove 1 item before and 1 item after',
      min: 1, max: 10, fixRight: false, index: 5, result: 4,
      predicate: ({ $index }) => !($index === 4 || $index === 6),
    }, {
      title: 'remove 1 item before and 1 item after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 6,
      predicate: ({ $index }) => !($index === 4 || $index === 6),
    }, {
      title: 'insert 1 item before',
      min: 1, max: 10, fixRight: false, index: 5, result: 6,
      predicate: ({ $index, data }) => $index === 2 ? [data, makeItem('x')] : true,
    }, {
      title: 'insert 2 items before',
      min: 1, max: 10, fixRight: false, index: 5, result: 7,
      predicate: ({ $index, data }) => $index === 2 ? [data, makeItem('x'), makeItem('y')] : true,
    }, {
      title: 'insert 2 items before (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 5,
      predicate: ({ $index, data }) => $index === 2 ? [data, makeItem('x'), makeItem('y')] : true,
    }, {
      title: 'insert 1 item after',
      min: 1, max: 10, fixRight: false, index: 5, result: 5,
      predicate: ({ $index, data }) => $index === 7 ? [data, makeItem('x')] : true,
    }, {
      title: 'insert 2 items after',
      min: 1, max: 10, fixRight: false, index: 5, result: 5,
      predicate: ({ $index, data }) => $index === 7 ? [data, makeItem('x'), makeItem('y')] : true,
    }, {
      title: 'insert 2 items after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 3,
      predicate: ({ $index, data }) => $index === 7 ? [data, makeItem('x'), makeItem('y')] : true,
    }, {
      title: 'insert 1 item before and 1 item after',
      min: 1, max: 10, fixRight: false, index: 5, result: 6,
      predicate: ({ $index, data }) => $index === 5 ? [makeItem('x'), data, makeItem('y')] : true,
    }, {
      title: 'insert 1 item before and 1 item after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 4,
      predicate: ({ $index, data }) => $index === 5 ? [makeItem('x'), data, makeItem('y')] : true,
    }, {
      title: 'replace this item',
      min: 1, max: 10, fixRight: false, index: 5, result: 5,
      predicate: ({ $index }) => $index === 5 ? [makeItem('x')] : true,
    }, {
      title: 'replace this item (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 5,
      predicate: ({ $index }) => $index === 5 ? [makeItem('x')] : true,
    }, {
      title: 'replace this item, remove 1 before and 1 after',
      min: 1, max: 10, fixRight: false, index: 5, result: 4,
      predicate: ({ $index }) => $index < 4 || $index > 6 ? true : ($index === 5 ? [makeItem('x')] : []),
    }, {
      title: 'replace this item, remove 1 before and 1 after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 6,
      predicate: ({ $index }) => $index < 4 || $index > 6 ? true : ($index === 5 ? [makeItem('x')] : []),
    }, {
      title: 'replace this item, remove 3 after',
      min: 1, max: 10, fixRight: false, index: 5, result: 5,
      predicate: ({ $index }) => $index === 5 ? [makeItem('x')] : !($index > 5 && $index <= 8),
    }, {
      title: 'replace this item, remove 3 after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 8,
      predicate: ({ $index }) => $index === 5 ? [makeItem('x')] : !($index > 5 && $index <= 8),
    }, {
      title: 'replace this item, remove 3 before',
      min: 1, max: 10, fixRight: false, index: 5, result: 2,
      predicate: ({ $index }) => $index === 5 ? [makeItem('x')] : !($index < 5 && $index >= 2),
    }, {
      title: 'replace this item, remove 3 before (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 5,
      predicate: ({ $index }) => $index === 5 ? [makeItem('x')] : !($index < 5 && $index >= 2),
    }, {
      title: 'remove this item',
      min: 1, max: 10, fixRight: false, index: 5, result: 5,
      predicate: ({ $index }) => $index !== 5,
    }, {
      title: 'remove this item (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 6,
      predicate: ({ $index }) => $index !== 5,
    }, {
      title: 'remove this, 1 before and 1 after',
      min: 1, max: 10, fixRight: false, index: 5, result: 4,
      predicate: ({ $index }) => !($index >= 4 && $index <= 6),
    }, {
      title: 'remove this, 1 before and 1 after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 7,
      predicate: ({ $index }) => !($index >= 4 && $index <= 6),
    }, {
      title: 'remove this and all after',
      min: 1, max: 10, fixRight: false, index: 5, result: 4,
      predicate: ({ $index }) => !($index >= 5),
    }, {
      title: 'remove this and all after (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 10,
      predicate: ({ $index }) => !($index >= 5),
    }, {
      title: 'remove this and all before',
      min: 1, max: 10, fixRight: false, index: 5, result: 1,
      predicate: ({ $index }) => !($index <= 5),
    }, {
      title: 'remove this and all before (fixRight)',
      min: 1, max: 10, fixRight: true, index: 5, result: 6,
      predicate: ({ $index }) => !($index <= 5),
    }, {
      title: 'remove all',
      min: 1, max: 10, fixRight: false, index: 5, result: NaN,
      predicate: () => [],
    }]
    .forEach(config => it(config.title, checkIndexTrackingOnUpdate(config)))
  );

  describe('Index tracking on Update when flushing the Buffer', () => {
    describe('Cache is present', () => [
      {
        title: 'cache matches buffer',
        min: -9, max: 20, minCache: -9, maxCache: 20, fixRight: false, index: 5, result: NaN,
      }, {
        title: 'simple flush',
        min: 1, max: 10, minCache: -9, maxCache: 20, fixRight: false, index: 5, result: 1,
      }, {
        title: 'simple flush (fixRight)',
        min: 1, max: 10, minCache: -9, maxCache: 20, fixRight: true, index: 5, result: 11,
      }, {
        title: 'flush when eof',
        min: 1, max: 20, minCache: -9, maxCache: 20, fixRight: false, index: 5, result: 0,
      }, {
        title: 'flush when eof (fixRight)',
        min: 1, max: 20, minCache: -9, maxCache: 20, fixRight: true, index: 5, result: 20,
      }, {
        title: 'flush when bof',
        min: -9, max: 10, minCache: -9, maxCache: 20, fixRight: false, index: 5, result: -9,
      }, {
        title: 'flush when bof (fixRight)',
        min: -9, max: 10, minCache: -9, maxCache: 20, fixRight: true, index: 5, result: 11,
      }]
      .forEach(config => it(config.title, checkIndexTrackingOnUpdate({
        ...config,
        predicate: () => []
      })))
    );

    describe('No Cache behind, but absolute borders are present', () => [
      {
        title: 'borders matches buffer',
        min: -9, max: 20, absMin: -9, absMax: 20, fixRight: false, index: 5, result: NaN,
      }, {
        title: 'simple flush',
        min: 1, max: 10, absMin: -9, absMax: 20, fixRight: false, index: 5, result: 1,
      }, {
        title: 'simple flush (fixRight)',
        min: 1, max: 10, absMin: -9, absMax: 20, fixRight: true, index: 5, result: 11,
      }, {
        title: 'no right border',
        min: 1, max: 10, absMin: -9, absMax: 10, fixRight: false, index: 5, result: 0,
      }, {
        title: 'no right border (fixRight)',
        min: 1, max: 10, absMin: -9, absMax: 10, fixRight: true, index: 5, result: 10,
      }, {
        title: 'no left border',
        min: 1, max: 10, absMin: 1, absMax: 20, fixRight: false, index: 5, result: 1,
      }, {
        title: 'no left border (fixRight)',
        min: 1, max: 10, absMin: 1, absMax: 20, fixRight: true, index: 5, result: 11,
      }]
      .forEach(config => it(config.title, checkIndexTrackingOnUpdate({
        ...config,
        predicate: () => []
      })))
    );
  });

  describe('Append', () => [
    {
      title: 'append & no fixRight',
      min: -9, max: 10, absMin: -99, absMax: 100,
      prepend: false, amount: 10, fixRight: false,
    }, {
      title: 'append & fixRight',
      min: -9, max: 10, absMin: -99, absMax: 100,
      prepend: false, amount: 10, fixRight: true,
    }, {
      title: 'prepend & no fixRight',
      min: -9, max: 10, absMin: -99, absMax: 100,
      prepend: true, amount: 10, fixRight: false,
    }, {
      title: 'prepend & fixRight',
      min: -9, max: 10, absMin: -99, absMax: 100,
      prepend: true, amount: 10, fixRight: true,
    }]
    .forEach(config => it(config.title, checkAppend(config)))
  );

  describe('Insert', () => [
    {
      title: '[skip] inside buffer, forward',
      items: ['A', 'B'], index: -1, direction: Direction.forward, fixRight: false
    }, {
      title: '[skip] inside buffer, forward + fixRight',
      items: ['A', 'B'], index: -1, direction: Direction.forward, fixRight: true
    }, {
      title: 'at the left border of buffer, backward',
      items: ['A', 'B'], index: -1, direction: Direction.backward, fixRight: false,
      result: { list: [{ 1: -1 }, { 2: 0 }, { 3: 1 }], absMin: -100, absMax: 102 }
    }, {
      title: '[skip] inside buffer, backward',
      items: ['A', 'B'], index: 1, direction: Direction.backward, fixRight: false
    }, {
      title: '[skip] inside buffer, backward + fixRight',
      items: ['A', 'B'], index: 1, direction: Direction.backward, fixRight: true
    }, {
      title: 'at the right border of buffer, forward',
      items: ['A', 'B'], index: 1, direction: Direction.forward, fixRight: false,
      result: { list: [{ '-1': -1 }, { 0: 0 }, { 1: 1 }], absMin: -100, absMax: 102 }
    }, {
      title: 'out of the left border, backward',
      items: ['A', 'B'], index: -50, direction: Direction.backward, fixRight: false,
      result: { list: [{ 1: -1 }, { 2: 0 }, { 3: 1 }], absMin: -100, absMax: 102 }
    }, {
      title: 'out of the left border, backward + fixRight',
      items: ['A', 'B'], index: -50, direction: Direction.backward, fixRight: true,
      result: { list: [{ '-1': -1 }, { 0: 0 }, { 1: 1 }], absMin: -102, absMax: 100 }
    }, {
      title: 'out of the left border, forward',
      items: ['A', 'B'], index: -50, direction: Direction.forward, fixRight: false,
      result: { list: [{ 1: -1 }, { 2: 0 }, { 3: 1 }], absMin: -100, absMax: 102 }
    }, {
      title: 'out of the left border, forward + fixRight',
      items: ['A', 'B'], index: -50, direction: Direction.forward, fixRight: true,
      result: { list: [{ '-1': -1 }, { 0: 0 }, { 1: 1 }], absMin: -102, absMax: 100 }
    }, {
      title: 'out of the right border, backward',
      items: ['A', 'B'], index: 50, direction: Direction.backward, fixRight: false,
      result: { list: [{ '-1': -1 }, { 0: 0 }, { 1: 1 }], absMin: -100, absMax: 102 }
    }, {
      title: 'out of the right border, backward + fixRight',
      items: ['A', 'B'], index: 50, direction: Direction.backward, fixRight: true,
      result: { list: [{ '-3': -1 }, { '-2': 0 }, { '-1': 1 }], absMin: -102, absMax: 100 }
    }, {
      title: 'out of the right border, forward',
      items: ['A', 'B'], index: 50, direction: Direction.forward, fixRight: false,
      result: { list: [{ '-1': -1 }, { 0: 0 }, { 1: 1 }], absMin: -100, absMax: 102 }
    }, {
      title: 'out of the right border, forward + fixRight',
      items: ['A', 'B'], index: 50, direction: Direction.forward, fixRight: true,
      result: { list: [{ '-3': -1 }, { '-2': 0 }, { '-1': 1 }], absMin: -102, absMax: 100 }
    }, {
      title: 'on the right border, forward + fixRight',
      items: ['A', 'B'], index: 100, direction: Direction.forward, fixRight: true,
      result: { list: [{ '-3': -1 }, { '-2': 0 }, { '-1': 1 }], absMin: -102, absMax: 100 }
    }, {
      title: 'on the left border, backward',
      items: ['A', 'B'], index: -100, direction: Direction.backward, fixRight: false,
      result: { list: [{ 1: -1 }, { 2: 0 }, { 3: 1 }], absMin: -100, absMax: 102 }
    }, {
      title: '[skip] out of the right abs border, forward',
      items: ['A', 'B'], index: 150, direction: Direction.forward, fixRight: false
    }, {
      title: '[skip] on the right abs border, forward',
      items: ['A', 'B'], index: 101, direction: Direction.forward, fixRight: false
    }, {
      title: '[skip] on the right abs border, backward',
      items: ['A', 'B'], index: 101, direction: Direction.backward, fixRight: false
    }, {
      title: '[skip] out of the right abs border, forward + fixRight',
      items: ['A', 'B'], index: 150, direction: Direction.forward, fixRight: true
    }, {
      title: '[skip] on the right abs border, forward + fixRight',
      items: ['A', 'B'], index: 101, direction: Direction.forward, fixRight: true
    }, {
      title: '[skip] on the right abs border, backward + fixRight',
      items: ['A', 'B'], index: 101, direction: Direction.backward, fixRight: true
    }, {
      title: '[skip] out of the left abs border, forward',
      items: ['A', 'B'], index: -150, direction: Direction.forward, fixRight: false
    }, {
      title: '[skip] on the left abs border, forward',
      items: ['A', 'B'], index: -101, direction: Direction.forward, fixRight: false
    }, {
      title: '[skip] on the left abs border, backward',
      items: ['A', 'B'], index: -101, direction: Direction.backward, fixRight: false
    }, {
      title: '[skip] out of the left abs border, forward + fixRight',
      items: ['A', 'B'], index: -150, direction: Direction.forward, fixRight: true
    }, {
      title: '[skip] on the left abs border, forward + fixRight',
      items: ['A', 'B'], index: -101, direction: Direction.forward, fixRight: true
    }, {
      title: '[skip] on the left abs border, backward + fixRight',
      items: ['A', 'B'], index: -101, direction: Direction.backward, fixRight: true
    }]
    .map(c => ({ ...c, min: -1, max: 1, absMin: -100, absMax: 100 }))
    .forEach(config => it(config.title, checkInsert(config)))
  );

});