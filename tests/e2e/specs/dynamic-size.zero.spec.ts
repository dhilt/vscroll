import { test, expect } from '@playwright/test';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { SizeStrategy } from '../../../src/index.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

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
});
