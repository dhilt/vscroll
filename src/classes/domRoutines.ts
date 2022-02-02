import { Settings } from './settings';
import { Direction } from '../inputs/index';
import { IRoutines, CustomRoutinesClass } from '../interfaces/index';

export class Routines implements IRoutines {

  readonly settings: IRoutines['settings'];
  readonly element: HTMLElement;
  readonly viewport: HTMLElement;

  constructor(element: HTMLElement, settings: Settings, CustomRoutines?: CustomRoutinesClass) {
    this.element = element;
    this.settings = {
      viewport: settings.viewport,
      horizontal: settings.horizontal,
      window: settings.windowViewport
    };
    // provide custom overrides for IRoutines methods
    if (CustomRoutines) {
      const routines = new CustomRoutines(element, this.settings);
      Object.getOwnPropertyNames(Object.getPrototypeOf(routines))
        .filter(method =>
          method !== 'constructor' &&
          typeof routines[method] === 'function' &&
          typeof this[method] === 'function'
        )
        .forEach(method =>
          this[method] = (...args: unknown[]) =>
            routines[method].apply(this, args)
        );
    }
    // initialization
    this.viewport = this.getViewportElement();
    this.onInit(settings);
  }

  checkElement(element: HTMLElement): void {
    if (!element) {
      throw new Error('HTML element is not defined');
    }
  }

  getViewportElement(): HTMLElement {
    if (this.settings.window) {
      return document.documentElement;
    }
    if (this.settings.viewport) {
      return this.settings.viewport;
    }
    this.checkElement(this.element);
    const parent = this.element.parentElement as HTMLElement;
    this.checkElement(parent);
    return parent;
  }

  onInit(settings: Settings): void {
    if (settings.windowViewport) {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
    }
    if (settings.dismissOverflowAnchor) {
      this.viewport.style.overflowAnchor = 'none';
    }
  }

  findElementBySelector(element: HTMLElement, selector: string): HTMLElement | null {
    this.checkElement(element);
    return element.querySelector(selector);
  }

  findPaddingElement(direction: Direction): HTMLElement | null {
    return this.findElementBySelector(this.element, `[data-padding-${direction}]`);
  }

  findItemElement(id: string): HTMLElement | null {
    return this.findElementBySelector(this.element, `[data-sid="${id}"]`);
  }

  getScrollPosition(): number {
    if (this.settings.window) {
      return this.settings.horizontal ? window.pageXOffset : window.pageYOffset;
    }
    return this.viewport[this.settings.horizontal ? 'scrollLeft' : 'scrollTop'];
  }

  setScrollPosition(value: number): void {
    value = Math.max(0, value);
    if (this.settings.window) {
      if (this.settings.horizontal) {
        window.scrollTo(value, window.scrollY);
      } else {
        window.scrollTo(window.scrollX, value);
      }
      return;
    }
    this.viewport[this.settings.horizontal ? 'scrollLeft' : 'scrollTop'] = value;
  }

  getElementParams(element: HTMLElement): DOMRect {
    this.checkElement(element);
    return element.getBoundingClientRect();
  }

  getWindowParams(): DOMRect {
    const { clientWidth, clientHeight, clientLeft, clientTop } = this.viewport;
    return {
      'height': clientHeight,
      'width': clientWidth,
      'top': clientTop,
      'bottom': clientTop + clientHeight,
      'left': clientLeft,
      'right': clientLeft + clientWidth,
      'x': clientLeft,
      'y': clientTop,
      'toJSON': () => null,
    };
  }

  getSize(element: HTMLElement): number {
    return this.getElementParams(element)[this.settings.horizontal ? 'width' : 'height'];
  }

  getScrollerSize(): number {
    return this.getElementParams(this.element)[this.settings.horizontal ? 'width' : 'height'];
  }

  getViewportSize(): number {
    if (this.settings.window) {
      return this.getWindowParams()[this.settings.horizontal ? 'width' : 'height'];
    }
    return this.getSize(this.viewport);
  }

  getSizeStyle(element: HTMLElement): number {
    this.checkElement(element);
    const size = element.style[this.settings.horizontal ? 'width' : 'height'];
    return parseFloat(size as string) || 0;
  }

  setSizeStyle(element: HTMLElement, value: number): void {
    this.checkElement(element);
    value = Math.max(0, Math.round(value));
    element.style[this.settings.horizontal ? 'width' : 'height'] = `${value}px`;
  }

  getEdge(element: HTMLElement, direction: Direction): number {
    const { horizontal } = this.settings;
    const params = this.getElementParams(element);
    const isFwd = direction === Direction.forward;
    return params[isFwd ? (horizontal ? 'right' : 'bottom') : (horizontal ? 'left' : 'top')];
  }

  getViewportEdge(direction: Direction): number {
    const { window, horizontal } = this.settings;
    if (window) {
      const params = this.getWindowParams();
      const isFwd = direction === Direction.forward;
      return params[isFwd ? (horizontal ? 'right' : 'bottom') : (horizontal ? 'left' : 'top')];
    }
    return this.getEdge(this.viewport, direction);
  }

  makeElementVisible(element: HTMLElement): void {
    this.checkElement(element);
    element.style.left = '';
    element.style.top = '';
    element.style.position = '';
  }

  hideElement(element: HTMLElement): void {
    this.checkElement(element);
    element.style.display = 'none';
  }

  getOffset(): number {
    const get = (element: HTMLElement) =>
      (this.settings.horizontal ? element.offsetLeft : element.offsetTop) || 0;
    return get(this.element) - (!this.settings.window ? get(this.viewport) : 0);
  }

  scrollTo(element: HTMLElement, argument?: boolean | ScrollIntoViewOptions): void {
    this.checkElement(element);
    element.scrollIntoView(argument);
  }

  render(cb: () => void): () => void {
    const timeoutId = setTimeout(() => cb());
    return () => clearTimeout(timeoutId);
  }

  animate(cb: () => void): () => void {
    const animationFrameId = requestAnimationFrame(() => cb());
    return () => cancelAnimationFrame(animationFrameId);
  }

  onScroll(handler: EventListener): () => void {
    const eventReceiver = this.settings.window ? window : this.viewport;
    eventReceiver.addEventListener('scroll', handler);
    return () => eventReceiver.removeEventListener('scroll', handler);
  }

}
