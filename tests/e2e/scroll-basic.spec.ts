import { test, expect } from '@playwright/test';

import { Direction } from '../../src/index';
import { ItemsCounter } from './misc/itemsCounter';

const configList = [{
  datasourceSettings: { startIndex: 100, bufferSize: 4, padding: 0.22, itemSize: 20 },
  templateSettings: { viewportHeight: 71, itemHeight: 20 },
  custom: { direction: Direction.forward, count: 1 }
}/*, {
  datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.2, itemSize: 20 },
  templateSettings: { viewportHeight: 100 },
  custom: { direction: Direction.forward, count: 1 }
}, {
  datasourceSettings: { startIndex: -15, bufferSize: 12, padding: 0.98, itemSize: 20 },
  templateSettings: { viewportHeight: 66, itemHeight: 20 },
  custom: { direction: Direction.forward, count: 1 }
}, {
  datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 1, horizontal: true, itemSize: 100 },
  templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true },
  custom: { direction: Direction.forward, count: 1 }
}, {
  datasourceSettings: { startIndex: -74, bufferSize: 4, padding: 0.72, horizontal: true, itemSize: 75 },
  templateSettings: { viewportWidth: 300, itemWidth: 75, horizontal: true },
  custom: { direction: Direction.forward, count: 1 }
}*/];

// const treatIndex = (index: number) => index <= 3 ? index : (3 * 2 - index);

// const singleBackwardMaxScrollConfigList =
//   configList.map(config => ({
//     ...config,
//     custom: {
//       ...config.custom,
//       direction: Direction.backward
//     }
//   }));

// const massForwardScrollsConfigList =
//   configList.map((config, index) => ({
//     ...config,
//     custom: {
//       direction: Direction.backward,
//       count: 3 + treatIndex(index) // 3-6 bwd scroll events per config
//     }
//   }));

// const massBackwardScrollsConfigList =
//   massForwardScrollsConfigList.map((config, index) => ({
//     ...config,
//     custom: {
//       direction: Direction.backward,
//       count: 3 + treatIndex(index) // 3-6 fwd scroll events per config
//     }
//   }));

// const massBouncingScrollsConfigList_fwd =
//   massForwardScrollsConfigList.map((config, index) => ({
//     ...config,
//     custom: {
//       direction: Direction.forward,
//       count: (3 + treatIndex(index)) * 2, // 3-6 (fwd + bwd) scroll events per config
//       bouncing: true
//     }
//   }));

// const massBouncingScrollsConfigList_bwd =
//   massForwardScrollsConfigList.map((config, index) => ({
//     ...config,
//     custom: {
//       direction: Direction.backward,
//       count: (3 + treatIndex(index)) * 2, // 3-6 (fwd + bwd) scroll events per config
//       bouncing: true
//     }
//   }));

// const massTwoDirectionalScrollsConfigList_fwd =
//   massForwardScrollsConfigList.map((config, index) => ({
//     ...config,
//     custom: {
//       direction: Direction.forward,
//       count: (3 + treatIndex(index)) * 2, // 3-6 fwd + 3-6 bwd scroll events per config
//       mass: true
//     }
//   }));

// const massTwoDirectionalScrollsConfigList_bwd =
//   massForwardScrollsConfigList.map((config, index) => ({
//     ...config,
//     custom: {
//       direction: Direction.backward,
//       count: (3 + treatIndex(index)) * 2, // 3-6 fwd + 3-6 bwd scroll events per config
//       mass: true
//     }
//   }));

// const doScrollMax = (config, misc) => {
//   if (config.custom.direction === Direction.forward) {
//     misc.scrollMax();
//   } else {
//     misc.scrollMin();
//   }
// };

// const invertDirection = (config) => {
//   const _forward = config.custom.direction === Direction.forward;
//   config.custom.direction = _forward ? Direction.backward : Direction.forward;
// };

// const getFullHouseDiff = (
//   viewportSize: number, paddingDelta: number, itemSize: number, bufferSize: number
// ): number => {
//   const sizeToFill = viewportSize + 2 * paddingDelta; // size to fill the viewport + padding deltas
//   const itemsToFillNotRounded = sizeToFill / itemSize;
//   const itemsToFillRounded = Math.ceil(sizeToFill / itemSize);
//   const itemsToFill = itemsToFillRounded + (itemsToFillNotRounded === itemsToFillRounded ? 0 : 1);
//   const bufferSizeDiff = bufferSize - itemsToFill;
//   return Math.max(0, bufferSizeDiff);
// };

const shouldScroll = config => async (page) => {
  const custom = config.custom;
  const wfCount = custom.count + 1;
  const wfCountMiddle = Math.ceil(wfCount / 2);
  let itemsCounter: ItemsCounter;

  const result = await page.evaluate(({ custom }) => {
    const { workflow } = window['__vscroll__'].workflow;

    const finalize = workflow.finalize;
    workflow.finalize = (...args) => {
      finalize.apply(workflow, args);

      const cycles = workflow.cyclesDone;
      if (cycles === 1) {
        itemsCounter = ((scroller) => {
          const { startIndex } = scroller.settings;
          const edgeItem = scroller.buffer.getEdgeVisibleItem(Direction.forward);
          const oppositeItem = scroller.buffer.getEdgeVisibleItem(Direction.backward);
          const result = new ItemsCounter();
          if (!edgeItem || !oppositeItem) {
            return result;
          }
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
        })(workflow.scroller);

      } else {
        const getFullHouseDiff = (
          viewportSize: number, paddingDelta: number, itemSize: number, bufferSize: number
        ): number => {
          const sizeToFill = viewportSize + 2 * paddingDelta; // size to fill the viewport + padding deltas
          const itemsToFillNotRounded = sizeToFill / itemSize;
          const itemsToFillRounded = Math.ceil(sizeToFill / itemSize);
          const itemsToFill = itemsToFillRounded + (itemsToFillNotRounded === itemsToFillRounded ? 0 : 1);
          const bufferSizeDiff = bufferSize - itemsToFill;
          return Math.max(0, bufferSizeDiff);
        };

        itemsCounter = ((scroller, direction: Direction, previous: ItemsCounter): ItemsCounter => {
          const { bufferSize, padding } = scroller.settings;
          const viewportSize = scroller.viewport.getSize();
          const itemSize = scroller.buffer.defaultSize;
          const fwd = direction === Direction.forward;
          const opposite = fwd ? Direction.backward : Direction.forward;
          const delta = viewportSize * padding;

          // handle direction (fetch)
          const fullHouseDiff = getFullHouseDiff(viewportSize, delta, itemSize, bufferSize);
          const _singleFetchCount = Math.ceil(delta / itemSize);
          const singleFetchCount = Math.max(bufferSize, _singleFetchCount);
          const itemsToFetch = previous.direction && previous.direction !== direction ?
            (_singleFetchCount + fullHouseDiff) : singleFetchCount;
          const previousEdgeIndex = previous.get(direction).index;
          const paddingItems = (fwd ? 1 : -1) * (previous.get(direction).padding / itemSize);
          const newItemsPack = (fwd ? 1 : -1) * itemsToFetch;
          const newDirIndex = previousEdgeIndex + paddingItems + newItemsPack;

          // handle opposite (clip)
          const oppPadding = previous.get(opposite).padding;
          const previousTotalSize = previous.total * itemSize + previous.paddings;
          const sizeToClip = previousTotalSize - oppPadding - viewportSize - delta;
          const itemsToClip = Math.floor(sizeToClip / itemSize);
          const newOppIndex = previous.get(opposite).index + (fwd ? 1 : -1) * itemsToClip;
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
        })(workflow.scroller, custom.direction, itemsCounter);
      }

      if (cycles < wfCount) {
        const invertDirection = () => {
          const _forward = custom.direction === Direction.forward;
          custom.direction = _forward ? Direction.backward : Direction.forward;
        };
        if (custom.bouncing) {
          invertDirection();
        } else if (custom.mass) {
          if (cycles === wfCountMiddle) {
            invertDirection();
          }
        }
        if (custom.direction === Direction.forward) {
          workflow.scroller.adapter.fix({ scrollPosition: Infinity });
        } else {
          workflow.scroller.adapter.fix({ scrollPosition: 0 });
        }
      } else {
        // expectations
        const direction: Direction = custom.direction;
        const opposite = direction === Direction.forward ? Direction.backward : Direction.forward;
        const edgeItem = workflow.scroller.buffer.getEdgeVisibleItem(direction);
        const oppositeItem = workflow.scroller.buffer.getEdgeVisibleItem(opposite);
        const edgeItemIndex = itemsCounter.get(direction).index;
        const oppositeItemIndex = itemsCounter.get(opposite).index;
        return {
          edgeItemsIndex: [edgeItemIndex, edgeItem?.$index],
          oppositeItemIndex: [oppositeItemIndex, oppositeItem?.$index],
          paddingSize: itemsCounter.get(direction).padding,
          oppositePaddingSize: itemsCounter.get(opposite).padding
        };
      }
    };
  }, { custom });

  const {
    edgeItemIndex,
    oppositeItemIndex,
    paddingSize,
    oppositePaddingSize
  } = result;

  expect(edgeItemIndex?.[0]).toEqual(edgeItemIndex?.[1]);
  expect(oppositeItemIndex?.[0]).toEqual(oppositeItemIndex?.[1]);

  const _paddingSize = await page.evaluate((direction) =>
    document.querySelector(`[data-padding-${direction}]`)?.clientHeight
    , custom.direction);

  const _oppositePaddingSize = await page.evaluate((direction) =>
    document.querySelector(`[data-padding-${direction}]`)?.clientHeight
    , custom.direction === Direction.forward
      ? Direction.backward
      : Direction.forward
  );

  expect(_paddingSize).toEqual(paddingSize);
  expect(_oppositePaddingSize).toEqual(oppositePaddingSize);

  await expect(page.locator(`[sid="${edgeItemIndex[0]}"]`))
    .toHaveText('item: ' + edgeItemIndex[0]);
  await expect(page.locator(`[sid="${oppositeItemIndex[0]}"]`))
    .toHaveText('item: ' + oppositeItemIndex[0]);
};

const runScroller = async (page, { settings = {}, devSettings = {} } = {}) =>
  await page.evaluate(({ settings, devSettings }) => {
    const { Scroller, datasource } = window['__vscroll__'];
    datasource.settings = { ...datasource.settings, ...settings };
    datasource.devSettings = { ...datasource.devSettings, ...devSettings };
    const { workflow } = new Scroller(datasource);
    window['__vscroll__'].workflow = workflow;
  }, { settings, devSettings });

const makeTest = async ({ page, title, config, it }) => {
  console.log(title);
  await page.goto(URL + '/need-run');
  await runScroller(page, { settings: config.datasourceSettings });
  await it(page);
};


test('Single max fwd scroll event', ({ page }) =>
  configList.forEach(config =>
    makeTest({
      page,
      config,
      title: 'should process 1 forward max scroll',
      it: shouldScroll(config)
    })
  )
);

  // describe('Single max bwd scroll event', () =>
  //   singleBackwardMaxScrollConfigList.forEach(config =>
  //     _makeTest({
  //       config,
  //       title: 'should process 1 backward max scroll',
  //       it: shouldScroll(config)
  //     })
  //   )
  // );

  // describe('Mass max fwd scroll events', () =>
  //   massForwardScrollsConfigList.forEach(config =>
  //     _makeTest({
  //       config,
  //       title: 'should process some forward scrolls',
  //       it: shouldScroll(config)
  //     })
  //   )
  // );

  // describe('Mass max bwd scroll events', () =>
  //   massBackwardScrollsConfigList.forEach(config =>
  //     _makeTest({
  //       config,
  //       title: 'should process some backward scrolls',
  //       it: shouldScroll(config)
  //     })
  //   )
  // );

  // describe('Bouncing max two-directional scroll events (fwd started)', () =>
  //   massBouncingScrollsConfigList_fwd.forEach(config =>
  //     _makeTest({
  //       config,
  //       title: 'should process some bouncing scrolls',
  //       it: shouldScroll(config)
  //     })
  //   )
  // );

  // describe('Bouncing max two-directional scroll events (bwd started)', () =>
  //   massBouncingScrollsConfigList_bwd.forEach(config =>
  //     _makeTest({
  //       config,
  //       title: 'should process some bouncing scrolls',
  //       it: shouldScroll(config)
  //     })
  //   )
  // );

  // describe('Mass max two-directional scroll events (fwd started)', () =>
  //   massTwoDirectionalScrollsConfigList_fwd.forEach(config =>
  //     _makeTest({
  //       config,
  //       title: 'should process some two-directional scrolls',
  //       it: shouldScroll(config)
  //     })
  //   )
  // );

  // describe('Mass max two-directional scroll events (bwd started)', () =>
  //   massTwoDirectionalScrollsConfigList_bwd.forEach(config =>
  //     _makeTest({
  //       config,
  //       title: 'should process some two-directional scrolls',
  //       it: shouldScroll(config)
  //     })
  //   )
  // );
