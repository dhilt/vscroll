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

const takeCoreSettings = (settings: ParsedSettings) => ({
  startIndex: settings.startIndex,
  bufferSize: settings.bufferSize,
  padding: settings.padding,
  itemSize: settings.itemSize,
  infinite: settings.infinite,
  horizontal: settings.horizontal
});

describe('Common Spec', () => {
  describe('Settings', () => {
    test('uses defaults for missing or malformed input', () => {
      [undefined, null, 'invalid', 42].forEach(input =>
        expect(takeCoreSettings(parseSettings(input))).toEqual({
          startIndex: 1,
          bufferSize: 5,
          padding: 0.5,
          itemSize: NaN,
          infinite: false,
          horizontal: false
        })
      );
    });

    test('applies valid overrides', () => {
      expect(
        takeCoreSettings(
          parseSettings({ startIndex: 99, bufferSize: 11, infinite: true })
        )
      ).toEqual({
        startIndex: 99,
        bufferSize: 11,
        padding: 0.5,
        itemSize: NaN,
        infinite: true,
        horizontal: false
      });
    });

    test('normalizes invalid and below-limit values', () => {
      const cases: Array<{
        key: keyof Settings;
        input: unknown;
        expected: unknown;
      }> = [
        { key: 'startIndex', input: false, expected: 1 },
        { key: 'bufferSize', input: { invalid: true }, expected: 5 },
        { key: 'bufferSize', input: 5.5, expected: 5 },
        { key: 'bufferSize', input: -1, expected: 1 },
        { key: 'padding', input: 'invalid', expected: 0.5 },
        { key: 'padding', input: -0.1, expected: 0.01 },
        { key: 'itemSize', input: -5, expected: 1 },
        { key: 'itemSize', input: 1.5, expected: NaN },
        { key: 'infinite', input: 'invalid', expected: false },
        { key: 'horizontal', input: null, expected: false }
      ];

      cases.forEach(({ key, input, expected }) =>
        expect({ key, value: parseSettings({ [key]: input })[key] }).toEqual({
          key,
          value: expected
        })
      );
    });

    test('accepts an HTML element', () => {
      const element = document.createElement('div');
      const settings = parseSettings({ viewportElement: element });

      expect(settings.viewportElement).toBe(element);
      expect(settings.viewport).toBe(element);
    });

    test('rejects an element-like object', () => {
      const settings = parseSettings({ viewportElement: { nodeType: 1 } });

      expect(settings.viewportElement).toBeNull();
      expect(settings.viewport).toBeNull();
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
