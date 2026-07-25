import { Scroller } from '../../src/scroller';
import Fetch from '../../src/processes/fetch';
import { CommonProcess, ProcessStatus } from '../../src/processes/misc';

type Success = (data: unknown[]) => void;
type Failure = (error: unknown) => void;
type Get = (
  index: number,
  count: number,
  success: Success,
  fail: Failure
) => unknown;

interface ErrorSource {
  get: Get;
  release?: () => void;
}

const error = 0;

const sources: Array<[string, () => ErrorSource]> = [
  [
    'synchronous callback',
    () => ({
      get: (_index, _count, _success, fail) => fail(error)
    })
  ],
  [
    'asynchronous callback',
    () => {
      let fail: Failure;
      return {
        get: (_index, _count, _success, onError) => {
          fail = onError;
        },
        release: () => fail(error)
      };
    }
  ],
  [
    'rejected Promise',
    () => ({
      get: () => Promise.reject(error)
    })
  ],
  [
    'synchronous Observable',
    () => ({
      get: () => ({
        subscribe: (_success: Success, fail: Failure) => {
          fail(error);
          return { unsubscribe: () => null };
        }
      })
    })
  ],
  [
    'asynchronous Observable',
    () => {
      let fail: Failure;
      return {
        get: () => ({
          subscribe: (_success: Success, onError: Failure) => {
            fail = onError;
            return { unsubscribe: () => null };
          }
        }),
        release: () => fail(error)
      };
    }
  ]
];

const createScroller = (get: Get) => {
  const call = jest.fn();
  const scroller = {
    datasource: { get },
    workflow: { call },
    logger: { log: jest.fn() },
    state: {
      fetch: {
        index: 1,
        count: 2,
        cancel: null
      },
      scroll: {
        positionBeforeAsync: null
      }
    },
    viewport: {
      scrollPosition: 0
    }
  } as unknown as Scroller;

  return { call, scroller };
};

describe('Datasource errors', () => {
  test.each(sources)(
    '%s produces one Fetch error',
    async (_title, createSource) => {
      const source = createSource();
      const { call, scroller } = createScroller(source.get);

      Fetch.run(scroller);
      source.release?.();
      await Promise.resolve();

      expect(call).toHaveBeenCalledTimes(1);
      expect(call).toHaveBeenCalledWith({
        process: CommonProcess.fetch,
        status: ProcessStatus.error,
        payload: { error }
      });
    }
  );
});
