import { test, expect, Page } from '@playwright/test';
import {
  VScrollFixture,
  Direction,
  type DirectionType
} from '../fixture/VScrollFixture.js';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

const min = 1;
const max = 100;
const scrollCount = 10;

type IConfig = ITestConfig;

// Limited datasource: items [1..100]
const datasourceGetLimited = (index, count, success) => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    if (i >= 1 && i <= 100) {
      data.push({ id: i, text: `item #${i}` });
    }
  }
  setTimeout(() => success(data), 25);
};

// Empty datasource: no items at all
const datasourceGetEmpty = (_index, _count, success) => {
  setTimeout(() => success([]), 25);
};

type BofEofState = {
  bufferBof: boolean;
  bufferEof: boolean;
  adapterBof: boolean;
  adapterEof: boolean;
  sharedBof?: boolean;
  sharedEof?: boolean;
  bofCount?: number;
  eofCount?: number;
};

type Counter = {
  count: number;
  value: boolean;
  off?: () => void;
};

type BofEofCountersContainer = {
  bof: Counter;
  eof: Counter;
};

type WithCounters = Window & { __bofEofCounters?: BofEofCountersContainer };

/** Setup bof/eof tracking container in browser context */
const setupBofEofTracking = async (page: Page) =>
  page.evaluate(() => {
    const w = window as WithCounters;
    const adapter = w.__vscroll__.datasource.adapter;
    const bof: Counter = {
      count: 0,
      value: adapter.bof
    };
    const eof: Counter = {
      count: 0,
      value: adapter.eof
    };

    w.__bofEofCounters = { bof, eof };

    adapter.bof$.on((value: boolean) => {
      bof.count++;
      bof.value = value;
    });
    adapter.eof$.on((value: boolean) => {
      eof.count++;
      eof.value = value;
    });
  });

// Base configs for BOF and EOF cases
const bofConfig: IConfig = {
  datasourceGet: datasourceGetLimited,
  datasourceSettings: {
    startIndex: min,
    bufferSize: 10,
    padding: 0.5
  },
  templateSettings: { viewportHeight: 200, itemHeight: 20 },
  onBefore: setupBofEofTracking
};

const eofConfig: IConfig = {
  datasourceGet: datasourceGetLimited,
  datasourceSettings: {
    startIndex: max - 10 + 1,
    bufferSize: 10,
    padding: 0.5
  },
  templateSettings: { viewportHeight: 200, itemHeight: 20 },
  onBefore: setupBofEofTracking
};

// Config where datasource always returns empty array
const emptyConfig: IConfig = {
  datasourceGet: datasourceGetEmpty,
  datasourceSettings: {
    startIndex: min,
    bufferSize: 10,
    padding: 0.5
  },
  templateSettings: { viewportHeight: 200, itemHeight: 20 },
  onBefore: setupBofEofTracking
};

// Config with explicit min/max indexes to track bof/eof reactive counters
const multipleScrollsConfig: IConfig = {
  datasourceGet: datasourceGetLimited,
  datasourceSettings: {
    startIndex: min,
    bufferSize: 10,
    padding: 0.5,
    minIndex: min,
    maxIndex: max
  },
  templateSettings: { viewportHeight: 200, itemHeight: 20 },
  onBefore: setupBofEofTracking
};

const getBofEofState = async (fixture: VScrollFixture): Promise<BofEofState> =>
  fixture.page.evaluate(() => {
    const w = window as WithCounters;
    const workflow = w.__vscroll__.workflow;
    const buffer = workflow.scroller.buffer;
    const adapter = w.__vscroll__.datasource.adapter;
    const counters = w.__bofEofCounters;

    return {
      bufferBof: buffer.bof.get(),
      bufferEof: buffer.eof.get(),
      adapterBof: adapter.bof,
      adapterEof: adapter.eof,
      sharedBof: counters.bof?.value,
      sharedEof: counters.eof?.value,
      bofCount: counters.bof?.count || 0,
      eofCount: counters.eof?.count || 0
    };
  });

/**
 * Expect that BOF/EOF limit is reached for the given direction.
 */
const expectLimit = async (
  fixture: VScrollFixture,
  config: IConfig,
  direction: DirectionType,
  noscroll = false
) => {
  const forward = direction === Direction.forward;

  const elements = await fixture.getElements();
  const bufferSize = config.datasourceSettings.bufferSize as number;

  expect(elements.length).toBeGreaterThan(bufferSize);

  const forwardPadding =
    await fixture.scroller.viewport.paddings[Direction.forward].size;
  const backwardPadding =
    await fixture.scroller.viewport.paddings[Direction.backward].size;

  if (forward) {
    expect(forwardPadding).toBe(0);
    if (!noscroll) {
      expect(backwardPadding).toBeGreaterThan(0);
    }
  } else {
    expect(backwardPadding).toBe(0);
    if (!noscroll) {
      expect(forwardPadding).toBeGreaterThan(0);
    }
  }

  const targetElement = forward
    ? (elements[elements.length - 1] as HTMLElement)
    : (elements[0] as HTMLElement);
  const targetIndex = await fixture.getElementIndex(targetElement);
  const expectedIndex = forward ? max : min;

  expect(targetIndex).toBe(expectedIndex);

  const state = await getBofEofState(fixture);

  // bof/eof flags in buffer, adapter and shared container must be in sync
  expect(state.bufferBof).toBe(!forward);
  expect(state.adapterBof).toBe(state.bufferBof);
  if (typeof state.sharedBof !== 'undefined') {
    expect(state.sharedBof).toBe(state.bufferBof);
  }

  expect(state.bufferEof).toBe(forward);
  expect(state.adapterEof).toBe(state.bufferEof);
  if (typeof state.sharedEof !== 'undefined') {
    expect(state.sharedEof).toBe(state.bufferEof);
  }
};

const makeLimitTest = (
  title: string,
  config: IConfig,
  testFunc: (fixture: VScrollFixture, config: IConfig) => Promise<void>
) => {
  test(title, async ({ page }) => {
    const fixture = await createFixture({ page, config });
    await testFunc(fixture, config);
    await fixture.dispose();
  });
};

const runLimitSuite = (kind: 'bof' | 'eof') => {
  const isEOF = kind === 'eof';
  const config = isEOF ? eofConfig : bofConfig;
  const suiteTitle = isEOF ? 'End of file' : 'Begin of file';
  const limitDirection = isEOF ? Direction.forward : Direction.backward;
  const oppositeDirection = isEOF ? Direction.backward : Direction.forward;

  test.describe(suiteTitle, () => {
    makeLimitTest(
      `should get ${kind} on init`,
      config,
      async (fixture, cfg) => {
        // Initial workflow has already completed in createFixture
        await expectLimit(fixture, cfg, limitDirection, true);
      }
    );

    makeLimitTest(
      `should reset ${kind} after scroll`,
      config,
      async fixture => {
        const initial = await getBofEofState(fixture);
        if (isEOF) {
          expect(initial.bufferEof).toBe(true);
          expect(initial.adapterEof).toBe(true);
          expect(initial.sharedEof).toBe(true);
          expect(initial.bufferBof).toBe(false);
        } else {
          expect(initial.bufferBof).toBe(true);
          expect(initial.bufferEof).toBe(false);
          expect(initial.adapterEof).toBe(false);
          expect(initial.sharedEof).toBe(false);
        }

        // Scroll away from the current limit
        if (isEOF) {
          await fixture.scrollMin();
        } else {
          await fixture.scrollMax();
        }

        const after = await getBofEofState(fixture);
        expect(after.bufferBof).toBe(false);
        expect(after.adapterBof).toBe(false);
        expect(after.sharedBof).toBe(false);
        expect(after.bufferEof).toBe(false);
        expect(after.adapterEof).toBe(false);
        expect(after.sharedEof).toBe(false);
      }
    );

    makeLimitTest(
      `should stop when ${kind} is reached again`,
      config,
      async (fixture, cfg) => {
        // Move to the opposite limit and then back
        if (isEOF) {
          await fixture.scrollMin();
          await fixture.scrollMax();
        } else {
          await fixture.scrollMax();
          await fixture.scrollMin();
        }

        await expectLimit(fixture, cfg, limitDirection);
      }
    );

    makeLimitTest(
      `should reach ${isEOF ? 'bof' : 'eof'} after some scrolls`,
      config,
      async (fixture, cfg) => {
        // From current limit, repeated scrolls must eventually reach the opposite limit
        for (let i = 0; i < scrollCount; i++) {
          if (isEOF) {
            await fixture.scrollMin();
          } else {
            await fixture.scrollMax();
          }
        }

        await expectLimit(fixture, cfg, oppositeDirection);
      }
    );
  });
};

test.describe('EOF/BOF Spec', () => {
  runLimitSuite('bof');
  runLimitSuite('eof');

  test.describe('Empty datasource', () => {
    test('should reach both bof and eof during the first workflow cycle', async ({
      page
    }) => {
      const fixture = await createFixture({ page, config: emptyConfig });

      const state = await getBofEofState(fixture);
      expect(state.bufferBof).toBe(true);
      expect(state.bufferEof).toBe(true);
      expect(state.adapterBof).toBe(true);
      expect(state.adapterEof).toBe(true);
      expect(state.sharedBof).toBe(true);
      expect(state.sharedEof).toBe(true);
      expect(state.bofCount).toBe(1);
      expect(state.eofCount).toBe(1);

      await fixture.dispose();
    });
  });

  test.describe('Multiple scrolls', () => {
    test('should reach bof/eof multiple times', async ({ page }) => {
      const fixture = await createFixture({
        page,
        config: multipleScrollsConfig
      });

      // Perform a sequence of scrolls:
      // max, min, max, min, ... to toggle bof/eof repeatedly
      const COUNT = 10;
      for (let i = 1; i <= COUNT; i++) {
        const cyclesDone = await fixture.workflow.cyclesDone;
        if (cyclesDone === 1) {
          await fixture.scrollMax();
        } else if (cyclesDone > 1 && cyclesDone < COUNT) {
          if (cyclesDone % 2 === 0) {
            await fixture.scrollMin();
          } else {
            await fixture.scrollMax();
          }
        } else {
          break;
        }
      }

      const state = await getBofEofState(fixture);
      expect(state.bofCount || 0).toEqual(COUNT);
      expect(state.eofCount || 0).toEqual(COUNT - 1);

      await fixture.dispose();
    });
  });
});
