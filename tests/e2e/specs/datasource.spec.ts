import { expectDomMatchesBuffer } from '../helpers/expect';
import { makeDatasource } from '../miscellaneous/vscroll';
import type { IDatasource, Settings } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';
import type { TestItem } from '../types';

const createItems = (index: number, count: number): TestItem[] =>
  Array.from({ length: count }, (_, offset) => {
    const current = index + offset;
    return { id: current, text: `item #${current}` };
  });

class ClassDatasource implements IDatasource<TestItem> {
  settings: Settings<TestItem> = {};

  get(index: number, count: number, success: (data: TestItem[]) => void): void {
    success(createItems(index, count));
  }

  reset(): void { }
}

const expectFetched = (misc: Misc) => async () => {
  await misc.relaxNext();
  expect(misc.scroller.state.fetch.callCount).toBeGreaterThan(0);
  expect(misc.scroller.buffer.size).toBeGreaterThan(0);
  expectDomMatchesBuffer(misc);
};

const expectEmpty = (misc: Misc) => async () => {
  await misc.relaxNext();
  const { buffer, state } = misc.scroller;
  expect(misc.innerLoopCount).toBe(1);
  expect(state.fetch.callCount).toBe(0);
  expect(buffer.size).toBe(0);
  expect(buffer.bof.get()).toBe(true);
  expect(buffer.eof.get()).toBe(true);
};

const scopes = ['infinite', 'limited'] as const;
const modes = ['observable', 'promise', 'callback'] as const;
const Datasource = makeDatasource();

describe('Datasource Class', () => {
  makeTest({
    config: { datasource: () => new ClassDatasource() },
    title: 'should run Workflow with a class-based datasource',
    it: expectFetched
  });

  makeTest({
    config: {
      datasource: () =>
        new Datasource<TestItem>({
          get: (index, count, success) => success(createItems(index, count)),
          settings: { startIndex: 1 },
          devSettings: { throttle: 1 }
        }),
      datasourceSettings: { startIndex: 42 },
      datasourceDevSettings: { throttle: 17 }
    },
    title: 'should apply settings to a constructed datasource',
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.scroller.settings.startIndex).toBe(42);
      expect(misc.scroller.settings.throttle).toBe(17);
    }
  });
});

describe('Datasource Get', () => {
  ([
    { suite: 'immediate', delay: 0 },
    { suite: 'non-immediate', delay: 1 }
  ]).forEach(timing =>
    describe(timing.suite, () => {
      scopes.forEach(scope =>
        modes.forEach(mode => {
          const config: TestBedConfig = {
            datasource: () =>
              getDatasource({
                ...(scope === 'limited' ? { min: 1, max: 100 } : {}),
                mode,
                delay: timing.delay
              })
          };
          makeTest({
            config,
            title: `should run Workflow with ${scope} ${mode}-based datasource`,
            it: expectFetched
          });
        })
      );
    })
  );

  describe('empty', () => {
    for (const mode of ['callback', 'observable'] as const) {
      makeTest({
        config: {
          datasource: () => getDatasource({ min: 1, max: 0, mode })
        },
        title: `should stop without fetching (${mode})`,
        it: expectEmpty
      });
    }
  });
});
