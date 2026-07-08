import {
  getDatasource,
  makeItems,
  makeTest,
  Misc,
  MutableDatasource,
  TestConfig,
  TestItem
} from '../scaffolding';

interface InsertScenario {
  before: boolean;
  index: number;
  amount: number;
  startIndex: number;
  decrease?: boolean;
  useIndexApi?: boolean;
}

interface VirtualScenario extends InsertScenario {
  expected: { min: number; max: number; ids: number[] };
}

interface EmptyScenario extends Omit<InsertScenario, 'startIndex'> {
  expected: {
    min: number;
    max: number;
    start: number;
    firstVisible?: number;
    lastVisible?: number;
  };
}

interface StateSnapshot {
  absMin: number;
  absMax: number;
  bufferSize: number;
  scrollableSize: number;
  indexes: number[];
  ids: number[];
}

const min = 1;
const max = 100;
const middle = 50;
const itemSize = 20;

const coreScenarios: InsertScenario[] = [
  { before: false, index: middle, amount: 3, startIndex: middle },
  { before: true, index: middle, amount: 3, startIndex: middle },
  { before: false, index: max, amount: 3, startIndex: max },
  { before: true, index: min, amount: 3, startIndex: min }
];

const indexScenarios = [coreScenarios[0], coreScenarios[3]].map(scenario => ({
  ...scenario,
  useIndexApi: true
}));

const staticScenarios = [
  ...coreScenarios,
  ...indexScenarios,
  ...[...coreScenarios, ...indexScenarios].map(scenario => ({
    ...scenario,
    decrease: true
  }))
];

const outsideScenarios: InsertScenario[] = [
  { before: false, index: 1, amount: 3, startIndex: middle },
  { before: false, index: max - 1, amount: 3, startIndex: middle },
  { before: true, index: 1, amount: 3, startIndex: middle },
  { before: true, index: max - 1, amount: 3, startIndex: middle }
];

const dynamicBase = [
  ...coreScenarios,
  { ...coreScenarios[0], decrease: true },
  { ...coreScenarios[1], decrease: true }
];
const dynamicScenarios = [
  ...dynamicBase,
  ...dynamicBase.map(scenario => ({ ...scenario, useIndexApi: true }))
];

const virtualScenarios: VirtualScenario[] = [
  {
    before: false,
    index: -3,
    amount: 2,
    startIndex: 0,
    expected: {
      min: -4,
      max: 7,
      ids: [-4, -3, 101, 102, -2, -1, 0, 1, 2, 3, 4, 5]
    }
  },
  {
    before: false,
    index: -3,
    amount: 2,
    startIndex: 0,
    decrease: true,
    expected: {
      min: -6,
      max: 5,
      ids: [-4, -3, 101, 102, -2, -1, 0, 1, 2, 3, 4, 5]
    }
  },
  {
    before: true,
    index: -3,
    amount: 2,
    startIndex: 0,
    expected: {
      min: -4,
      max: 7,
      ids: [-4, 101, 102, -3, -2, -1, 0, 1, 2, 3, 4, 5]
    }
  },
  {
    before: true,
    index: -3,
    amount: 2,
    startIndex: 0,
    decrease: true,
    expected: {
      min: -6,
      max: 5,
      ids: [-4, 101, 102, -3, -2, -1, 0, 1, 2, 3, 4, 5]
    }
  },
  {
    before: false,
    index: 4,
    amount: 2,
    startIndex: 0,
    expected: {
      min: -4,
      max: 7,
      ids: [-4, -3, -2, -1, 0, 1, 2, 3, 4, 101, 102, 5]
    }
  },
  {
    before: false,
    index: 4,
    amount: 2,
    startIndex: 0,
    decrease: true,
    expected: {
      min: -6,
      max: 5,
      ids: [-4, -3, -2, -1, 0, 1, 2, 3, 4, 101, 102, 5]
    }
  },
  {
    before: true,
    index: 4,
    amount: 2,
    startIndex: 0,
    expected: {
      min: -4,
      max: 7,
      ids: [-4, -3, -2, -1, 0, 1, 2, 3, 101, 102, 4, 5]
    }
  },
  {
    before: true,
    index: 4,
    amount: 2,
    startIndex: 0,
    decrease: true,
    expected: {
      min: -6,
      max: 5,
      ids: [-4, -3, -2, -1, 0, 1, 2, 3, 101, 102, 4, 5]
    }
  },
  {
    before: true,
    index: -4,
    amount: 20,
    startIndex: 0,
    expected: {
      min: -4,
      max: 25,
      ids: [
        ...Array.from({ length: 20 }, (_, index) => 101 + index),
        -4,
        -3,
        -2,
        -1,
        0,
        1,
        2,
        3,
        4,
        5
      ]
    }
  },
  {
    before: false,
    index: 5,
    amount: 20,
    startIndex: 0,
    decrease: true,
    expected: {
      min: -24,
      max: 5,
      ids: [
        -4,
        -3,
        -2,
        -1,
        0,
        1,
        2,
        3,
        4,
        5,
        ...Array.from({ length: 20 }, (_, index) => 101 + index)
      ]
    }
  }
];

const emptyScenarios: EmptyScenario[] = [
  {
    before: false,
    index: 0,
    amount: 5,
    expected: { min: 1, max: 5, start: 1, firstVisible: 1 }
  },
  {
    before: true,
    index: 2,
    amount: 5,
    expected: { min: 1, max: 5, start: 1, firstVisible: 1 }
  },
  {
    before: false,
    index: 5,
    amount: 5,
    decrease: true,
    expected: { min: 1, max: 5, start: 1, firstVisible: 1 }
  },
  {
    before: true,
    index: 6,
    amount: 5,
    decrease: true,
    expected: { min: 1, max: 5, start: 1, firstVisible: 1 }
  },
  {
    before: false,
    index: -10,
    amount: 20,
    expected: { min: -9, max: 10, start: 1, firstVisible: 1 }
  },
  {
    before: false,
    index: 100,
    amount: 10,
    expected: { min: 101, max: 110, start: 101, firstVisible: 101 }
  },
  {
    before: false,
    index: -100,
    amount: 10,
    expected: { min: -99, max: -90, start: -90, lastVisible: -90 }
  }
];

const createConfig = (scenario: InsertScenario): TestConfig => ({
  datasource: () => new MutableDatasource(min, max),
  datasourceSettings: {
    startIndex: scenario.startIndex,
    minIndex: min,
    maxIndex: max,
    bufferSize: 10,
    padding: 0.5,
    itemSize
  },
  templateSettings: { viewportHeight: 200, itemHeight: itemSize },
  timeout: 4000
});

const createVirtualConfig = (): TestConfig => ({
  datasource: () => new MutableDatasource(-4, 5),
  datasourceSettings: {
    minIndex: -4,
    maxIndex: 5,
    startIndex: 0,
    padding: 0.1,
    bufferSize: 1,
    itemSize
  },
  templateSettings: { viewportHeight: 60, itemHeight: itemSize },
  timeout: 4000
});

const emptyConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 0 }),
  datasourceSettings: {
    minIndex: -15,
    maxIndex: 15,
    startIndex: 1,
    padding: 0.1,
    bufferSize: 7,
    itemSize
  },
  templateSettings: { viewportHeight: 100, itemHeight: itemSize }
};

const takeSnapshot = (misc: Misc): StateSnapshot => ({
  absMin: misc.scroller.buffer.absMinIndex,
  absMax: misc.scroller.buffer.absMaxIndex,
  bufferSize: misc.scroller.buffer.size,
  scrollableSize: misc.getScrollableSize(),
  indexes: misc.scroller.buffer.items.map(item => item.$index),
  ids: misc.scroller.buffer.items.map(item => item.data.id)
});

const insertViaAdapter = (
  misc: Misc,
  scenario: Pick<
    InsertScenario,
    'before' | 'index' | 'decrease' | 'useIndexApi'
  >,
  items: TestItem[]
) =>
  misc.adapter.insert({
    items,
    decrease: !!scenario.decrease,
    ...(scenario.useIndexApi
      ? scenario.before
        ? { beforeIndex: scenario.index }
        : { afterIndex: scenario.index }
      : scenario.before
        ? { before: ({ $index }) => $index === scenario.index }
        : { after: ({ $index }) => $index === scenario.index })
  });

const expectStaticResult = (
  before: StateSnapshot,
  misc: Misc,
  scenario: InsertScenario,
  inserted: boolean
): void => {
  const after = takeSnapshot(misc);
  if (!inserted) {
    expect(after).toEqual(before);
    return;
  }

  const items = makeItems(max + 1, scenario.amount);
  const expectedIds = [...before.ids];
  const anchor = expectedIds.indexOf(scenario.index);
  expectedIds.splice(
    anchor + (scenario.before ? 0 : 1),
    0,
    ...items.map(item => item.id)
  );
  const firstIndex =
    before.indexes[0] - (scenario.decrease ? scenario.amount : 0);

  expect(after.absMin).toBe(
    before.absMin - (scenario.decrease ? scenario.amount : 0)
  );
  expect(after.absMax).toBe(
    before.absMax + (scenario.decrease ? 0 : scenario.amount)
  );
  expect(after.bufferSize).toBe(before.bufferSize + scenario.amount);
  expect(after.scrollableSize).toBe(
    before.scrollableSize + scenario.amount * itemSize
  );
  expect(after.indexes).toEqual(
    Array.from({ length: after.bufferSize }, (_, offset) => firstIndex + offset)
  );
  expect(after.ids).toEqual(expectedIds);
};

const runBufferedInsert = async (
  misc: Misc,
  scenario: InsertScenario,
  shouldInsert: boolean
): Promise<StateSnapshot> => {
  await misc.relaxNext();
  const items = makeItems(max + 1, scenario.amount);
  const datasource = misc.source<MutableDatasource>();
  datasource.insert(
    items,
    scenario.index,
    scenario.before,
    !!scenario.decrease
  );
  const before = takeSnapshot(misc);

  const resultPromise = insertViaAdapter(misc, scenario, items);
  if (shouldInsert) {
    expect(misc.adapter.isLoading).toBe(true);
  }
  const result = await resultPromise;

  expect(result.success).toBe(true);
  expect(result.immediate).toBe(!shouldInsert);
  expect(misc.adapter.isLoading).toBe(false);
  expectStaticResult(before, misc, scenario, shouldInsert);
  misc.expect.uniqueItems();
  misc.expect.domIndexesMatchBuffer();
  return before;
};

const registerStatic = (
  scenario: InsertScenario,
  shouldInsert: boolean
): void =>
  makeTest({
    config: createConfig(scenario),
    title: shouldInsert ? 'should insert into the buffer' : 'should not insert',
    meta:
      `${scenario.before ? 'before' : 'after'} ${scenario.index}` +
      (scenario.decrease ? ', decrease' : '') +
      (scenario.useIndexApi ? ', index API' : ''),
    it: misc => async () => {
      await runBufferedInsert(misc, scenario, shouldInsert);
    }
  });

const registerDynamic = (scenario: InsertScenario): void =>
  makeTest({
    config: createConfig(scenario),
    title: 'should persist insertion after scrolling',
    meta:
      `${scenario.before ? 'before' : 'after'} ${scenario.index}` +
      (scenario.decrease ? ', decrease' : '') +
      (scenario.useIndexApi ? ', index API' : ''),
    it: misc => async () => {
      await runBufferedInsert(misc, scenario, true);
      const datasource = misc.source<MutableDatasource>();

      if (misc.getScrollPosition() !== 0) {
        await misc.scrollMinRelax();
      }
      await misc.scrollMaxRelax();
      datasource.clearRequests();
      await misc.scrollMinRelax();

      expect(datasource.requests[0]?.index).toBe(
        min - (scenario.decrease ? scenario.amount : 0)
      );
      expect(misc.adapter.bufferInfo.absMinIndex).toBe(
        min - (scenario.decrease ? scenario.amount : 0)
      );
      expect(misc.adapter.bufferInfo.absMaxIndex).toBe(
        max + (scenario.decrease ? 0 : scenario.amount)
      );
      misc.expect.domIndexesMatchBuffer();
    }
  });

const registerVirtual = (scenario: VirtualScenario): void =>
  makeTest({
    config: createVirtualConfig(),
    title: 'should insert virtually and preserve it at both edges',
    meta:
      `${scenario.before ? 'before' : 'after'} ${scenario.index}` +
      (scenario.decrease ? ', decrease' : ''),
    it: misc => async () => {
      await misc.relaxNext();
      const items = makeItems(max + 1, scenario.amount);
      const beforeItems = [...misc.scroller.buffer.items];
      const firstVisibleId = misc.adapter.firstVisible.data.id;
      misc.source<MutableDatasource>().insert(
        items,
        scenario.index,
        scenario.before,
        !!scenario.decrease
      );

      await insertViaAdapter(misc, { ...scenario, useIndexApi: true }, items);

      misc.expect.itemsIdentity(beforeItems, misc.scroller.buffer.items);
      expect(misc.adapter.firstVisible.data.id).toBe(firstVisibleId);
      expect(misc.getScrollableSize()).toBe(
        (scenario.expected.max - scenario.expected.min + 1) * itemSize
      );

      await misc.scrollToIndexRelax(scenario.expected.min, 25);
      expect(misc.scroller.buffer.absMinIndex).toBe(scenario.expected.min);
      expect(misc.scroller.buffer.minIndex).toBe(scenario.expected.min);
      misc.scroller.buffer.items.forEach((item, index) =>
        expect(item.data.id).toBe(scenario.expected.ids[index])
      );

      await misc.scrollToIndexRelax(scenario.expected.max);
      expect(misc.scroller.buffer.absMaxIndex).toBe(scenario.expected.max);
      expect(misc.scroller.buffer.maxIndex).toBe(scenario.expected.max);
      [...misc.scroller.buffer.items]
        .reverse()
        .forEach((item, index) =>
          expect(item.data.id).toBe(
            scenario.expected.ids[scenario.expected.ids.length - index - 1]
          )
        );
      misc.expect.domIndexesMatchBuffer();
    }
  });

const registerEmpty = (scenario: EmptyScenario): void =>
  makeTest({
    config: emptyConfig,
    title: 'should insert into an empty datasource',
    meta:
      `${scenario.before ? 'before' : 'after'} ${scenario.index}` +
      (scenario.decrease ? ', decrease' : ''),
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.scroller.buffer.size).toBe(0);
      const items = makeItems(max + 1, scenario.amount);

      await insertViaAdapter(misc, { ...scenario, useIndexApi: true }, items);

      const { buffer } = misc.scroller;
      const expected = scenario.expected;
      expect(misc.getScrollableSize()).toBe(
        Math.max((expected.max - expected.min + 1) * itemSize, 100)
      );
      if (expected.firstVisible !== undefined) {
        expect(misc.adapter.firstVisible.$index).toBe(expected.firstVisible);
      }
      if (expected.lastVisible !== undefined) {
        expect(misc.adapter.lastVisible.$index).toBe(expected.lastVisible);
      }
      expect(buffer.startIndex).toBe(expected.start);
      expect(buffer.absMinIndex).toBe(expected.min);
      expect(buffer.minIndex).toBe(expected.min);
      expect(buffer.firstIndex).toBe(expected.min);
      expect(buffer.absMaxIndex).toBe(expected.max);
      expect(buffer.maxIndex).toBe(expected.max);
      expect(buffer.lastIndex).toBe(expected.max);
      expect(buffer.items.map(item => item.data.id)).toEqual(
        items.map(item => item.id)
      );
      misc.expect.domIndexesMatchBuffer();
    }
  });

describe('Adapter Insert Spec', () => {
  describe('Buffer', () => {
    staticScenarios.forEach(scenario => registerStatic(scenario, true));
    outsideScenarios.forEach(scenario => registerStatic(scenario, false));
  });

  describe('Persistence after scroll', () =>
    dynamicScenarios.forEach(registerDynamic));

  describe('Virtual insertion', () =>
    virtualScenarios.forEach(registerVirtual));

  describe('Empty datasource', () => emptyScenarios.forEach(registerEmpty));
});
