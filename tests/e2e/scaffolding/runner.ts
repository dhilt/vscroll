import { describe, test } from 'vitest';
import { TestHost } from './TestHost';
import type { TestConfig, TestItem } from '../types';

export type OperationConfig<
  Operation extends PropertyKey,
  Custom = void,
  Data = TestItem
> = {
  [key in Operation]: TestConfig<Custom, Data>;
};

type TestBody = void | Promise<void> | (() => void | Promise<void>);

export type ItFunc<Data extends TestItem = TestItem> = (
  misc: TestHost<Data>
) => TestBody;

export type ItFuncConfig<
  Custom = void,
  Data extends TestItem = TestItem
> = (config: TestConfig<Custom, Data>) => ItFunc<Data>;

export interface MakeTestConfig<
  Custom = void,
  Data extends TestItem = TestItem
> {
  title: string;
  meta?: string;
  config: TestConfig<Custom, Data>;
  it: ItFunc<Data>;
  before?: (misc: TestHost<Data>) => void | Promise<void>;
  after?: (misc: TestHost<Data>) => void | Promise<void>;
}

const metaTitle = <Custom, Data extends TestItem>(
  data: MakeTestConfig<Custom, Data>
): string => {
  const result: string[] = [];
  const template = data.config.templateSettings;
  const settings = data.config.datasourceSettings;

  if (template?.viewportHeight) {
    result.push(`vp height = ${template.viewportHeight}`);
  }
  if (template?.viewportWidth) {
    result.push(`vp width = ${template.viewportWidth}`);
  }
  if (settings?.padding) {
    result.push(`padding = ${settings.padding}`);
  }
  if (settings?.itemSize) {
    result.push(`itemSize = ${settings.itemSize}`);
  }
  if (settings?.startIndex) {
    result.push(`start = ${settings.startIndex}`);
  }
  if (settings?.bufferSize) {
    result.push(`buffer = ${settings.bufferSize}`);
  }
  if (settings?.horizontal) {
    result.push('HORIZONTAL');
  }
  if (settings?.windowViewport) {
    result.push('ENTIRE WINDOW');
  }
  if (data.meta) {
    result.push(data.meta);
  }

  return `[${result.join(', ') || 'default params'}]`;
};

const runBody = async (body: TestBody): Promise<void> => {
  await (typeof body === 'function' ? body() : body);
};

export const makeTest = <Custom = void, Data extends TestItem = TestItem>(
  data: MakeTestConfig<Custom, Data>
): void => {
  describe(metaTitle(data), () => {
    test(
      data.title,
      async () => {
        const misc = new TestHost<Data>(
          data.config as TestConfig<unknown, Data>
        );
        try {
          await data.before?.(misc);
          await runBody(data.it(misc));
          await data.after?.(misc);
          // Enforce the core invariant on every test: once the body settles, the
          // rendered DOM must mirror the buffer (same contiguous indexes, paddings
          // reflecting the model). This is a general property of a healthy
          // scroller, not a per-test assertion, so it runs here for all tests.
          // Opt out via `skipInvariantAutoCheck` when a test intentionally ends
          // in a non-settled state (disposed, paused, halted, mid-burst, error).
          if (!data.config.skipInvariantAutoCheck) {
            misc.expect.domIndexesMatchBuffer();
          }
        } finally {
          misc.dispose();
        }
      },
      data.config.timeout || 2000
    );
  });
};
