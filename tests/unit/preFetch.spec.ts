import PreFetch from '../../src/processes/preFetch';
import { Buffer } from '../../src/classes/buffer';
import { Scroller } from '../../src/scroller';

describe('Prefetch index resolution', () => {
  const create = (
    min: number,
    max: number,
    origin: number,
    offset: number,
    itemSize = 20
  ) => {
    const buffer = new Buffer(
      { minIndex: min, maxIndex: max, startIndex: origin, itemSize } as never,
      () => null,
      { log: () => null } as never
    );
    return {
      buffer,
      state: {
        fetch: {
          positions: { start: offset },
          first: { index: NaN, indexBuffer: NaN, position: NaN }
        },
        cycle: { innerLoop: { isInitial: false } }
      },
      logger: { log: () => null }
    };
  };

  [
    {
      min: 1,
      max: 500_000_000,
      origin: 250_000_000,
      offset: -4_999_999_980,
      index: 1
    },
    {
      min: 1,
      max: Infinity,
      origin: 250_000_000,
      offset: -4_999_999_980,
      index: 1
    },
    {
      min: -Infinity,
      max: -1,
      origin: -250_000_000,
      offset: -5_000_000_000,
      index: -500_000_000
    },
    {
      min: -Infinity,
      max: Infinity,
      origin: -250_000_000,
      offset: 10_000_000_000,
      index: 250_000_000
    }
  ].forEach(({ min, max, origin, offset, index }) =>
    it(`should resolve a large jump with bounds [${min}, ${max}]`, () => {
      const scroller = create(min, max, origin, offset);
      PreFetch.setFirstIndex(scroller as unknown as Scroller);
      expect(scroller.state.fetch.first).toEqual({
        index,
        indexBuffer: index,
        position: offset
      });
    })
  );

  it('should start at the configured index during the initial loop', () => {
    const scroller = create(1, Infinity, 100, -1000);
    scroller.state.cycle.innerLoop.isInitial = true;
    PreFetch.setFirstIndex(scroller as unknown as Scroller);
    expect(scroller.state.fetch.first).toEqual({
      index: 100,
      indexBuffer: 100,
      position: 0
    });
  });

  it('should defer inverse lookup until an item size is known', () => {
    const scroller = create(-Infinity, Infinity, -100, -1000, NaN);
    PreFetch.setFirstIndex(scroller as unknown as Scroller);
    expect(scroller.state.fetch.first).toEqual({
      index: -100,
      indexBuffer: -100,
      position: 0
    });
  });
});
