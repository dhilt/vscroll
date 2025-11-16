import { test, expect } from '@playwright/test';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { VScrollFixture } from '../fixture/VScrollFixture.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

interface ICustom {
  scrollTo?: number;
}

type IConfig = ITestConfig<ICustom>;

// Datasource: limited callback (1-100)
const datasourceGet = (index: number, count: number, success: (data: unknown[]) => void): void => {
  const data = [];
  const start = Math.max(1, index);
  const end = index + count - 1;
  if (start > 100 || end < 1) {
    success(data);
    return;
  }
  const first = Math.max(1, start);
  const last = Math.min(100, end);
  for (let i = first; i <= last; i++) {
    data.push({ id: i, text: `item #${i}` });
  }
  success(data);
};

// Base config: windowViewport with 50px header
const windowWith50HeaderConfig: IConfig = {
  datasourceGet,
  datasourceSettings: { startIndex: 1, windowViewport: true, adapter: true },
  templateSettings: { itemHeight: 50, noViewportClass: true, viewportHeight: 0, headerHeight: 50 },
  custom: { scrollTo: undefined }
};

// Config with 500px header
const windowWith500HeaderConfig: IConfig = {
  ...windowWith50HeaderConfig,
  templateSettings: {
    ...windowWith50HeaderConfig.templateSettings,
    headerHeight: 500
  }
};

// All test configurations
const windowWithHeaderConfigList: IConfig[] = [
  windowWith50HeaderConfig,
  windowWith500HeaderConfig,
  { ...windowWith50HeaderConfig, custom: { scrollTo: 99999 } },
  { ...windowWith500HeaderConfig, custom: { scrollTo: 99999 } },
  { ...windowWith500HeaderConfig, custom: { scrollTo: 450 } },
  { ...windowWith500HeaderConfig, custom: { scrollTo: 50 } },
  { ...windowWith500HeaderConfig, custom: { scrollTo: 500 } }
];

// Test implementation
const shouldWorkOnWindowWithHeader = async (
  fixture: VScrollFixture,
  config: IConfig
) => {
  const itemHeight = config.templateSettings.itemHeight || 50;
  const headerHeight = config.templateSettings.headerHeight || 0;
  let position = 0;
  let index = 1;

  // Wait for initial load
  await fixture.adapter.relax();

  if (config.custom?.scrollTo !== undefined) {
    // Scroll (synchronous in browser)
    await fixture.adapter.fix({ scrollPosition: config.custom.scrollTo });
    // Read position immediately after scroll (before workflow processes it)
    position = await fixture.scroller.viewport.scrollPosition;
    index = Math.max(1, Math.ceil((position - headerHeight) / itemHeight));
    // Now wait for workflow to process the scroll
    await fixture.adapter.relax();
  }

  const actualPosition = await fixture.scroller.viewport.scrollPosition;
  const firstVisible = await fixture.adapter.firstVisible;

  expect(actualPosition).toBe(position);
  expect(firstVisible.$index).toBe(index);
};

test.describe('Viewport Spec', () => {
  test.describe('Entire Window with Header', () => {
    windowWithHeaderConfigList.forEach((config, idx) => {
      const scrollToText = config.custom?.scrollTo !== undefined
        ? ` scroll to ${config.custom.scrollTo}`
        : ' not scroll';
      const headerText = `${config.templateSettings.headerHeight}-offset`;

      test(`should${scrollToText} with ${headerText}`, async ({ page }) => {
        const fixture = await createFixture({ page, config });
        await shouldWorkOnWindowWithHeader(fixture, config);
        await fixture.dispose();
      });
    });
  });
});
