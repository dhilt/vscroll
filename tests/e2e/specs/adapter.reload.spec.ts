import {
  ControlledDatasource,
  ControlledRequest,
  getDatasource,
  makeItems,
  makeTest,
  Misc,
  TestConfig
} from '../scaffolding';

interface ReloadExpectation {
  index?: number;
  interruptions: number;
  reloads: number;
}

interface FirstVisibleScenario extends ReloadExpectation {
  threshold: number;
}

const baseConfigs: TestConfig[] = [
  {
    datasource: () => getDatasource({ mode: 'promise' }),
    datasourceSettings: { startIndex: 100, bufferSize: 5, padding: 0.2 },
    templateSettings: { viewportHeight: 100 }
  },
  {
    datasource: () => getDatasource({ mode: 'promise' }),
    datasourceSettings: { startIndex: -50, bufferSize: 4, padding: 0.49 },
    templateSettings: { viewportHeight: 70 }
  },
  {
    datasource: () => getDatasource({ mode: 'promise' }),
    datasourceSettings: {
      startIndex: -33,
      bufferSize: 5,
      padding: 0.3,
      horizontal: true
    },
    templateSettings: { viewportWidth: 300, itemWidth: 100, horizontal: true }
  }
];

const indexedReloads = [-10, 1255, 2];
const scrolledReloads = [
  { index: -20, scrolls: 3 },
  { index: undefined, scrolls: 5 },
  { index: 4, scrolls: 2 }
];
const beforeLoadReloads = [-30, undefined, 12];
const asyncFetchReloads = [undefined, 1025, -40];
const afterAdjustReloads = [10, 365, -14];
const onRenderReloads = [500, -25, undefined];
const syncFetchReloads = [1, 2, 3];
const firstVisibleReloads: FirstVisibleScenario[] = [
  { index: 1, threshold: 50, interruptions: 1, reloads: 1 },
  { index: -50, threshold: -60, interruptions: 1, reloads: 1 },
  { index: -99, threshold: -55, interruptions: 1, reloads: 1 }
];

const largeDoubleReloadConfig: TestConfig = {
  datasource: () => getDatasource({ mode: 'promise' }),
  datasourceSettings: {
    startIndex: 1,
    itemSize: 100,
    bufferSize: 10,
    padding: 0.1
  },
  templateSettings: { viewportHeight: 600 }
};

const resolveGetRequest = (request: ControlledRequest): void =>
  request.resolve(makeItems(request.index, request.count));

const expectedStartIndex = (config: TestConfig, index?: number): number =>
  index ?? (config.datasourceSettings?.startIndex as number);

const expectReloaded = (
  misc: Misc,
  config: TestConfig,
  expected: ReloadExpectation
): void => {
  const startIndex = expectedStartIndex(config, expected.index);
  const bufferSize = config.datasourceSettings?.bufferSize as number;
  const firstIndex = startIndex - bufferSize;
  const nextIndex = firstIndex + bufferSize + 1;
  const itemsPerViewport = Math.ceil(
    misc.getViewportSize() / misc.scroller.buffer.defaultSize
  );

  expect(misc.scroller.buffer.getFirstVisibleItem()?.$index).toBe(firstIndex);
  expect(misc.checkElementContentByIndex(firstIndex)).toBe(true);
  expect(misc.checkElementContentByIndex(nextIndex)).toBe(true);
  expect(misc.adapter.firstVisible.uid).toBeDefined();
  expect(misc.adapter.lastVisible.uid).toBeDefined();
  misc.expect.uniqueItems();
  expect(misc.adapter.firstVisible.$index).toBe(startIndex);
  expect(misc.adapter.lastVisible.$index).toBe(
    startIndex + itemsPerViewport - 1
  );
  expect(misc.workflow.interruptionCount).toBe(expected.interruptions);
  expect(misc.scroller.adapter.reloadCount).toBe(expected.reloads);
};

const registerSettledReload = (
  config: TestConfig,
  title: string,
  index?: number,
  scrolls = 0
): void =>
  makeTest({
    config,
    title,
    meta: index === undefined ? 'default index' : `index = ${index}`,
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      for (let step = 0; step < scrolls; step++) {
        await misc.scrollMaxRelax();
      }

      await misc.adapter.reload(index);

      expectReloaded(misc, config, {
        index,
        interruptions: 0,
        reloads: 1
      });
    }
  });

const registerBeforeLoad = (config: TestConfig, index?: number): void =>
  makeTest({
    config,
    title: 'should reload between initial inner loops',
    meta: index === undefined ? 'default index' : `index = ${index}`,
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.captureInnerLoops(1, () => null);
      const finished = misc.waitForCycles(2);

      await misc.adapter.reload(index);
      await finished;
      await misc.adapter.relax();

      expectReloaded(misc, config, {
        index,
        interruptions: 1,
        reloads: 1
      });
    }
  });

const registerAsyncFetch = (
  baseConfig: TestConfig,
  index?: number
): void => {
  const config: TestConfig = {
    ...baseConfig,
    datasource: () => new ControlledDatasource()
  };

  makeTest({
    config,
    title: 'should reload during a pending datasource request',
    meta: index === undefined ? 'default index' : `index = ${index}`,
    it: misc => async () => {
      misc.trackVisibleItems();
      const datasource = misc.source<ControlledDatasource>();

      // Complete the initial fetch so the workflow reaches its next request,
      // then deliberately leave that request pending.
      const initialGetRequest = await datasource.nextRequest();
      resolveGetRequest(initialGetRequest);

      const staleGetRequest = await datasource.nextRequest();
      expect(misc.adapter.isLoading).toBe(true);

      // Reload must interrupt the waiting workflow and issue a replacement
      // request without waiting for the old promise to settle. Do not await
      // reload yet: it cannot finish until the replacement request is captured
      // and resolved below.
      const reloadPromise = misc.adapter.reload(index);
      const replacementGetRequest = await datasource.nextRequest();
      expect(misc.workflow.interruptionCount).toBe(1);

      // The new workflow may need more fetches after its replacement request.
      // Auto-resolve only those future requests; resolve the abandoned request
      // first to prove that its late result cannot affect the reload.
      const stopResponding =
        datasource.respondToFutureRequests(resolveGetRequest);
      try {
        resolveGetRequest(staleGetRequest);
        resolveGetRequest(replacementGetRequest);
        await reloadPromise;
        await misc.adapter.relax();
      } finally {
        stopResponding();
      }

      expectReloaded(misc, config, {
        index,
        interruptions: 1,
        reloads: 1
      });
    }
  });
};

const registerBeforeInit = (baseConfig: TestConfig): void => {
  const config: TestConfig = {
    ...baseConfig,
    datasourceDevSettings: { initDelay: 50 }
  };

  makeTest({
    config,
    title: 'should ignore reload before initialization',
    it: misc => async () => {
      misc.trackVisibleItems();
      const result = await misc.adapter.reload();
      expect(result).toEqual({
        immediate: true,
        success: true,
        details: 'Adapter is not initialized'
      });

      await misc.waitForAdapterInit();
      await misc.adapter.relax();

      expect(misc.scroller.state.fetch.cancel).toBeNull();
      expectReloaded(misc, config, {
        interruptions: 0,
        reloads: 0
      });
    }
  });
};

const registerDoubleReload = (
  config: TestConfig,
  index: number | undefined,
  timing: 'after adjust' | 'during render'
): void =>
  makeTest({
    config,
    title: 'should interrupt the first reload with the second',
    meta: `${timing}, ${
      index === undefined ? 'default index' : `index = ${index}`
    }`,
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      const finished = misc.waitForCycles(3);
      let secondReload: ReturnType<typeof misc.adapter.reload>;

      if (timing === 'after adjust') {
        let off = () => { };
        off = misc.scroller.state.cycle.innerLoop.busy.on(pending => {
          if (!pending) {
            off();
            secondReload = misc.adapter.reload(index);
          }
        });
      } else {
        setTimeout(() => (secondReload = misc.adapter.reload(index)));
      }

      const firstReload = misc.adapter.reload(10);
      await finished;
      await Promise.all([firstReload, secondReload!]);

      expect(misc.workflow.cyclesDone).toBe(3);
      expectReloaded(misc, config, {
        index,
        interruptions: 1,
        reloads: 2
      });
    }
  });

const registerSyncFetch = (baseConfig: TestConfig, index: number): void => {
  const config: TestConfig = {
    ...baseConfig,
    datasource: () => getDatasource({ delay: 1 }),
    timeout: 4000
  };

  makeTest({
    config,
    title: 'should reload from inside datasource.get',
    meta: `index = ${index}`,
    it: misc => async () => {
      misc.trackVisibleItems();
      let reloadResult: ReturnType<typeof misc.adapter.reload> | undefined;
      misc.setDatasourceProcessor(() => {
        reloadResult ??= misc.adapter.reload(index);
      });

      await misc.waitForCycles(2);
      await reloadResult;

      expect(misc.workflow.cyclesDone).toBe(2);
      expectReloaded(misc, config, {
        index,
        interruptions: 1,
        reloads: 1
      });
    }
  });
};

const registerFirstVisibleReload = (
  config: TestConfig,
  scenario: FirstVisibleScenario
): void =>
  makeTest({
    config,
    title: 'should reload from a firstVisible change',
    meta: `threshold = ${scenario.threshold}`,
    it: misc => async () => {
      misc.trackVisibleItems();
      let reloadResult: ReturnType<typeof misc.adapter.reload> | undefined;
      let off = () => { };
      off = misc.adapter.firstVisible$.on(({ $index }) => {
        if (
          reloadResult ||
          !Number.isFinite($index) ||
          $index > scenario.threshold
        ) {
          return;
        }
        off();
        reloadResult = misc.adapter.reload(scenario.index);
      });

      await misc.relaxNext();
      while (!reloadResult) {
        await misc.scrollMinRelax();
      }
      await reloadResult;

      expectReloaded(misc, config, scenario);
    }
  });

describe('Adapter Reload Spec', () => {
  describe('Settled reload', () => {
    baseConfigs.forEach(config =>
      registerSettledReload(
        config,
        'should reload at the initial position'
      )
    );
    baseConfigs.forEach((config, index) =>
      registerSettledReload(
        config,
        'should reload at the requested position',
        indexedReloads[index]
      )
    );
    baseConfigs.forEach((config, index) =>
      registerSettledReload(
        config,
        'should reload after scrolling',
        scrolledReloads[index].index,
        scrolledReloads[index].scrolls
      )
    );
  });

  describe('Interruption', () => {
    baseConfigs.forEach((config, index) =>
      registerBeforeLoad(config, beforeLoadReloads[index])
    );
    baseConfigs.forEach((config, index) =>
      registerAsyncFetch(config, asyncFetchReloads[index])
    );
    baseConfigs.forEach((config, index) =>
      registerDoubleReload(config, afterAdjustReloads[index], 'after adjust')
    );
    registerDoubleReload(largeDoubleReloadConfig, 999, 'after adjust');
    baseConfigs.forEach((config, index) =>
      registerDoubleReload(config, onRenderReloads[index], 'during render')
    );
    baseConfigs.forEach((config, index) =>
      registerSyncFetch(config, syncFetchReloads[index])
    );
    baseConfigs.forEach((config, index) =>
      registerFirstVisibleReload(config, firstVisibleReloads[index])
    );
  });

  describe('Before initialization', () =>
    baseConfigs.forEach(registerBeforeInit));
});
