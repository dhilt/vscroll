import { Page } from '@playwright/test';

/**
 * Adapter accessor class - provides access to adapter methods in browser context
 */
export class Adapter {
  constructor(private page: Page) { }

  /**
   * Wait for the scroller to relax (no pending operations)
   */
  async relax() {
    return await this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.relax();
    });
  }

  /**
   * Append items to the end of the dataset
   */
  async append(options) {
    return await this.page.evaluate((opts) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.append(opts);
    }, options);
  }

  /**
   * Prepend items to the beginning of the dataset
   */
  async prepend(options) {
    return await this.page.evaluate((opts) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.prepend(opts);
    }, options);
  }

  /**
   * Reload the dataset
   */
  async reload(reloadIndex) {
    return await this.page.evaluate((index) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.reload(index);
    }, reloadIndex);
  }

  /**
   * Reset the scroller to initial state
   */
  async reset(options) {
    return await this.page.evaluate((opts) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.reset(opts);
    }, options);
  }

  /**
   * Remove items from the dataset
   */
  async remove(options) {
    const predicateStr = options.predicate.toString();
    return await this.page.evaluate(({ predicateStr, increase }) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      const predicate = eval(`(${predicateStr})`);
      return ds.adapter.remove({ predicate, increase });
    }, { predicateStr, increase: options.increase });
  }

  /**
   * Insert items at a specific position
   */
  async insert(options) {
    return await this.page.evaluate((opts) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.insert(opts);
    }, options);
  }

  /**
   * Replace items in the dataset
   */
  async replace(options) {
    const predicateStr = options.predicate.toString();
    return await this.page.evaluate(({ predicateStr, items }) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      const predicate = eval(`(${predicateStr})`);
      return ds.adapter.replace({ predicate, items });
    }, { predicateStr, items: options.items });
  }

  /**
   * Update items in the dataset
   */
  async update(options) {
    const predicateStr = options.predicate.toString();
    return await this.page.evaluate((predicateStr) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      const predicate = eval(`(${predicateStr})`);
      return ds.adapter.update({ predicate });
    }, predicateStr);
  }

  /**
   * Clip the dataset (remove items outside visible range)
   */
  async clip(options) {
    return await this.page.evaluate((opts) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.clip(opts);
    }, options);
  }

  /**
   * Check the dataset consistency
   */
  async check() {
    return await this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.check();
    });
  }

  /**
   * Fix scroll position
   */
  async fix(options) {
    return await this.page.evaluate((opts) => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.fix(opts);
    }, options);
  }

  /**
   * Get adapter properties (as getters to match IAdapter interface)
   */
  get isLoading() {
    return this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.isLoading;
    });
  }

  get bof() {
    return this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.bof;
    });
  }

  get eof() {
    return this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.eof;
    });
  }

  get itemsCount() {
    return this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.itemsCount;
    });
  }

  get firstVisible() {
    return this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.firstVisible;
    });
  }

  get lastVisible() {
    return this.page.evaluate(() => {
      const ds = window.__vscroll__.datasource;
      if (!ds.adapter) {
        throw new Error('Adapter not available. Set useAdapter: true in config.');
      }
      return ds.adapter.lastVisible;
    });
  }
}

