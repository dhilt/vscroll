import {
  getDatasource,
  makeTest,
  Misc,
  MutableDatasource,
  TestConfig
} from '../scaffolding';

interface CustomConfig {
  scrollTo?: number;
}

type ViewportConfig = TestConfig<CustomConfig> & {
  custom: CustomConfig;
  datasourceSettings: NonNullable<TestConfig['datasourceSettings']>;
  templateSettings: NonNullable<TestConfig['templateSettings']>;
};

const baseConfig: ViewportConfig = {
  datasource: () => getDatasource({ min: 1, max: 100, delay: 1 }),
  datasourceSettings: { startIndex: 1, windowViewport: true },
  templateSettings: { itemHeight: 50, noViewportClass: true, headerHeight: 50 },
  custom: {}
};

const tallHeaderConfig: ViewportConfig = {
  ...baseConfig,
  templateSettings: { ...baseConfig.templateSettings, headerHeight: 500 }
};

const configs: ViewportConfig[] = [
  baseConfig,
  tallHeaderConfig,
  { ...baseConfig, custom: { scrollTo: 99999 } },
  { ...tallHeaderConfig, custom: { scrollTo: 99999 } },
  { ...tallHeaderConfig, custom: { scrollTo: 450 } },
  { ...tallHeaderConfig, custom: { scrollTo: 50 } },
  { ...tallHeaderConfig, custom: { scrollTo: 500 } }
];

const testWindowViewport =
  (config: ViewportConfig) => (misc: Misc) => async () => {
    await misc.relaxNext();

    const itemHeight = config.templateSettings.itemHeight as number;
    const headerHeight = config.templateSettings.headerHeight as number;
    let position = 0;
    let index = 1;

    if (config.custom.scrollTo !== undefined) {
      await misc.scrollToRelax(config.custom.scrollTo);
      position = misc.getScrollPosition();
      index = Math.max(1, Math.ceil((position - headerHeight) / itemHeight));
    }

    expect(misc.getScrollPosition()).toEqual(position);
    expect(misc.adapter.firstVisible.$index).toEqual(index);
  };

const offsetConfigs: TestConfig[] = [false, true].map(horizontal => ({
  datasource: () => new MutableDatasource(1, 100),
  datasourceSettings: {
    startIndex: 1,
    minIndex: 1,
    maxIndex: 100,
    itemSize: 20,
    horizontal
  },
  templateSettings: {
    viewportHeight: 120,
    viewportWidth: 120,
    itemHeight: 20,
    itemWidth: 20,
    horizontal
  }
}));

const externalOffsetConfigs: TestConfig[] = offsetConfigs.map(config => ({
  ...config,
  datasourceSettings: {
    ...config.datasourceSettings,
    viewportElement: () =>
      document.querySelector<HTMLElement>('[data-test-viewport]')
  }
}));

const prepareOffsetLayout = (misc: Misc, external: boolean): void => {
  const { root, viewportElement, contentElement, horizontal } = misc;
  root.style[horizontal ? 'paddingLeft' : 'paddingTop'] = '100px';
  const header = document.createElement('div');
  header.style[horizontal ? 'width' : 'height'] = '40px';
  if (horizontal) {
    header.style.display = 'inline-block';
  }
  viewportElement.prepend(header);

  if (external) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    if (horizontal) {
      wrapper.style.display = 'inline-block';
    }
    viewportElement.append(wrapper);
    wrapper.append(contentElement);
  } else {
    viewportElement.style.position = 'relative';
    viewportElement.style.border = '3px solid transparent';
  }
};

const testOffset = (external: boolean) => (misc: Misc) => async () => {
  misc.trackVisibleItems();
  await misc.relaxNext();

  const offset = external ? 40 : 43;
  misc.expect.startVisible(1);
  expect(misc.getScrollPosition()).toBe(0);
  expect(misc.scroller.viewport.offset).toBe(offset);
  expect(misc.adapter.itemsCount).toBeLessThan(100);
  expect(misc.source<MutableDatasource>().requests).toHaveLength(1);

  await misc.scrollToRelax(offset + 200);
  misc.expect.startVisible(11);
  expect(misc.scroller.routines.getOffset()).toBe(offset);

  await misc.adapter.reload(51);
  misc.expect.startVisible(51);
  expect(misc.scroller.viewport.offset).toBe(offset);

  await misc.scrollMinRelax();
  misc.expect.startVisible(1);
};

describe('Viewport Spec', () => {
  describe('Entire Window with Header', () => {
    configs.forEach(config =>
      makeTest({
        config,
        title: `should${
          config.custom.scrollTo === undefined
            ? ' not scroll'
            : ` scroll to ${config.custom.scrollTo}`
        } with ${config.templateSettings.headerHeight}-offset`,
        it: testWindowViewport(config)
      })
    );
  });

  describe('Positioned layouts', () => {
    [false, true].forEach(external =>
      (external ? externalOffsetConfigs : offsetConfigs).forEach(config =>
        makeTest({
          config,
          meta: external ? 'external viewport' : 'parent viewport',
          title:
            'should preserve the starting index across scrolling and reload',
          before: misc => prepareOffsetLayout(misc, external),
          it: testOffset(external)
        })
      )
    );
  });

  makeTest({
    config: {
      ...offsetConfigs[0],
      datasourceSettings: {
        ...offsetConfigs[0].datasourceSettings,
        windowViewport: true,
        startIndex: 21
      }
    },
    title: 'should preserve the starting index in a positioned window wrapper',
    before: misc => prepareOffsetLayout(misc, true),
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();

      misc.expect.startVisible(21);
      expect(misc.scroller.viewport.offset).toBe(140);

      await misc.scrollToRelax(600);
      expect(misc.scroller.routines.getOffset()).toBe(140);

      await misc.adapter.reload(21);
      expect(misc.scroller.viewport.offset).toBe(140);
      misc.expect.startVisible(21);
    }
  });
});
