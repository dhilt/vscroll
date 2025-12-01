/**
 * Global type definitions for e2e tests
 * Extends Window with vscroll-specific properties
 */

import * as VScroll from '../../../src/index';
import type { IAdapter } from '../../../src/interfaces/adapter';
import type { Workflow } from '../../../src/workflow';

interface VScrollTest<ItemData = unknown> {
  workflow: Workflow<ItemData>;
  datasource: {
    adapter?: IAdapter<ItemData>;
  };
  makeScroller?: () => Workflow<ItemData>; // Creates Workflow with fresh oldItems closure
  Direction: {
    forward: string;
    backward: string;
  };
}

declare global {
  interface Window {
    VScroll: typeof VScroll;
    __vscroll__: VScrollTest;
  }
}

export {};
