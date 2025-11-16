import { test, expect } from '@playwright/test';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

const datasourceGet = (index: number, count: number, success: (data: unknown[]) => void): void => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    data.push({ id: i, text: `item #${i}` });
  }
  success(data);
};

test.describe('Recreation Spec', () => {
  test.describe('Destroying (plain DS)', () => {

    test('should not reset Datasource on destroy', async ({ page }) => {
      const config: ITestConfig = {
        datasourceGet,
        datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.5 },
        templateSettings: { viewportHeight: 200, itemHeight: 20 },
        noRelaxOnStart: true
      };

      const fixture = await createFixture({ page, config });

      // Store datasource-adapter id before cleanup
      const before = await page.evaluate(() => ({
        id: window.__vscroll__.datasource.adapter.id,
        init: window.__vscroll__.datasource.adapter.init,
        disposed: window.__vscroll__.workflow.disposed
      }));

      // Destroy the scroller
      await fixture.dispose();

      // Wait a bit to ensure no async errors
      await page.waitForTimeout(25);

      // Verify datasource still exists with its adapter (wasn't reset/destroyed)
      const after = await page.evaluate(() => ({
        id: window.__vscroll__.datasource.adapter.id,
        init: window.__vscroll__.datasource.adapter.init,
        disposed: window.__vscroll__.workflow.disposed
      }));

      expect(before.id).toBe(after.id);
      expect(before.init).toBe(!after.init);
      expect(before.disposed).toBe(!after.disposed);
    });

  });
});

