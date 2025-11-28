import { Routines } from '../classes/domRoutines';
import { Settings } from '../classes/settings';
import { Direction } from '../inputs/index';
import { ItemAdapter } from './adapter';

interface IRoutinesSettings {
  /** The scroller's viewport element defined by the app settings.
   * The value is equal to settings.viewport and thus can be null.
   */
  viewport: HTMLElement | null;

  /** Determines wether the scroller is horizontal-oriented or not.
   * The value is equal to settings.horizontal.
   */
  horizontal: boolean;

  /** Determines wether the entire window is the scroller's viewport or not.
   * The value is equal to settings.window.
   */
  window: boolean;
}

export interface IRoutines {
  /** Internal prop that is available after instantiation.
   * Reduced version of the App settings object.
   */
  readonly settings: IRoutinesSettings;

  /** Internal prop that is available after instantiation.
   * The scroller's element that comes from the end App.
   */
  readonly element: HTMLElement;

  /** Internal prop that is available after instantiation.
   * The scroller's viewport element.
   * The "getViewportElement" method is responsible for the value.
   */
  readonly viewport: HTMLElement;

  /** Checks HTML element. Should throw error if it's not valid.
   * @param {HTMLElement} element HTML element to check.
   */
  checkElement: (element: HTMLElement) => void;

  /** Gets the viewport element based on the internal props:
   * "settings.viewport", "settings.window" and "element".
   * This method is being called during Routines instantiation
   * to determine the "viewport" prop:
   *
   * this.viewport = this.getViewportElement();
   * @returns {HTMLElement} HTML element.
   */
  getViewportElement: () => HTMLElement;

  /** This method is being called in the end of Routines instantiation.
   * @param {Settings} settings Unreduced Scroller's settings object.
   */
  onInit: (settings: Settings) => void;

  /** Finds element by CSS selector.
   * @param {HTMLElement} element Top of the elements hierarchy to search.
   * @param {string} selector CSS selector.
   * @returns {HTMLElement | null} The first HTML element that matches the specified selector, or null.
   */
  findElementBySelector: (element: HTMLElement, selector: string) => HTMLElement | null;

  /** Finds padding element.
   * @param {'backward' | 'forward'} direction Search direction: backward or forward.
   * @returns {HTMLElement | null} HTML padding element, or null.
   */
  findPaddingElement: (direction: Direction) => HTMLElement | null;

  /** Finds single item element by its id.
   * @param {string} id Id of the element to search.
   * @returns {HTMLElement | null} HTML item element, or null.
   */
  findItemElement: (id: string) => HTMLElement | null;

  /** Finds element by CSS selector among the child elements of an element that matches the item's id.
   * @param {string} id Id of the parent item.
   * @param {string} selector CSS selector of the child element to search.
   * @returns {HTMLElement | null} HTML item element, or null.
   */
  findItemChildBySelector: (id: string, selector: string) => HTMLElement | null;

  /** Gets scroll position of the viewport. Internal settings should be taken into account.
   * @returns {number} Scroll position value.
   */
  getScrollPosition: () => number;

  /** Sets scroll position of the viewport. Internal settings should be taken into account.
   * @param {number} value Scroll position value.
   */
  setScrollPosition: (value: number) => void;

  /** Gets the size of the element and its position relative to the viewport.
   * @param {HTMLElement} element
   * @returns {DOMRect} DOMRect object.
   */
  getElementParams: (element: HTMLElement) => DOMRect;

  /** Gets params of the host element in case the "window" setting is set to true.
   * @returns {DOMRect} DOMRect object.
   */
  getWindowParams: () => DOMRect;

  /** Gets size of the element. Internal props should be taken into account.
   * For example, if horizontal = false, then the element's height is needed.
   * If horizontal = true, then the element's width is needed.
   * @param {HTMLElement} element
   * @returns {DOMRect} DOMRect object.
   */
  getSize: (element: HTMLElement) => number;

  /** Gets size of the scroller element.
   * @returns {DOMRect} DOMRect object.
   */
  getScrollerSize: () => number;

  /** Gets size of the viewport.
   * @returns {DOMRect} DOMRect object.
   */
  getViewportSize: () => number;

  /** Gets size of the element. Internal settings ("horizontal") should be taken into account.
   * This method should work in the same way as "setSizeStyle" does.
   * @param {HTMLElement} element
   * @returns {number} Numeric value.
   */
  getSizeStyle: (element: HTMLElement) => number;

  /** Sets size of the element. Internal settings ("horizontal") should be taken into account.
   * This method should work in the same way as "getSizeStyle" does.
   * @param {HTMLElement} element
   * @param {number} value Numeric value to be new element's size.
   */
  setSizeStyle: (element: HTMLElement, value: number) => void;

  /** Gets the edge coordinate of the element. Internal settings ("horizontal") should be taken into account.
   * For example, if horizontal = false and direction = "backward" then the element's top coordinate is needed.
   * If horizontal = true and direction = "forward" then the element's right coordinate is needed.
   * @param {HTMLElement} element
   * @param {'backward' | 'forward'} direction
   * @returns {number} Numeric value.
   */
  getEdge: (element: HTMLElement, direction: Direction) => number;

  /** Gets the edge coordinate of the viewport. Internal settings should be taken into account.
   * @param {'backward' | 'forward'} direction
   * @returns {number} Numeric value.
   */
  getViewportEdge: (direction: Direction) => number;

  /** Makes the element visible in the same way as the external Workflow.run method makes it invisible.
   * @param {HTMLElement} element
   */
  makeElementVisible: (element: HTMLElement) => void;

  /** Hides the element. This method is being called before remove and has no connection with makeElementVisible.
   * @param {HTMLElement} element
   */
  hideElement: (element: HTMLElement) => void;

  /** Gets scroller's offset.
   * @returns {number} Numeric value.
   */
  getOffset: () => number;

  /** Scrolls into the element's view.
   * @param {HTMLElement} element
   * @param {boolean | ScrollIntoViewOptions} argument
   */
  scrollTo: (element: HTMLElement, argument?: boolean | ScrollIntoViewOptions) => void;

  /** Wraps rendering. Runs the rendering process and calls the "cb" function when it is done.
   * @param {function} cb A callback function that should be invoked after the rendering process has completed.
   * @param {ItemAdapter[]} items An array of items to be rendered.
   * @returns {function} Callback to dismiss render and prevent the argument function to be invoked.
   */
  render: (cb: () => void, { items }: { items: ItemAdapter[] }) => () => void;

  /** Wraps animation. Runs animations process and calls the argument function when it is done.
   * @param {function} cb
   * @returns {function} Callback to dismiss animation and prevent the argument function to be invoked.
   */
  animate: (cb: () => void) => () => void;

  /** Provides scroll event listening. Invokes the function argument each time the scroll event fires.
   * @param {EventListener} handler
   * @returns {function} Callback to dismiss scroll event listener.
   */
  onScroll: (handler: EventListener) => () => void;
}

export type RoutinesClassType = new (...args: ConstructorParameters<typeof Routines>) => Routines;
