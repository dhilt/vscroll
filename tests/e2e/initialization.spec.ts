import { test, expect } from '@playwright/test';
import { makeTest } from './misc/runner';

const URL = '127.0.0.1:3000';

// test.use({ headless: false });

makeTest({
  title: 'DOM + Workflow',
  config: { datasourceDevSettings: { initDelay: 100 } },
  it: async ({ page }) => {
    await expect(page.locator('[data-padding-forward]')).toBeAttached();
    await expect(page.locator('[data-padding-backward]')).toBeAttached();
    await expect(page.locator('[data-padding-forward]')).toHaveCount(1);
    await expect(page.locator('[data-padding-backward]')).toHaveCount(1);

    const firstItemElt = page.locator('[data-sid="1"]');
    await expect(firstItemElt).toBeVisible();
    await expect(firstItemElt).toContainText('1) item #1');

    const { datasource, workflow } = await page.evaluate(async () => {
      const vscroll = window['__vscroll__'];
      await vscroll.datasource.adapter.relax();
      return vscroll;
    });

    expect(Object.hasOwn(datasource, 'get')).toBe(true);
    expect(typeof workflow).toBe('object');
    expect(workflow.isInitialized).toBe(true);
    expect(workflow.errors.length).toEqual(0);
    expect(workflow.cyclesDone).toEqual(1);
    const name = workflow?.scroller?.state?.packageInfo?.core?.name;
    expect(name).toBe('vscroll');
  }
});

makeTest({
  title: 'Workflow & Adapter. Delayed initialization',
  config: { datasourceDevSettings: { initDelay: 100 } },
  it: async ({ page }) => {
    await page.waitForFunction(() => {
      const { workflow, datasource } = window['__vscroll__'];
      return !workflow.isInitialized && !datasource.adapter.init;
    });

    await page.waitForTimeout(100);

    await page.waitForFunction(() => {
      const { workflow, datasource } = window['__vscroll__'];
      return workflow.isInitialized && datasource.adapter.init;
    });
  }
});

makeTest({
  title: 'Workflow & Adapter. Disposing after delayed initialization',
  config: { datasourceDevSettings: { initDelay: 100 } },
  it: async ({ page }) => {
    await page.waitForTimeout(100);
    await page.evaluate(() => window['__vscroll__'].workflow.dispose());

    await page.waitForFunction(() => {
      const { workflow, datasource } = window['__vscroll__'];
      return !workflow.isInitialized && !datasource.adapter.init;
    });
  }
});

makeTest({
  title: 'Workflow & Adapter. Disposing before delayed initialization',
  config: { datasourceDevSettings: { initDelay: 100 } },
  it: async ({ page }) => {
    await page.evaluate(() => window['__vscroll__'].workflow.dispose());
    await page.waitForTimeout(100);

    await page.waitForFunction(() => {
      const { workflow, datasource } = window['__vscroll__'];
      return !workflow.isInitialized && !datasource.adapter.init;
    });
  }
});

makeTest({
  title: 'Workflow & Adapter. Disposing after immediate initialization',
  config: { datasourceDevSettings: { initDelay: 100 } },
  it: async ({ page }) => {
    await page.waitForFunction(() => {
      const { workflow, datasource } = window['__vscroll__'];
      return workflow.isInitialized && datasource.adapter.init;
    });

    await page.evaluate(() => window['__vscroll__'].workflow.dispose());

    await page.waitForFunction(() => {
      const { workflow, datasource } = window['__vscroll__'];
      return !workflow.isInitialized && !datasource.adapter.init;
    });
  }
});

test('Multiple instances initialization', async ({ page }) => {
  await page.goto(URL + '/multiple');

  // DOM
  await expect(page.locator('[data-padding-forward]')).toHaveCount(2);
  await expect(page.locator('[data-padding-backward]')).toHaveCount(2);
  const firstItemElements = page.locator('[data-sid="1"]');
  await expect(firstItemElements).toHaveCount(2);
  await expect(firstItemElements.first()).toBeVisible();
  await expect(firstItemElements.first()).toContainText('1) item #1');
  await expect(firstItemElements.nth(1)).toBeVisible();
  await expect(firstItemElements.nth(1)).toContainText('1) item #1 *');

  // Workflows
  const [wf1, wf2] = await page.evaluate(() => {
    const { scroller1, scroller2 } = window['__vscroll__'];
    return [scroller1.workflow, scroller2.workflow];
  });
  expect(wf1.isInitialized).toBe(true);
  expect(wf1.errors.length).toEqual(0);
  expect(wf1.cyclesDone).toEqual(1);
  expect(wf2.isInitialized).toBe(true);
  expect(wf2.errors.length).toEqual(0);
  expect(wf2.cyclesDone).toEqual(1);
  expect(wf1.scroller.settings.instanceIndex).toEqual(1);
  expect(wf2.scroller.settings.instanceIndex).toEqual(2);

  // Adapters
  await page.waitForFunction(() => {
    const { scroller1, scroller2 } = window['__vscroll__'];
    const { datasource: datasource1 } = scroller1;
    const { datasource: datasource2 } = scroller2;
    const a1Ok = datasource1.adapter.init && datasource1.adapter.id === 1;
    const a2Ok = datasource2.adapter.init && datasource2.adapter.id === 2;
    return a1Ok && a2Ok;
  });
});

test('Multiple instances subscriptions', async ({ page }) => {
  await page.goto(URL + '/multiple');

  // subscriptions should not interfere
  const [c1, c2] = await page.evaluate<number[]>(() => new Promise(resolve => {
    const { scroller1, scroller2 } = window['__vscroll__'];
    const { datasource: datasource1 } = scroller1;
    const { datasource: datasource2 } = scroller2;
    let c1 = 0, c2 = 0, count = 0;
    datasource1.adapter.isLoading$.on(v => c1 += v ? 0 : 1);
    datasource2.adapter.isLoading$.on(v => c2 += v ? 0 : 1);
    const done = () => {
      if (++count === 2) {
        resolve([c1, c2]);
      }
    };
    const fin1 = scroller1.workflow.finalize;
    scroller1.workflow.finalize = () => {
      fin1.call(scroller1.workflow);
      done();
    };
    const fin2 = scroller2.workflow.finalize;
    scroller2.workflow.finalize = () => {
      fin2.call(scroller2.workflow);
      done();
    };
  }));

  expect(c1).toEqual(1);
  expect(c2).toEqual(1);
});
