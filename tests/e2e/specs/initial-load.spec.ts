import {
  expectBufferRange,
  expectConsistent,
  expectStartVisible
} from '../helpers/expect';
import { Misc } from '../miscellaneous/misc';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

type InitialLoadConfig = TestBedConfig & {
  datasourceSettings: NonNullable<TestBedConfig['datasourceSettings']>;
  templateSettings: NonNullable<TestBedConfig['templateSettings']>;
};

type GoldenConfig = InitialLoadConfig & {
  golden: [number, number];
};

type Scenario<Config extends InitialLoadConfig = InitialLoadConfig> = (
  config: Config
) => (misc: Misc) => () => Promise<void>;

const fixedItemSizeConfigList: GoldenConfig[] = [
  {
    datasourceSettings: { startIndex: 1, padding: 2, itemSize: 15 },
    templateSettings: { viewportHeight: 20, itemHeight: 15 },
    golden: [-4, 5]
  },
  {
    datasourceSettings: { startIndex: 1, padding: 0.5, itemSize: 20 },
    templateSettings: { viewportHeight: 120, itemHeight: 20 },
    golden: [-4, 9]
  },
  {
    datasourceSettings: { startIndex: -99, padding: 0.3, itemSize: 25 },
    templateSettings: { viewportHeight: 200, itemHeight: 25 },
    golden: [-104, -89]
  },
  {
    datasourceSettings: {
      startIndex: -77,
      padding: 0.62,
      itemSize: 100,
      horizontal: true
    },
    templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true },
    golden: [-82, -70]
  },
  {
    datasourceSettings: {
      startIndex: 1,
      padding: 0.5,
      itemSize: 20,
      windowViewport: true
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    },
    golden: [-19, 58]
  }
];

const fixedItemSizeAndBigBufferSizeConfigList: GoldenConfig[] = [
  {
    datasourceSettings: {
      startIndex: 100,
      padding: 0.1,
      itemSize: 20,
      bufferSize: 20
    },
    templateSettings: { viewportHeight: 100, itemHeight: 20 },
    golden: [80, 119]
  },
  {
    datasourceSettings: {
      startIndex: -50,
      padding: 0.1,
      itemSize: 100,
      bufferSize: 10,
      horizontal: true
    },
    templateSettings: { viewportWidth: 200, itemWidth: 100, horizontal: true },
    golden: [-60, -41]
  }
];

const tunedItemSizeConfigList: GoldenConfig[] = [
  {
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 1,
      padding: 0.5,
      itemSize: 40
    },
    templateSettings: { viewportHeight: 100, itemHeight: 20 },
    golden: [-2, 8]
  },
  {
    datasourceSettings: {
      startIndex: -50,
      bufferSize: 2,
      padding: 0.5,
      itemSize: 30
    },
    templateSettings: { viewportHeight: 120, itemHeight: 20 },
    golden: [-53, -42]
  },
  {
    datasourceSettings: {
      startIndex: -77,
      padding: 0.82,
      itemSize: 200,
      horizontal: true
    },
    templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true },
    golden: [-82, -68]
  },
  {
    datasourceSettings: {
      startIndex: -47,
      padding: 0.3,
      itemSize: 60,
      windowViewport: true
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 40
    },
    golden: [-53, -23]
  }
];

const tunedItemSizeAndBigBufferSizeConfigList: GoldenConfig[] = [
  {
    datasourceSettings: {
      startIndex: -50,
      bufferSize: 7,
      padding: 0.5,
      itemSize: 30
    },
    templateSettings: { viewportHeight: 120, itemHeight: 20 },
    golden: [-57, -37]
  },
  {
    datasourceSettings: {
      startIndex: 50,
      padding: 0.33,
      itemSize: 35,
      bufferSize: 20,
      windowViewport: true
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    },
    golden: [30, 101]
  }
];

const withoutItemSize = (config: GoldenConfig): GoldenConfig => {
  const datasourceSettings = { ...config.datasourceSettings };
  delete datasourceSettings.itemSize;
  return { ...config, datasourceSettings };
};

const noItemSizeConfigList = tunedItemSizeConfigList.map(withoutItemSize);
const noItemSizeAndBigBufferConfigList =
  tunedItemSizeAndBigBufferSizeConfigList.map(withoutItemSize);

const lackOfItemsOnFirstFetchConfigList: InitialLoadConfig[] = [
  {
    datasourceSettings: {
      startIndex: 100,
      padding: 0.5,
      bufferSize: 10,
      minIndex: 1
    },
    templateSettings: { viewportHeight: 300, itemHeight: 20 }
  },
  {
    datasourceSettings: {
      startIndex: -70,
      padding: 0.5,
      bufferSize: 2,
      minIndex: -75
    },
    templateSettings: { viewportHeight: 200, itemHeight: 20 }
  },
  {
    datasourceSettings: {
      startIndex: 1,
      padding: 0.1,
      bufferSize: 12,
      minIndex: -9,
      windowViewport: true
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    }
  },
  {
    datasourceSettings: {
      startIndex: -99,
      padding: 0.3,
      bufferSize: 4,
      minIndex: -120,
      horizontal: true
    },
    templateSettings: { horizontal: true, viewportWidth: 300, itemWidth: 40 }
  }
];

const testFixedItemSize: Scenario<GoldenConfig> =
  config => misc => async () => {
    await misc.relaxNext();

    const { fetch, clip } = misc.scroller.state;
    expect(misc.workflow.cyclesDone).toEqual(1);
    expect(fetch.callCount).toEqual(2);
    expect(misc.innerLoopCount).toEqual(3);
    expect(clip.callCount).toEqual(0);

    expectConsistent(misc);
    expectBufferRange(misc, config.golden);
    expectStartVisible(misc, config.datasourceSettings.startIndex as number);
    expect(misc.padding.backward.getSize()).toEqual(0);
    expect(misc.padding.forward.getSize()).toEqual(0);
  };

const testMeasuredItemSize: Scenario<GoldenConfig> =
  config => misc => async () => {
    const cycleDone = misc.waitNextCycle();
    const innerLoops = await misc.captureInnerLoops(3, () => ({
      indexes: misc.scroller.buffer.items.map(item => item.$index),
      firstIndex: misc.adapter.bufferInfo.firstIndex,
      lastIndex: misc.adapter.bufferInfo.lastIndex
    }));
    await cycleDone;
    await misc.adapter.relax();

    expect(misc.workflow.cyclesDone).toEqual(1);
    expect(misc.scroller.state.fetch.callCount).toEqual(3);
    expect(misc.scroller.state.clip.callCount).toEqual(0);

    innerLoops.forEach(({ indexes, firstIndex, lastIndex }) => {
      const contiguous = Array.from(
        { length: lastIndex - firstIndex + 1 },
        (_, offset) => firstIndex + offset
      );
      expect(indexes).toEqual(contiguous);
    });

    expectConsistent(misc);
    expectBufferRange(misc, config.golden);
    expectStartVisible(misc, config.datasourceSettings.startIndex as number);
    expect(misc.padding.backward.getSize()).toEqual(0);
    expect(misc.padding.forward.getSize()).toEqual(0);
  };

const testFirstFetchGap: Scenario = config => misc => async () => {
  const cycleDone = misc.waitNextCycle();
  const [firstLoop] = await misc.captureInnerLoops(1, () => ({
    scrollPosition: misc.getScrollPosition(),
    backwardPadding: misc.padding.backward.getSize(),
    firstVisibleIndex: misc.adapter.firstVisible.$index
  }));

  const startIndex = config.datasourceSettings.startIndex as number;
  expect(firstLoop.scrollPosition).toBe(firstLoop.backwardPadding);
  expect(firstLoop.firstVisibleIndex).toEqual(startIndex);

  await cycleDone;
  await misc.adapter.relax();

  expectConsistent(misc);
  expectStartVisible(misc, startIndex);
};

const registerCases = <Config extends InitialLoadConfig>(
  configs: Config[],
  title: string,
  scenario: Scenario<Config>
) =>
  configs.forEach(config => makeTest({ config, title, it: scenario(config) }));

describe('Initial Load Spec', () => {
  describe('Fixed itemSize', () => {
    registerCases(
      fixedItemSizeConfigList,
      'should make 2 fetches to satisfy padding limits',
      testFixedItemSize
    );
    registerCases(
      fixedItemSizeAndBigBufferSizeConfigList,
      'should make 2 fetches to overflow padding limits (bufferSize is big enough)',
      testFixedItemSize
    );
  });

  describe('Tuned itemSize', () => {
    registerCases(
      tunedItemSizeConfigList,
      'should make 3 fetches to satisfy padding limits',
      testMeasuredItemSize
    );
    registerCases(
      tunedItemSizeAndBigBufferSizeConfigList,
      'should make 3 fetches to overflow padding limits (bufferSize is big enough)',
      testMeasuredItemSize
    );
  });

  describe('No itemSize', () => {
    registerCases(
      noItemSizeConfigList,
      'should make 3 fetches to satisfy padding limits',
      testMeasuredItemSize
    );
    registerCases(
      noItemSizeAndBigBufferConfigList,
      'should make 3 fetches to overflow padding limits (bufferSize is big enough)',
      testMeasuredItemSize
    );
  });

  describe('Lack of items after the 1st fetch', () => {
    lackOfItemsOnFirstFetchConfigList.forEach((config, index) =>
      makeTest({
        config,
        title: `should stretch the forward padding element (${index})`,
        it: testFirstFetchGap(config)
      })
    );
  });
});
