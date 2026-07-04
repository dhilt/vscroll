import { expectDomMatchesBuffer } from '../helpers/expect';
import { SizeStrategy } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

type Action =
  | { type: 'scroll'; positions: Array<'min' | 'max' | number> }
  | { type: 'check'; indexes: number[]; size: number };

interface Scenario {
  title: string;
  getSize: (index: number) => number;
  initialDefault: number;
  finalDefault?: number;
  action?: Action;
}

const settings = {
  padding: 0.5,
  bufferSize: 5,
  startIndex: 1,
  minIndex: -99,
  maxIndex: 100
};

const frequentScenarios: Scenario[] = [
  {
    title: 'set default on load (0)',
    getSize: () => 20,
    initialDefault: 20
  },
  {
    title: 'set default on load (1)',
    getSize: index => (index < 0 ? -index : index === 0 ? 1 : index),
    initialDefault: 1
  },
  {
    title: 'change default on scroll min',
    getSize: index => (index < 0 ? 20 : 30),
    action: { type: 'scroll', positions: ['min'] },
    initialDefault: 30,
    finalDefault: 20
  },
  {
    title: 'not change default on scroll max',
    getSize: index => (index < 0 ? 20 : 30),
    action: { type: 'scroll', positions: ['max'] },
    initialDefault: 30
  },
  {
    title: 'not change default on scroll max & min',
    getSize: index => (index < 0 ? 20 : 30),
    action: { type: 'scroll', positions: ['max', 'min'] },
    initialDefault: 30
  },
  {
    title: 'change default on scroll max & min & 100',
    getSize: index => (index < 0 ? 20 : 30),
    action: { type: 'scroll', positions: ['max', 'min', 100] },
    initialDefault: 30,
    finalDefault: 20
  },
  {
    title: 'change default on Adapter.check',
    getSize: index =>
      index >= -2 && index <= 2 ? 2 : index < 0 ? -index : index,
    action: { type: 'check', indexes: [5, 6, 7, 8, 9, 10], size: 1 },
    initialDefault: 2,
    finalDefault: 1
  },
  {
    title: 'not change default on Adapter.check',
    getSize: index =>
      index >= -2 && index <= 2 ? 2 : index < 0 ? -index : index,
    action: { type: 'check', indexes: [5, 6, 7, 8, 9], size: 1 },
    initialDefault: 2,
    finalDefault: 2
  }
];

const constantScenarios: Scenario[] = frequentScenarios
  .filter((_scenario, index) => index % 2 === 0)
  .map((scenario, index) => ({
    ...scenario,
    title: `not change (${index + 1})`,
    initialDefault: 22,
    finalDefault: 22
  }));

const runAction = async (misc: Misc, action: Action): Promise<void> => {
  if (action.type === 'scroll') {
    for (const position of action.positions) {
      if (position === 'min') {
        await misc.scrollMinRelax();
      } else if (position === 'max') {
        await misc.scrollMaxRelax();
      } else {
        await misc.scrollToRelax(position);
      }
    }
    return;
  }

  action.indexes.forEach(index => {
    const element = misc.getElement(index);
    if (!element) {
      throw new Error(`Item ${index} is not rendered`);
    }
    element.style.height = `${action.size}px`;
  });
  await misc.adapter.check();
};

const expectHealthyState = (misc: Misc): void => {
  expectDomMatchesBuffer(misc);
  expect(misc.padding.backward.getSize()).toBeGreaterThanOrEqual(0);
  expect(misc.padding.forward.getSize()).toBeGreaterThanOrEqual(0);
  expect(misc.getScrollableSize()).toBeGreaterThanOrEqual(
    misc.getViewportSize()
  );

  // the visible window stays within the buffered range
  const { firstIndex, lastIndex } = misc.adapter.bufferInfo;
  expect(misc.adapter.firstVisible.$index).toBeGreaterThanOrEqual(firstIndex);
  expect(misc.adapter.lastVisible.$index).toBeLessThanOrEqual(lastIndex);
};

const registerScenario = (
  strategy: SizeStrategy,
  scenario: Scenario,
  configuredSize?: number
): void => {
  const config: TestBedConfig = {
    datasource: () => getDatasource({ min: -99, max: 100 }),
    datasourceSettings: {
      ...settings,
      sizeStrategy: strategy,
      ...(configuredSize === undefined ? {} : { itemSize: configuredSize })
    },
    templateSettings: { viewportHeight: 200, dynamicSize: 'size' }
  };

  makeTest({
    config,
    title: `should ${scenario.title}`,
    before: misc =>
      misc.setItemProcessor(({ $index, data }) => {
        data.size = scenario.getSize($index);
      }),
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.scroller.buffer.defaultSize).toBe(scenario.initialDefault);
      expectHealthyState(misc);

      if (scenario.action) {
        await runAction(misc, scenario.action);
        expect(misc.scroller.buffer.defaultSize).toBe(
          scenario.finalDefault ?? scenario.initialDefault
        );
        expectHealthyState(misc);
      }
    }
  });
};

describe('Dynamic Size Spec for Frequent and Constant strategies', () => {
  describe('SizeStrategy.Frequent', () =>
    frequentScenarios.forEach(scenario =>
      registerScenario(SizeStrategy.Frequent, scenario)
    ));

  describe('SizeStrategy.Constant', () => {
    constantScenarios.forEach(scenario =>
      registerScenario(SizeStrategy.Constant, scenario, 22)
    );
    registerScenario(SizeStrategy.Constant, {
      title: 'not change when itemSize is not set',
      getSize: () => 10,
      initialDefault: 10
    });
  });
});
