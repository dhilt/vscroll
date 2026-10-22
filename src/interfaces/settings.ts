import { ItemsProcessor } from './adapter';
import { SizeStrategy } from '../inputs/index';

export interface Settings<T = unknown> {
  /**
   * Exposes the Adapter on a plain-object datasource; factory-created datasources already expose it.
   * Default: false.
   */
  adapter?: boolean;

  /**
   * Initial dataset index, clamped to the configured bounds; zero and negative indexes are valid.
   * Default: 1. Integer values only.
   */
  startIndex?: number;

  /**
   * Inclusive lower dataset bound; an unknown bound is discovered from datasource responses.
   * Default: -Infinity. Integer values or infinity.
   */
  minIndex?: number;

  /**
   * Inclusive upper dataset bound; an unknown bound is discovered from datasource responses.
   * Default: Infinity. Integer values or infinity.
   */
  maxIndex?: number;

  /**
   * Initial row-size estimate in CSS pixels: height vertically or width horizontally.
   * Used for the first fetch and virtual space, not CSS sizing.
   * Default: NaN (unknown). Minimum: 1. Integer values only.
   */
  itemSize?: number;

  /**
   * Minimum fetch batch target, not a fixed item count per request or a limit on buffered items.
   * Default: 5. Minimum: 1. Integer values only.
   */
  bufferSize?: number;

  /**
   * Target offscreen content on each side, measured in viewport sizes, not CSS pixels.
   * Default: 0.5 (half a viewport per side). Minimum: 0.01.
   */
  padding?: number;

  /**
   * Disables automatic clipping, retaining loaded items and their DOM rows.
   * Explicit adapter.clip() remains available.
   * Default: false.
   */
  infinite?: boolean;

  /**
   * Scrolls and measures horizontally instead of vertically; the DOM/CSS layout must also be horizontal.
   * Default: false.
   */
  horizontal?: boolean;

  /**
   * Uses the browser window for scrolling and viewport dimensions, overriding viewportElement.
   * Default: false.
   */
  windowViewport?: boolean;

  /**
   * Explicit viewport element, or a synchronous factory returning an element or null; windowViewport takes precedence.
   * A null or invalid factory result falls back to the content element's parent.
   * Experimental. Default: null (the content element's parent).
   */
  viewportElement?: HTMLElement | (() => HTMLElement | null) | null;

  /**
   * Aligns content shorter than the viewport to the bottom vertically or to the right horizontally.
   * Does not reverse item order or automatically follow appended items.
   * Default: false.
   */
  alignShortContentToEnd?: boolean;

  /**
   * Alias for alignShortContentToEnd, ignored when that setting is supplied.
   * Default: false.
   * @deprecated Use alignShortContentToEnd.
   */
  inverse?: boolean;

  /**
   * Called synchronously after rows are hidden, before their items leave the Buffer.
   * Consumers must catch exceptions inside this callback; an escaping exception can
   * interrupt clipping and leave the scroller inconsistent or busy.
   * Experimental. Default: null.
   */
  onBeforeClip?: ItemsProcessor<T> | null;

  /**
   * Estimates unmeasured rows using the average, most frequent measured size, or a constant estimate.
   * A constant estimate uses itemSize, or the first measured size when itemSize is omitted.
   * Default: SizeStrategy.Average ('average').
   */
  sizeStrategy?: SizeStrategy;
}

export interface DevSettings {
  /**
   * Enables core diagnostics; the other logging options have no effect when disabled.
   * Default: false.
   */
  debug?: boolean;

  /**
   * Prints debug messages immediately; false queues them until adapter.showLog() is called.
   * Requires debug: true. Default: true.
   */
  immediateLog?: boolean;

  /**
   * Includes process dispatch and execution events in debug logs.
   * Requires debug: true. Default: false.
   */
  logProcessRun?: boolean;

  /**
   * Includes elapsed time in debug logs.
   * Requires debug: true. Default: false.
   */
  logTime?: boolean;

  /**
   * Applies console color formatting to debug logs.
   * Requires debug: true. Default: true.
   */
  logColor?: boolean;

  /**
   * Throttles scroll-event handling, coalescing rapid events with a delay in milliseconds.
   * Default: 40. Minimum: 0. Integer values only.
   */
  throttle?: number;

  /**
   * Base delay before Workflow initialization, in milliseconds.
   * Default: 1. Minimum: 0. Integer values only.
   */
  initDelay?: number;

  /**
   * Initialization delay for window scrolling when history.scrollRestoration is unavailable, in milliseconds.
   * The larger of this delay and initDelay is used.
   * Default: 40. Minimum: 0. Integer values only.
   */
  initWindowDelay?: number;

  /**
   * Retains application data alongside cached item indexes and measured sizes.
   * This internal cache does not answer datasource requests.
   * Default: false.
   */
  cacheData?: boolean;

  /**
   * Preserves the item index-and-size cache across adapter.reload(), not the rendered rows.
   * adapter.reset() still clears the cache.
   * Default: false.
   */
  cacheOnReload?: boolean;

  /**
   * Disables native scroll anchoring by setting overflow-anchor: none on the viewport.
   * The style is not restored on disposal.
   * Default: true.
   */
  dismissOverflowAnchor?: boolean;

  /**
   * Prefers top/left anchoring during size corrections ('backward'), or allows bottom/right anchoring
   * when rows are fetched before the current Buffer ('forward').
   * Default: 'backward'.
   */
  directionPriority?: 'backward' | 'forward';
}
