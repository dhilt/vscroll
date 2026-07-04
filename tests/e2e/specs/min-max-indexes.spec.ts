import {
  expectBufferRange,
  expectConsistent,
  expectNoForwardGap,
  expectStartVisible
} from '../helpers/expect';
import { Misc } from '../miscellaneous/misc';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

type Config = TestBedConfig & {
  datasourceSettings: NonNullable<TestBedConfig['datasourceSettings']>;
  templateSettings: NonNullable<TestBedConfig['templateSettings']>;
};

interface ExpectedRange {
  bufferRange: [number, number];
}

interface ExpectedLoad extends ExpectedRange {
  loops: number;
}

interface GoldenCase<Expected extends ExpectedRange = ExpectedRange> {
  config: Config;
  expected: Expected;
}

const configs: Config[] = [
  {
    datasourceSettings: {
      startIndex: 1,
      padding: 0.5,
      itemSize: 20,
      minIndex: -49,
      maxIndex: 100
    },
    templateSettings: { viewportHeight: 200, itemHeight: 20 }
  },
  {
    datasourceSettings: {
      startIndex: 600,
      padding: 1.2,
      itemSize: 40,
      minIndex: -69,
      maxIndex: 1300
    },
    templateSettings: { viewportHeight: 100, itemHeight: 40 }
  },
  {
    datasourceSettings: {
      startIndex: 174,
      padding: 0.7,
      itemSize: 25,
      minIndex: 169,
      maxIndex: 230
    },
    templateSettings: { viewportHeight: 50, itemHeight: 25 }
  },
  {
    datasourceSettings: {
      startIndex: 33,
      padding: 0.62,
      itemSize: 100,
      minIndex: 20,
      maxIndex: 230,
      horizontal: true
    },
    templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true }
  },
  {
    datasourceSettings: {
      startIndex: 1,
      padding: 0.25,
      itemSize: 20,
      minIndex: -40,
      maxIndex: 159,
      windowViewport: true
    },
    templateSettings: {
      noViewportClass: true,
      viewportHeight: 0,
      itemHeight: 20
    }
  }
];

const withoutSetting = (
  config: Config,
  setting: 'itemSize' | 'minIndex' | 'maxIndex'
): Config => {
  const datasourceSettings = { ...config.datasourceSettings };
  delete datasourceSettings[setting];
  return { ...config, datasourceSettings };
};

const commonExpected: ExpectedLoad[] = [
  { bufferRange: [-4, 15], loops: 3 },
  { bufferRange: [595, 605], loops: 3 },
  { bufferRange: [169, 178], loops: 3 },
  { bufferRange: [28, 40], loops: 3 },
  { bufferRange: [-9, 48], loops: 3 }
];
const noItemSizeExpected: ExpectedLoad[] = [
  { bufferRange: [-4, 15], loops: 4 },
  { bufferRange: [595, 609], loops: 4 },
  { bufferRange: [169, 178], loops: 3 },
  { bufferRange: [28, 42], loops: 4 },
  { bufferRange: [-9, 48], loops: 4 }
];
const aroundMinExpected: ExpectedRange[] = [
  { bufferRange: [-49, -35] },
  { bufferRange: [-49, -35] },
  { bufferRange: [-49, -35] },
  { bufferRange: [-49, -34] }
];
const aroundMaxExpected: ExpectedRange[] = [
  { bufferRange: [86, 100] },
  { bufferRange: [86, 100] },
  { bufferRange: [86, 100] },
  { bufferRange: [86, 100] }
];

const zip = <Expected extends ExpectedRange>(
  configs: Config[],
  expected: Expected[]
): GoldenCase<Expected>[] => {
  if (configs.length !== expected.length) {
    throw new Error(
      `golden mismatch: ${configs.length} configs vs ${expected.length} expected`
    );
  }
  return configs.map((config, index) => ({
    config,
    expected: expected[index]
  }));
};

const commonCases = zip(configs, commonExpected);
const noMaxCases = zip(
  configs.map(config => withoutSetting(config, 'maxIndex')),
  commonExpected
);
const noMinCases = zip(
  configs.map(config => withoutSetting(config, 'minIndex')),
  commonExpected
);
const noItemSizeCases = zip(
  configs.map(config => withoutSetting(config, 'itemSize')),
  noItemSizeExpected
);

const commonConfig = configs[0];
const aroundMinCases = zip(
  [-9999, -50, -49, -48].map<Config>(startIndex => ({
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex }
  })),
  aroundMinExpected
);
const aroundMaxConfigs = [99, 100, 101, 999].map<Config>(startIndex => ({
  ...commonConfig,
  datasourceSettings: { ...commonConfig.datasourceSettings, startIndex }
}));
const aroundMaxCases = zip(aroundMaxConfigs, aroundMaxExpected);
const forwardGapConfigs = aroundMaxConfigs.map(config =>
  withoutSetting(config, 'minIndex')
);

const getItemSize = (misc: Misc, config: Config): number =>
  config.datasourceSettings.itemSize ?? misc.scroller.buffer.defaultSize;

const testCommonCase =
  ({ config, expected }: GoldenCase<ExpectedLoad>) =>
  (misc: Misc) =>
  async () => {
    await misc.relaxNext();

    const { minIndex, maxIndex, startIndex } = config.datasourceSettings;
    const size = getItemSize(misc, config);

    expectConsistent(misc);
    expectBufferRange(misc, expected.bufferRange);
    expect(misc.innerLoopCount).toEqual(expected.loops);
    expectStartVisible(misc, startIndex as number);

    expect(misc.adapter.bufferInfo.absMinIndex).toEqual(minIndex ?? -Infinity);
    expect(misc.adapter.bufferInfo.absMaxIndex).toEqual(maxIndex ?? Infinity);

    const { firstIndex, lastIndex } = misc.adapter.bufferInfo;
    if (minIndex !== undefined && maxIndex !== undefined) {
      expect(misc.getScrollableSize()).toEqual(
        (maxIndex - minIndex + 1) * size
      );
    } else if (minIndex !== undefined) {
      expect(misc.getScrollableSize()).toEqual(
        (lastIndex - minIndex + 1) * size
      );
    } else if (maxIndex !== undefined) {
      expect(misc.getScrollableSize()).toEqual(
        (maxIndex - firstIndex + 1) * size
      );
    }
  };

const testStartIndexEdge =
  ({ config, expected }: GoldenCase) =>
  (misc: Misc) =>
  async () => {
    await misc.relaxNext();

    const minIndex = config.datasourceSettings.minIndex as number;
    const maxIndex = config.datasourceSettings.maxIndex as number;
    const size = getItemSize(misc, config);

    expectConsistent(misc);
    expectBufferRange(misc, expected.bufferRange);
    expect(misc.getScrollableSize()).toEqual((maxIndex - minIndex + 1) * size);
    expect(misc.adapter.bufferInfo.absMinIndex).toEqual(minIndex);
    expect(misc.adapter.bufferInfo.absMaxIndex).toEqual(maxIndex);
  };

const testForwardGap = (misc: Misc) => async () => {
  await misc.relaxNext();
  expectConsistent(misc);
  expectNoForwardGap(misc);
};

const registerGolden = <Expected extends ExpectedRange>(
  title: string,
  testTitle: string,
  cases: GoldenCase<Expected>[],
  scenario: (
    testCase: GoldenCase<Expected>
  ) => (misc: Misc) => () => Promise<void>
): void => {
  describe(title, () =>
    cases.forEach((testCase, index) =>
      makeTest({
        config: testCase.config,
        title: `${testTitle} (config ${index})`,
        it: scenario(testCase)
      })
    )
  );
};

describe('Min/max Indexes Spec', () => {
  registerGolden(
    'Common cases',
    'should fill the viewport and the paddings',
    commonCases,
    testCommonCase
  );
  registerGolden(
    'No maxIndex cases',
    'should fill the viewport and backward padding',
    noMaxCases,
    testCommonCase
  );
  registerGolden(
    'No minIndex cases',
    'should fill the viewport and forward padding',
    noMinCases,
    testCommonCase
  );
  registerGolden(
    'No itemSize cases',
    'should fill the viewport and the paddings',
    noItemSizeCases,
    testCommonCase
  );
  registerGolden(
    'startIndex around minIndex',
    'should reset backward padding',
    aroundMinCases,
    testStartIndexEdge
  );
  registerGolden(
    'startIndex around maxIndex',
    'should reset forward padding',
    aroundMaxCases,
    testStartIndexEdge
  );

  describe('startIndex around maxIndex and no minIndex', () =>
    forwardGapConfigs.forEach((config, index) =>
      makeTest({
        config,
        title: `should fill forward padding gap (config ${index})`,
        it: testForwardGap
      })
    ));
});
