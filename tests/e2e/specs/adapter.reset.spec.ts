import {
  Direction,
  getDatasource,
  makeTest,
  Misc,
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
});
