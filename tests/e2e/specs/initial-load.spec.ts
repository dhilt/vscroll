import { test, expect } from '@playwright/test';
import { VScrollFixture, Direction } from '../fixture/VScrollFixture.js';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { ITestConfig } from 'types/index.js';
import { ItemsCounter } from '../helpers/itemsCounter.js';

// // Capture console logs for comparison
// test.beforeEach(async ({ page }) => {
//   page.on('console', msg => {
//     console.log('[BROWSER]', msg.text());
//   });
// });

test.afterEach(afterEachLogs);

// Basic unlimited datasource for all tests
const unlimitedDatasource = (index, count, success) => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    data.push({ id: i, text: `item #${i}` });
  }
  setTimeout(() => success(data), 25);
};

const fixedItemSizeConfigList: ITestConfig[] = [
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: 1,
      padding: 2,
      itemSize: 15,
      adapter: true
    },
    templateSettings: { viewportHeight: 20, itemHeight: 15 }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: 1,
      padding: 0.5,
      itemSize: 20,
      adapter: true
    },
    templateSettings: { viewportHeight: 120, itemHeight: 20 }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: -99,
      padding: 0.3,
      itemSize: 25,
      adapter: true
    },
    templateSettings: { viewportHeight: 200, itemHeight: 25 }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: -77,
      padding: 0.62,
      itemSize: 100,
      horizontal: true,
      adapter: true
    },
    templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: 1,
      padding: 0.5,
      itemSize: 20,
      windowViewport: true,
      adapter: true
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    }
  }
];

const fixedItemSizeAndBigBufferSizeConfigList: ITestConfig[] = [
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: 100,
      padding: 0.1,
      itemSize: 20,
      bufferSize: 20,
      adapter: true
    },
    templateSettings: { viewportHeight: 100, itemHeight: 20 }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: -50,
      padding: 0.1,
      itemSize: 100,
      bufferSize: 10,
      horizontal: true,
      adapter: true
    },
    templateSettings: { viewportWidth: 200, itemWidth: 100, horizontal: true }
  }
];

const tunedItemSizeConfigList: ITestConfig[] = [
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 1,
      padding: 0.5,
      itemSize: 40,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: { viewportHeight: 100, itemHeight: 20 }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: -50,
      bufferSize: 2,
      padding: 0.5,
      itemSize: 30,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: { viewportHeight: 120, itemHeight: 20 }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: -77,
      padding: 0.82,
      itemSize: 200,
      horizontal: true,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: -47,
      padding: 0.3,
      itemSize: 60,
      windowViewport: true,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 40
    }
  }
];

const tunedItemSizeAndBigBufferSizeConfigList: ITestConfig[] = [
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: -50,
      bufferSize: 7,
      padding: 0.5,
      itemSize: 30,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: { viewportHeight: 120, itemHeight: 20 }
  },
  {
    datasourceGet: unlimitedDatasource,
    datasourceSettings: {
      startIndex: 50,
      padding: 0.33,
      itemSize: 35,
      bufferSize: 20,
      windowViewport: true,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    }
  }
];

const noItemSizeConfigList: ITestConfig[] = tunedItemSizeConfigList.map(
  ({
    datasourceGet,
    datasourceSettings: { itemSize: _, ...restDatasourceSettings },
    ...config
  }) => ({
    ...config,
    datasourceGet,
    datasourceSettings: { ...restDatasourceSettings }
  })
);

const noItemSizeAndBigBufferConfigList: ITestConfig[] =
  tunedItemSizeAndBigBufferSizeConfigList.map(
    ({
      datasourceGet,
      datasourceSettings: { itemSize: _, ...restDatasourceSettings },
      ...config
    }) => ({
      ...config,
      datasourceGet,
      datasourceSettings: { ...restDatasourceSettings }
    })
  );

const lackOfItemsOnFirstFetchConfigList: ITestConfig[] = [
  {
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= 1) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
    datasourceSettings: {
      startIndex: 100,
      padding: 0.5,
      bufferSize: 10,
      minIndex: 1,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: { viewportHeight: 300, itemHeight: 20 }
  },
  {
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= -75) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
    datasourceSettings: {
      startIndex: -70,
      padding: 0.5,
      bufferSize: 2,
      minIndex: -75,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: { viewportHeight: 200, itemHeight: 20 }
  },
  {
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= -9) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
    datasourceSettings: {
      startIndex: 1,
      padding: 0.1,
      bufferSize: 12,
      minIndex: -9,
      windowViewport: true,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    }
  },
  {
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= -120) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
    datasourceSettings: {
      startIndex: -99,
      padding: 0.3,
      bufferSize: 4,
      minIndex: -120,
      horizontal: true,
      adapter: true
    },
    noRelaxOnStart: true,
    templateSettings: { horizontal: true, viewportWidth: 300, itemWidth: 40 }
  }
];

const getSetItemSizeCounter = async (
  config: ITestConfig,
  fixture: VScrollFixture,
  itemSize: number
): Promise<ItemsCounter> => {
  const bufferSize = await fixture.scroller.settings.bufferSize;
  const startIndex = config.datasourceSettings.startIndex as number;
  const padding = config.datasourceSettings.padding as number;
  const viewportSize = await fixture.scroller.viewport.getSize();

  const backwardLimit = viewportSize * padding;
  const forwardLimit = viewportSize + backwardLimit;
  const itemsCounter = new ItemsCounter();

  itemsCounter.backward.count = Math.ceil(backwardLimit / itemSize);
  itemsCounter.forward.count = Math.ceil(forwardLimit / itemSize);

  // when bufferSize is big enough
  const bwdDiff = bufferSize - itemsCounter.backward.count;
  if (bwdDiff > 0) {
    itemsCounter.backward.count += bwdDiff;
  }
  const fwdDiff = bufferSize - itemsCounter.forward.count;
  if (fwdDiff > 0) {
    itemsCounter.forward.count += fwdDiff;
  }

  itemsCounter.backward.index = startIndex - itemsCounter.backward.count;
  itemsCounter.forward.index = startIndex + itemsCounter.forward.count - 1;
  return itemsCounter;
};

const getNotSetItemSizeCounter = async (
  config: ITestConfig,
  fixture: VScrollFixture,
  itemSize: number,
  previous?: ItemsCounter
): Promise<ItemsCounter> => {
  const bufferSize = await fixture.scroller.settings.bufferSize;
  const startIndex = config.datasourceSettings.startIndex as number;
  const padding = config.datasourceSettings.padding as number;
  const viewportSize = await fixture.scroller.viewport.getSize();
  const backwardLimit = viewportSize * padding;
  const forwardLimit = viewportSize + backwardLimit;
  const itemsCounter = new ItemsCounter();
  const countB = previous ? previous.backward.count : 0;
  const countF = previous ? previous.forward.count : 0;
  let bwd, fwd;

  // 1) fetch only in forward direction if this is the first fetch
  // 2) fetch bufferSize items if Settings.itemSize value hasn't been set up
  itemsCounter.backward.count = previous
    ? itemSize
      ? Math.ceil(backwardLimit / itemSize)
      : bufferSize
    : 0;
  itemsCounter.forward.count = itemSize
    ? Math.ceil(forwardLimit / itemSize)
    : bufferSize;
  if (previous) {
    itemsCounter.backward.count = Math.max(itemsCounter.backward.count, countB);
    itemsCounter.forward.count = Math.max(itemsCounter.forward.count, countF);
  }

  // when bufferSize is big enough
  bwd = itemsCounter.backward.count - (previous ? countB : 0);
  fwd = itemsCounter.forward.count - (previous ? countF : 0);
  const bwdDiff = bwd > 0 ? bufferSize - bwd : 0;
  const fwdDiff = fwd > 0 ? bufferSize - fwd : 0;
  if (bwdDiff > 0 && bwd > fwd) {
    itemsCounter.backward.count += bwdDiff;
    itemsCounter.forward.count = previous ? countF : itemsCounter.forward.count;
  }
  if (fwdDiff > 0 && fwd >= bwd) {
    itemsCounter.forward.count += fwdDiff;
    itemsCounter.backward.count = previous
      ? countB
      : itemsCounter.backward.count;
  }

  if (previous) {
    bwd = itemsCounter.backward.count - countB;
    fwd = itemsCounter.forward.count - countF;
    if (bwd > 0 && bwd > fwd) {
      itemsCounter.backward.count = countB + bwd;
      itemsCounter.forward.count =
        fwd > 0 ? countF : itemsCounter.forward.count;
    }
    if (fwd > 0 && fwd >= bwd) {
      itemsCounter.forward.count = countF + fwd;
      itemsCounter.backward.count =
        bwd > 0 ? countB : itemsCounter.backward.count;
    }
  }

  itemsCounter.backward.index = startIndex - itemsCounter.backward.count;
  itemsCounter.forward.index = startIndex + itemsCounter.forward.count - 1;

  const defaultSize = await fixture.scroller.buffer.defaultSize;
  itemsCounter.backward.padding = 0;
  itemsCounter.forward.padding = Math.max(
    0,
    viewportSize - itemsCounter.forward.count * defaultSize
  );

  return itemsCounter;
};

const testItemsCounter = async (
  startIndex: number,
  fixture: VScrollFixture,
  itemsCounter: ItemsCounter
) => {
  const elements = await fixture.getElements();
  const firstIndex = await fixture.getElementIndex(elements[0] as HTMLElement);
  const lastIndex = await fixture.getElementIndex(
    elements[elements.length - 1] as HTMLElement
  );

  expect(firstIndex).toEqual(itemsCounter.backward.index);
  expect(lastIndex).toEqual(itemsCounter.forward.index);
  expect(
    await fixture.scroller.viewport.paddings[Direction.backward].size
  ).toEqual(itemsCounter.backward.padding);
  expect(
    await fixture.scroller.viewport.paddings[Direction.forward].size
  ).toEqual(itemsCounter.forward.padding);

  const bufferInfo = await fixture.adapter.bufferInfo;
  expect(bufferInfo.firstIndex).toEqual(itemsCounter.backward.index);
  expect(bufferInfo.lastIndex).toEqual(itemsCounter.forward.index);

  const firstVisible = await fixture.adapter.firstVisible;
  expect(firstVisible.$index).toEqual(startIndex);
};

const testSetItemSizeCase = async (
  fixture: VScrollFixture,
  config: ITestConfig
) => {
  // Wait for the workflow to complete
  await fixture.adapter.relax();

  const cyclesDone = await fixture.workflow.cyclesDone;
  const fetchCount = await fixture.page.evaluate(
    () => window.__vscroll__.workflow.scroller.state.fetch.callCount
  );
  const innerLoopCount = await fixture.workflow.innerLoopCount;
  const clipCount = await fixture.page.evaluate(
    () => window.__vscroll__.workflow.scroller.state.clip.callCount
  );

  expect(cyclesDone).toEqual(1);
  expect(fetchCount).toEqual(2);
  expect(innerLoopCount).toEqual(3);
  expect(clipCount).toEqual(0);
  expect(
    await fixture.scroller.viewport.paddings[Direction.backward].size
  ).toEqual(0);
  expect(
    await fixture.scroller.viewport.paddings[Direction.forward].size
  ).toEqual(0);

  const startIndex = config.datasourceSettings.startIndex as number;
  const tplSettings = config.templateSettings || {};
  const horizontal = config.datasourceSettings.horizontal;
  const itemSize = tplSettings[
    horizontal ? 'itemWidth' : 'itemHeight'
  ] as number;
  const itemsCounter = await getSetItemSizeCounter(config, fixture, itemSize);
  await testItemsCounter(startIndex, fixture, itemsCounter);
};

type LoopData = {
  loopCount: number;
  viewportSize: number;
  defaultSize: number;
  bufferSize: number;
  firstIndex: number;
  lastIndex: number;
  bwdPaddingSize: number;
  fwdPaddingSize: number;
  elementsLength: number;
  firstElementIndex: number;
  lastElementIndex: number;
  bufferItemsLength: number;
  bufferFirstIndex: number;
  bufferLastIndex: number;
  firstVisibleIndex: number;
};

const testNotSetItemSizeCase = async (
  fixture: VScrollFixture,
  config: ITestConfig
) => {
  const startIndex = config.datasourceSettings.startIndex as number;
  const initialItemSize = config.datasourceSettings.itemSize as number;
  const tplSettings = config.templateSettings || {};
  const horizontal = config.datasourceSettings.horizontal;
  const itemSize = tplSettings[
    horizontal ? 'itemWidth' : 'itemHeight'
  ] as number;

  // Capture data from all loops in browser context
  const loopData = await fixture.page.evaluate(() => {
    return new Promise<{ loops: LoopData[] }>(resolve => {
      const workflow = window.__vscroll__.workflow;
      const innerLoop = workflow.scroller.state.cycle.innerLoop;
      const loops: LoopData[] = [];

      innerLoop.busy.on(loopPending => {
        if (loopPending) {
          return;
        }

        const loopCount = innerLoop.total;

        // On loops 1, 2, 3: memorize complete state
        if (loopCount >= 1 && loopCount <= 3) {
          const buffer = workflow.scroller.buffer;
          loops.push({
            loopCount: loopCount,
            viewportSize: workflow.scroller.viewport.getScrollableSize(),
            defaultSize: buffer.defaultSize,
            bufferSize: buffer.size,
            firstIndex: buffer.firstIndex,
            lastIndex: buffer.lastIndex,
            bwdPaddingSize: workflow.scroller.viewport.paddings.backward.size,
            fwdPaddingSize: workflow.scroller.viewport.paddings.forward.size,
            elementsLength: buffer.items.length,
            firstElementIndex: buffer.items[0].$index,
            lastElementIndex: buffer.items[buffer.items.length - 1].$index,
            bufferItemsLength: buffer.items.length,
            bufferFirstIndex: workflow.scroller.adapter.bufferInfo.firstIndex,
            bufferLastIndex: workflow.scroller.adapter.bufferInfo.lastIndex,
            firstVisibleIndex: workflow.scroller.adapter.firstVisible.$index
          });
        }

        // On loop 4: resolve with all collected data
        if (loopCount === 4) {
          resolve({ loops });
          return;
        }
      });
    });
  });

  // Wait for scroller to stop completely
  await fixture.adapter.relax();

  // Check final state in node context
  const cyclesDone = await fixture.workflow.cyclesDone;
  const { fetchCount, clipCount } = await fixture.page.evaluate(() => ({
    fetchCount: window.__vscroll__.workflow.scroller.state.fetch.callCount,
    clipCount: window.__vscroll__.workflow.scroller.state.clip.callCount
  }));
  expect(cyclesDone).toEqual(1);
  expect(fetchCount).toEqual(3);
  expect(clipCount).toEqual(0);

  // Validate each loop's itemsCounter against captured snapshots
  let previousCounter: ItemsCounter | undefined;

  for (const loop of loopData.loops) {
    const sizeToUse = loop.loopCount === 1 ? initialItemSize : itemSize;
    const itemsCounter = await getNotSetItemSizeCounter(
      config,
      fixture,
      sizeToUse,
      previousCounter
    );

    // Replicate all checks from original testItemsCounter using captured data
    expect(loop.bwdPaddingSize).toEqual(itemsCounter.backward.padding);
    expect(loop.fwdPaddingSize).toEqual(itemsCounter.forward.padding);
    expect(loop.elementsLength).toEqual(itemsCounter.total);
    expect(loop.bufferItemsLength).toEqual(itemsCounter.total);
    expect(loop.firstElementIndex).toEqual(itemsCounter.backward.index);
    expect(loop.lastElementIndex).toEqual(itemsCounter.forward.index);
    expect(loop.bufferFirstIndex).toEqual(itemsCounter.backward.index);
    expect(loop.bufferLastIndex).toEqual(itemsCounter.forward.index);
    expect(loop.firstVisibleIndex).toEqual(startIndex);

    previousCounter = itemsCounter;
  }
};

const testLackOfItemsOnFirstFetchCase = async (
  fixture: VScrollFixture,
  config: ITestConfig
) => {
  const startIndex = config.datasourceSettings.startIndex as number;

  // Capture state after the first inner loop completes
  const result = await fixture.page.evaluate(() => {
    return new Promise<{
      scrollPosition: number;
      bwdPaddingSize: number;
      firstVisibleIndex: number;
    }>(resolve => {
      const workflow = window.__vscroll__.workflow;
      const innerLoop = workflow.scroller.state.cycle.innerLoop;
      let resolved = false;

      innerLoop.busy.on((loopPending: boolean) => {
        if (!loopPending && !resolved) {
          // First inner loop just completed
          resolved = true;
          const viewport = workflow.scroller.viewport;
          resolve({
            scrollPosition: viewport.scrollPosition,
            bwdPaddingSize: viewport.paddings.backward.size,
            firstVisibleIndex: workflow.scroller.adapter.firstVisible.$index
          });
        }
      });
    });
  });

  // Start workflow and wait for it to complete
  await fixture.adapter.relax();

  // Verify state after first inner loop
  expect(result.scrollPosition).toBe(result.bwdPaddingSize);
  expect(result.firstVisibleIndex).toEqual(startIndex);

  // Verify final state
  const finalFirstVisibleIndex = (await fixture.adapter.firstVisible).$index;
  expect(finalFirstVisibleIndex).toEqual(startIndex);
};

const makeTest = (
  title: string,
  config: ITestConfig,
  testFunc: (fixture: VScrollFixture, config: ITestConfig) => Promise<void>
) => {
  test(title, async ({ page }) => {
    const fixture = await createFixture({ page, config });
    await testFunc(fixture, config);
    await fixture.dispose();
  });
};

test.describe('Initial Load Spec', () => {
  test.describe('Fixed itemSize', () => {
    fixedItemSizeConfigList.forEach((config, i) =>
      makeTest(
        `should make 2 fetches to satisfy padding limits (config ${i})`,
        config,
        testSetItemSizeCase
      )
    );
    fixedItemSizeAndBigBufferSizeConfigList.forEach((config, i) =>
      makeTest(
        `should make 2 fetches to overflow padding limits (bufferSize is big enough) (config ${i})`,
        config,
        testSetItemSizeCase
      )
    );
  });

  test.describe('Tuned itemSize', () => {
    tunedItemSizeConfigList.forEach((config, i) =>
      makeTest(
        `should make 3 fetches to satisfy padding limits (config ${i})`,
        config,
        testNotSetItemSizeCase
      )
    );
    tunedItemSizeAndBigBufferSizeConfigList.forEach((config, i) =>
      makeTest(
        `should make 3 fetches to overflow padding limits (bufferSize is big enough) (config ${i})`,
        config,
        testNotSetItemSizeCase
      )
    );
  });

  test.describe('No itemSize', () => {
    noItemSizeConfigList.forEach((config, i) =>
      makeTest(
        `should make 3 fetches to satisfy padding limits (config ${i})`,
        config,
        testNotSetItemSizeCase
      )
    );
    noItemSizeAndBigBufferConfigList.forEach((config, i) =>
      makeTest(
        `should make 3 fetches to overflow padding limits (bufferSize is big enough) (config ${i})`,
        config,
        testNotSetItemSizeCase
      )
    );
  });

  test.describe('Lack of items after the 1st fetch', () =>
    lackOfItemsOnFirstFetchConfigList.forEach((config, i) =>
      makeTest(
        `should stretch the forward padding element (${i})`,
        config,
        testLackOfItemsOnFirstFetchCase
      )
    ));
});
