import { Page } from '../types';
import { Direction as DirectionEnum } from '../../../src/inputs/common';

/**
 * Direction enum (inline, no import from vscroll source)
 * This avoids TypeScript compilation issues when loading e2e tests
 */
export const Direction = {
  forward: 'forward',
  backward: 'backward'
} as const;

export type DirectionType = (typeof Direction)[keyof typeof Direction];

/**
 * Scroller accessor class - provides access to scroller properties in browser context
 */
export class Scroller {
  constructor(private page: Page) {}

  get settings() {
    const page = this.page;
    return {
      get startIndex(): Promise<number> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.settings.startIndex;
        });
      },
      get bufferSize(): Promise<number> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.settings.bufferSize;
        });
      },
      get padding(): Promise<number> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.settings.padding;
        });
      },
      get horizontal(): Promise<boolean> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.settings.horizontal;
        });
      }
    };
  }

  get buffer() {
    const page = this.page;
    return {
      get size(): Promise<number> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.buffer.size;
        });
      },
      get defaultSize(): Promise<number> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.buffer.defaultSize;
        });
      },
      getEdgeVisibleItem: async (direction: DirectionType) => {
        return await page.evaluate(dir => {
          const workflow = window.__vscroll__.workflow;
          const item = workflow.scroller.buffer.getEdgeVisibleItem(
            dir as DirectionEnum
          );
          return item ? { $index: item.$index, data: item.data } : null;
        }, direction);
      }
    };
  }

  get viewport() {
    const page = this.page;
    return {
      getSize: async () => {
        return await page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.viewport.getSize();
        });
      },
      getScrollableSize: async () => {
        return await page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.viewport.getScrollableSize();
        });
      },
      get scrollPosition(): Promise<number> {
        return page.evaluate(() => {
          return window.__vscroll__.workflow.scroller.viewport.scrollPosition;
        });
      },
      paddings: {
        [Direction.forward]: {
          get size(): Promise<number> {
            return page.evaluate(() => {
              return window.__vscroll__.workflow.scroller.viewport.paddings
                .forward.size;
            });
          }
        },
        [Direction.backward]: {
          get size(): Promise<number> {
            return page.evaluate(() => {
              return window.__vscroll__.workflow.scroller.viewport.paddings
                .backward.size;
            });
          }
        }
      }
    };
  }
}
