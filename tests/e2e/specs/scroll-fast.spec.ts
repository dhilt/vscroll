import { expectConsistent } from '../helpers/expect';
import { Direction } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

interface FastScrollConfig {
  items: number;
  scrollCount: number;
  finalEdge: Direction;
}

type Config = TestBedConfig<FastScrollConfig> & {
  custom: FastScrollConfig;
  datasourceSettings: NonNullable<TestBedConfig['datasourceSettings']>;
  templateSettings: NonNullable<TestBedConfig['templateSettings']>;
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

const delay = (duration: number) =>
  new Promise<void>(resolve => setTimeout(resolve, duration));

const runFastScroll = async (misc: Misc, config: FastScrollConfig) => {
  for (let iteration = 0; iteration <= config.scrollCount; iteration++) {
    await delay(25);
    misc.scrollMax();
    await delay(25);
    if (
      iteration < config.scrollCount ||
      config.finalEdge === Direction.backward
    ) {
      misc.scrollMin();
    }
  }
};

const reachExpectedEdge = async (misc: Misc, config: Config) => {
  const startIndex = config.datasourceSettings.startIndex as number;

  for (let attempt = 0; attempt < 50; attempt++) {
    await misc.adapter.relax();
    const atBof = misc.getScrollPosition() === 0;
    const { items } = misc.scroller.buffer;
    const edgeItem = items[atBof ? 0 : items.length - 1];
    const expectedIndex = startIndex + (atBof ? 0 : config.custom.items - 1);
    if (edgeItem?.$index === expectedIndex) {
      return;
    }
    if (atBof) {
      await misc.scrollMaxRelax();
    } else {
      await misc.scrollMinRelax();
    }
  }

  throw new Error('Unable to reach a complete dataset edge');
};

const expectCompleteDataset = (misc: Misc, config: Config) => {
  expectConsistent(misc);
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
  await reachExpectedEdge(misc, config);
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
