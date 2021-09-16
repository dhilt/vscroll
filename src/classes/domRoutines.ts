import { Settings } from './settings';
import { Direction } from '../inputs/index';

export class Routines {

  readonly horizontal: boolean;
  readonly window: boolean;

  constructor(settings: Settings) {
    this.horizontal = settings.horizontal;
    this.window = settings.windowViewport;
  }

  checkElement(element: HTMLElement): void {
    if (!element) {
      throw new Error('HTML element is not defined');
    }
  }

  getScrollPosition(element: HTMLElement): number {
    if (this.window) {
      return window.pageYOffset;
    }
    this.checkElement(element);
    return element[this.horizontal ? 'scrollLeft' : 'scrollTop'];
  }

  setScrollPosition(element: HTMLElement, value: number): void {
    value = Math.max(0, value);
    if (this.window) {
      if (this.horizontal) {
        window.scrollTo(value, window.scrollY);
      } else {
        window.scrollTo(window.scrollX, value);
      }
      return;
    }
    this.checkElement(element);
    element[this.horizontal ? 'scrollLeft' : 'scrollTop'] = value;
  }

  getParams(element: HTMLElement, doNotBind?: boolean): DOMRect {
    this.checkElement(element);
    if (this.window && doNotBind) {
      const { clientWidth, clientHeight, clientLeft, clientTop } = element;
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
    return element.getBoundingClientRect();
  }

  getSize(element: HTMLElement, doNotBind?: boolean): number {
    return this.getParams(element, doNotBind)[this.horizontal ? 'width' : 'height'];
  }

  getSizeStyle(element: HTMLElement): number {
    this.checkElement(element);
    const size = element.style[this.horizontal ? 'width' : 'height'];
    return parseFloat(size as string) || 0;
  }

  setSizeStyle(element: HTMLElement, value: number): void {
    this.checkElement(element);
    value = Math.max(0, Math.round(value));
    element.style[this.horizontal ? 'width' : 'height'] = `${value}px`;
  }

  getEdge(element: HTMLElement, direction: Direction, doNotBind?: boolean): number {
    const params = this.getParams(element, doNotBind);
    const isFwd = direction === Direction.forward;
    return params[isFwd ? (this.horizontal ? 'right' : 'bottom') : (this.horizontal ? 'left' : 'top')];
  }

  getEdge2(element: HTMLElement, direction: Direction, relativeElement: HTMLElement, opposite: boolean): number {
    // vertical only ?
    return element.offsetTop - (relativeElement ? relativeElement.scrollTop : 0) +
      (direction === (!opposite ? Direction.forward : Direction.backward) ? this.getSize(element) : 0);
  }

  hideElement(element: HTMLElement): void {
    this.checkElement(element);
    element.style.display = 'none';
  }

  getOffset(element: HTMLElement): number {
    this.checkElement(element);
    return (this.horizontal ? element.offsetLeft : element.offsetTop) || 0;
  }

  scrollTo(element: HTMLElement, argument?: boolean | ScrollIntoViewOptions): void {
    this.checkElement(element);
    element.scrollIntoView(argument);
  }

}
