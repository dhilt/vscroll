import {
  Direction,
  getDatasource,
  makeTest,
  Misc,
  TestConfig
} from '../scaffolding';

interface FastScrollConfig {
  items: number;
  scrollCount: number;
  finalEdge: Direction;
}

type Config = TestConfig<FastScrollConfig> & {
  custom: FastScrollConfig;
  datasourceSettings: NonNullable<TestConfig['datasourceSettings']>;
  templateSettings: NonNullable<TestConfig['templateSettings']>;
};

const baseConfigs: Config[] = [
  {
    datasource: () => getDatasource({ min: 1, max: 100, delay: 25 }),
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 0.5,
      minIndex: 1,
      maxIndex: 100
    },
    templateSettings: { viewportHeight: 100, itemHeight: 20 },
    custom: { items: 100, scrollCount: 5, finalEdge: Direction.backward }
  },
  {
    datasource: () => getDatasource({ min: 1, max: 100, delay: 25 }),
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 3,
      padding: 0.3,
      minIndex: 1,
      maxIndex: 100
    },
    templateSettings: { viewportHeight: 110, itemHeight: 20 },
    custom: { items: 100, scrollCount: 8, finalEdge: Direction.backward }
  },
  {
    datasource: () => getDatasource({ min: 51, max: 200, delay: 25 }),
    datasourceSettings: {
      startIndex: 51,
      bufferSize: 7,
      padding: 1.1,
      minIndex: 51,
      maxIndex: 200
    },
    templateSettings: { viewportHeight: 69, itemHeight: 20 },
    custom: { items: 150, scrollCount: 6, finalEdge: Direction.backward }
  },
  {
    datasource: () => getDatasource({ min: 51, max: 200, delay: 25 }),
    datasourceSettings: {
      startIndex: 51,
      bufferSize: 20,
      padding: 0.2,
      windowViewport: true,
      minIndex: 51,
      maxIndex: 200
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    },
    custom: { items: 150, scrollCount: 5, finalEdge: Direction.backward }
  }
];

const eofConfigs = baseConfigs.map<Config>(config => ({
  ...config,
  custom: { ...config.custom, finalEdge: Direction.forward }
}));

const runFastScroll = async (misc: Misc, config: FastScrollConfig) => {
  for (let iteration = 0; iteration <= config.scrollCount; iteration++) {
    await misc.delay(25);
    misc.scrollMax();
    await misc.delay(25);
    if (
      iteration < config.scrollCount ||
      config.finalEdge === Direction.backward
    ) {
      misc.scrollMin();
    }
  }
};

const expectCompleteDataset = (misc: Misc, config: Config) => {
  misc.expect.consistent();
  const { buffer, viewport } = misc.scroller;
  const itemSize = config.templateSettings.itemHeight || 20;
  const totalSize =
    viewport.paddings.backward.size +
    buffer.size * itemSize +
    viewport.paddings.forward.size;

  expect(totalSize).toBe(config.custom.items * itemSize);
  expect(buffer.size).toBeGreaterThan(0);

  const atBof = misc.getScrollPosition() === 0;
  const edge = buffer.items[atBof ? 0 : buffer.items.length - 1];
  const startIndex = config.datasourceSettings.startIndex as number;
  const expectedIndex = startIndex + (atBof ? 0 : config.custom.items - 1);
  expect(edge?.$index).toBe(expectedIndex);
};

const testFastScroll = (config: Config) => (misc: Misc) => async () => {
  await misc.relaxNext();
  await runFastScroll(misc, config.custom);
  await misc.reachEdge(config.custom.finalEdge);
  expectCompleteDataset(misc, config);
};

const registerCases = (configs: Config[], edge: 'BOF' | 'EOF') =>
  configs.forEach((config, index) =>
    makeTest({
      config,
      title: `should reach ${edge} without gaps (config ${index})`,
      it: testFastScroll(config)
    })
  );

describe('Fast Scroll Spec', () => {
  describe('multi-scroll to the BOF', () => registerCases(baseConfigs, 'BOF'));
  describe('multi-scroll to the EOF', () => registerCases(eofConfigs, 'EOF'));
});
