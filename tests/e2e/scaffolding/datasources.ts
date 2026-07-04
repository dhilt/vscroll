import type { DatasourceGet } from '../../../src/interfaces/index';
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
          data: {
            id: i,
            text: `item #${i}`,
            ...(size === undefined ? {} : { size })
          }
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
