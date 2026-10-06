# Custom Routines

[← Documentation index](index.md) · Working draft

`Routines` is the scroller's DOM operations class, exported from `vscroll`. It handles element lookup, geometry measurement, scrolling and scheduling of internal work. The engine uses the built-in implementation by default. Custom Routines adapt these operations to a particular layout or rendering mechanism without changing the scrolling algorithm.

## Overriding and integration

A custom implementation extends `Routines` and overrides the relevant methods; the others retain their default behavior. The class is passed as the `Routines` parameter when constructing `Workflow`. The engine instantiates it with the content element and resolved datasource settings.

The exported `IRoutines` interface describes the class contract. The following instance properties are available through `this` in overridden methods:

| Property | Type | Meaning |
| --- | --- | --- |
| `element` | `HTMLElement` | Content element passed to `Workflow`, containing rows and padding elements. |
| `viewport` | `HTMLElement` | Viewport element determined by `getViewportElement()`. |
| `settings` | `IRoutines['settings']` | Reduced settings: `viewport` is the explicitly configured viewport or `null`; `horizontal` selects horizontal mode; `window` holds the value of `windowViewport`. |

For example, the [table demo](../demo/table-demo.html) uses `tbody` as the content element and explicitly selects an outer scrollable container through `settings.viewportElement`. The `getOffset()` method determines the list's offset relative to the viewport. For this layout, the override sets it to the height of the preceding table header:

```js
import { Routines, Workflow } from 'vscroll';

class TableRoutines extends Routines {
  getOffset() {
    return this.viewport.querySelector('thead')?.offsetHeight || 0;
  }
}

new Workflow({ Routines: TableRoutines, ... });
```

The inherited constructor initializes `element` and reduced `settings`, assigns `viewport` from `getViewportElement()`, then calls `onInit(settings)`. Both hooks run before subclass fields are initialized; `this.viewport` is not yet available inside `getViewportElement()`. A custom constructor must forward its arguments to `super`; overriding it is usually unnecessary.

## Hiding and revealing new rows

New rows are initially created in the DOM outside normal flow while the padding elements still represent the previous list state. The engine then reveals the rows, measures them and adjusts padding sizes and scroll position. Initial hiding in `run(items)` must therefore match `makeElementVisible`, which restores the rows to the layout before measurement.

Another example of Custom Routines replaces the default off-screen positioning with a CSS class that hides new rows using `display: none`. Below, `run` applies the class according to `item.invisible`, and `DisplayRoutines` removes it. [Rendering](rendering.md#the-runitems-callback) provides a complete `run` implementation; the version below is schematic.

```css
#content > .vscroll-pending { display: none !important; }
```

```js
import { Routines, Workflow } from 'vscroll';

class DisplayRoutines extends Routines {
  makeElementVisible(element) {
    this.checkElement(element);
    element.classList.remove('vscroll-pending');
  }
}

function run(items) {
  ... // remove rows no longer in the buffer
  for (const item of items) {
    ... // create or reuse row
    row.classList.toggle('vscroll-pending', item.invisible);
    ... // update row content and DOM order
  }
  ...
}

new Workflow({ element, run, Routines: DisplayRoutines, ... });
```

While the class is applied, the row is excluded from layout and its DOM size is zero. The engine calls `makeElementVisible` before `getSize`, so measurement uses the revealed row. Removing the class preserves the original `display` defined by CSS or an inline style; `!important` also allows temporary hiding when an ordinary inline `display` is present. The default `hideElement` remains unchanged: it is used before removing rows, not for their initial preparation.

## Scheduling and cancellation

With asynchronous rendering, `run(items)` may return before the DOM is updated. `Routines.render(cb, { items })` determines when the engine continues processing rows: a custom implementation calls `cb` once the DOM is ready. The engine does not await a Promise returned by `run`.

If the DOM is guaranteed to be ready by the next animation frame, the default `render` timer can be replaced with a frame callback:

```js
class FrameRoutines extends Routines {
  render(cb) {
    const id = requestAnimationFrame(cb);
    return () => cancelAnimationFrame(id);
  }
}
```

An animation frame does not guarantee DOM readiness in every framework. If the DOM updates later, the framework's own render-completion signal is required.

The scheduling methods `render` and `animate` share a contract:

1. `cb` is called asynchronously, exactly once unless the work is cancelled.
2. The method immediately returns a cancellation function. It prevents a pending `cb` call, never invokes `cb` itself, and is safe to call repeatedly.
3. The engine uses this function when abandoning pending work or during disposal; a cancelled callback must not resume processing.

Calls to `run` and `render` are not necessarily paired: clipping publishes the remaining buffer without processing new rows.

The consumer releases any additional integration resources; `Routines.dispose()` is not called automatically.

## Method reference

The tables below list all methods of the built-in class and their default behavior. The signatures also use the exported `Direction` enum: `backward` means the top or left side, and `forward` the bottom or right side.

### Initialization and element lookup

| Method | Default behavior |
| --- | --- |
| `checkElement(element: HTMLElement): void` | Checks that an element is provided; throws if it is missing. |
| `getViewportElement(): HTMLElement` | Returns `document.documentElement` in window mode; otherwise, the explicit `settings.viewport` or the parent of `element`. |
| `onInit(settings): void` | Receives the full resolved settings object, unlike reduced `this.settings`. In window mode, sets `history.scrollRestoration = 'manual'` when supported; with `dismissOverflowAnchor`, sets the viewport's `overflowAnchor = 'none'`. Calling `super.onInit(settings)` preserves this behavior in an override. |
| `findElementBySelector(element: HTMLElement, selector: string): HTMLElement \| null` | Returns the first `querySelector` match within the supplied element. |
| `findPaddingElement(direction: Direction): HTMLElement \| null` | Finds a padding element in `element` with `[data-padding-backward]` or `[data-padding-forward]`. |
| `findItemElement(id: string): HTMLElement \| null` | Finds a row in `element` with `[data-sid="<id>"]`. The engine supplies the item's current index as a string. |
| `findItemChildBySelector(id: string, selector: string): HTMLElement \| null` | Finds a row's descendant using `[data-sid="<id>"] <selector>`. |

Browser settings changed by `onInit` are not automatically restored when `Workflow` is disposed. Any required restoration belongs to the integration.

### Geometry and padding sizes

Sizes and coordinates are expressed in CSS pixels. The active dimension is height for vertical scrolling and width for horizontal scrolling. Custom geometry must keep row and content sizes, viewport edges, list offset and padding sizes consistent. For example, `getSizeStyle` and `setSizeStyle` must read and write sizes in the same way.

| Method | Default behavior |
| --- | --- |
| `getElementParams(element: HTMLElement): DOMRect` | Returns the element's `getBoundingClientRect()`. |
| `getWindowParams(): DOMRect` | Returns the window rectangle starting at `(0, 0)`, with dimensions `window.innerWidth` and `window.innerHeight`. |
| `getSize(element: HTMLElement): number` | Returns the active dimension from `getElementParams(element)`, excluding margins. Used for both rows and the viewport. |
| `getScrollerSize(): number` | Returns the content element's active dimension from `getElementParams(this.element)`, not its `scrollHeight` or `scrollWidth`. |
| `getViewportSize(): number` | Returns the active dimension from `getWindowParams()` in window mode; otherwise, `getSize(viewport)`. |
| `getSizeStyle(element: HTMLElement): number` | Reads inline `height` or `width` using `parseFloat`, returning `0` when absent. Does not read computed CSS. |
| `setSizeStyle(element: HTMLElement, value: number): void` | Rounds the size, clamps it to zero or greater, and writes inline `height` or `width` in pixels. Used for padding elements. |
| `getEdge(element: HTMLElement, direction: Direction): number` | Returns the corresponding edge from `getElementParams(element)`. |
| `getViewportEdge(direction: Direction): number` | Returns the corresponding edge of the window rectangle in window mode; otherwise, `getEdge(viewport, direction)`. |
| `getOffset(): number` | Returns the content element's `offsetTop` or `offsetLeft`, minus the viewport's corresponding offset. No subtraction is performed in window mode. |

### Visibility and scrolling

Revealing new rows must match their initial hiding in `run`: the default implementation expects off-screen positioning, not `display: none`.

| Method | Default behavior |
| --- | --- |
| `makeElementVisible(element: HTMLElement): void` | Clears inline `left`, `top` and `position`, returning the row to normal flow. Does not clear `display`. |
| `hideElement(element: HTMLElement): void` | Sets `display: none` before row removal. This is a separate operation, not the inverse of `makeElementVisible`. |
| `getScrollPosition(): number` | Returns `pageYOffset` or `pageXOffset` in window mode; otherwise, the viewport's `scrollTop` or `scrollLeft`. |
| `setScrollPosition(value: number): void` | Clamps the value to zero or greater and sets the position through `window.scrollTo` or the viewport's scroll property. Window scrolling preserves the other axis; browser limits still apply. |
| `scrollTo(element: HTMLElement, argument?: boolean \| ScrollIntoViewOptions): void` | Calls `element.scrollIntoView(argument)` to scroll to a specific element. |

### Scheduling and scroll listener

| Method | Default behavior |
| --- | --- |
| `render(cb: () => void, params: { items: IAdapterItem[] }): () => void` | Calls `cb` through `setTimeout` with no explicit delay and returns a timer cancellation function. `params.items` contains the current batch's item containers, not the whole buffer; their DOM references may not yet exist. The default implementation ignores `params`. |
| `animate(cb: () => void): () => void` | Schedules the scroll-position adjustment callback through `requestAnimationFrame` and returns a frame cancellation function. This is not animation of individual rows. |
| `onScroll(handler: EventListener): () => void` | Attaches a `scroll` listener to the window or viewport. Returns a function to remove it, which the engine calls during `Workflow` disposal. |
