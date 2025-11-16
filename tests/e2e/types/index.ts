
import type { Page } from '@playwright/test';
import type { IDatasource, Item } from '../../../src/index.js';
import type { Settings, DevSettings } from '../../../src/interfaces/settings.js';

export type { Page };
export type { IDatasource, Item };
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
  noRelaxOnStart?: boolean;
  custom?: Custom;
}

export interface VScrollFixtureConfig {
  datasource: IDatasource;
  useAdapter?: boolean; // If true, creates Datasource instance with adapter support
  templateSettings?: ITemplateSettings;
  templateFn?: (item: unknown) => string;
}