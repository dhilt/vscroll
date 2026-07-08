import {
  makeTest,
  MutableDatasource,
  TestConfig,
  TestItem
} from '../scaffolding';

type Position = 'first' | 'middle' | 'last';

interface ReplaceScenario {
  position: Position;
  indexes: number[];
  amount: number;
  fixRight?: boolean;
}

interface ScenarioGroup {
  title: string;
  scenarios: ReplaceScenario[];
}

const min = 1;
const max = 100;
const itemSize = 20;

const oneToOne: ReplaceScenario[] = [
  { position: 'middle', indexes: [2], amount: 1 },
  { position: 'first', indexes: [1], amount: 1 },
  { position: 'last', indexes: [100], amount: 1 }
];

const manyToOne: ReplaceScenario[] = [
  { position: 'middle', indexes: [2, 3, 4], amount: 1 },
  { position: 'first', indexes: [1, 2, 3], amount: 1 },
  { position: 'last', indexes: [98, 99, 100], amount: 1 }
];

const manyToMany = [2, 3, 4].flatMap(amount =>
  manyToOne.map(scenario => ({ ...scenario, amount }))
);

const groups: ScenarioGroup[] = [
  { title: 'one-to-one', scenarios: oneToOne },
  { title: 'many-to-one', scenarios: manyToOne },
  {
    title: 'many-to-one, fixRight',
    scenarios: manyToOne.map(scenario => ({ ...scenario, fixRight: true }))
  },
  { title: 'many-to-many', scenarios: manyToMany },
  {
    title: 'many-to-many, fixRight',
    scenarios: [manyToMany[0], manyToMany[5], manyToMany[8]].map(scenario => ({
      ...scenario,
      fixRight: true
    }))
  }
];

const createConfig = (scenario: ReplaceScenario): TestConfig => ({
  datasource: () => new MutableDatasource(min, max),
  datasourceSettings: {
    startIndex: scenario.position === 'last' ? max : min,
    minIndex: min,
    maxIndex: max,
    itemSize
  },
  templateSettings: { viewportHeight: 120, itemHeight: itemSize }
});

const makeReplacement = (index: number): TestItem => ({
  id: index,
  text: `item #${index} *`
});

const registerScenario = (scenario: ReplaceScenario, group: string): void =>
  makeTest({
    config: createConfig(scenario),
    title: `should replace ${scenario.position} ${scenario.indexes.length} to ${scenario.amount}`,
    meta: group,
    it: misc => async () => {
      await misc.relaxNext();
      const removed = scenario.indexes.length;
      const delta = scenario.amount - removed;
      const firstIndex = scenario.indexes[0] - (scenario.fixRight ? delta : 0);
      const lastIndex = firstIndex + scenario.amount - 1;
      const absMinIndex = min - (scenario.fixRight ? delta : 0);
      const items = Array.from({ length: scenario.amount }, (_, offset) =>
        makeReplacement(firstIndex + offset)
      );
      const scrollableSize = misc.getScrollableSize();

      misc
        .source<MutableDatasource>()
        .replace(scenario.indexes, items, scenario.fixRight);
      await misc.adapter.replace({
        predicate: ({ $index }) => scenario.indexes.includes($index),
        items,
        fixRight: scenario.fixRight
      });

      await misc.scrollMinMaxRelax();
      const position =
        scenario.position === 'last'
          ? misc.getScrollableSize() - misc.getViewportSize()
          : (firstIndex - absMinIndex) * itemSize;
      if (misc.getScrollPosition() !== position) {
        await misc.scrollToRelax(position);
      }

      if (scenario.position === 'last') {
        expect(misc.adapter.lastVisible.$index).toBe(lastIndex);
      } else {
        expect(misc.adapter.firstVisible.$index).toBe(firstIndex);
      }
      expect(misc.getElementText(firstIndex)).toBe(
        `${firstIndex}: ${items[0].text}`
      );
      expect(misc.getElementText(lastIndex)).toBe(
        `${lastIndex}: ${items[items.length - 1].text}`
      );

      // The neighbor is the untouched original item just outside the replaced
      // range (before it for 'last', after it otherwise). Its id is its original
      // datasource id: unchanged on the pinned side, but shifted by `delta` on the
      // side that absorbs the size change (min when fixRight, max otherwise).
      const neighborIndex =
        scenario.position === 'last' ? firstIndex - 1 : lastIndex + 1;
      const neighborId =
        scenario.position === 'last'
          ? firstIndex - (scenario.fixRight ? 1 - delta : 1)
          : lastIndex + (scenario.fixRight ? 1 : 1 - delta);
      expect(misc.checkElementContent(neighborIndex, neighborId)).toBe(true);
      expect(misc.getScrollableSize()).toBe(scrollableSize + delta * itemSize);
      misc.expect.uniqueItems();
    }
  });

describe('Adapter Replace Spec', () =>
  groups.forEach(group =>
    describe(group.title, () =>
      group.scenarios.forEach(scenario =>
        registerScenario(scenario, group.title)
      )
    )
  ));
