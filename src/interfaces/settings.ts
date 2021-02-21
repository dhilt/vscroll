import { ItemsProcessor } from './adapter';

export interface Settings {
  adapter?: boolean;
  startIndex?: number;
  minIndex?: number;
  maxIndex?: number;
  itemSize?: number;
  bufferSize?: number;
  padding?: number;
  infinite?: boolean;
  horizontal?: boolean;
  windowViewport?: boolean;
  viewportElement?: HTMLElement | (() => void) | null;
  inverse?: boolean;
  onBeforeClip?: ItemsProcessor | null;
}

export interface DevSettings {
  debug?: boolean;
  immediateLog?: boolean;
  logProcessRun?: boolean;
  logTime?: boolean;
  throttle?: number;
  initDelay?: number;
  initWindowDelay?: number;
  cacheData?: boolean;
  cacheOnReload?: boolean;
  changeOverflow?: boolean;
  dismissOverflowAnchor?: boolean;
}
