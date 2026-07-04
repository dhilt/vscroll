import { expectDomMatchesBuffer } from '../helpers/expect';
import { Direction } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

interface Scenario {
  title: string;
  priority: Direction;
  getSize: (index: number) => number;
  scrollPosition?: number;
  expected: {
    firstIndex?: number;
    lastIndex?: number;
    atMax?: boolean;
  };
}

interface TestCase {
  scenario: Scenario;
  config: TestBedConfig;
}

const minIndex = 0;
const maxIndex = 99;
const itemSize = 20;
const baseDsSettings = { startIndex: maxIndex, minIndex, maxIndex };

const scenarios: Scenario[] = [
  {
    title:
      'should stay at the bottom edge when odd items are big (fwd on init)',
    priority: Direction.forward,
    getSize: index => (index % 2 === 0 ? 50 : 100),
    expected: { lastIndex: maxIndex, atMax: true }
  },
  {
    title:
      'should stay at the bottom edge when even items are big (fwd on init)',
    priority: Direction.forward,
    getSize: index => (index % 2 !== 0 ? 50 : 100),
    expected: { lastIndex: maxIndex, atMax: true }
  },
  {
    title:
      'should stay at the bottom edge when odd items are big (bwd on init)',
    priority: Direction.backward,
    getSize: index => (index % 2 === 0 ? 50 : 100),
    expected: { lastIndex: maxIndex, atMax: true }
  },
  {
    title:
      'should not stay at the bottom edge when even items are big (bwd on init)',
    priority: Direction.backward,
    getSize: index => (index % 2 !== 0 ? 50 : 100),
    expected: { lastIndex: maxIndex - 1, atMax: false }
  },
  {
    title: 'should not shift position (bwd on scroll)',
    priority: Direction.backward,
    getSize: index => (index >= 80 ? itemSize : 100),
    scrollPosition: 75 * itemSize,
    expected: { firstIndex: 75 }
  },
  {
    title: 'should shift position (fwd on scroll)',
    priority: Direction.forward,
    getSize: index => (index >= 80 ? itemSize : 100),
    scrollPosition: 75 * itemSize,
    expected: { firstIndex: 79 }
  }
];

const cases: TestCase[] = scenarios.map(scenario => ({
  scenario,
  config: {
    datasource: () => getDatasource({ min: minIndex, max: maxIndex }),
    datasourceSettings: {
      ...baseDsSettings,
      ...(scenario.scrollPosition === undefined ? {} : { itemSize })
    },
    datasourceDevSettings: { directionPriority: scenario.priority },
    templateSettings: { viewportHeight: 200, dynamicSize: 'size' }
  }
}));

const expectResult = (misc: Misc, scenario: Scenario): void => {
  const { firstIndex, lastIndex, atMax } = scenario.expected;

  if (firstIndex !== undefined) {
    expect(misc.adapter.firstVisible.$index).toBe(firstIndex);
  }
  if (lastIndex !== undefined) {
    expect(misc.adapter.lastVisible.$index).toBe(lastIndex);
  }
  if (atMax !== undefined) {
    const maxPosition = misc.getScrollableSize() - misc.getViewportSize();
    if (atMax) {
      expect(misc.getScrollPosition()).toBe(maxPosition);
    } else {
      expect(misc.getScrollPosition()).not.toBe(maxPosition);
    }
  }
};

describe('Direction Priority Spec', () =>
  cases.forEach(({ scenario, config }) =>
    makeTest({
      config,
      title: scenario.title,
      before: misc =>
        misc.setItemProcessor(({ $index, data }) => {
          data.size = scenario.getSize($index);
        }),
      it: misc => async () => {
        await misc.relaxNext();
        if (scenario.scrollPosition !== undefined) {
          await misc.scrollToRelax(scenario.scrollPosition);
        }
        expectDomMatchesBuffer(misc);
        expectResult(misc, scenario);
      }
    })
  ));
