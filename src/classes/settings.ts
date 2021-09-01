import { SETTINGS, DEV_SETTINGS, validate, validateOne, VALIDATORS, SizeStrategy, Direction } from '../inputs/index';
import { Settings as ISettings, DevSettings as IDevSettings, ICommonProps, ItemsProcessor } from '../interfaces/index';

export class Settings<Data = unknown> implements ISettings, IDevSettings {

  // user settings
  adapter: boolean;
  startIndex: number;
  minIndex: number;
  maxIndex: number;
  itemSize: number;
  bufferSize: number;
  padding: number;
  infinite: boolean;
  horizontal: boolean;
  windowViewport: boolean;
  viewportElement: HTMLElement | (() => void) | null;
  inverse: boolean; // if true, bwd padding element will have a priority when filling the viewport (if lack of items)
  onBeforeClip: ItemsProcessor | null; // if set, it will be run before clipping items from Buffer after they are hidden
  sizeStrategy: SizeStrategy; // "average" | "frequent", determines behavior of unknown items

  /**
   * Development setting.
   * If true, logging is enabled.
   * Default value: false.
   * @type {boolean}
   */
  debug: boolean; // if true, 

  /**
   * Development setting.
   * If false, in-memory logging is enabled, Adapter.showLog() method should be called to print the log.
   * Default value: true.
   * @type {boolean}
   */
  immediateLog: boolean;

  /**
   * Development setting.
   * If true, time differences will be logged.
   * Default value: false.
   * @type {boolean}
   */
  logTime: boolean;

  /**
   * Development setting.
   * If true, process fire/run info will be logged.
   * Default value: false.
   * @type {boolean}
   */
  logProcessRun: boolean;

  /**
   * Development setting.
   * If set, scroll event handling is throttled (ms).
   * Default value: 40. Minimal value: 0.
   * @type {number} ms
   */
  throttle: number;

  /**
   * Development setting.
   * If set, the Workflow initialization will be postponed (ms).
   * Default value: 1. Minimal value: 0.
   * @type {number} ms
   */
  initDelay: number;

  /**
   * Development setting.
   * If set and the entire window is scrollable, the Workflow initialization will be postponed (ms).
   * Default value: 40. Minimal value: 0.
   * @type {number} ms
   */
  initWindowDelay: number;

  /**
   * Development setting.
   * If true, item's data will be cached along with item's size and index.
   * Default value: false.
   * @type {boolean}
   */
  cacheData: boolean;

  /**
   * Development setting.
   * If true, cache will not be flushed on reload.
   * Default value: false.
   * @type {boolean}
   */
  cacheOnReload: boolean;

  /**
   * Development setting.
   * If true, the viewport will receive "overflowAnchor: none" css property.
   * Default value: false.
   * @type {boolean}
   */
  dismissOverflowAnchor: boolean;

  /**
   * Development setting.
   * Determines the strategy of fixing the difference between estimated and real (rendered) sizes
   * on scroll position adjustments. If set to 'backward', the difference is always resolved in favour of the
   * backward direction: top/left content is fixed and appears in accordance with pre-render expectations.
   * If set to 'forward', both directions could be used, and there is a case when bottom/right content is fixed:
   * new items are to the left of the previously rendered
   * and at least one previously rendered item remains.
   * Default value: 'backward'. Allowed values: 'backward', 'forward'.
   * @type {string}
   */
  directionPriority: Direction;

  /**
   * Internal setting. Stores the index of the Scroller instance.
   * @type {number}
   */
  instanceIndex: number;

  /**
   * Internal setting. Stores the Workflow initialization delay based on initDelay and initWindowDelay settings.
   * @type {number}
   */
  initializeDelay: number;

  /**
   * Internal setting. Stores the viewport based on viewportElement setting (which can be element or function).
   * @type {HTMLElement|null}
   */
  viewport: HTMLElement | null;

  constructor(
    settings: ISettings<Data> | undefined, devSettings: IDevSettings | undefined, instanceIndex: number
  ) {
    this.parseInput(settings, SETTINGS);
    this.parseInput(devSettings, DEV_SETTINGS);
    this.instanceIndex = instanceIndex;
    this.initializeDelay = this.getInitializeDelay();
    this.viewport = this.getViewport();
    // todo: min/max indexes must be ignored if infinite mode is enabled ??
  }

  parseInput(input: ISettings<Data> | IDevSettings | undefined, props: ICommonProps<PropertyKey>): void {
    const result = validate(input, props);
    if (!result.isValid) {
      throw new Error('Invalid settings');
    }
    Object.entries(result.params).forEach(([key, par]) =>
      Object.assign(this, { [key]: par.value })
    );
  }

  getInitializeDelay(): number {
    let result = 0;
    if (this.windowViewport && this.initWindowDelay && !('scrollRestoration' in history)) {
      result = this.initWindowDelay;
    }
    if (this.initDelay > 0) {
      result = Math.max(result, this.initDelay);
    }
    return result;
  }

  getViewport(): HTMLElement | null {
    if (typeof this.viewportElement !== 'function') {
      return this.viewportElement;
    }
    const value = this.viewportElement();
    const result = validateOne({ value }, 'value', { validators: [VALIDATORS.ELEMENT] });
    if (!result.isValid) {
      return null; // fallback to default (null) if Function didn't return HTML element synchronously
    }
    return result.value as HTMLElement;
  }
}
