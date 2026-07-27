import {
  ControlledDatasource,
  getDatasource,
  IDatasource,
  makeDatasource,
  makeItems,
  makeTest,
  Misc,
  Settings,
  TestConfig,
  TestItem
} from '../scaffolding';

class ClassDatasource implements IDatasource<TestItem> {
  settings: Settings<TestItem> = {};

  get(index: number, count: number, success: (data: TestItem[]) => void): void {
    success(makeItems(index, count));
  }

  reset(): void { }
}

const expectFetched = (misc: Misc) => async () => {
  await misc.relaxNext();
  expect(misc.scroller.state.fetch.callCount).toBeGreaterThan(0);
  expect(misc.scroller.buffer.size).toBeGreaterThan(0);
  misc.expect.domMatchesBuffer();
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
          get: (index, count, success) => success(makeItems(index, count)),
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
          const config: TestConfig = {
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

  // Exercise the full failure path over an already rendered state:
  // rejected fetch -> Workflow error/finalization -> preserved DOM/Buffer ->
  // successful reload. An initial-request failure could only prove an empty state.
  makeTest({
    config: {
      datasource: () => new ControlledDatasource(),
      datasourceSettings: {
        startIndex: 1,
        minIndex: 1,
        bufferSize: 10,
        padding: 0,
        itemSize: 20
      },
      templateSettings: { viewportHeight: 100, itemHeight: 20 }
    },
    title: 'should recover after a pending request fails',
    it: misc => async () => {
      const datasource = misc.source<ControlledDatasource>();
      const initial = await datasource.nextRequest();
      initial.resolve(makeItems(initial.index, initial.count));
      await misc.relaxNext();
      misc.expect.viewportFilled();

      const initialIndexes = misc.scroller.buffer.items.map(
        item => item.$index
      );
      expect(misc.workflow.errors).toHaveLength(0);
      const failedCycle = misc.waitNextCycle();

      expect(misc.getScrollableSize()).toBeGreaterThan(misc.getViewportSize());
      misc.scrollMax();
      const failed = await datasource.nextRequest();
      expect(misc.adapter.isLoading).toBe(true);
      const relaxed = misc.adapter.relax();
      const failure = new Error('controlled datasource failure');
      failed.reject(failure);

      await failedCycle;
      expect(await relaxed).toMatchObject({ success: true });
      expect(misc.adapter.isLoading).toBe(false);
      expect(misc.workflow.errors).toHaveLength(1);
      expect(misc.workflow.errors[0]).toMatchObject({
        process: 'fetch',
        message: String(failure)
      });
      expect(
        misc.scroller.buffer.items.map(item => item.$index)
      ).toEqual(initialIndexes);
      misc.expect.domMatchesBuffer();

      const reload = misc.adapter.reload();
      const recovery = await datasource.nextRequest();
      recovery.resolve(makeItems(recovery.index, recovery.count));

      expect(await reload).toMatchObject({ success: true });
      expect(misc.adapter.isLoading).toBe(false);
      expect(misc.workflow.errors).toHaveLength(1);
      misc.expect.viewportFilled();
    }
  });
});
