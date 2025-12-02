import type { Page } from '@playwright/test';
import type { IDatasource, Item, Workflow } from '../../../src/index.js';
import type {
  Settings,
  DevSettings
} from '../../../src/interfaces/settings.js';

export type { Page };
export type { IDatasource, Item, Workflow };

interface ITemplateSettings {
  viewportHeight?: number;
  viewportWidth?: number;
  itemHeight?: number;
  itemWidth?: number;
  horizontal?: boolean;
  noViewportClass?: boolean;
  headerHeight?: number;
}

export interface ITestConfig<Custom = unknown> {
  datasourceGet?: IDatasource['get'];
  datasourceSettings: Settings;
  datasourceDevSettings?: DevSettings;
  templateSettings: ITemplateSettings;
  noAdapter?: boolean;
  noRelaxOnStart?: boolean;
  custom?: Custom;
  onBefore?: (page: Page) => Promise<void>;
  templateFn?: (item: unknown) => string;
}

export interface VScrollFixtureConfig {
  datasource: IDatasource;
  noAdapter?: boolean;
  templateSettings?: ITemplateSettings;
  templateFn?: (item: unknown) => string;
  onBefore?: (page: Page) => Promise<void>;
}
