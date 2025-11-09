/**
 * Global type definitions for e2e tests
 * Extends Window with vscroll-specific properties
 */

import type { IAdapter } from '../../src/interfaces/adapter';
import type { Item } from '../../src/interfaces/item';
import type { Workflow } from '../../src/workflow';

interface VScrollGlobal {
  workflow: Workflow<unknown> | Record<string, never>;
  datasource: {
    adapter?: IAdapter;
  };
  oldItems: Item<unknown>[];
  Direction: {
    forward: string;
    backward: string;
  };
}

interface VScrollConstructor {
  makeDatasource: () => new (config: unknown) => unknown;
  Workflow: new (config: unknown) => Workflow<unknown>;
}

declare global {
  interface Window {
    VScroll: VScrollConstructor;
    __vscroll__: VScrollGlobal;
  }
}

export { };

