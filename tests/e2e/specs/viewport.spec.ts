import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

interface CustomConfig {
  scrollTo?: number;
}

type ViewportConfig = TestBedConfig<CustomConfig> & {
  custom: CustomConfig;
  datasourceSettings: NonNullable<TestBedConfig['datasourceSettings']>;
  templateSettings: NonNullable<TestBedConfig['templateSettings']>;
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
});
