import { expectBufferRange, expectViewportFilled } from '../helpers/expect';
import { Direction } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

interface ScrollPlan {
  direction: Direction;
  count: number;
  bouncing?: boolean;
  mass?: boolean;
}

type Config = TestBedConfig<ScrollPlan> & {
  custom: ScrollPlan;
  datasourceSettings: NonNullable<TestBedConfig['datasourceSettings']> & {
    startIndex: number;
    bufferSize: number;
    padding: number;
    itemSize: number;
  };
  templateSettings: NonNullable<TestBedConfig['templateSettings']>;
};

type BaseConfig = Omit<Config, 'custom'>;

interface Golden {
  range: [number, number];
  oppositePadding: number;
}

interface Scenario {
  suite: string;
  plan: (index: number) => ScrollPlan;
  title: (plan: ScrollPlan, index: number) => string;
  golden: Golden[];
}

const baseConfigs: BaseConfig[] = [
  {
    datasource: () => getDatasource({ delay: 25 }),
    datasourceSettings: {
      startIndex: 100,
      bufferSize: 4,
      padding: 0.22,
      itemSize: 20
    },
    templateSettings: { viewportHeight: 71, itemHeight: 20 }
  },
  {
    datasource: () => getDatasource({ delay: 25 }),
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 0.2,
      itemSize: 20
    },
    templateSettings: { viewportHeight: 100, itemHeight: 20 }
  },
  {
    datasource: () => getDatasource({ delay: 25 }),
    datasourceSettings: {
      startIndex: -15,
      bufferSize: 12,
      padding: 0.98,
      itemSize: 20
    },
    templateSettings: { viewportHeight: 66, itemHeight: 20 }
  },
  {
    datasource: () => getDatasource({ delay: 25 }),
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 1,
      horizontal: true,
      itemSize: 100
    },
    templateSettings: {
      viewportWidth: 450,
      itemWidth: 100,
      horizontal: true
    }
  },
  {
    datasource: () => getDatasource({ delay: 25 }),
    datasourceSettings: {
      startIndex: -74,
      bufferSize: 4,
      padding: 0.72,
      horizontal: true,
      itemSize: 75
    },
    templateSettings: {
      viewportWidth: 300,
      itemWidth: 75,
      horizontal: true
    }
  }
];

const treatIndex = (index: number): number => (index <= 3 ? index : 6 - index);

const invert = (direction: Direction): Direction =>
  direction === Direction.forward ? Direction.backward : Direction.forward;

const scrollToEdge = (misc: Misc, direction: Direction): Promise<void> =>
  direction === Direction.forward
    ? misc.scrollMaxRelax()
    : misc.scrollMinRelax();

const testScroll =
  (config: Config, golden: Golden) => (misc: Misc) => async () => {
    await misc.relaxNext();

    const { count, bouncing, mass } = config.custom;
    const middleCycle = Math.ceil((count + 1) / 2);
    let direction = config.custom.direction;

    for (let cycle = 2; cycle <= count + 1; cycle++) {
      if (bouncing || (mass && cycle === middleCycle)) {
        direction = invert(direction);
      }
      await scrollToEdge(misc, direction);
    }

    expectBufferRange(misc, golden.range);
    expect(misc.padding[direction].getSize()).toBe(0);
    expect(misc.padding[invert(direction)].getSize()).toBe(
      golden.oppositePadding
    );
    expectViewportFilled(misc);
  };

const repeatedPlan =
  (direction: Direction) =>
  (index: number): ScrollPlan => ({
    direction,
    count: 3 + treatIndex(index)
  });

const alternatingPlan =
  (direction: Direction, mode: 'bouncing' | 'mass') =>
  (index: number): ScrollPlan => ({
    direction,
    count: (3 + treatIndex(index)) * 2,
    [mode]: true
  });

const scenarios: Scenario[] = [
  {
    suite: 'Single max fwd scroll event',
    plan: () => ({ direction: Direction.forward, count: 1 }),
    title: (_plan, index) =>
      `should process 1 forward max scroll (config ${index})`,
    golden: [
      { range: [100, 108], oppositePadding: 80 },
      { range: [1, 11], oppositePadding: 100 },
      { range: [-10, 8], oppositePadding: 340 },
      { range: [1, 14], oppositePadding: 500 },
      { range: [-74, -64], oppositePadding: 300 }
    ]
  },
  {
    suite: 'Single max bwd scroll event',
    plan: () => ({ direction: Direction.backward, count: 1 }),
    title: (_plan, index) =>
      `should process 1 backward max scroll (config ${index})`,
    golden: [
      { range: [92, 100], oppositePadding: 80 },
      { range: [-9, 1], oppositePadding: 100 },
      { range: [-39, -21], oppositePadding: 340 },
      { range: [-9, 4], oppositePadding: 500 },
      { range: [-82, -72], oppositePadding: 300 }
    ]
  },
  {
    suite: 'Mass max fwd scroll events',
    plan: repeatedPlan(Direction.forward),
    title: (plan, index) =>
      `should process ${plan.count} forward scrolls (config ${index})`,
    golden: [
      { range: [108, 116], oppositePadding: 240 },
      { range: [16, 26], oppositePadding: 400 },
      { range: [38, 56], oppositePadding: 1300 },
      { range: [26, 39], oppositePadding: 3000 },
      { range: [-58, -48], oppositePadding: 1500 }
    ]
  },
  {
    suite: 'Mass max bwd scroll events',
    plan: repeatedPlan(Direction.backward),
    title: (plan, index) =>
      `should process ${plan.count} backward scrolls (config ${index})`,
    golden: [
      { range: [84, 92], oppositePadding: 240 },
      { range: [-24, -14], oppositePadding: 400 },
      { range: [-87, -69], oppositePadding: 1300 },
      { range: [-34, -21], oppositePadding: 3000 },
      { range: [-98, -88], oppositePadding: 1500 }
    ]
  },
  {
    suite: 'Bouncing max two-directional scroll events (fwd started)',
    plan: alternatingPlan(Direction.forward, 'bouncing'),
    title: (plan, index) =>
      `should process ${plan.count} bouncing scrolls (config ${index})`,
    golden: [
      { range: [102, 107], oppositePadding: 240 },
      { range: [4, 10], oppositePadding: 320 },
      { range: [10, 21], oppositePadding: 1380 },
      { range: [26, 39], oppositePadding: 6000 },
      { range: [-62, -53], oppositePadding: 2400 }
    ]
  },
  {
    suite: 'Bouncing max two-directional scroll events (bwd started)',
    plan: alternatingPlan(Direction.backward, 'bouncing'),
    title: (plan, index) =>
      `should process ${plan.count} bouncing scrolls (config ${index})`,
    golden: [
      { range: [93, 98], oppositePadding: 240 },
      { range: [-8, -2], oppositePadding: 320 },
      { range: [-52, -41], oppositePadding: 1380 },
      { range: [-34, -21], oppositePadding: 6000 },
      { range: [-93, -84], oppositePadding: 2400 }
    ]
  },
  {
    suite:
      'Mass two-directional scroll events (first half fwd, second half bwd)',
    plan: alternatingPlan(Direction.forward, 'mass'),
    title: (plan, index) =>
      `should process ${plan.count} two-directional scrolls (config ${index})`,
    golden: [
      { range: [83, 91], oppositePadding: 420 },
      { range: [-25, -15], oppositePadding: 720 },
      { range: [-92, -74], oppositePadding: 2360 },
      { range: [-39, -26], oppositePadding: 6000 },
      { range: [-101, -91], oppositePadding: 2925 }
    ]
  },
  {
    suite:
      'Mass two-directional scroll events (first half bwd, second half fwd)',
    plan: alternatingPlan(Direction.backward, 'mass'),
    title: (plan, index) =>
      `should process ${plan.count} two-directional scrolls (config ${index})`,
    golden: [
      { range: [109, 117], oppositePadding: 420 },
      { range: [17, 27], oppositePadding: 720 },
      { range: [43, 61], oppositePadding: 2360 },
      { range: [31, 44], oppositePadding: 6000 },
      { range: [-55, -45], oppositePadding: 2925 }
    ]
  }
];

const registerScenario = (scenario: Scenario): void => {
  if (scenario.golden.length !== baseConfigs.length) {
    throw new Error(
      `golden mismatch in "${scenario.suite}": ` +
        `${scenario.golden.length} vs ${baseConfigs.length} configs`
    );
  }
  describe(scenario.suite, () => {
    baseConfigs.forEach((baseConfig, index) => {
      const plan = scenario.plan(index);
      const config: Config = { ...baseConfig, custom: plan };
      makeTest({
        config,
        title: scenario.title(plan, index),
        it: testScroll(config, scenario.golden[index])
      });
    });
  });
};

describe('Basic Scroll Spec', () => scenarios.forEach(registerScenario));
