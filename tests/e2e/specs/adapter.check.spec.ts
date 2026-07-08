import {
  getDatasource,
  makeTest,
  Misc,
  SizeStrategy,
  TestConfig
} from '../scaffolding';

interface Scenario {
  min: number;
  max: number;
  size: number;
  itemSize: number;
  padding: number;
  bufferSize: number;
  viewportSize: number;
  horizontal?: boolean;
  // Harvested empirically: settled scrollable px after the size change is
  // absorbed. It depends on vscroll's own measurement, so it is captured, not
  // derived (deriving it would re-implement the scroller).
  expectedScrollable: number;
}

const minIndex = -99;
const maxIndex = 100;

const scenarios: Scenario[] = [
  {
    min: 1,
    max: 10,
    size: 10,
    itemSize: 100,
    padding: 0.5,
    bufferSize: 10,
    viewportSize: 600,
    expectedScrollable: 14810
  },
  {
    min: 4,
    max: 5,
    size: 100,
    itemSize: 20,
    padding: 0.88,
    bufferSize: 10,
    viewportSize: 300,
    expectedScrollable: 4788
  },
  {
    min: 2,
    max: 11,
    size: 200,
    itemSize: 20,
    padding: 0.5,
    bufferSize: 10,
    viewportSize: 600,
    expectedScrollable: 10000
  },
  {
    min: -2,
    max: 2,
    size: 20,
    itemSize: 100,
    padding: 0.5,
    bufferSize: 10,
    viewportSize: 600,
    expectedScrollable: 17390
  },
  {
    min: 1,
    max: 2,
    size: 20,
    itemSize: 100,
    padding: 0.33,
    bufferSize: 5,
    viewportSize: 450,
    horizontal: true,
    expectedScrollable: 18000
  }
];

const createConfig = (scenario: Scenario): TestConfig => ({
  datasource: () => getDatasource({ min: minIndex, max: maxIndex }),
  datasourceSettings: {
    startIndex: 1,
    minIndex,
    maxIndex,
    itemSize: scenario.itemSize,
    padding: scenario.padding,
    bufferSize: scenario.bufferSize,
    sizeStrategy: SizeStrategy.Average,
    ...(scenario.horizontal ? { horizontal: true } : {})
  },
  templateSettings: scenario.horizontal
    ? {
        viewportWidth: scenario.viewportSize,
        itemWidth: scenario.itemSize,
        horizontal: true,
        dynamicSize: 'size'
      }
    : {
        viewportHeight: scenario.viewportSize,
        dynamicSize: 'size'
      },
  timeout: 9000
});

const updateElementSize = (misc: Misc, index: number, size: number): void => {
  const element = misc.getElement(index);
  if (element) {
    element.style[misc.horizontal ? 'width' : 'height'] = `${size}px`;
  }
};

const updateSizes = (misc: Misc, scenario: Scenario): void => {
  for (let index = scenario.min; index <= scenario.max; index++) {
    updateElementSize(misc, index, scenario.size);
  }
  misc.setItemProcessor(({ data }) => {
    data.size =
      data.id >= scenario.min && data.id <= scenario.max
        ? scenario.size
        : scenario.itemSize;
  });
};

const getFirstFullyVisibleIndex = (misc: Misc): number => {
  const edge = misc.getScrollPosition();
  const element = misc
    .getElements()
    .find(item => item[misc.horizontal ? 'offsetLeft' : 'offsetTop'] >= edge);
  return element ? misc.getElementIndex(element) : NaN;
};

const expectCheckState = (misc: Misc, expected: boolean): void => {
  expect(misc.scroller.state.fetch.simulate).toBe(expected);
  expect(misc.scroller.state.fetch.isCheck).toBe(expected);
};

const expectSurvivorIdentity = (
  misc: Misc,
  before: Misc['scroller']['buffer']['items'],
  after: Misc['scroller']['buffer']['items']
): void => {
  const uidByIndex = new Map(before.map(item => [item.$index, item.uid]));
  after.forEach(item => {
    const uid = uidByIndex.get(item.$index);
    if (uid !== undefined) {
      expect(item.uid).toBe(uid);
    }
  });
  misc.expect.uniqueItems(after);
};

const registerCheckScenario = (scenario: Scenario): void =>
  makeTest({
    config: createConfig(scenario),
    title: 'should check changed sizes',
    before: misc =>
      misc.setItemProcessor(({ data }) => {
        data.size = scenario.itemSize;
      }),
    it: misc => async () => {
      await misc.relaxNext();
      const beforeItems = [...misc.scroller.buffer.items];
      updateSizes(misc, scenario);
      const firstVisibleIndex = getFirstFullyVisibleIndex(misc);

      await misc.adapter.check();

      expectSurvivorIdentity(misc, beforeItems, misc.scroller.buffer.items);
      expect(misc.adapter.firstVisible.$index).toBe(firstVisibleIndex);
      expect(misc.getScrollableSize()).toBe(scenario.expectedScrollable);
      misc.expect.domMatchesBuffer();
    }
  });

const registerFetchAfterCheck = (scenario: Scenario): void =>
  makeTest({
    config: createConfig(scenario),
    title: 'should fetch after check',
    before: misc =>
      misc.setItemProcessor(({ data }) => {
        data.size = scenario.itemSize;
      }),
    it: misc => async () => {
      await misc.relaxNext();
      updateElementSize(misc, misc.scroller.settings.startIndex, 50);

      const result = misc.adapter.check();
      expectCheckState(misc, true);
      await result;
      expectCheckState(misc, false);
      misc.expect.uniqueItems();

      await misc.scrollMaxRelax();
      misc.expect.domMatchesBuffer();
    }
  });

const registerDoubleCheck = (
  scenario: Scenario,
  operation: 'append' | 'prepend'
): void =>
  makeTest({
    config: createConfig(scenario),
    title: `should check after check and ${operation}`,
    before: misc =>
      misc.setItemProcessor(({ data }) => {
        data.size = scenario.itemSize;
      }),
    it: misc => async () => {
      await misc.relaxNext();
      const startIndex = misc.scroller.settings.startIndex;
      updateElementSize(misc, startIndex, 50);

      let result = misc.adapter.check();
      expectCheckState(misc, true);
      await result;
      expectCheckState(misc, false);
      misc.expect.uniqueItems();

      const item = {
        id: operation === 'prepend' ? minIndex - 1 : maxIndex + 1,
        text: 'new item',
        size: scenario.itemSize
      };
      if (operation === 'prepend') {
        await misc.adapter.prepend({ items: [item] });
      } else {
        await misc.adapter.append({ items: [item] });
      }
      misc.expect.uniqueItems();

      updateElementSize(misc, startIndex, scenario.itemSize);
      result = misc.adapter.check();
      expectCheckState(misc, true);
      await result;
      expectCheckState(misc, false);
      misc.expect.uniqueItems();
    }
  });

describe('Adapter Check Size Spec', () => {
  scenarios.forEach(registerCheckScenario);
  registerFetchAfterCheck(scenarios[1]);
  registerFetchAfterCheck(scenarios[4]);
  registerDoubleCheck(scenarios[1], 'prepend');
  registerDoubleCheck(scenarios[4], 'append');
});
