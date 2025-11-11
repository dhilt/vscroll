import { Page } from '@playwright/test';
import * as path from 'path';
import type { IDatasource, Item } from '../../src/index';
import { Scroller, Direction, type DirectionType } from './Scroller.js';
import { Adapter } from './Adapter.js';

export { Direction, type DirectionType };
export interface VScrollFixtureConfig {
  datasource: IDatasource;
  useAdapter?: boolean; // If true, creates Datasource instance with adapter support
  templateSettings?: {
    viewportHeight?: number;
    viewportWidth?: number;
    itemHeight?: number;
    itemWidth?: number;
    horizontal?: boolean;
  };
  templateFn?: (item: unknown) => string;
}

export class VScrollFixture {
  private page: Page;
  private config: VScrollFixtureConfig;
  readonly scroller: Scroller;
  readonly adapter: Adapter;

  constructor(page: Page, config: VScrollFixtureConfig) {
    this.page = page;
    this.config = config;
    this.scroller = new Scroller(page);
    this.adapter = new Adapter(page);
  }

  static async create(page: Page, config: VScrollFixtureConfig): Promise<VScrollFixture> {
    const fixture = new VScrollFixture(page, config);
    await fixture.mount();
    return fixture;
  }

  /**
   * Mount vscroll in browser (POC pattern)
   */
  async mount(): Promise<void> {
    const page = this.page;

    // 1. Go to blank page
    await page.goto('about:blank');

    // 2. Load vscroll UMD bundle
    const vscrollPath = path.join(process.cwd(), 'dist', 'bundles', 'vscroll.umd.js');
    await page.addScriptTag({ path: vscrollPath });

    // 3. Add global styles FIRST (separate evaluate call to ensure styles are processed)
    const templateSettings = this.config.templateSettings || {};
    if (templateSettings.horizontal || templateSettings.itemHeight) {
      await page.addStyleTag({
        content: templateSettings.horizontal
          ? `
            #viewport {
              white-space: nowrap;
            }
            #viewport div {
              display: inline-block;
            }
            #vscroll [data-sid] {
              width: ${templateSettings.itemWidth || 100}px;
              overflow-x: hidden;
            }
          `
          : `
            #vscroll [data-sid] {
              height: ${templateSettings.itemHeight}px;
              overflow-y: hidden;
            }
          `
      });
    }

    // 4. Create viewport and vscroll element (after styles are loaded)
    await page.evaluate((settings) => {
      const viewport = document.createElement('div');
      viewport.id = 'viewport';

      if (settings.horizontal) {
        viewport.style.width = `${settings.viewportWidth || 300}px`;
        viewport.style.height = '100%';
        viewport.style.overflowX = 'scroll';  // Always scroll, not auto
        viewport.style.overflowY = 'hidden';
      } else {
        viewport.style.height = `${settings.viewportHeight || 200}px`;
        viewport.style.width = '100%';
        viewport.style.overflowY = 'scroll';  // Always scroll, not auto
        viewport.style.overflowX = 'hidden';
      }

      document.body.appendChild(viewport);

      // Create vscroll element with padding elements
      const vscrollEl = document.createElement('div');
      vscrollEl.id = 'vscroll';

      const backwardPadding = document.createElement('div');
      backwardPadding.setAttribute('data-padding-backward', '');
      vscrollEl.appendChild(backwardPadding);

      const forwardPadding = document.createElement('div');
      forwardPadding.setAttribute('data-padding-forward', '');
      vscrollEl.appendChild(forwardPadding);

      viewport.appendChild(vscrollEl);
    }, templateSettings);

    // 5. Initialize vscroll workflow
    await this.initializeWorkflow();
  }

  /**
   * Initialize vscroll workflow in browser
   * Supports two patterns:
   * 1. Plain object datasource (simple tests)
   * 2. Datasource class with adapter (adapter tests)
   */
  private async initializeWorkflow(): Promise<void> {
    const { datasource, templateFn, useAdapter } = this.config;

    // Serialize functions and config
    const datasourceGetStr = datasource.get.toString();
    const datasourceSettings = datasource.settings || {};
    // Add default devSettings for all e2e tests:
    // debug enabled, colors disabled, immediateLog disabled (to store logs in logger for retrieval on test failure)
    const datasourceDevSettings = {
      debug: true,
      immediateLog: false,
      logColor: false,
      ...(datasource.devSettings || {})
    };
    const templateFnStr = templateFn
      ? templateFn.toString()
      : '(item) => `<div class="item">${item.$index}: ${item.data.text || ""}</div>`';

    await this.page.evaluate(
      ({
        datasourceGetStr,
        datasourceSettings,
        datasourceDevSettings,
        templateFnStr,
        useAdapter
      }) => {
        const VScroll = window.VScroll;

        // Parse configs
        const datasourceGet = eval(`(${datasourceGetStr})`);
        const templateFn = eval(`(${templateFnStr})`);

        // Old items storage
        let oldItems: Item<unknown>[] = [];

        // Renderer (from POC)
        const processItems = (newItems: Item<unknown>[], oldItems: Item<unknown>[]) => {
          // Remove elements not present
          oldItems
            .filter(item => !newItems.includes(item))
            .forEach(item => item.element.remove());

          // Create and insert new elements
          const elements = [];
          const vscrollEl = document.getElementById('vscroll')!;
          let beforeElement = vscrollEl.querySelector('[data-padding-forward]');

          for (let i = newItems.length - 1; i >= 0; i--) {
            if (oldItems.includes(newItems[i])) {
              if (!elements.length) {
                beforeElement = newItems[i].element;
                continue;
              } else {
                break;
              }
            }

            // Create element
            const item = newItems[i];
            const element = document.createElement('div');
            element.setAttribute('data-sid', String(item.$index));

            if (item.invisible) {
              element.style.position = 'fixed';
              element.style.top = '-99px';
            }

            element.innerHTML = templateFn(item);

            item.element = element;
            elements.unshift(element);
          }

          elements.forEach(elt =>
            beforeElement!.insertAdjacentElement('beforebegin', elt)
          );
        };

        // Create datasource (plain object or Datasource class)
        let datasourceInstance;

        if (useAdapter) {
          // Pattern 2: Create Datasource class with adapter support
          const Datasource = VScroll.makeDatasource();
          datasourceInstance = new Datasource({
            get: datasourceGet,
            settings: datasourceSettings,
            devSettings: datasourceDevSettings
          });
        } else {
          // Pattern 1: Plain object (no adapter)
          datasourceInstance = {
            get: datasourceGet,
            settings: datasourceSettings,
            devSettings: datasourceDevSettings
          };
        }

        // Create workflow
        const workflow = new VScroll.Workflow({
          consumer: { name: 'vscroll-e2e', version: '1.0.0' },
          element: document.getElementById('vscroll'),
          datasource: datasourceInstance,
          run: (newItems: unknown[]) => {
            const items = newItems as Item<unknown>[];
            if (!items.length && !oldItems.length) {
              return;
            }
            processItems(items, oldItems);
            oldItems = items;
          }
        });

        // Expose for testing
        window.__vscroll__ = {
          workflow,
          datasource: datasourceInstance,
          oldItems,
          Direction: { forward: 'forward', backward: 'backward' }
        };
      },
      {
        datasourceGetStr,
        datasourceSettings,
        datasourceDevSettings,
        templateFnStr,
        useAdapter: !!useAdapter
      }
    );
  }

  /**
   * Access to workflow in browser
   */
  get workflow() {
    const page = this.page;
    return {
      // Proxy methods to browser
      get cyclesDone(): Promise<number> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.cyclesDone;
        });
      }
    };
  }



  /**
   * Scroll to a specific position. Waits for the scroller to relax if the scroll position changed.
   * @param position - The position to scroll to
   * @param options.noRelax - If true, the adapter will not be relaxed even if the scroll position changed
   */
  async scrollTo(position: number, options: { noRelax?: boolean } = {}): Promise<void> {
    const positionBefore = await this.scroller.viewport.scrollPosition;
    await this.adapter.fix({ scrollPosition: position });
    const positionAfter = await this.scroller.viewport.scrollPosition;
    if (!options?.noRelax && positionBefore !== positionAfter) {
      await this.relaxNext();
    }
  }

  /**
   * Scroll to max position
   */
  async scrollMax(options?: { noRelax?: boolean }): Promise<void> {
    return this.scrollTo(Infinity, options);
  }

  /**
   * Scroll to min position
   */
  async scrollMin(options?: { noRelax?: boolean }): Promise<void> {
    return this.scrollTo(0, options);
  }

  /**
   * Get all rendered elements
   */
  async getElements(): Promise<unknown[]> {
    return await this.page.$$('[data-sid]');
  }

  /**
   * Get element index
   */
  async getElementIndex(element: HTMLElement): Promise<number> {
    return await this.page.evaluate((el) => {
      return parseInt(el.getAttribute('data-sid') || '0', 10);
    }, element);
  }

  /**
   * Check element content by index
   */
  async checkElementContentByIndex(index: number): Promise<boolean> {
    return await this.page.evaluate((idx) => {
      const elements = Array.from(document.querySelectorAll('[data-sid]'));
      const element = elements.find(el => el.getAttribute('data-sid') === String(idx));
      return element ? element.textContent?.includes(String(idx)) || false : false;
    }, index);
  }

  /**
   * Wait for workflow to start loading (a new cycle to begin)
   * This ensures the workflow has started processing before we proceed
   */
  async waitForLoadingStart(): Promise<void> {
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const workflow = window.__vscroll__.workflow;
        const ds = window.__vscroll__.datasource;
        const initialCycles = workflow.cyclesDone;

        // If already loading, we're good
        if (ds.adapter && ds.adapter.isLoading) {
          resolve();
          return;
        }

        // Otherwise wait for a new cycle to start OR loading to begin
        const check = () => {
          if (workflow.cyclesDone > initialCycles || (ds.adapter && ds.adapter.isLoading)) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
    });
  }

  /**
   * Wait for the next workflow cycle to start and complete
   * Equivalent to: waitForLoadingStart() + adapter.relax()
   * This is the recommended way to wait for workflow operations to complete
   */
  async relaxNext(): Promise<void> {
    await this.waitForLoadingStart();
    await this.adapter.relax();
  }


  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.page.evaluate(() => {
      window.__vscroll__?.workflow?.dispose();
      document.querySelector('#viewport')?.remove();
    });
  }
}

