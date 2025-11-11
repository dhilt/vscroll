import { INVALID_DATASOURCE_PREFIX, Scroller } from '../../src/scroller';

describe('Wrong Datasource on Scroller instantiation', () => {

  const checkScrollerError = (datasource, error) => {
    try {
      new Scroller({ datasource });
    } catch (e) {
      expect(e.message).toContain(INVALID_DATASOURCE_PREFIX);
      expect(e.message).toContain(error);
    }
  };

  it('should throw "get" must be set', () =>
    [
      void 0,
      null,
      'wrong',
      {},
      { get: void 0 }
    ].forEach(ds => checkScrollerError(ds, '"get" must be set'))
  );

  it('should throw "get" must be a function', () =>
    [
      { get: 'get' },
      { get: {} },
      { get: 1 },
      { get: true }
    ].forEach(ds => checkScrollerError(ds, '"get" must be a function'))
  );

  it('should throw "get" must have 2 argument(s)', () =>
    [
      { get: () => { } },
      { get: (a) => a },
      { get: (...a) => a },
    ].forEach(ds => checkScrollerError(ds, '"get" must have 2 argument(s)'))
  );

});

