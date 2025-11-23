import { test, expect } from '@playwright/test';
import { VScrollFixture, Direction } from '../fixture/VScrollFixture.js';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

// Basic unlimited datasource for all tests
const makeUnlimitedDatasource =
  () => (index: number, count: number, success: (data: unknown[]) => void) => {
    const data = [];
    for (let i = index; i < index + count; i++) {
      data.push({ id: i, text: `item #${i}` });
    }
    setTimeout(() => success(data), 25);
  };

const fixedItemSizeConfigList: ITestConfig[] = [
  {
    datasourceGet: makeUnlimitedDatasource(),
    datasourceSettings: {
      startIndex: 1,
      padding: 2,
      itemSize: 15,
      adapter: true
    },
    templateSettings: { viewportHeight: 20, itemHeight: 15 }
  },
  {
    datasourceGet: makeUnlimitedDatasource(),
    datasourceSettings: {
      startIndex: 1,
      padding: 0.5,
      itemSize: 20,
      adapter: true
    },
    templateSettings: { viewportHeight: 120, itemHeight: 20 }
  },
  {
    datasourceGet: makeUnlimitedDatasource(),
    datasourceSettings: {
      startIndex: -99,
      padding: 0.3,
      itemSize: 25,
      adapter: true
    },
    templateSettings: { viewportHeight: 200, itemHeight: 25 }
  },
  {
    datasourceGet: makeUnlimitedDatasource(),
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
    datasourceGet: makeUnlimitedDatasource(),
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
    datasourceGet: makeUnlimitedDatasource(),
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
    datasourceGet: makeUnlimitedDatasource(),
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

interface ItemsCounter {
  backward: { count: number; index: number; padding: number };
  forward: { count: number; index: number; padding: number };
}

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
  const itemsCounter: ItemsCounter = {
    backward: { count: 0, index: 0, padding: 0 },
    forward: { count: 0, index: 0, padding: 0 }
  };

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
});
