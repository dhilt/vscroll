import { Page } from '@playwright/test';
import { Settings, DevSettings } from '../../../src/interfaces';
import { Workflow, IDatasourceConstructed } from '../../../src/index';
import { ItemsCounter } from './itemsCounter';

interface Scroller {
  workflow: InstanceType<typeof Workflow>;
  datasource: IDatasourceConstructed;
}
interface ScrollerClass {
  new(datasource: IDatasourceConstructed): Scroller;
}

export type VSCROLL = {
  workflow: Scroller['workflow'];
  datasource: Scroller['datasource'];
  Scroller: ScrollerClass;
  scroller: Scroller;
  scroller1: Scroller;
  scroller2: Scroller;
};

export type TESTS = {
  ItemsCounter: ItemsCounter
};

type TemplateSettings = {
  noViewportClass?: boolean;
  viewportHeight?: number;
  viewportWidth?: number | null;
  itemHeight?: number;
  itemWidth?: number | null;
  horizontal?: boolean;
  dynamicSize?: string | null;
  viewportPadding?: number;
  headerHeight?: number;
}

export type Config<Custom = unknown> = {
  datasourceClass?: { new(): unknown };
  datasourceName?: string;
  datasourceSettings?: Settings;
  datasourceDevSettings?: DevSettings;
  templateSettings?: TemplateSettings;
  toThrow?: boolean;
  custom?: Custom;
  timeout?: number;
}

export type It<T = unknown> = (args: { config: Config<T>, page: Page }) => Promise<void>;
