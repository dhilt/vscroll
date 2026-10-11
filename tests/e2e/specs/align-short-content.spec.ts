import {
  getDatasource,
  makeItems,
  makeTest,
  Misc,
  MutableDatasource,
  TestConfig
} from '../scaffolding';

const maxIndex = 1000;
const middleIndex = 501;
const itemSize = 20;
const axes = [false, true];

const createConfig = (
  horizontal: boolean,
  settings: TestConfig['datasourceSettings'] = {},
  max = maxIndex
): TestConfig => ({
  datasource: () => new MutableDatasource(1, max),
  datasourceSettings: {
    startIndex: 1,
    minIndex: 1,
    maxIndex: max,
    itemSize,
    bufferSize: 5,
    padding: 0.5,
    alignShortContentToEnd: true,
    horizontal,
    ...settings
  },
  templateSettings: {
    viewportHeight: 120,
    viewportWidth: 120,
    itemHeight: itemSize,
    itemWidth: itemSize,
    horizontal
  }
});

const initialConfigs = axes.flatMap(horizontal =>
  [undefined, itemSize].map(size =>
    createConfig(horizontal, { itemSize: size })
  )
);
const partialConfigs = axes.map(horizontal =>
  createConfig(horizontal, { startIndex: middleIndex, minIndex: undefined })
);
const shortConfigs = axes.map(horizontal => createConfig(horizontal, {}, 3));

const oversizedConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 10 }),
  datasourceSettings: {
    startIndex: -1,
    bufferSize: 7,
    itemSize,
    alignShortContentToEnd: true
  },
  templateSettings: { viewportHeight: 300, dynamicSize: 'size' }
};

const registerInitialization = (
  config: TestConfig,
  title: string,
  startIndex = 1
): void =>
  makeTest({
    config,
    title,
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();

      const source = misc.source<MutableDatasource>();
      expect(source.requests[0].index).toBe(startIndex);
      source.requests.forEach(({ count }) =>
        expect(count).toBeLessThan(maxIndex - startIndex + 1)
      );
      expect(misc.adapter.itemsCount).toBeLessThan(maxIndex);
      misc.expect.startVisible(startIndex);
      misc.expect.viewportFilled();
    }
  });

const expectShortContent = (misc: Misc): void => {
  misc.expect.bufferRange([1, 3]);
  misc.expect.domMatchesBuffer();
  misc.expect.noForwardGap();
  expect(misc.getScrollableSize()).toBe(misc.getViewportSize());
  expect(misc.padding.backward.getSize()).toBeGreaterThan(0);
};

const registerShortContent = (config: TestConfig): void =>
  makeTest({
    config,
    title:
      'should align short content and readjust as items are added and removed',
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      expectShortContent(misc);

      const source = misc.source<MutableDatasource>();
      const items = makeItems(4, 9);
      source.insert(items, 3, false);
      await misc.adapter.append({ items, eof: true });

      expect(misc.padding.backward.getSize()).toBe(0);
      misc.expect.startVisible(1);
      misc.expect.viewportFilled();

      const indexes = items.map(({ id }) => id);
      source.remove(indexes);
      await misc.adapter.remove({ indexes });
      expectShortContent(misc);
    }
  });

describe('Short Content Alignment Spec', () => {
  describe('Initialization', () =>
    initialConfigs.forEach(config =>
      registerInitialization(
        config,
        `should preserve the starting position ${
          config.datasourceSettings?.itemSize ? 'with' : 'without'
        } an initial size estimate`
      )
    ));

  describe('Partial bounds', () =>
    partialConfigs.forEach(config =>
      registerInitialization(
        config,
        'should preserve the starting position with only an upper bound',
        middleIndex
      )
    ));

  describe('Short content', () => shortConfigs.forEach(registerShortContent));

  makeTest({
    config: createConfig(
      false,
      { alignShortContentToEnd: undefined, inverse: true },
      3
    ),
    title: 'should align short content with the legacy inverse setting',
    it: misc => async () => {
      await misc.relaxNext();
      expectShortContent(misc);
    }
  });

  makeTest({
    config: oversizedConfig,
    title: 'should not extend forward padding for an oversized item',
    before: misc =>
      misc.setItemProcessor(({ $index, data }) => {
        data.size = $index === 4 ? 120 : 20;
      }),
    it: misc => async () => {
      await misc.relaxNext();

      expect(misc.padding.backward.getSize()).toBe(0);
      expect(misc.padding.forward.getSize()).toBe(0);
      misc.expect.domIndexesMatchBuffer();
    }
  });
});
