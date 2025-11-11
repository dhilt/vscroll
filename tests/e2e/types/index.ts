
import type { Page } from '@playwright/test';
import type { IDatasource } from '../../../src/index.js';
import type { Settings, DevSettings } from '../../../src/interfaces/settings.js';

export type { Page };
export type { IDatasource };
interface ITemplateSettings {
  viewportHeight?: number;
  viewportWidth?: number;
  itemHeight?: number;
  itemWidth?: number;
  horizontal?: boolean;
}

export interface ITestConfig<Custom = unknown> {
  datasourceSettings: Settings;
  datasourceDevSettings?: DevSettings;
  templateSettings: ITemplateSettings;
  custom?: Custom;
}