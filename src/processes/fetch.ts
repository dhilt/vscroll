import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { ObservableLike } from '../interfaces/index';

interface Immediate {
  data: unknown[] | null;
  error: unknown | null;
  isError: boolean;
}

type FetchGetResult = Immediate | Promise<unknown>;

interface FetchBox {
  success: (value: unknown[]) => void;
  fail: (value: unknown) => void;
}

export default class Fetch extends BaseProcessFactory(CommonProcess.fetch) {
  static run(scroller: Scroller): void {
    const { workflow } = scroller;

    const box = {
      success: (data: unknown[]) => {
        scroller.logger.log(
          () =>
            `resolved ${data.length} items ` +
            `(index = ${scroller.state.fetch.index}, count = ${scroller.state.fetch.count})`
        );
        scroller.state.fetch.newItemsData = data;
        workflow.call({
          process: Fetch.process,
          status: ProcessStatus.next
        });
      },
      fail: (error: unknown) =>
        workflow.call({
          process: Fetch.process,
          status: ProcessStatus.error,
          payload: { error }
        })
    };

    const result = Fetch.get(scroller);
    Fetch.complete(scroller, box, result);
  }

  static complete(scroller: Scroller, box: FetchBox, result: FetchGetResult): void {
    if (Object.prototype.hasOwnProperty.call(result, 'data')) {
      const { data, error, isError } = result as Immediate;
      if (!isError) {
        box.success(data || []);
      } else {
        box.fail(error);
      }
    } else {
      const { state, viewport } = scroller;
      const { scroll, fetch } = state;
      if (scroll.positionBeforeAsync === null) {
        scroll.positionBeforeAsync = viewport.scrollPosition;
      }
      fetch.cancel = () => {
        box.success = () => null;
        box.fail = () => null;
      };
      (result as Promise<unknown[]>).then(
        data => box.success(data),
        error => box.fail(error)
      );
    }
  }

  static get(scroller: Scroller): FetchGetResult {
    const _get = scroller.datasource.get;
    const { index, count } = scroller.state.fetch;

    let immediateData, immediateError;
    let resolve: (value: unknown) => void, reject: (value: unknown) => void;

    const done = (data: unknown[]) => {
      if (!resolve) {
        immediateData = data || null;
        return;
      }
      resolve(data);
    };
    const fail = (error: unknown) => {
      if (!reject) {
        immediateError = error || null;
        return;
      }
      reject(error);
    };

    const getResult = _get(index, count, done, fail);

    if (getResult && typeof getResult === 'object' && getResult !== null) {
      if (typeof (getResult as PromiseLike<unknown>).then === 'function') {
        return getResult as Promise<unknown>;
      } else if (typeof (getResult as ObservableLike).subscribe === 'function') {
        let sub: undefined | ReturnType<ObservableLike['subscribe']> = void 0;
        sub = (getResult as ObservableLike).subscribe(done, fail, () => {
          if (sub && typeof sub === 'object' && typeof sub.unsubscribe === 'function') {
            sub.unsubscribe();
          }
        });
      }
    }

    if (immediateData || immediateError) {
      // callback case or immediate observable
      return {
        data: immediateError ? null : immediateData || [],
        error: immediateError,
        isError: !!immediateError
      };
    }

    return new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
  }
}
