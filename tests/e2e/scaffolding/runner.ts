import { describe, test } from 'vitest';
import { TestHost } from './TestHost';
import type { TestConfig, TestItem } from '../types';

export type TestBedConfig<Custom = void, Data = TestItem> = TestConfig<
  Custom,
  Data
>;

export type OperationConfig<
  Operation extends PropertyKey,
  Custom = void,
  Data = TestItem
> = {
  [key in Operation]: TestBedConfig<Custom, Data>;
};

type Done = () => void;
type LegacyBody = (done: Done) => unknown;
type AsyncBody = () => void | Promise<void>;
type TestBody = void | Promise<void> | LegacyBody | AsyncBody;

export type ItFunc<Data extends TestItem = TestItem> = (
  misc: TestHost<Data>
) => TestBody;

export type ItFuncConfig<
  Custom = void,
  Data extends TestItem = TestItem
> = (config: TestBedConfig<Custom, Data>) => ItFunc<Data>;

export interface MakeTestConfig<
  Custom = void,
  Data extends TestItem = TestItem
> {
  title: string;
  meta?: string;
  config: TestBedConfig<Custom, Data>;
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
  if (typeof body !== 'function') {
    await body;
    return;
  }

  if (body.length === 0) {
    await (body as AsyncBody)();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    try {
      Promise.resolve(body(resolve)).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
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
        } finally {
          misc.dispose();
        }
      },
      data.config.timeout || 2000
    );
  });
};
