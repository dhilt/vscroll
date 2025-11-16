/**
 * Global type definitions for e2e tests
 * Extends Window with vscroll-specific properties
 */

import type { IAdapter } from '../../../src/interfaces/adapter';
import type { Workflow } from '../../../src/workflow';
import type { Direction } from '../../../src/inputs/common';

interface VScrollTest<ItemData = unknown> {
  workflow: Workflow<ItemData>;
  datasource: {
    adapter?: IAdapter<ItemData>;
  };
  makeScroller?: () => Workflow<ItemData>; // Creates Workflow with fresh oldItems closure (when manualRun)
  Direction: {
    forward: string;
    backward: string;
  };
}

interface VScrollConstructor {
  makeDatasource: () => new (config: unknown) => unknown;
  Workflow: new (config: unknown) => Workflow<unknown>;
  Direction: typeof Direction;
}

declare global {
  interface Window {
    VScroll: VScrollConstructor;
    __vscroll__: VScrollTest;
  }
}

export { };

