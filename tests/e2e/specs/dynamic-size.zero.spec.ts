import { test, expect } from '@playwright/test';
import { Direction } from '../fixture/VScrollFixture.js';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { ITestConfig } from 'types/index.js';
import { SizeStrategy } from '../../../src/index.js';

test.afterEach(afterEachLogs);

// // Capture console logs for comparison
// test.beforeEach(async ({ page }) => {
//   page.on('console', msg => {
//     console.log('[BROWSER]', msg.text());
//   });
// });

type WithAsyncSize = Window & { __vscrollAsyncSize?: number };

const dynamicTemplate = (item: {
  $index: number;
  data: { id: number; text: string; size?: number };
}): string => {
  const size = item.data.size ?? 0;
  return `<div class="item" style="height:${size}px">${item.$index}: ${item.data.text}</div>`;
};

const zeroSizeDatasourceGet: ITestConfig['datasourceGet'] = (
  index,
  count,
  success
) => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    if (i >= 1 && i <= 100) {
      data.push({ id: i, text: `item #${i}`, size: 0 });
    }
  }
  setTimeout(() => success(data), 0);
};

// Async resize datasource: its item size is controlled via a flag on window
const asyncResizeDatasourceGet: ITestConfig['datasourceGet'] = (
  index,
  count,
  success
) => {
  const data = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const size = ((window as any).__vscrollAsyncSize as number | undefined) ?? 0;
  for (let i = index; i < index + count; i++) {
    if (i >= 1 && i <= 100) {
      data.push({ id: i, text: `item #${i}`, size });
    }
  }
  setTimeout(() => success(data), 0);
};

const secondPackZeroSizeDatasourceGet: ITestConfig['datasourceGet'] = (
  index,
  count,
  success
) => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    if (i >= 1 && i <= 100) {
      const size = i >= 6 ? 0 : 20;
      data.push({ id: i, text: `item #${i}`, size });
    }
  }
  setTimeout(() => success(data), 0);
};

const baseSettings = {
  startIndex: 1,
  bufferSize: 5,
  minIndex: 1,
  padding: 0.5,
  sizeStrategy: SizeStrategy.Average
} as const;

const zeroSizeConfig: ITestConfig = {
  datasourceGet: zeroSizeDatasourceGet,
  datasourceSettings: { ...baseSettings },
  templateSettings: { viewportHeight: 200 },
  templateFn: dynamicTemplate
};

const secondPackConfig: ITestConfig = {
  datasourceGet: secondPackZeroSizeDatasourceGet,
  datasourceSettings: { ...baseSettings },
  templateSettings: { viewportHeight: 200 },
  templateFn: dynamicTemplate
};

const asyncResizeConfig: ITestConfig = {
  datasourceGet: asyncResizeDatasourceGet,
  datasourceSettings: {
    startIndex: 1,
    bufferSize: 5,
    padding: 0.5,
    sizeStrategy: SizeStrategy.Average
  },
  templateSettings: { viewportHeight: 200 },
  templateFn: dynamicTemplate
};

test.describe('Dynamic Zero Size Spec', () => {
  test('Items with zero size: should stop the Workflow after the first loop', async ({
    page
  }) => {
    const fixture = await createFixture({ page, config: zeroSizeConfig });

    const cyclesDone = await fixture.workflow.cyclesDone;
    const innerLoopCount = await fixture.workflow.innerLoopCount;
    expect(cyclesDone).toBe(1);
    expect(innerLoopCount).toBe(1);

    await fixture.dispose();
  });

  test('Items with zero size started from 2 pack: should stop the Workflow after the second loop', async ({
    page
  }) => {
    const fixture = await createFixture({ page, config: secondPackConfig });

    const cyclesDone = await fixture.workflow.cyclesDone;
    const innerLoopCount = await fixture.workflow.innerLoopCount;
    expect(cyclesDone).toBe(1);
    expect(innerLoopCount).toBe(2);

    await fixture.dispose();
  });

  test('Items get non-zero size asynchronously: should continue the Workflow after re-size and check', async ({
    page
  }) => {
    const fixture = await createFixture({ page, config: asyncResizeConfig });
    const viewport = fixture.scroller.viewport;

    const scrollableSizeBefore = await viewport.getScrollableSize();
    const forwardPaddingBefore =
      await viewport.paddings[Direction.forward].size;
    expect(scrollableSizeBefore).toEqual(forwardPaddingBefore);
    expect(scrollableSizeBefore).toBe(200);

    // Switch datasource to produce size=20 for all future items
    // and make currently rendered items non-zero-sized via adapter.fix updater
    await page.evaluate(() => {
      const w = window as WithAsyncSize;
      w.__vscrollAsyncSize = 20;
      const adapter = w.__vscroll__.datasource.adapter;
      return adapter.fix({
        updater: ({ element, data }) => {
          (data as { size?: number }).size = 20;
          const el = element as HTMLElement;
          const child = (el.firstElementChild as HTMLElement) || el;
          child.style.height = '20px';
        }
      });
    });

    await fixture.adapter.check();

    const cyclesDone = await fixture.workflow.cyclesDone;
    const scrollableSizeAfter = await viewport.getScrollableSize();
    const forwardPaddingAfter = await viewport.paddings[Direction.forward].size;

    expect(cyclesDone).toBe(2);
    expect(forwardPaddingAfter).toBe(0);
    expect(scrollableSizeAfter).toBeGreaterThan(0);
    expect(scrollableSizeAfter).toBe(300);

    await fixture.dispose();
  });
});
