import { makeDatasource } from './vscroll';
import type { BufferUpdater, DatasourceGet } from './vscroll';
import { makeItem } from './data';
import type { DatasourceProcessor, IndexedItem, TestItem } from '../types';

// A datasource that also lets a test inject a per-fetch processor, used to
// mutate item data/sizes between the fetch and the workflow (e.g. dynamic size).
export interface TestDatasource<Data = TestItem> {
  get: DatasourceGet<Data>;
  setProcessor(processor: DatasourceProcessor<Data>): void;
}

export interface DatasourceOptions {
  min?: number; // inclusive lower bound; omit for unbounded
  max?: number; // inclusive upper bound; omit for unbounded
  delay?: number; // async delay in ms; omit/0 for synchronous delivery
  size?: number; // per-item `size` field; omit to leave it out
  mode?: 'callback' | 'promise' | 'observable'; // transport, default callback
}

interface MutableState {
  min: number;
  max: number;
  data: TestItem[];
  requests: Array<{ index: number; count: number }>;
  processor?: DatasourceProcessor;
}

const Datasource = makeDatasource();

export interface ControlledRequest<Data = TestItem> {
  readonly index: number;
  readonly count: number;
  resolve(items: Data[]): void;
  reject(error: unknown): void;
}

interface ControlledState<Data> {
  queued: ControlledRequest<Data>[];
  waiters: Array<(request: ControlledRequest<Data>) => void>;
  pending: Set<ControlledRequest<Data>>;
  responder?: (request: ControlledRequest<Data>) => void;
}

/**
 * Captures `get` requests so tests can resolve or reject them deterministically,
 * reproducing async failures and interruption races without timers.
 */
export class ControlledDatasource<Data = TestItem> extends Datasource<Data> {
  private readonly state: ControlledState<Data>;

  constructor() {
    const state: ControlledState<Data> = {
      queued: [],
      waiters: [],
      pending: new Set()
    };

    super({
      get: (index: number, count: number) =>
        new Promise<Data[]>((resolve, reject) => {
          const settle = (complete: () => void): void => {
            if (!state.pending.delete(request)) {
              throw new Error(
                `Controlled request get(${index}, ${count}) is already settled`
              );
            }
            complete();
          };
          const request: ControlledRequest<Data> = {
            index,
            count,
            resolve: items => settle(() => resolve(items)),
            reject: error => settle(() => reject(error))
          };

          state.pending.add(request);
          if (state.responder) {
            state.responder(request);
            return;
          }
          const waiter = state.waiters.shift();
          if (waiter) {
            waiter(request);
          } else {
            state.queued.push(request);
          }
        })
    });

    this.state = state;
  }

  /** Capture the current request before triggering an operation that may cancel it. */
  nextRequest(): Promise<ControlledRequest<Data>> {
    if (this.state.responder) {
      throw new Error(
        'Cannot await a controlled request while a responder is active'
      );
    }
    const request = this.state.queued.shift();
    return request
      ? Promise.resolve(request)
      : new Promise(resolve => this.state.waiters.push(resolve));
  }

  respondToFutureRequests(
    responder: (request: ControlledRequest<Data>) => void
  ): () => void {
    if (this.state.responder) {
      throw new Error('ControlledDatasource already has an active responder');
    }
    if (this.state.queued.length || this.state.waiters.length) {
      throw new Error(
        'Cannot start a responder while controlled requests are unclaimed'
      );
    }

    this.state.responder = responder;
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      if (this.state.responder === responder) {
        this.state.responder = undefined;
      }
    };
  }

  assertNoPendingRequests(): void {
    const problems: string[] = [];
    if (this.state.pending.size) {
      const requests = [...this.state.pending]
        .map(({ index, count }) => `get(${index}, ${count})`)
        .join(', ');
      problems.push(`unsettled requests: ${requests}`);
    }
    if (this.state.waiters.length) {
      problems.push(
        `unfulfilled nextRequest calls: ${this.state.waiters.length}`
      );
    }
    if (this.state.responder) {
      problems.push('active future-request responder');
    }
    if (problems.length) {
      throw new Error(`ControlledDatasource is not idle: ${problems.join('; ')}`);
    }
  }
}

/**
 * An in-memory datasource that tests can modify at runtime to exercise adapter
 * operations against changing items, indexes, ranges, and sizes.
 */
export class MutableDatasource extends Datasource<TestItem> {
  private readonly state: MutableState;

  constructor(min: number, max: number, firstId = min) {
    const state = { min, max, data: [], requests: [] } as MutableState;
    const read = (index: number, count: number): TestItem[] => {
      state.requests.push({ index, count });
      const items: IndexedItem[] = [];
      for (let current = index; current < index + count; current++) {
        const data = state.data[current - state.min];
        if (data) {
          items.push({ $index: current, data });
        }
      }
      state.processor?.(items, index, count, state.min, state.max);
      return items.map(({ data }) => data);
    };
    super({ get: (index, count, success) => success(read(index, count)) });
    this.state = state;
    this.reset(min, max, firstId);
  }

  reset(min: number, max: number, firstId = min): void {
    this.state.min = min;
    this.state.max = max;
    this.state.data = Array.from({ length: max - min + 1 }, (_, offset) =>
      makeItem(firstId + offset)
    );
  }

  setProcessor(processor: DatasourceProcessor): void {
    this.state.processor = processor;
  }

  insert(
    items: TestItem[],
    index: number,
    before: boolean,
    decrease = false
  ): void {
    const offset = index - this.state.min;
    if (offset >= 0 && offset < this.state.data.length) {
      this.state.data.splice(offset + (before ? 0 : 1), 0, ...items);
    }
    this.state.min -= decrease ? items.length : 0;
    this.state.max += decrease ? 0 : items.length;
  }

  remove(indexes: number[], increase = false): void {
    const indexSet = new Set(indexes);
    const min = this.state.min;
    let removed = 0;
    this.state.data = this.state.data.filter((_item, offset) => {
      const remove = indexSet.has(min + offset);
      removed += Number(remove);
      return !remove;
    });
    this.state.min += increase ? removed : 0;
    this.state.max -= increase ? 0 : removed;
  }

  replace(indexes: number[], items: TestItem[], fixRight = false): void {
    const sorted = [...indexes].sort((a, b) => a - b);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const removed = last - first + 1;
    const delta = items.length - removed;

    this.state.data.splice(first - this.state.min, removed, ...items);
    this.state.min -= fixRight ? delta : 0;
    this.state.max += fixRight ? 0 : delta;
  }

  update(predicate: BufferUpdater<TestItem>, fixRight = false): void {
    const min = this.state.min;
    const data = this.state.data.flatMap((item, offset) => {
      const result = predicate({ uid: 0, $index: min + offset, data: item });
      return result === true
        ? [item]
        : Array.isArray(result)
          ? (result as TestItem[])
          : [];
    });
    const delta = data.length - this.state.data.length;

    this.state.data = data;
    this.state.min -= fixRight ? delta : 0;
    this.state.max += fixRight ? 0 : delta;
  }

  setSizes(getSize: (index: number) => number): void {
    this.state.data.forEach(
      (item, offset) => (item.size = getSize(this.state.min + offset))
    );
  }

  setSize(index: number, size: number): void {
    const item = this.state.data[index - this.state.min];
    if (item) {
      item.size = size;
    }
  }

  clearRequests(): void {
    this.state.requests.length = 0;
  }

  get requests(): ReadonlyArray<{ index: number; count: number }> {
    return this.state.requests;
  }
}

export const getDatasource = (
  options: DatasourceOptions = {}
): TestDatasource => {
  const { min, max, delay = 0, size, mode = 'callback' } = options;
  let processor: DatasourceProcessor | undefined;

  const read = (index: number, count: number): TestItem[] => {
    const items: IndexedItem[] = [];
    for (let i = index; i < index + count; i++) {
      if ((min === undefined || i >= min) && (max === undefined || i <= max)) {
        items.push({
          $index: i,
          data: { ...makeItem(i), ...(size === undefined ? {} : { size }) }
        });
      }
    }
    processor?.(items, index, count, min, max);
    return items.map(({ data }) => data);
  };

  const get = (
    index: number,
    count: number,
    success?: (data: TestItem[]) => void
  ): unknown => {
    if (mode === 'promise') {
      return new Promise<TestItem[]>(resolve =>
        delay
          ? setTimeout(() => resolve(read(index, count)), delay)
          : resolve(read(index, count))
      );
    }
    if (mode === 'observable') {
      return {
        subscribe(
          next: (data: TestItem[]) => void,
          _error: (error: unknown) => void,
          complete: () => void
        ) {
          let active = true;
          const emit = () => {
            if (!active) {
              return;
            }
            next(read(index, count));
            complete();
          };
          const timer = delay ? setTimeout(emit, delay) : undefined;
          if (!delay) {
            emit();
          }
          return {
            unsubscribe: () => {
              active = false;
              if (timer) {
                clearTimeout(timer);
              }
            }
          };
        }
      };
    }
    if (delay) {
      setTimeout(() => success?.(read(index, count)), delay);
    } else {
      success?.(read(index, count));
    }
  };

  return {
    get: get as DatasourceGet<TestItem>,
    setProcessor: processorFn => {
      processor = processorFn;
    }
  };
};
