
import type { Settings, DevSettings } from '../../src/interfaces/settings.js';

interface ITemplateSettings {
  viewportHeight?: number;
  viewportWidth?: number;
  itemHeight?: number;
  itemWidth?: number;
  horizontal?: boolean;
}

export interface ITestConfig<Custom = void> {
  datasourceSettings: Settings;
  datasourceDevSettings?: DevSettings;
  templateSettings: ITemplateSettings;
  custom?: Custom;
}