# Rendering and DOM contract

[← Documentation index](index.md)

The rendering integration is established when `Workflow` is instantiated. Two constructor parameters define its core contract: `element` identifies the mounted content element, and `run(items)` keeps its rows aligned with the Scroller's item buffer.

## Required DOM and layout

The DOM must provide a scrollable viewport with a constrained size. Inside it, a content element holds two empty padding elements, one before and one after the item rows. This structure must be mounted before `Workflow` is instantiated:

```html
<div id="viewport">
  <div id="content">
    <div data-padding-backward></div>
    <!-- Item rows go here. -->
    <div data-padding-forward></div>
  </div>
</div>
```

This CSS example constrains the viewport height and enables vertical scrolling:

```css
#viewport { height: 300px; overflow-y: auto; }
```

The content element is passed to `Workflow`:

```js
const element = document.getElementById('content');
const workflow = new Workflow({ element, ... });
```

By default, the Scroller uses the content element's parent as its viewport; [Configuration](configuration.md#viewport-and-horizontal-scrolling) explains how to select a different scroll target.

The padding elements remain mounted as rows come and go; the Scroller sizes them to represent virtual space. Rows must be measurable. By default, their size comes from `getBoundingClientRect()`, which excludes margins; unaccounted margins or gaps distort the virtual geometry. Row measurement can be customized through [Routines](routines.md#geometry-and-padding-sizes).

## The `run(items)` callback

Implementing `run(items)` is a central integration requirement for the consumer. The callback must turn the supplied items into DOM rows that correctly represent the current buffer. This remains the consumer's responsibility whether rendering is performed directly or through a framework.

The Scroller calls `run(items)` whenever it updates the item buffer—for example, after fetching data, clipping distant items, or applying an Adapter mutation. The argument is the complete buffer, including items outside the visible viewport, not just newly fetched data. The content element must contain one row per item, in buffer order, between the padding elements.

Each buffer entry is an `Item<Data>` wrapping application data. Its rendering-relevant fields are:

| Field | Rendering role |
| --- | --- |
| `data` | Application value supplied through the datasource's `get` or an Adapter operation and displayed in the row. |
| `$index` | Current dataset position, used for row order and `data-sid`; Adapter mutations may change it. |
| `uid` | Item identity, stable while that item is retained even if its index changes; suitable as a renderer key. A refetched or replaced item has a new `uid`. |
| `element` | Associated DOM row; initially absent for a new item and available after association. |
| `invisible` | True until a new row is revealed by the Scroller; it does not mean the row is outside the viewport. |
| `get()` | Returns the shared Adapter-facing item container; its fields remain live, not a snapshot. |

A minimal direct-DOM implementation of `run(items)` uses the content element shown above and assumes each item's data has a `text` field:

```js
const element = document.getElementById('content');
const forwardPadding = element.querySelector('[data-padding-forward]');
let previous = [];

function run(items) {
  for (const item of previous) {
    if (!items.includes(item)) item.element?.remove();
  }

  let next = forwardPadding;
  for (const item of [...items].reverse()) {
    const row = (item.element ??= document.createElement('div'));

    row.dataset.sid = String(item.$index);
    row.style.position = item.invisible ? 'fixed' : '';
    row.style.top = item.invisible ? '-99999px' : '';
    row.textContent = `${item.$index}: ${item.data.text}`;

    if (row.nextElementSibling !== next) element.insertBefore(row, next);
    next = row;
  }

  previous = [...items];
}
```

The example illustrates five rendering requirements:

1. **Represent the whole buffer.** The committed DOM has one row per item, in buffer order, between the unchanged padding elements. The callback must not mutate `items` or core-managed fields such as `uid` and `$index`.
2. **Remove and reuse rows.** The example uses `previous` to identify items that left the buffer and remove their rows. Retained items reuse their DOM nodes through `item.element`; those nodes can be updated or moved as needed instead of recreated. Any consumer-owned resources attached to removed rows must also be released.
3. **Keep rows current.** Row content reflects `item.data`, and `data-sid` matches the current `$index`, including when an Adapter operation changes the index of a retained item.
4. **Keep new rows measurable.** With default Routines, `item.invisible` rows are positioned off-screen and outside normal flow, not hidden with `display: none`.
5. **Commit in time.** Renderer state must exist before `new Workflow(...)`, which calls `run([])` during construction. With default Routines, DOM changes must be synchronous; a returned Promise is not awaited.

After `run` adds new rows, `Routines.render` schedules the Scroller's processing of them. When its callback runs, those rows must be in the DOM: the Scroller finds them by `data-sid`, restores normal positioning and measures them. A renderer with a later DOM commit needs a custom [render hook](routines.md#scheduling-and-cancellation) that waits for that commit. Later row-size changes require [Adapter `check()`](adapter-methods.md#check) after the DOM update; the Scroller does not observe them automatically.
