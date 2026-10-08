import {
  Direction,
  getDatasource,
  makeTest,
  Misc,
  Routines,
  starGet,
  IDatasourceOptional,
  TestConfig
} from '../scaffolding';

interface ResetSnapshot {
  instanceIndex: number;
  firstVisible: number;
  firstVisibleUid: number;
  lastVisible: number;
  firstVisibleText: string;
  interruptions: number;
}

interface ResetScenario {
  config: TestConfig;
  options?: IDatasourceOptional;
  scrolls?: number;
  direction?: Direction;
  interruption?: boolean;
  starData?: boolean;
}

interface ViewportResetScenario extends ResetScenario {
  windowViewport: boolean;
  scrollCount: number;
}

const baseConfigs: TestConfig[] = [
  {
    datasource: () => getDatasource({ mode: 'promise' }),
    datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.25 },
    templateSettings: { viewportHeight: 100 }
  },
  {
    datasource: () => getDatasource({ mode: 'promise' }),
    datasourceSettings: { startIndex: -123, bufferSize: 6, padding: 0.62 },
    templateSettings: { viewportHeight: 160 }
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

const settingsScenarios: ResetScenario[] = [baseConfigs[0], baseConfigs[2]].map(
  config => ({
    config,
    options: {
      settings: {
        ...config.datasourceSettings,
        startIndex: 999
      } as IDatasourceOptional['settings']
    }
  })
);

const scrollScenarios: ResetScenario[] = settingsScenarios.flatMap(scenario =>
  [Direction.forward, Direction.backward].map(direction => ({
    ...scenario,
    scrolls: 4,
    direction
  }))
);

const newGetScenarios: ResetScenario[] = [baseConfigs[0], baseConfigs[2]].map(
  config => ({ config, options: { get: starGet }, starData: true })
);

const routinesScenarios: ResetScenario[] = [false, true].map(interruption => ({
  config: {
    ...baseConfigs[0],
    Routines: class extends Routines {
      makeElementVisible(element: HTMLElement): void {
        super.makeElementVisible(element);
        element.dataset.customRoutines = 'true';
      }
    }
  },
  interruption
}));

const synchronousScrollConfig: TestConfig = {
  ...baseConfigs[0],
  Routines: class extends Routines {
    onScroll(handler: EventListener): () => void {
      const off = super.onScroll(handler);
      this.viewport.dispatchEvent(new Event('scroll'));
      return off;
    }
  }
};

const viewportScenarios: ViewportResetScenario[] = [false, true].map(
  windowViewport => {
    const scenario: ViewportResetScenario = {
      config: {
        datasourceSettings: { minIndex: 1, maxIndex: 100, itemSize: 20 },
        skipInvariantAutoCheck: true,
        Routines: class extends Routines {
          onScroll(handler: EventListener): () => void {
            return super.onScroll(event => {
              scenario.scrollCount++;
              handler(event);
            });
          }
        }
      },
      windowViewport,
      scrollCount: 0
    };
    return scenario;
  }
);

const invalidOptions: unknown[] = [
  { settings: 'bad' },
  { devSettings: 'bad' },
  { get: 'bad' },
  { get: (_index: number) => 'bad' },
  {
    get: (_index: number, _count: number) => null,
    settings: {},
    devSettings: 'bad'
  }
];

const takeSnapshot = (misc: Misc): ResetSnapshot => ({
  instanceIndex: misc.scroller.settings.instanceIndex,
  firstVisible: misc.adapter.firstVisible.$index,
  firstVisibleUid: misc.adapter.firstVisible.uid,
  lastVisible: misc.adapter.lastVisible.$index,
  firstVisibleText: misc.adapter.firstVisible.data.text,
  interruptions: misc.workflow.interruptionCount
});

const expectReset = (
  misc: Misc,
  before: ResetSnapshot,
  scenario: ResetScenario
): void => {
  const configuredStart = scenario.options?.settings?.startIndex;
  const firstVisible =
    configuredStart === undefined ? before.firstVisible : configuredStart;
  const after = takeSnapshot(misc);

  expect(after.instanceIndex).toBe(before.instanceIndex + 1);
  expect(after.firstVisible).toBe(firstVisible);
  expect(after.firstVisibleUid).not.toBe(before.firstVisibleUid);
  expect(after.lastVisible).toBe(
    firstVisible + before.lastVisible - before.firstVisible
  );
  expect(after.firstVisibleText).toBe(
    `item #${firstVisible}${scenario.starData ? ' *' : ''}`
  );
  expect(after.interruptions).toBe(
    before.interruptions + Number(!!scenario.interruption)
  );
  misc.expect.uniqueItems();
};

const reset = (misc: Misc, options?: IDatasourceOptional) =>
  options ? misc.adapter.reset(options) : misc.adapter.reset();

const expectScrollListeners = (
  scenario: ViewportResetScenario,
  targets: EventTarget[],
  active?: EventTarget
): void => {
  // Pause prevents processing, so each dispatch measures listener delivery only.
  for (const target of targets) {
    const before = scenario.scrollCount;
    target.dispatchEvent(new Event('scroll'));
    expect(scenario.scrollCount - before).toBe(Number(target === active));
  }
};

const registerRoutinesReset = (scenario: ResetScenario, title: string): void =>
  makeTest({
    config: scenario.config,
    title,
    meta: scenario.interruption ? 'pending reload' : 'idle',
    it: misc => async () => {
      await misc.relaxNext();
      for (let step = 0; step < 2; step++) {
        const previousRoutines = misc.scroller.routines;
        // An interrupted reload ends its cycle before reset's own load begins.
        const resetCyclesPromise = misc.waitForCycles(
          misc.workflow.cyclesDone + (scenario.interruption ? 2 : 1)
        );
        // The immediate reset interrupts the reload's pending fetch.
        const reloadPromise = scenario.interruption
          ? misc.adapter.reload()
          : undefined;
        await misc.adapter.reset();
        await reloadPromise;
        await resetCyclesPromise;
        await misc.adapter.relax();

        expect(misc.scroller.routines).not.toBe(previousRoutines);
        expect(misc.getElements().length).toBeGreaterThan(0);
        expect(
          misc
            .getElements()
            .every(element => element.dataset.customRoutines === 'true')
        ).toBe(true);
        expect(misc.workflow.errors).toEqual([]);
      }
    }
  });

const expectSynchronousScrollReset = (misc: Misc) => async () => {
  misc.trackVisibleItems();
  await misc.relaxNext();

  // Registration must not start a competing fetch before reset's own cycle.
  await misc.adapter.reset();
  expect(misc.workflow.errors).toEqual([]);

  // Once registration completes, the listener must still process scrolling.
  const firstVisible = misc.adapter.firstVisible.$index;
  const cycleDone = misc.waitNextCycle();
  misc.scrollMax();
  misc.viewportElement.dispatchEvent(new Event('scroll'));
  await cycleDone;
  await misc.adapter.relax();
  expect(misc.adapter.firstVisible.$index).toBeGreaterThan(firstVisible);
};

const registerViewportReset = (
  scenario: ViewportResetScenario,
  title: string
): void =>
  makeTest({
    config: scenario.config,
    title,
    meta: scenario.windowViewport ? 'window viewport' : 'external viewport',
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      const original = misc.viewportElement;
      const external = original.cloneNode(false) as HTMLElement;
      misc.root.appendChild(external);
      const replacement = scenario.windowViewport ? window : external;
      const targets = [original, external, window];
      const originalStyle = original.style.cssText;

      // Reset twice on each target: a switch must remove the old listener,
      // and resetting on the same target must not duplicate the new one.
      for (const target of [replacement, replacement, original, original]) {
        const useWindow = target === window;
        const viewport = target instanceof HTMLElement ? target : original;
        original.style.cssText = originalStyle;
        if (useWindow) {
          original.style.height = 'auto';
          original.style.overflowY = 'visible';
        }
        viewport.appendChild(misc.contentElement);
        await misc.adapter.reset({
          settings: {
            minIndex: 1,
            maxIndex: 100,
            itemSize: 20,
            windowViewport: useWindow,
            viewportElement: useWindow ? undefined : viewport
          }
        });

        await misc.adapter.pause();
        expectScrollListeners(scenario, targets, target);
        await misc.adapter.resume();
        // Let the browser deliver reset's scroll event before the user scroll.
        await misc.waitForPaint();
        const firstVisible = misc.adapter.firstVisible.$index;
        const cycleDone = misc.waitNextCycle();
        misc.scrollMax();
        // Explicit delivery avoids the browser coalescing rapid reset/scroll changes.
        target.dispatchEvent(new Event('scroll'));
        await cycleDone;
        await misc.adapter.relax();
        expect(misc.adapter.firstVisible.$index).toBeGreaterThan(firstVisible);
        misc.expect.domIndexesMatchBuffer();
      }

      misc.dispose();
      expectScrollListeners(scenario, targets);
      window.scrollTo(0, 0);
    }
  });

const registerReset = (scenario: ResetScenario, title: string): void =>
  makeTest({
    config: scenario.config,
    title,
    meta:
      scenario.options?.settings?.startIndex !== undefined
        ? `start = ${scenario.options.settings.startIndex}`
        : scenario.starData
          ? 'new get'
          : scenario.interruption
            ? 'interrupted'
            : 'same datasource',
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      for (let step = 0; step < (scenario.scrolls ?? 0); step++) {
        await (scenario.direction === Direction.backward
          ? misc.scrollMinRelax()
          : misc.scrollMaxRelax());
      }
      const before = takeSnapshot(misc);

      if (scenario.interruption) {
        // Start a reload, then fire reset on the next macrotask so it lands
        // while the reload is still pending and interrupts it. Both settle
        // within the two cycles we wait for.
        const finished = misc.waitForCycles(misc.workflow.cyclesDone + 2);
        const reloadResult = misc.adapter.reload();
        let resetResult: ReturnType<typeof misc.adapter.reset>;
        setTimeout(() => (resetResult = reset(misc, scenario.options)));
        await finished;
        await Promise.all([reloadResult, resetResult!]);
      } else {
        await reset(misc, scenario.options);
      }

      expectReset(misc, before, scenario);
    }
  });

describe('Adapter Reset Spec', () => {
  describe('Without parameters', () =>
    baseConfigs.forEach(config =>
      registerReset({ config }, 'should reset at the current position')
    ));

  describe('Invalid parameters', () =>
    invalidOptions.forEach((options, index) =>
      makeTest({
        config: baseConfigs[0],
        title: 'should reject invalid reset parameters',
        meta: `case ${index + 1}`,
        it: misc => async () => {
          misc.trackVisibleItems();
          await misc.relaxNext();
          const before = takeSnapshot(misc);

          const result = await misc.adapter.reset(
            options as IDatasourceOptional
          );

          expect(result.success).toBe(false);
          expect(result.immediate).toBe(true);
          expect(misc.workflow.cyclesDone).toBe(1);
          expect(takeSnapshot(misc)).toEqual(before);
          expect(
            misc.workflow.errors.some(error => error.process.endsWith('reset'))
          ).toBe(true);
        }
      })
    ));

  describe('Interruption', () =>
    [baseConfigs[0], baseConfigs[2]].forEach(config =>
      registerReset(
        { config, interruption: true },
        'should interrupt a pending reload'
      )
    ));

  describe('New settings', () =>
    settingsScenarios.forEach(scenario =>
      registerReset(scenario, 'should reset at the new position')
    ));

  describe('New settings after scrolling', () =>
    scrollScenarios.forEach(scenario =>
      registerReset(scenario, 'should reset after scrolling')
    ));

  describe('New get', () =>
    newGetScenarios.forEach(scenario =>
      registerReset(scenario, 'should reset with new data')
    ));

  describe('Custom Routines', () =>
    routinesScenarios.forEach(scenario =>
      registerRoutinesReset(
        scenario,
        'should preserve custom Routines across repeated resets'
      )
    ));

  describe('Scroll listeners', () => {
    makeTest({
      config: synchronousScrollConfig,
      title: 'should ignore synchronous scroll during listener registration',
      it: expectSynchronousScrollReset
    });

    viewportScenarios.forEach(scenario =>
      registerViewportReset(
        scenario,
        'should move the scroll listener and release it on disposal'
      )
    );
  });
});
