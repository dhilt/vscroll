import {
  getDatasource,
  makeTest,
  ParsedSettings,
  TestHost,
  Settings,
  TestConfig
} from '../scaffolding';

const initDelay = 50;
const baseConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 100 }),
  datasourceSettings: {
    startIndex: 1,
    minIndex: 1,
    maxIndex: 100,
    itemSize: 20,
    bufferSize: 5,
    padding: 0.5
  },
  templateSettings: { viewportHeight: 200, itemHeight: 20 }
};

const parseSettings = (settings?: unknown): ParsedSettings =>
  new ParsedSettings(settings as Settings | undefined, undefined, 1);

describe('Common Spec', () => {
  describe('Settings with an HTML viewport element', () => {
    test('accepts an HTML element', () => {
      const element = document.createElement('div');
      const settings = parseSettings({ viewportElement: element });

      expect(settings.viewportElement).toBe(element);
      expect(settings.viewport).toBe(element);
    });
  });

  describe('Delayed initialization', () => {
    makeTest({
      config: {
        ...baseConfig,
        datasourceDevSettings: { initDelay },
        timeout: 1000,
        skipInvariantAutoCheck: true // test disposes the host in-body
      },
      title: 'should initialize after the configured delay',
      it: misc => async () => {
        expect(misc.workflow.isInitialized).toBe(false);
        expect(misc.adapter.init).toBe(false);

        await misc.waitForAdapterInit();
        await misc.adapter.relax();

        expect(misc.workflow.isInitialized).toBe(true);
        expect(misc.adapter.init).toBe(true);
        misc.expect.domMatchesBuffer();

        const workflow = misc.workflow;
        const adapter = misc.adapter;
        misc.dispose();

        expect(workflow.isInitialized).toBe(false);
        expect(workflow.disposed).toBe(true);
        expect(adapter.init).toBe(false);
      }
    });

    makeTest({
      config: {
        ...baseConfig,
        datasourceDevSettings: { initDelay },
        timeout: 1000,
        skipInvariantAutoCheck: true // test disposes the host in-body
      },
      title: 'should remain disposed when destroyed before initialization',
      it: misc => async () => {
        const workflow = misc.workflow;
        const adapter = misc.adapter;

        expect(workflow.isInitialized).toBe(false);
        expect(adapter.init).toBe(false);

        misc.dispose();
        await misc.delay(initDelay * 2);

        expect(workflow.isInitialized).toBe(false);
        expect(workflow.disposed).toBe(true);
        expect(adapter.init).toBe(false);
      }
    });
  });

  makeTest({
    config: baseConfig,
    title: 'should keep simultaneous workflows independent',
    it: first => async () => {
      const second = new TestHost(baseConfig);

      try {
        await Promise.all([first.relaxNext(), second.relaxNext()]);
        first.expect.domMatchesBuffer();
        second.expect.domMatchesBuffer();
        expect(first.adapter.id).not.toBe(second.adapter.id);
        expect(first.adapter.version).toBe(second.adapter.version);

        const firstCycles = first.workflow.cyclesDone;
        const secondState = {
          cycles: second.workflow.cyclesDone,
          position: second.getScrollPosition(),
          bufferInfo: { ...second.adapter.bufferInfo }
        };
        const firstLoading: boolean[] = [];
        const secondLoading: boolean[] = [];
        const offFirst = first.adapter.isLoading$.on(value =>
          firstLoading.push(value)
        );
        const offSecond = second.adapter.isLoading$.on(value =>
          secondLoading.push(value)
        );

        await first.scrollToRelax(400);
        offFirst();
        offSecond();

        expect(firstLoading).toEqual([true, false]);
        expect(secondLoading).toEqual([]);
        expect(first.workflow.cyclesDone).toBeGreaterThan(firstCycles);
        expect({
          cycles: second.workflow.cyclesDone,
          position: second.getScrollPosition(),
          bufferInfo: second.adapter.bufferInfo
        }).toEqual(secondState);
      } finally {
        second.dispose();
      }
    }
  });
});
