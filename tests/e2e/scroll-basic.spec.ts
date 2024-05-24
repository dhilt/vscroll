import { test, expect, Page } from '@playwright/test';
import { ScrollResult, initializeItemsCounter } from './misc/itemsCounter';
import { Config } from './misc/types';
import { makeTest } from './misc/runner';
import { Direction } from '../../src/inputs/common';

// test.use({ headless: false });

interface ICustom {
  direction: Direction;
  count: number;
  bouncing?: boolean;
  mass?: boolean;
}

const configList: Config<ICustom>[] = [{
  datasourceSettings: { startIndex: 100, bufferSize: 4, padding: 0.22, itemSize: 20 },
  templateSettings: { viewportHeight: 71, itemHeight: 20 },
  datasourceDevSettings: { debug: true },
  custom: { direction: Direction.forward, count: 1 }
}, {
  datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.2, itemSize: 20 },
  templateSettings: { viewportHeight: 100 },
  datasourceDevSettings: { debug: true },
  custom: { direction: Direction.forward, count: 1 }
}, {
  datasourceSettings: { startIndex: -15, bufferSize: 12, padding: 0.98, itemSize: 20 },
  templateSettings: { viewportHeight: 66, itemHeight: 20 },
  datasourceDevSettings: { debug: true },
  custom: { direction: Direction.forward, count: 1 }
}, {
  datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 1, horizontal: true, itemSize: 100 },
  templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true },
  datasourceDevSettings: { debug: true },
  custom: { direction: Direction.forward, count: 1 }
}, {
  datasourceSettings: { startIndex: -74, bufferSize: 4, padding: 0.72, horizontal: true, itemSize: 75 },
  templateSettings: { viewportWidth: 300, itemWidth: 75, horizontal: true },
  datasourceDevSettings: { debug: true },
  custom: { direction: Direction.forward, count: 1 }
}];

const treatIndex = (index: number) => index <= 3 ? index : (3 * 2 - index);

const singleBackwardMaxScrollConfigList =
  configList.map(config => ({
    ...config,
    custom: {
      ...config.custom,
      direction: Direction.backward
    }
  } as Config<ICustom>));

const massForwardScrollsConfigList =
  configList.map((config, index) => ({
    ...config,
    custom: {
      direction: Direction.backward,
      count: 3 + treatIndex(index) // 3-6 bwd scroll events per config
    }
  } as Config<ICustom>));

const massBackwardScrollsConfigList =
  massForwardScrollsConfigList.map((config, index) => ({
    ...config,
    custom: {
      direction: Direction.backward,
      count: 3 + treatIndex(index) // 3-6 fwd scroll events per config
    }
  } as Config<ICustom>));

const massBouncingScrollsConfigList_fwd =
  massForwardScrollsConfigList.map((config, index) => ({
    ...config,
    custom: {
      direction: Direction.forward,
      count: (3 + treatIndex(index)) * 2, // 3-6 (fwd + bwd) scroll events per config
      bouncing: true
    }
  } as Config<ICustom>));

const massBouncingScrollsConfigList_bwd =
  massForwardScrollsConfigList.map((config, index) => ({
    ...config,
    custom: {
      direction: Direction.backward,
      count: (3 + treatIndex(index)) * 2, // 3-6 (fwd + bwd) scroll events per config
      bouncing: true
    }
  } as Config<ICustom>));

const massTwoDirectionalScrollsConfigList_fwd =
  massForwardScrollsConfigList.map((config, index) => ({
    ...config,
    custom: {
      direction: Direction.forward,
      count: (3 + treatIndex(index)) * 2, // 3-6 fwd + 3-6 bwd scroll events per config
      mass: true
    }
  } as Config<ICustom>));

const massTwoDirectionalScrollsConfigList_bwd =
  massForwardScrollsConfigList.map((config, index) => ({
    ...config,
    custom: {
      direction: Direction.backward,
      count: (3 + treatIndex(index)) * 2, // 3-6 fwd + 3-6 bwd scroll events per config
      mass: true
    }
  } as Config<ICustom>));


const shouldWork = async ({ config, page }: { config: Config, page: Page }) => {

  await initializeItemsCounter(page);

  const result = await page.evaluate(custom =>
    new Promise<ScrollResult>(resolve => {
      const { workflow } = window['__vscroll__'];
      const { ItemsCounter: helper } = window['__tests__'];

      workflow.scroller.state.cycle.busy.on(busy => {
        if (busy) {
          return;
        }

        if (workflow.cyclesDone === 1) {
          helper.getInitialItemsCounter();
        } else {
          helper.getCurrentItemsCounter(custom.direction);
        }

        const wfCount = custom.count + 1;
        if (workflow.cyclesDone < wfCount) {
          if (custom.bouncing) {
            helper.invertDirection(custom.direction);
          } else if (custom.mass) {
            const wfCountMiddle = Math.ceil(wfCount / 2);
            if (workflow.cyclesDone === wfCountMiddle) {
              helper.invertDirection(custom.direction);
            }
          }
          helper.doScrollMax(custom.direction);
        } else {
          resolve(helper.getExpectations(custom.direction));
        }
      });
    }), config.custom as ICustom);

  const {
    edgeItemIndex,
    oppositeItemIndex,
    paddingSize,
    oppositePaddingSize
  } = result;

  expect(edgeItemIndex?.[0]).toEqual(edgeItemIndex?.[1]);
  expect(oppositeItemIndex?.[0]).toEqual(oppositeItemIndex?.[1]);
  expect(paddingSize?.[0]).toEqual(paddingSize?.[1]);
  expect(oppositePaddingSize?.[0]).toEqual(oppositePaddingSize?.[1]);

  await expect(page.locator(`[data-sid="${edgeItemIndex[0]}"]`))
    .toHaveText(`${edgeItemIndex[0]}) item #${edgeItemIndex[0]}`);
  await expect(page.locator(`[data-sid="${oppositeItemIndex[0]}"]`))
    .toHaveText(`${oppositeItemIndex[0]}) item #${oppositeItemIndex[0]}`);
};

test.describe('Scroll Basic Spec', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Single max fwd scroll event', () =>
    configList.forEach((config, index) =>
      makeTest({
        config,
        title: `should process 1 forward max scroll (${index + 1})`,
        it: shouldWork
      })
    )
  );

  test.describe('Single max bwd scroll event', () =>
    singleBackwardMaxScrollConfigList.forEach((config, index) =>
      makeTest({
        config,
        title: `should process 1 backward max scroll (${index + 1})`,
        it: shouldWork
      })
    )
  );

  test.describe('Mass max fwd scroll events', () =>
    massForwardScrollsConfigList.forEach((config, index) =>
      makeTest({
        config,
        title: `should process some forward scrolls (${index + 1})`,
        it: shouldWork
      })
    )
  );

  test.describe('Mass max bwd scroll events', () =>
    massBackwardScrollsConfigList.forEach((config, index) =>
      makeTest({
        config,
        title: `should process some backward scrolls (${index + 1})`,
        it: shouldWork
      })
    )
  );

  test.describe('Bouncing max two-directional scroll events (fwd started)', () =>
    massBouncingScrollsConfigList_fwd.forEach((config, index) =>
      makeTest({
        config,
        title: `should process some bouncing scrolls (${index + 1})`,
        it: shouldWork
      })
    )
  );

  test.describe('Bouncing max two-directional scroll events (bwd started)', () =>
    massBouncingScrollsConfigList_bwd.forEach((config, index) =>
      makeTest({
        config,
        title: `should process some bouncing scrolls (${index + 1})`,
        it: shouldWork
      })
    )
  );

  test.describe('Mass max two-directional scroll events (fwd started)', () =>
    massTwoDirectionalScrollsConfigList_fwd.forEach((config, index) =>
      makeTest({
        config,
        title: `should process some two-directional scrolls (${index + 1})`,
        it: shouldWork
      })
    )
  );

  test.describe('Mass max two-directional scroll events (bwd started)', () =>
    massTwoDirectionalScrollsConfigList_bwd.forEach((config, index) =>
      makeTest({
        config,
        title: `should process some two-directional scrolls (${index + 1})`,
        it: shouldWork
      })
    )
  );
});

export default {};
