import {
  BufferUpdater,
  makeTest,
  Misc,
  MutableDatasource,
  TestConfig,
  TestItem
} from '../scaffolding';

interface ExpectedRow {
  index: number;
  text: string;
}

interface IdentityExpectation {
  stable: string[];
  fresh: string[];
}

interface UpdateOutcome {
  rows: ExpectedRow[];
  identity: IdentityExpectation;
  firstVisible: number;
}

interface UpdateScenario {
  title: string;
  startIndex?: number;
  predicate: BufferUpdater<TestItem>;
  left: UpdateOutcome;
  right: UpdateOutcome;
  /** Settled Average-strategy value captured from the implementation. */
  expectedDefaultSize?: number;
}

const min = -29;
const max = 30;
const itemSize = 20;
const viewportSize = 100;
const itemsPerPage = viewportSize / itemSize;

const make = (text: string, size: number): TestItem => ({ id: 0, text, size });
const row = (index: number, text: string): ExpectedRow => ({ index, text });
const outcome = (
  rows: ExpectedRow[],
  stable: string[],
  fresh: string[],
  firstVisible: number
): UpdateOutcome => ({
  rows,
  identity: { stable, fresh },
  firstVisible
});

const scenarios: UpdateScenario[] = [
  {
    title: 'no-op',
    predicate: _item => true,
    left: outcome(
      [row(0, 'item #0'), row(1, 'item #1'), row(2, 'item #2')],
      ['item #0', 'item #1', 'item #2'],
      [],
      1
    ),
    right: outcome(
      [row(0, 'item #0'), row(1, 'item #1'), row(2, 'item #2')],
      ['item #0', 'item #1', 'item #2'],
      [],
      1
    )
  },
  {
    title: 'replace one-to-one',
    predicate: ({ $index }) => ($index === 1 ? [make('xxx', 125)] : true),
    left: outcome(
      [row(0, 'item #0'), row(1, 'xxx'), row(2, 'item #2')],
      ['item #0', 'item #2'],
      ['xxx'],
      1
    ),
    right: outcome(
      [row(0, 'item #0'), row(1, 'xxx'), row(2, 'item #2')],
      ['item #0', 'item #2'],
      ['xxx'],
      1
    ),
    expectedDefaultSize: 28
  },
  {
    title: 'replace one-to-three',
    predicate: ({ $index }) =>
      $index === 3 ? [make('xxx', 1), make('yyy', 1), make('zzz', 125)] : true,
    left: outcome(
      [
        row(2, 'item #2'),
        row(3, 'xxx'),
        row(4, 'yyy'),
        row(5, 'zzz'),
        row(6, 'item #4')
      ],
      ['item #2', 'item #4'],
      ['xxx', 'yyy', 'zzz'],
      1
    ),
    right: outcome(
      [
        row(0, 'item #2'),
        row(1, 'xxx'),
        row(2, 'yyy'),
        row(3, 'zzz'),
        row(4, 'item #4')
      ],
      ['item #2', 'item #4'],
      ['xxx', 'yyy', 'zzz'],
      -1
    ),
    expectedDefaultSize: 24
  },
  {
    title: 'insert two around one original item',
    startIndex: 10,
    predicate: ({ $index, data }) =>
      $index === 10 ? [make('xxx', itemSize), data, make('yyy', 125)] : true,
    left: outcome(
      [
        row(9, 'item #9'),
        row(10, 'xxx'),
        row(11, 'item #10'),
        row(12, 'yyy'),
        row(13, 'item #11')
      ],
      ['item #9', 'item #10', 'item #11'],
      ['xxx', 'yyy'],
      11
    ),
    right: outcome(
      [
        row(7, 'item #9'),
        row(8, 'xxx'),
        row(9, 'item #10'),
        row(10, 'yyy'),
        row(11, 'item #11')
      ],
      ['item #9', 'item #10', 'item #11'],
      ['xxx', 'yyy'],
      9
    ),
    expectedDefaultSize: 27
  },
  {
    title: 'prepend',
    startIndex: min,
    predicate: ({ $index, data }) =>
      $index === min ? [make('xxx', 125), data] : true,
    left: outcome(
      [row(min, 'xxx'), row(min + 1, `item #${min}`)],
      [`item #${min}`],
      ['xxx'],
      min + 1
    ),
    right: outcome(
      [row(min - 1, 'xxx'), row(min, `item #${min}`)],
      [`item #${min}`],
      ['xxx'],
      min
    ),
    expectedDefaultSize: 32
  },
  {
    title: 'append',
    startIndex: max,
    predicate: ({ $index, data }) =>
      $index === max ? [data, make('xxx', 125)] : true,
    left: outcome(
      [row(max, `item #${max}`), row(max + 1, 'xxx')],
      [`item #${max}`],
      ['xxx'],
      max - itemsPerPage + 1
    ),
    right: outcome(
      [row(max - 1, `item #${max}`), row(max, 'xxx')],
      [`item #${max}`],
      ['xxx'],
      max - itemsPerPage
    ),
    expectedDefaultSize: 32
  },
  {
    title: 'remove two',
    predicate: ({ $index }) => !($index === 1 || $index === 3),
    left: outcome(
      [row(0, 'item #0'), row(1, 'item #2'), row(2, 'item #4')],
      ['item #0', 'item #2', 'item #4'],
      [],
      1
    ),
    right: outcome(
      [row(2, 'item #0'), row(3, 'item #2'), row(4, 'item #4')],
      ['item #0', 'item #2', 'item #4'],
      [],
      3
    )
  },
  {
    title: 'remove left edge',
    startIndex: min,
    predicate: ({ $index }) => $index !== min,
    left: outcome(
      [row(min, `item #${min + 1}`), row(min + 1, `item #${min + 2}`)],
      [`item #${min + 1}`, `item #${min + 2}`],
      [],
      min
    ),
    right: outcome(
      [row(min + 1, `item #${min + 1}`), row(min + 2, `item #${min + 2}`)],
      [`item #${min + 1}`, `item #${min + 2}`],
      [],
      min + 1
    )
  },
  {
    title: 'remove right edge',
    startIndex: max,
    predicate: ({ $index }) => $index !== max,
    left: outcome(
      [row(max - 2, `item #${max - 2}`), row(max - 1, `item #${max - 1}`)],
      [`item #${max - 2}`, `item #${max - 1}`],
      [],
      max - itemsPerPage
    ),
    right: outcome(
      [row(max - 1, `item #${max - 2}`), row(max, `item #${max - 1}`)],
      [`item #${max - 2}`, `item #${max - 1}`],
      [],
      max - itemsPerPage + 1
    )
  },
  {
    title: 'perform complex update',
    predicate: ({ $index, data }) => {
      switch ($index) {
        case 1:
          return [make('a', 2), data];
        case 2:
          return [];
        case 3:
          return [make('b', 2), make('c', 2)];
        case 4:
          return [];
        case 5:
          return [data, make('d', 2)];
        default:
          return true;
      }
    },
    left: outcome(
      [
        row(1, 'a'),
        row(2, 'item #1'),
        row(3, 'b'),
        row(4, 'c'),
        row(5, 'item #5'),
        row(6, 'd')
      ],
      ['item #1', 'item #5'],
      ['a', 'b', 'c', 'd'],
      2
    ),
    right: outcome(
      [
        row(0, 'a'),
        row(1, 'item #1'),
        row(2, 'b'),
        row(3, 'c'),
        row(4, 'item #5'),
        row(5, 'd')
      ],
      ['item #1', 'item #5'],
      ['a', 'b', 'c', 'd'],
      1
    ),
    expectedDefaultSize: 16
  }
];

const createSource = (): MutableDatasource => {
  const source = new MutableDatasource(min, max);
  source.setSizes(() => itemSize);
  return source;
};

const createConfig = (scenario: UpdateScenario): TestConfig => ({
  datasource: createSource,
  datasourceSettings: {
    startIndex: scenario.startIndex ?? 1,
    minIndex: min,
    maxIndex: max,
    itemSize
  },
  templateSettings: {
    viewportHeight: viewportSize,
    itemHeight: itemSize,
    dynamicSize: 'size'
  },
  timeout: 4000
});

const expectRows = (misc: Misc, rows: ExpectedRow[]): void => {
  const items = misc.scroller.buffer.items;
  const start = items.findIndex(item => item.$index === rows[0].index);
  expect(start).toBeGreaterThanOrEqual(0);

  rows.forEach((expected, offset) => {
    const item = items[start + offset];
    expect(item.$index).toBe(expected.index);
    expect(item.data.text).toBe(expected.text);
    expect(item.invisible).toBe(false);
    expect(misc.getElementText(expected.index)).toBe(
      `${expected.index}: ${expected.text}`
    );
  });
};

const expectIdentity = (
  misc: Misc,
  before: Misc['scroller']['buffer']['items'],
  expected: IdentityExpectation
): void => {
  const after = misc.scroller.buffer.items;
  misc.expect.uniqueItems(after);

  expected.stable.forEach(text => {
    const oldItem = before.find(item => item.data.text === text);
    const newItem = after.find(item => item.data.text === text);
    expect(oldItem).toBeDefined();
    expect(newItem?.uid).toBe(oldItem?.uid);
  });
  expected.fresh.forEach(text => {
    expect(before.some(item => item.data.text === text)).toBe(false);
    expect(after.some(item => item.data.text === text)).toBe(true);
  });
};

const registerScenario = (scenario: UpdateScenario, fixRight: boolean): void =>
  makeTest({
    config: createConfig(scenario),
    title: `should ${scenario.title}`,
    meta: `fixRight = ${fixRight}`,
    it: misc => async () => {
      await misc.relaxNext();
      const expected = fixRight ? scenario.right : scenario.left;
      const beforeItems = [...misc.scroller.buffer.items];

      misc.source<MutableDatasource>().update(scenario.predicate, fixRight);
      await misc.adapter.update({ predicate: scenario.predicate, fixRight });

      expect(misc.adapter.firstVisible.$index).toBe(expected.firstVisible);
      expectRows(misc, expected.rows);
      expectIdentity(misc, beforeItems, expected.identity);
      if (scenario.expectedDefaultSize !== undefined) {
        expect(misc.scroller.buffer.defaultSize).toBe(
          scenario.expectedDefaultSize
        );
      }

      await misc.scrollMinMaxRelax();
      await misc.scrollToIndexRelax(expected.rows[0].index);
      expectRows(misc, expected.rows);
    }
  });

const registerCleanup = (fixRight: boolean): void =>
  makeTest({
    config: createConfig(scenarios[0]),
    title: 'should refill after removing the entire buffer',
    meta: `fixRight = ${fixRight}`,
    it: misc => async () => {
      await misc.relaxNext();
      const { firstIndex, lastIndex } = misc.scroller.buffer;
      const removed = lastIndex - firstIndex + 1;
      const predicate: BufferUpdater<TestItem> = ({ $index }) =>
        !($index >= firstIndex && $index <= lastIndex);

      misc.source<MutableDatasource>().update(predicate, fixRight);
      await misc.adapter.update({ predicate, fixRight });

      expect(misc.adapter.firstVisible.$index).toBe(
        fixRight ? lastIndex + 1 : firstIndex
      );
      await misc.scrollMinRelax();
      expect(misc.scroller.buffer.firstIndex).toBe(
        min + (fixRight ? removed : 0)
      );
      await misc.scrollMaxRelax();
      expect(misc.scroller.buffer.lastIndex).toBe(
        max - (fixRight ? 0 : removed)
      );
    }
  });

describe('Adapter Update Spec', () => {
  describe('Updates', () =>
    [false, true].forEach(fixRight =>
      scenarios.forEach(scenario => registerScenario(scenario, fixRight))
    ));

  describe('After cleanup', () => [false, true].forEach(registerCleanup));
});
