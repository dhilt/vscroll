import type {
  DevSettings,
  IDatasource,
  Settings
} from './scaffolding/vscroll';

export interface TestItem {
  id: number;
  text: string;
  size?: number;
}

export interface TemplateSettings {
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

export interface TestConfig<Custom = void, Data = TestItem> {
  datasource?: () => IDatasource<Data>;
  datasourceSettings?: Settings<Data>;
  datasourceDevSettings?: DevSettings;
  templateSettings?: TemplateSettings;
  noAdapter?: boolean;
  custom?: Custom;
  timeout?: number;
  skipInvariantAutoCheck?: boolean;
}

export interface IndexedItem<Data = TestItem> {
  $index: number;
  data: Data;
}

export type DatasourceProcessor<Data = TestItem> = (
  items: IndexedItem<Data>[],
  ...args: unknown[]
) => unknown;
