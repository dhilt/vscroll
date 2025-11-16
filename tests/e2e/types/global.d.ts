/**
 * Global type definitions for e2e tests
 * Extends Window with vscroll-specific properties
 */

import type { IAdapter } from '../../../src/interfaces/adapter';
import type { WorkflowParams, Item } from '../../../src/interfaces/index';
import type { Workflow } from '../../../src/workflow';
import type { Direction } from '../../../src/inputs/common';

interface VScrollTest<ItemData = unknown> {
  workflowParams: WorkflowParams<ItemData>;
  workflow: Workflow<ItemData> | Record<string, never>;
  datasource: {
    adapter?: IAdapter<ItemData>;
  };
  oldItems: Item<ItemData>[];
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

