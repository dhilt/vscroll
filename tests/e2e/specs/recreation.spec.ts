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

  test.describe('Recreation via ngIf (instance DS)', () => {

    test('should switch Adapter.init trice', async ({ page }) => {
      const config: ITestConfig = {
        datasourceGet,
        datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.5 },
        templateSettings: { viewportHeight: 200, itemHeight: 20 },
        manualRun: true
      };

      const fixture = await createFixture({ page, config });

      // Perform dispose and recreate cycle
      type Result = { adapterInitCount: number; wfInitOnFirstMake?: boolean; };
      const result = await page.evaluate<Result>(() => new Promise((resolve) => {
        const { datasource, makeScroller } = window.__vscroll__;

        const result: Result = { adapterInitCount: 0 };

        // Subscribe to init$ BEFORE creating workflow
        const off = datasource.adapter.init$.on(() => {
          if (++result.adapterInitCount === 3) {
            off();
            resolve(result);
          }
        });

        // Create and run initial scroller workflow
        makeScroller!();

        // To make sure the workflow is not yet initialized immediately after creation
        result.wfInitOnFirstMake = window.__vscroll__.workflow.isInitialized;

        const checkAndRecreate = () => {
          if (!datasource.adapter.isLoading && datasource.adapter.init) {
            window.__vscroll__.workflow.dispose();

            setTimeout(() => {
              // Create and run new scroller workflow
              makeScroller!();
            }, 25);
          } else {
            setTimeout(checkAndRecreate, 10);
          }
        };
        checkAndRecreate();
      }));

      // Workflow should not be initialized immediately after creation
      expect(result.wfInitOnFirstMake).toBe(false);

      // Adapter should be initialized 3 times
      expect(result.adapterInitCount).toBe(3);

      await fixture.dispose();
    });

  });
});

