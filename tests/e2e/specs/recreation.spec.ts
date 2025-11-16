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
        noAdapter: true // plain DS
      };

      const fixture = await createFixture({ page, config });

      const getWorkflowData = () =>
        page.evaluate(() => ({
          workflowInit: window.__vscroll__.workflow.isInitialized,
          internalAdapterInit: window.__vscroll__.workflow?.scroller?.adapter?.init,
          disposed: window.__vscroll__.workflow.disposed
        }));

      // Store workflow data before cleanup
      const before = await getWorkflowData();

      // Destroy the scroller
      await fixture.dispose();

      // Wait a bit to ensure no async errors
      await page.waitForTimeout(25);

      // Store workflow data after cleanup
      const after = await getWorkflowData();

      expect(before.workflowInit).toBe(true);
      expect(after.workflowInit).toBe(false);
      expect(before.internalAdapterInit).toBe(true);
      expect(after.internalAdapterInit).toBe(undefined);
      expect(before.disposed).toBe(false);
      expect(after.disposed).toBe(true);
    });

    // Note: Test 1.2 ('should not reset Datasource on destroy via ngIf') is deferred.
    // It requires viewport removal detection feature (Routines.onViewportRemoved with MutationObserver)
    // to automatically call workflow.dispose() when viewport element is removed from DOM.
  });

});

