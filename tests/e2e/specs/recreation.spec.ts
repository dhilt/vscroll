import { test, expect, Page } from '@playwright/test';
import { afterEachLogs } from '../fixture/after-each-logs.js';
import { createFixture } from '../fixture/create-fixture.js';
import { ITestConfig } from 'types/index.js';

test.afterEach(afterEachLogs);

const datasourceGet = (
  index: number,
  count: number,
  success: (data: unknown[]) => void
): void => {
  const data = [];
  for (let i = index; i < index + count; i++) {
    data.push({ id: i, text: `item #${i}` });
  }
  setTimeout(() => success(data), 0);
};

const baseConfig: ITestConfig = {
  datasourceGet,
  datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.5 },
  templateSettings: { viewportHeight: 200, itemHeight: 20 }
};

type RecreationBox = {
  adapterInitCount: number;
  wfInitOnFirstMake: boolean;
};
type WithRecreationResult = Window & { __recreationBox?: RecreationBox };

const onBefore = async (page: Page) =>
  page.evaluate(() => {
    const w = window as WithRecreationResult;
    const { datasource } = w.__vscroll__;

    // Subscribe to init$ BEFORE creating workflow
    const box: RecreationBox = {
      adapterInitCount: 0,
      wfInitOnFirstMake: false
    };
    w.__recreationBox = box;

    datasource.adapter.init$.on(value => {
      if (!value) {
        return;
      }
      if (++box.adapterInitCount === 1) {
        // First init - capture initial workflow state
        box.wfInitOnFirstMake = w.__vscroll__.workflow.isInitialized;
      }
    });
  });

test.describe('Recreation Spec', () => {
  test.describe('Destroying (plain DS)', () => {
    test('should not reset Datasource on destroy', async ({ page }) => {
      const fixture = await createFixture({
        page,
        config: { ...baseConfig, noAdapter: true }
      });

      const getWorkflowData = () =>
        page.evaluate(() => ({
          workflowInit: window.__vscroll__.workflow.isInitialized,
          internalAdapterInit:
            window.__vscroll__.workflow?.scroller?.adapter?.init,
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
      const fixture = await createFixture({
        page,
        config: { ...baseConfig, noRelaxOnStart: true, onBefore }
      });

      const result = await page.evaluate(async () => {
        const w = window as WithRecreationResult;
        const { datasource, makeScroller } = w.__vscroll__;
        // 3 recreation cycles: 1 from onBefore and 2 from this loop
        for (let i = 0; i < 2; i++) {
          // Recreate scroller workflow, and wait for adapter is initialized
          w.__vscroll__.workflow.dispose();
          makeScroller!();
          await new Promise(r => datasource.adapter.init$.once(r));
        }
        return w.__recreationBox;
      });

      await fixture.adapter.relax();

      // Workflow should not be initialized immediately after creation
      expect(result.wfInitOnFirstMake).toBe(false);

      // Adapter should be initialized 3 times
      expect(result.adapterInitCount).toBe(3);

      await fixture.dispose();
    });

    test('should re-render the viewport', async ({ page }) => {
      const fixture = await createFixture({ page, config: baseConfig });

      // Helper to capture state
      const getState = () =>
        page.evaluate(() => ({
          workflowInit: window.__vscroll__.workflow.isInitialized,
          scrollerId:
            window.__vscroll__.workflow.scroller.settings.instanceIndex,
          internalAdapterId: window.__vscroll__.workflow.scroller.adapter.id,
          adapterId: window.__vscroll__.datasource.adapter.id
        }));

      // Capture initial state
      const before = await getState();
      const beforeElements = await fixture.getElements();

      // Dispose and recreate
      await fixture.recreateScroller();
      await fixture.adapter.relax();

      // Capture state after recreation
      const after = await getState();
      const afterElements = await fixture.getElements();

      // Verify expectations
      expect(after.workflowInit).toBe(true);
      expect(after.scrollerId).toBe(before.scrollerId + 1); // New scroller instance
      expect(after.internalAdapterId).toBe(before.adapterId); // Scroller uses same adapter
      expect(after.adapterId).toBe(before.adapterId); // Same external adapter
      expect(afterElements.length).toBe(beforeElements.length); // Same number of elements

      await fixture.dispose();
    });

    test('should scroll and take firstVisible', async ({ page }) => {
      const fixture = await createFixture({ page, config: baseConfig });

      await fixture.recreateScroller();
      await page.waitForFunction(
        () => window.__vscroll__.datasource.adapter.init
      );
      await fixture.adapter.relax();

      const firstVisible = await fixture.adapter.firstVisible;
      expect(firstVisible.$index).toBe(1);

      await fixture.scrollTo(200);

      const firstVisibleAfter = await fixture.adapter.firstVisible;
      expect(firstVisibleAfter.$index).toBeGreaterThan(1);

      await fixture.dispose();
    });
  });
});
