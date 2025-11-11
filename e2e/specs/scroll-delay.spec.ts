import { test, expect } from '@playwright/test';
import { VScrollFixture } from '../fixture/VScrollFixture.js';
import { ITestConfig, Page, IDatasource } from 'types/index.js';

/**
 * Create fixture with datasource delay
 */
const createFixture = async (page: Page, config: ITestConfig): Promise<VScrollFixture> => {
  const { datasourceSettings, datasourceDevSettings, templateSettings } = config;

  // Note: closure variables not available in browser context
  const datasource: IDatasource = {
    get: (index, count, success) => {
      const data = [];
      for (let i = index; i < index + count; i++) {
        data.push({ id: i, text: `item #${i}` });
      }
      setTimeout(() => success(data), 150); // 150ms delay for slow fetch test
    },
    settings: datasourceSettings,
    devSettings: datasourceDevSettings
  };

  const fixture = await VScrollFixture.create(page, {
    datasource,
    useAdapter: true,
    templateSettings,
    templateFn: (item: { $index: number, data: { id: number, text: string } }) =>
      `<div class="item">${item.$index}: ${item.data.text}</div>`
  });

  // Wait for initial workflow cycle to complete
  await fixture.relaxNext();

  return fixture;
};

/**
 * Test: Throttled scroll event handling
 * 
 * Rapidly triggers multiple scroll operations and verifies that the workflow
 * throttles them into fewer cycles than the number of scroll events.
 */
test.describe('Delay Scroll Spec', () => {
  test('should work with throttled scroll event handling', async ({ page }) => {
    const config: ITestConfig = {
      datasourceSettings: {
        startIndex: 1,
        bufferSize: 5,
        padding: 0.5,
        itemSize: 20,
        adapter: true
      },
      datasourceDevSettings: {
        throttle: 500
      },
      templateSettings: {
        viewportHeight: 200,
        itemHeight: 20
      }
    };

    const fixture = await createFixture(page, config);
    const initCyclesCount = await fixture.workflow.cyclesDone;
    expect(initCyclesCount).toBe(1);

    // Start rapid scrolling and monitor cycles in browser context
    const count = await page.evaluate(() =>
      new Promise<number>(resolve => {
        const COUNT = 10;
        let scrollCount = 0;
        let timer: ReturnType<typeof setInterval>;
        const workflow = window.__vscroll__.workflow;
        const adapter = window.__vscroll__.datasource.adapter;

        // Subscribe to cyclesDone$ - resolve when cycle 3 completes
        workflow.cyclesDone$.on(cycles => {
          if (cycles === 3) {
            resolve(scrollCount);
          }
        });

        // Start the scrolling timer after cycle 1 completes (already completed)
        timer = setInterval(() => {
          scrollCount++;
          if (scrollCount % 2 === 0) {
            adapter.fix({ scrollPosition: 0 }); // scrollMin
          } else {
            adapter.fix({ scrollPosition: Infinity }); // scrollMax
          }
          if (scrollCount === COUNT) {
            clearInterval(timer);
          }
        }, 10);
      })
    );

    // Verify all scrolls were executed
    expect(count).toBe(10);

    await fixture.cleanup();
  });

  test('should handle additional scrolling during slow fetch', async ({ page }) => {
    const config: ITestConfig = {
      datasourceSettings: {
        startIndex: 1,
        bufferSize: 5,
        padding: 0.5,
        itemSize: 20,
        adapter: true
      },
      templateSettings: {
        viewportHeight: 200,
        itemHeight: 20
      }
    };

    const fixture = await createFixture(page, config);
    const initCyclesCount = await fixture.workflow.cyclesDone;
    expect(initCyclesCount).toBe(1);

    const startPosition = await fixture.scroller.viewport.scrollPosition;

    // Start rapid scrolling and monitor cycles in browser context
    const result = await page.evaluate(({ start }) =>
      new Promise<{ endPos: number, position: number }>((resolve) => {
        const COUNT = 10;
        let scrollCount = 0;
        let endPos: number;
        let timer: ReturnType<typeof setInterval>;
        const workflow = window.__vscroll__.workflow;
        const adapter = window.__vscroll__.datasource.adapter;

        // Subscribe to cyclesDone$ - stop timer when the nearest cycle completes (cycle 2)
        workflow.cyclesDone$.on(count => {
          if (count === 2) {
            clearInterval(timer);
            const position = workflow.scroller.viewport.scrollPosition;
            resolve({ endPos, position });
          }
        });

        // Start the scrolling timer
        timer = setInterval(
          () =>
            requestAnimationFrame(() => {
              scrollCount++;
              endPos = start + scrollCount * 5;

              // Trigger scroll via adapter.fix
              adapter.fix({ scrollPosition: endPos });

              // Stop timer if all scrolls done
              if (scrollCount === COUNT) {
                clearInterval(timer);
              }
            }),
          25
        );
      })
      , { start: startPosition });


    // Verify final position
    expect(result.position).toBe(result.endPos);
    expect(result.endPos).toBeGreaterThan(startPosition);

    await fixture.cleanup();
  });
});

