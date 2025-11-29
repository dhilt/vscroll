import { test, expect } from '@playwright/test';
import { VScrollFixture, Direction } from '../fixture/VScrollFixture.js';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

const configList: ITestConfig[] = [
  {
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= -49 && i <= 100) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
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
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= -69 && i <= 1300) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
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
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= 169 && i <= 230) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
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
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= 20 && i <= 230) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
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
    datasourceGet: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        if (i >= -40 && i <= 159) {
          data.push({ id: i, text: `item #${i}` });
        }
      }
      setTimeout(() => success(data), 25);
    },
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

const noItemSizeConfigList: ITestConfig[] = configList.map(
  ({
    datasourceGet,
    datasourceSettings: { itemSize: _, ...restDatasourceSettings },
    ...config
  }) => ({
    ...config,
    datasourceGet,
    datasourceSettings: { ...restDatasourceSettings }
  })
);

const commonConfig = configList[0]; // [-49, ..., 100]

const startIndexAroundMinIndexConfigList: ITestConfig[] = [
  {
    ...commonConfig,
    datasourceSettings: {
      ...commonConfig.datasourceSettings,
      startIndex: -9999
    }
  },
  {
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex: -50 }
  },
  {
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex: -49 }
  },
  {
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex: -48 }
  }
];

const startIndexAroundMaxIndexConfigList: ITestConfig[] = [
  {
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex: 99 }
  },
  {
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex: 100 }
  },
  {
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex: 101 }
  },
  {
    ...commonConfig,
    datasourceSettings: { ...commonConfig.datasourceSettings, startIndex: 999 }
  }
];

const noMaxIndexConfigList: ITestConfig[] = configList.map(
  ({
    datasourceGet,
    datasourceSettings: { maxIndex: _, ...datasourceSettings },
    ...config
  }) => ({ ...config, datasourceGet, datasourceSettings })
);

const noMinIndexConfigList: ITestConfig[] = configList.map(
  ({
    datasourceGet,
    datasourceSettings: { minIndex: _, ...datasourceSettings },
    ...config
  }) => ({ ...config, datasourceGet, datasourceSettings })
);

const forwardGapConfigList: ITestConfig[] =
  startIndexAroundMaxIndexConfigList.map(
    ({
      datasourceGet,
      datasourceSettings: { minIndex: _, ...datasourceSettings },
      ...config
    }) => ({ ...config, datasourceGet, datasourceSettings })
  );

const checkMinMaxIndexes = async (fixture: VScrollFixture) => {
  const elements = await fixture.getElements();
  const bufferInfo = await fixture.adapter.bufferInfo;
  const { firstIndex, lastIndex, minIndex, maxIndex } = bufferInfo;
  const _minIndex = await fixture.getElementIndex(elements[0]);
  const _maxIndex = await fixture.getElementIndex(
    elements[elements.length - 1]
  );

  expect(firstIndex).toEqual(minIndex);
  expect(lastIndex).toEqual(maxIndex);
  expect(minIndex).toEqual(_minIndex);
  expect(maxIndex).toEqual(_maxIndex);
};

const getParams = ({
  datasourceSettings: settings
}: ITestConfig): {
  maxIndex: number;
  minIndex: number;
  itemSize: number;
  startIndex: number;
  padding: number;
} => ({
  maxIndex: settings.maxIndex as number,
  minIndex: settings.minIndex as number,
  itemSize: settings.itemSize as number,
  startIndex: settings.startIndex as number,
  padding: settings.padding as number
});

const testCommonCase = async (fixture: VScrollFixture, config: ITestConfig) => {
  await fixture.adapter.relax();

  const bufferSize = await fixture.scroller.settings.bufferSize;
  const {
    maxIndex,
    minIndex,
    itemSize: _itemSize,
    startIndex,
    padding
  } = getParams(config);
  const viewportSize = await fixture.scroller.viewport.getSize();
  const viewportSizeDelta = viewportSize * padding;
  const itemSize = _itemSize || (await fixture.scroller.buffer.defaultSize);
  const hasMinIndex = minIndex !== undefined;
  const hasMaxIndex = maxIndex !== undefined;
  let innerLoopCount = 3;

  const _negativeItemsAmount = Math.ceil(viewportSizeDelta / itemSize);
  const negativeItemsAmount = Math.max(_negativeItemsAmount, bufferSize);
  const _positiveItemsAmount = Math.ceil(
    (viewportSize + viewportSizeDelta) / itemSize
  );
  let positiveItemsAmount = Math.max(_positiveItemsAmount, bufferSize);

  if (!_itemSize) {
    // if Settings.itemSize is not set, then there could be 1 more fetch
    const positiveDiff = _positiveItemsAmount - bufferSize;
    if (positiveDiff > 0) {
      innerLoopCount = 4;
      // if the additional fetch size is less than bufferSize
      if (positiveDiff < bufferSize) {
        positiveItemsAmount = 2 * bufferSize;
      }
    }
  }

  const bufferInfo = await fixture.adapter.bufferInfo;

  if (hasMinIndex) {
    const negativeSize = (startIndex - minIndex) * itemSize;
    const negativeItemsSize = negativeItemsAmount * itemSize;
    const bwdPaddingSize = negativeSize - negativeItemsSize;
    const _bwdPaddingSize =
      await fixture.scroller.viewport.paddings[Direction.backward].size;
    expect(_bwdPaddingSize).toEqual(bwdPaddingSize);
    expect(bufferInfo.absMinIndex).toEqual(minIndex);
  } else {
    expect(bufferInfo.absMinIndex).toEqual(-Infinity);
  }

  if (hasMaxIndex) {
    const positiveSize = (maxIndex - startIndex + 1) * itemSize;
    const positiveItemsSize = positiveItemsAmount * itemSize;
    const fwdPaddingSize = positiveSize - positiveItemsSize;
    const _fwdPaddingSize =
      await fixture.scroller.viewport.paddings[Direction.forward].size;
    expect(_fwdPaddingSize).toEqual(fwdPaddingSize);
    expect(bufferInfo.absMaxIndex).toEqual(maxIndex);
  } else {
    expect(bufferInfo.absMaxIndex).toEqual(Infinity);
  }

  let totalSize = 0;
  if (hasMinIndex && hasMaxIndex) {
    totalSize = (maxIndex - minIndex + 1) * itemSize;
  } else if (hasMinIndex) {
    const knownSize = (startIndex - minIndex) * itemSize;
    totalSize = knownSize + positiveItemsAmount * itemSize;
  } else if (hasMaxIndex) {
    const knownSize = (maxIndex - startIndex + 1) * itemSize;
    totalSize = knownSize + negativeItemsAmount * itemSize;
  }

  const _totalSize = await fixture.scroller.viewport.getScrollableSize();
  const _innerLoopCount = await fixture.workflow.innerLoopCount;
  expect(_totalSize).toEqual(totalSize);
  expect(_innerLoopCount).toEqual(innerLoopCount);
  await checkMinMaxIndexes(fixture);
};

const testStartIndexEdgeCase = async (
  fixture: VScrollFixture,
  config: ITestConfig
) => {
  await fixture.adapter.relax();

  const { maxIndex, minIndex, itemSize, startIndex, padding } =
    getParams(config);
  const bufferInfo = await fixture.adapter.bufferInfo;
  const viewportSize = await fixture.scroller.viewport.getSize();
  const totalSize = (maxIndex - minIndex + 1) * itemSize;
  const viewportSizeDelta = viewportSize * padding;
  let _startIndex = Math.max(minIndex, startIndex); // startIndex < minIndex
  _startIndex = Math.min(maxIndex, _startIndex); // startIndex > maxIndex

  // visible part of the viewport must be filled
  const viewportItemsAmount = Math.ceil(viewportSize / itemSize);
  const diff = _startIndex + viewportItemsAmount - maxIndex - 1;
  if (diff > 0) {
    _startIndex -= diff;
  }

  const negativeSize = (_startIndex - minIndex) * itemSize;
  const negativeItemsAmount = Math.ceil(viewportSizeDelta / itemSize);
  const negativeItemsSize = negativeItemsAmount * itemSize;
  const bwdPaddingSize = Math.max(0, negativeSize - negativeItemsSize);

  const positiveSize = (maxIndex - _startIndex + 1) * itemSize;
  const positiveItemsAmount = Math.ceil(
    (viewportSize + viewportSizeDelta) / itemSize
  );
  const positiveItemsSize = positiveItemsAmount * itemSize;
  const fwdPaddingSize = Math.max(0, positiveSize - positiveItemsSize);

  const _totalSize = await fixture.scroller.viewport.getScrollableSize();
  const _bwdPaddingSize =
    await fixture.scroller.viewport.paddings[Direction.backward].size;
  const _fwdPaddingSize =
    await fixture.scroller.viewport.paddings[Direction.forward].size;
  expect(_totalSize).toEqual(totalSize);
  expect(_bwdPaddingSize).toEqual(bwdPaddingSize);
  expect(_fwdPaddingSize).toEqual(fwdPaddingSize);

  expect(bufferInfo.absMinIndex).toEqual(minIndex);
  expect(bufferInfo.absMaxIndex).toEqual(maxIndex);
  await checkMinMaxIndexes(fixture);
};

const testForwardGapCase = async (fixture: VScrollFixture) => {
  await fixture.adapter.relax();

  const gapSize = await fixture.page.evaluate(() => {
    const viewportChildren =
      window.__vscroll__.workflow.scroller.routines.element.children;
    const lastChild = viewportChildren[viewportChildren.length - 2];
    const lastChildBottom = lastChild.getBoundingClientRect().bottom;
    const viewport = window.__vscroll__.workflow.scroller.viewport;
    const viewportSize = viewport.getSize();
    let gap = viewportSize - lastChildBottom;
    gap = Math.max(0, gap);
    return gap;
  });

  expect(gapSize).toEqual(0);
  expect(
    await fixture.scroller.viewport.paddings[Direction.forward].size
  ).toEqual(0);
};

const makeTest = (
  title: string,
  config: ITestConfig,
  testFunc: (fixture: VScrollFixture, config: ITestConfig) => Promise<void>
) => {
  test(title, async ({ page }) => {
    const fixture = await createFixture({ page, config });
    await testFunc(fixture, config);
    await fixture.dispose();
  });
};

test.describe('Min/max Indexes Spec', () => {
  test.describe('Common cases', () =>
    configList.forEach((config, index) =>
      makeTest(
        `should fill the viewport and the paddings (config ${index})`,
        config,
        testCommonCase
      )
    ));

  test.describe('No maxIndex cases', () =>
    noMaxIndexConfigList.forEach((config, index) =>
      makeTest(
        `should fill the viewport and backward padding (config ${index})`,
        config,
        testCommonCase
      )
    ));

  test.describe('No minIndex cases', () =>
    noMinIndexConfigList.forEach((config, index) =>
      makeTest(
        `should fill the viewport and forward padding (config ${index})`,
        config,
        testCommonCase
      )
    ));

  test.describe('No itemSize cases', () =>
    noItemSizeConfigList.forEach((config, index) =>
      makeTest(
        `should fill the viewport and the paddings (config ${index})`,
        config,
        testCommonCase
      )
    ));

  test.describe('startIndex around minIndex', () =>
    startIndexAroundMinIndexConfigList.forEach((config, index) =>
      makeTest(
        `should reset backward padding (config ${index})`,
        config,
        testStartIndexEdgeCase
      )
    ));

  test.describe('startIndex around maxIndex', () =>
    startIndexAroundMaxIndexConfigList.forEach((config, index) =>
      makeTest(
        `should reset forward padding (config ${index})`,
        config,
        testStartIndexEdgeCase
      )
    ));

  test.describe('startIndex around maxIndex and no minIndex', () =>
    forwardGapConfigList.forEach((config, index) =>
      makeTest(
        `should fill forward padding gap (config ${index})`,
        config,
        testForwardGapCase
      )
    ));
});
