import { test, expect } from '@playwright/test';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import {
  Direction,
  VScrollFixture,
  type DirectionType
} from '../fixture/VScrollFixture.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

interface ICustom {
  items: number;
  scrollCount: number;
  start: DirectionType;
}
type IConfig = ITestConfig<ICustom>;

// Datasource generators for limited ranges
// Note: We can't use closure variables because the function gets serialized.
const datasourceGet1to100 = (index, count, success) => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    if (i >= 1 && i <= 100) {
      data.push({ id: i, text: `item #${i}` });
    }
  }
  setTimeout(() => success(data), 25);
};

const datasourceGet51to200 = (index, count, success) => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    if (i >= 51 && i <= 200) {
      data.push({ id: i, text: `item #${i}` });
    }
  }
  setTimeout(() => success(data), 25);
};

const configList: IConfig[] = [
  {
    datasourceGet: datasourceGet1to100,
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 0.5,
      minIndex: 1,
      maxIndex: 100,
      adapter: true
    },
    templateSettings: { viewportHeight: 100, itemHeight: 20 },
    custom: { items: 100, scrollCount: 5, start: Direction.backward }
  },
  {
    datasourceGet: datasourceGet1to100,
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 3,
      padding: 0.3,
      minIndex: 1,
      maxIndex: 100,
      adapter: true
    },
    templateSettings: { viewportHeight: 110, itemHeight: 20 },
    custom: { items: 100, scrollCount: 8, start: Direction.backward }
  },
  {
    datasourceGet: datasourceGet51to200,
    datasourceSettings: {
      startIndex: 51,
      bufferSize: 7,
      padding: 1.1,
      minIndex: 51,
      maxIndex: 200,
      adapter: true
    },
    templateSettings: { viewportHeight: 69, itemHeight: 20 },
    custom: { items: 150, scrollCount: 6, start: Direction.backward }
  },
  {
    datasourceGet: datasourceGet51to200,
    datasourceSettings: {
      startIndex: 51,
      bufferSize: 20,
      padding: 0.2,
      windowViewport: true,
      minIndex: 51,
      maxIndex: 200,
      adapter: true
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    },
    custom: { items: 150, scrollCount: 5, start: Direction.backward }
  }
];

const configEofList: IConfig[] = configList.map(config => ({
  ...config,
  custom: {
    ...config.custom,
    start: Direction.forward
  }
}));

/**
 * Run fast alternating scrolls in browser context
 */
const runFastScroll = (
  fixture: VScrollFixture,
  customConfig: ICustom
): Promise<void> =>
  fixture.page.evaluate(
    ({ scrollCount, start }) =>
      new Promise(resolve => {
        const adapter = window.__vscroll__.datasource.adapter;
        let iteration = 0;

        const doScroll = () => {
          setTimeout(() => {
            // scrollMax
            adapter.fix({ scrollPosition: Infinity });

            setTimeout(async () => {
              // scrollMin (except on last iteration for EOF tests)
              if (iteration < scrollCount || start === 'backward') {
                adapter.fix({ scrollPosition: 0 });
              }

              iteration++;
              if (iteration <= scrollCount) {
                doScroll();
              } else {
                resolve();
              }
            }, 25);
          }, 25);
        };

        doScroll();
      }),
    { scrollCount: customConfig.scrollCount, start: customConfig.start }
  );

/**
 * Wait for expected edge element to be reached
 * Simple feedback loop: Wait → Check → Correct if needed → Repeat
 */
const waitForExpectedEdge = async (
  fixture: VScrollFixture,
  config: IConfig
): Promise<void> => {
  const startIdx = config.datasourceSettings.startIndex as number;
  const itemsCount = config.custom.items;
  const timeout = 10000;
  const startTime = Date.now();

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for expected edge element');
    }

    // Step 1: Wait for workflow to be idle
    await fixture.adapter.relax();

    // Step 2: Get all state in ONE call
    const state = await fixture.page.evaluate(() => {
      const vscroll = window.__vscroll__;
      const { buffer, viewport } = vscroll.workflow.scroller;
      const Direction = window.VScroll.Direction;
      const position = viewport.scrollPosition;
      const eof = position === 0;
      const direction = eof ? Direction.backward : Direction.forward;
      const edgeItem = buffer.getEdgeVisibleItem(direction);

      return {
        bufferSize: buffer.size,
        position,
        eof,
        edgeItem: edgeItem ? { $index: edgeItem.$index } : null
      };
    });

    // Step 3: Do calculations/checks in Node.js
    if (!state.bufferSize || !state.edgeItem) {
      continue; // Buffer or edge item not ready
    }

    const expectedIndex = startIdx + (state.eof ? 0 : itemsCount - 1);

    // Step 4: Check if we're at target edge
    if (state.edgeItem.$index === expectedIndex) {
      break; // Success!
    }

    // Step 5: Issue corrective scroll
    await fixture.adapter.fix({
      scrollPosition: state.eof ? 0 : Infinity
    });
  }
};

/**
 * Verify final expectations after fast scrolling
 */
const verifyExpectations = async (
  fixture: VScrollFixture,
  config: IConfig
): Promise<void> => {
  const startIndex = config.datasourceSettings.startIndex as number;
  const position = await fixture.scroller.viewport.scrollPosition;
  const itemHeight = config.templateSettings.itemHeight || 20;

  // Get buffer and padding info
  const bufferSize = await fixture.scroller.buffer.size;
  const backwardPadding =
    await fixture.scroller.viewport.paddings[Direction.backward].size;
  const forwardPadding =
    await fixture.scroller.viewport.paddings[Direction.forward].size;

  const bufferHeight = bufferSize * itemHeight;
  const totalSize = backwardPadding + forwardPadding + bufferHeight;
  const totalItemsHeight = config.custom.items * itemHeight;

  // Verify total size matches expected
  expect(totalSize).toBe(totalItemsHeight);
  expect(bufferSize).toBeGreaterThan(0);

  if (bufferSize > 0) {
    if (position === 0) {
      // At BOF - check first element
      const first = await fixture.scroller.buffer.getEdgeVisibleItem(
        Direction.backward
      );
      expect(first.$index).toBe(startIndex);
    } else {
      // At EOF - check last element
      const last = await fixture.scroller.buffer.getEdgeVisibleItem(
        Direction.forward
      );
      expect(last.$index).toBe(startIndex + config.custom.items - 1);
    }
  }
};

/**
 * Main test function
 */
const shouldReachEdge = async (fixture: VScrollFixture, config: IConfig) => {
  // Wait for initial load
  await fixture.adapter.relax();

  // Run fast scrolling and wait for it to complete
  await runFastScroll(fixture, config.custom);

  // Wait for expected edge element
  await waitForExpectedEdge(fixture, config);

  // Verify final state
  await verifyExpectations(fixture, config);
};

const makeTest = (title: string, config: IConfig) => {
  test(title, async ({ page }) => {
    const fixture = await createFixture({ page, config });
    await shouldReachEdge(fixture, config);
    await fixture.dispose();
  });
};

test.describe('Fast Scroll Spec', () => {
  test.describe('multi-scroll to the BOF', () =>
    configList.forEach((config, index) =>
      makeTest(`should reach BOF without gaps (config ${index})`, config)
    ));

  test.describe('multi-scroll to the EOF', () =>
    configEofList.forEach((config, index) =>
      makeTest(`should reach EOF without gaps (config ${index})`, config)
    ));
});
