import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { VScrollFixture, Direction, type DirectionType } from '../fixture/VScrollFixture.js';
import { ItemsCounter } from '../helpers/itemsCounter.js';
import type { IDatasource } from '../../src/index.js';
import { ITestConfig } from 'types/index.js';

type IConfig = ITestConfig<{
  direction: DirectionType;
  count: number;
  bouncing?: boolean;
  mass?: boolean;
}>;

// Test configurations (same as original)
const configList: IConfig[] = [
  {
    datasourceSettings: {
      startIndex: 100,
      bufferSize: 4,
      padding: 0.22,
      itemSize: 20
    },
    datasourceDevSettings: { debug: true, immediateLog: true },
    templateSettings: { viewportHeight: 71, itemHeight: 20 },
    custom: { direction: Direction.forward, count: 1 }
  },
  {
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 0.2,
      itemSize: 20
    },
    datasourceDevSettings: { debug: true, immediateLog: true },
    templateSettings: { viewportHeight: 100, itemHeight: 20 },
    custom: { direction: Direction.forward, count: 1 }
  },
  {
    datasourceSettings: {
      startIndex: -15,
      bufferSize: 12,
      padding: 0.98,
      itemSize: 20
    },
    datasourceDevSettings: { debug: true, immediateLog: true },
    templateSettings: { viewportHeight: 66, itemHeight: 20 },
    custom: { direction: Direction.forward, count: 1 }
  },
  {
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 1,
      horizontal: true,
      itemSize: 100
    },
    datasourceDevSettings: { debug: true, immediateLog: true },
    templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true },
    custom: { direction: Direction.forward, count: 1 }
  },
  {
    datasourceSettings: {
      startIndex: -74,
      bufferSize: 4,
      padding: 0.72,
      horizontal: true,
      itemSize: 75
    },
    datasourceDevSettings: { debug: true, immediateLog: true },
    templateSettings: { viewportWidth: 300, itemWidth: 75, horizontal: true },
    custom: { direction: Direction.forward, count: 1 }
  }
];

// Helper functions (ported from original)
const treatIndex = (index: number) => (index <= 3 ? index : 3 * 2 - index);

const doScrollMax = async (config: IConfig, fixture: VScrollFixture) => {
  if (config.custom.direction === Direction.forward) {
    await fixture.scrollMax();
  } else {
    await fixture.scrollMin();
  }
};

const invertDirection = (config: IConfig) => {
  const _forward = config.custom.direction === Direction.forward;
  config.custom.direction = _forward ? Direction.backward : Direction.forward;
};

const getInitialItemsCounter = async (
  fixture: VScrollFixture,
  config: IConfig
): Promise<ItemsCounter> => {
  const edgeItem = await fixture.scroller.buffer.getEdgeVisibleItem(Direction.forward);
  const oppositeItem = await fixture.scroller.buffer.getEdgeVisibleItem(Direction.backward);
  const result = new ItemsCounter();

  if (!edgeItem || !oppositeItem) {
    return result;
  }

  const startIndex = config.datasourceSettings.startIndex;

  result.set(Direction.forward, {
    count: edgeItem.$index - startIndex + 1,
    index: edgeItem.$index,
    padding: 0,
    size: 0
  });
  result.set(Direction.backward, {
    count: startIndex - oppositeItem.$index,
    index: oppositeItem.$index,
    padding: 0,
    size: NaN
  });

  return result;
};

const getFullHouseDiff = (
  viewportSize: number,
  paddingDelta: number,
  itemSize: number,
  bufferSize: number
): number => {
  const sizeToFill = viewportSize + 2 * paddingDelta;
  const itemsToFillNotRounded = sizeToFill / itemSize;
  const itemsToFillRounded = Math.ceil(sizeToFill / itemSize);
  const itemsToFill =
    itemsToFillRounded + (itemsToFillNotRounded === itemsToFillRounded ? 0 : 1);
  const bufferSizeDiff = bufferSize - itemsToFill;
  return Math.max(0, bufferSizeDiff);
};

const getCurrentItemsCounter = async (
  fixture: VScrollFixture,
  direction: DirectionType,
  previous: ItemsCounter,
  config: IConfig
): Promise<ItemsCounter> => {
  const bufferSize = config.datasourceSettings.bufferSize;
  const padding = config.datasourceSettings.padding;
  const viewportSize = await fixture.scroller.viewport.getSize();
  const itemSize = await fixture.scroller.buffer.defaultSize;
  const fwd = direction === Direction.forward;
  const opposite = fwd ? Direction.backward : Direction.forward;
  const delta = viewportSize * padding;

  // handle direction (fetch)
  const fullHouseDiff = getFullHouseDiff(viewportSize, delta, itemSize, bufferSize);
  const _singleFetchCount = Math.ceil(delta / itemSize);
  const singleFetchCount = Math.max(bufferSize, _singleFetchCount);
  const itemsToFetch =
    previous.direction && previous.direction !== direction
      ? _singleFetchCount + fullHouseDiff
      : singleFetchCount;
  const newDirIndex =
    previous.get(direction).index +
    (fwd ? 1 : -1) * (previous.get(direction).padding / itemSize) +
    (fwd ? 1 : -1) * itemsToFetch;

  // handle opposite (clip)
  const oppPadding = previous.get(opposite).padding;
  const previousTotalSize = previous.total * itemSize + previous.paddings;
  const sizeToClip = previousTotalSize - oppPadding - viewportSize - delta;
  const itemsToClip = Math.floor(sizeToClip / itemSize);
  const newOppIndex =
    previous.get(opposite).index + (fwd ? 1 : -1) * itemsToClip;
  const newOppPadding = itemsToClip * itemSize + oppPadding;

  const result = new ItemsCounter(direction);
  result.set(direction, {
    index: newDirIndex,
    padding: 0,
    count: NaN,
    size: NaN
  });
  result.set(opposite, {
    index: newOppIndex,
    padding: newOppPadding,
    count: NaN,
    size: NaN
  });
  return result;
};

// Create test fixture from config
const createFixture = async (page: Page, config: IConfig): Promise<VScrollFixture> => {
  const { datasourceSettings, datasourceDevSettings, templateSettings } = config;

  // // Capture browser console logs
  // page.on('console', (msg: any) => {
  //   console.log(`[BROWSER] ${msg.text()}`);
  // });

  // Enable adapter to access relax() method
  const datasource: IDatasource = {
    get: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        data.push({ id: i, text: `item #${i}` });
      }
      setTimeout(() => success(data), 25);
    },
    settings: datasourceSettings,
    devSettings: datasourceDevSettings
  };

  const fixture = await VScrollFixture.create(page, {
    datasource,
    useAdapter: true,
    templateSettings,
    templateFn: (item: { $index: number, data: { id: number, text: string } }) =>
      `<div class="item">${item.$index}: ${item.data.text}</div>`
  });

  // Wait for initial workflow cycle to complete
  await fixture.relaxNext();

  // // Debug: log actual element dimensions
  // const debugInfo = await page.evaluate(() => {
  //   const viewport = document.getElementById('viewport')!;
  //   const vscroll = document.getElementById('vscroll')!;
  //   const items = Array.from(vscroll.querySelectorAll('[data-sid]'));
  //   const bwdPadding = vscroll.querySelector('[data-padding-backward]') as HTMLElement;
  //   const fwdPadding = vscroll.querySelector('[data-padding-forward]') as HTMLElement;
  //   const horizontal = (window as any).__vscroll__.workflow.scroller.settings.horizontal;
  //   return {
  //     viewportDimensions: {
  //       clientWidth: viewport.clientWidth,
  //       clientHeight: viewport.clientHeight,
  //       scrollWidth: viewport.scrollWidth,
  //       scrollHeight: viewport.scrollHeight
  //     },
  //     vscrollDimensions: {
  //       clientWidth: vscroll.clientWidth,
  //       clientHeight: vscroll.clientHeight,
  //       scrollWidth: vscroll.scrollWidth,
  //       scrollHeight: vscroll.scrollHeight
  //     },
  //     itemCount: items.length,
  //     firstItemDimensions: items[0] ? {
  //       width: (items[0] as HTMLElement).clientWidth,
  //       height: (items[0] as HTMLElement).clientHeight,
  //       display: getComputedStyle(items[0] as HTMLElement).display,
  //       whiteSpace: getComputedStyle(vscroll).whiteSpace
  //     } : null,
  //     bwdPaddingDimensions: {
  //       width: bwdPadding.clientWidth,
  //       height: bwdPadding.clientHeight,
  //       display: getComputedStyle(bwdPadding).display,
  //       computedWidth: getComputedStyle(bwdPadding).width
  //     },
  //     fwdPaddingDimensions: {
  //       width: fwdPadding.clientWidth,
  //       height: fwdPadding.clientHeight,
  //       display: getComputedStyle(fwdPadding).display,
  //       computedWidth: getComputedStyle(fwdPadding).width
  //     },
  //     horizontal
  //   };
  // });
  // console.log('[DEBUG] Initial dimensions:', JSON.stringify(debugInfo, null, 2));

  return fixture;
};

// Main test function
const shouldScroll = async (fixture: VScrollFixture, config: IConfig) => {
  const custom = config.custom;
  const wfCount = custom.count + 1;
  const wfCountMiddle = Math.ceil(wfCount / 2);
  let itemsCounter: ItemsCounter;
  let cycles = 1;

  // Initial state
  itemsCounter = await getInitialItemsCounter(fixture, config);

  // Perform scrolls
  while (cycles < wfCount) {
    cycles++;

    if (custom.bouncing) {
      invertDirection(config);
    } else if (custom.mass) {
      if (cycles === wfCountMiddle) {
        invertDirection(config);
      }
    }

    await doScrollMax(config, fixture);

    itemsCounter = await getCurrentItemsCounter(fixture, custom.direction, itemsCounter, config);
  }

  // Final expectations
  const direction: DirectionType = custom.direction;
  const opposite: DirectionType =
    direction === Direction.forward ? Direction.backward : Direction.forward;

  const edgeItem = await fixture.scroller.buffer.getEdgeVisibleItem(direction);
  const oppositeItem = await fixture.scroller.buffer.getEdgeVisibleItem(opposite);
  const edgeItemIndex = itemsCounter.get(direction).index;
  const oppositeItemIndex = itemsCounter.get(opposite).index;

  // await new Promise(resolve => setTimeout(resolve, 1000000));
  expect(edgeItem && edgeItem.$index).toEqual(edgeItemIndex);
  expect(oppositeItem && oppositeItem.$index).toEqual(oppositeItemIndex);
  expect(await fixture.scroller.viewport.paddings[direction].size).toEqual(
    itemsCounter.get(direction).padding
  );
  expect(await fixture.scroller.viewport.paddings[opposite].size).toEqual(
    itemsCounter.get(opposite).padding
  );
  expect(await fixture.checkElementContentByIndex(edgeItemIndex)).toEqual(true);
  expect(await fixture.checkElementContentByIndex(oppositeItemIndex)).toEqual(true);
};

const makeTest = (title: string, config: IConfig) => {
  test(title, async ({ page }) => {
    const fixture = await createFixture(page, config);
    await shouldScroll(fixture, config);
    await fixture.cleanup();
  });
};

// Test suites
test.describe('Basic Scroll Spec', () => {
  test.describe('Single max fwd scroll event', () =>
    configList.forEach((config, index) =>
      makeTest(`should process 1 forward max scroll (config ${index})`, config)
    )
  );

  test.describe('Single max bwd scroll event', () =>
    configList.map(config => ({
      ...config,
      custom: {
        ...config.custom,
        direction: Direction.backward
      }
    })).forEach((config, index) =>
      makeTest(`should process 1 backward max scroll (config ${index})`, config)
    )
  );

  test.describe('Mass max fwd scroll events', () =>
    configList.map((config, index) => ({
      ...config,
      custom: {
        direction: Direction.forward,
        count: 3 + treatIndex(index)
      }
    })).forEach((config, index) =>
      makeTest(`should process ${config.custom.count} forward scrolls (config ${index})`, config)
    )
  );

  test.describe('Mass max bwd scroll events', () =>
    configList.map((config, index) => ({
      ...config,
      custom: {
        direction: Direction.backward,
        count: 3 + treatIndex(index)
      }
    })).forEach((config, index) =>
      makeTest(`should process ${config.custom.count} backward scrolls (config ${index})`, config)
    )
  );

  test.describe('Bouncing max two-directional scroll events (fwd started)', () =>
    configList.map((config, index) => ({
      ...config,
      custom: {
        direction: Direction.forward,
        count: (3 + treatIndex(index)) * 2,
        bouncing: true
      }
    })).forEach((config, index) =>
      makeTest(`should process ${config.custom.count} bouncing scrolls (config ${index})`, config)
    )
  );

  test.describe('Bouncing max two-directional scroll events (bwd started)', () =>
    configList.map((config, index) => ({
      ...config,
      custom: {
        direction: Direction.backward,
        count: (3 + treatIndex(index)) * 2,
        bouncing: true
      }
    })).forEach((config, index) =>
      makeTest(`should process ${config.custom.count} bouncing scrolls (config ${index})`, config)
    )
  );

  test.describe('Mass two-directional scroll events (first half fwd, second half bwd)', () =>
    configList.map((config, index) => ({
      ...config,
      custom: {
        direction: Direction.forward,
        count: (3 + treatIndex(index)) * 2,
        mass: true
      }
    })).forEach((config, index) =>
      makeTest(`should process ${config.custom.count} two-directional scrolls (config ${index})`, config)
    )
  );

  test.describe('Mass two-directional scroll events (first half bwd, second half fwd)', () =>
    configList.map((config, index) => ({
      ...config,
      custom: {
        direction: Direction.backward,
        count: (3 + treatIndex(index)) * 2,
        mass: true
      }
    })).forEach((config, index) =>
      makeTest(`should process ${config.custom.count} two-directional scrolls (config ${index})`, config)
    )
  );
});

