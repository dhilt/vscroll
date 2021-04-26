import { ItemsProcessor } from './adapter';
import { SizeStrategy } from '../inputs/index';

export interface Settings<T = unknown> {
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
  onBeforeClip?: ItemsProcessor<T> | null;
  sizeStrategy?: SizeStrategy;
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
