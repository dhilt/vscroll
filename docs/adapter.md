# Adapter API

[← Documentation index](index.md) · [Adapter methods →](adapter-methods.md)

The Adapter adds runtime observation and control to virtual scrolling. It exposes workflow state, visible items and dataset boundaries, and supports data changes without recreating `Workflow`. It is available as `datasource.adapter` when the datasource is constructed through [`makeDatasource()`](datasource.md#creating-a-datasource-with-an-adapter). The Adapter exists at datasource construction; scroller-control methods take effect after Workflow initialization.

## Properties

Adapter properties are read-only. A property ending in `$` is the reactive counterpart of its scalar property; the core subscription API is described [below](#reactive-subscriptions).

| Property | Type | Meaning |
| --- | --- | --- |
| `init`, `init$` | `boolean`, reactive boolean | Becomes `true` when `Workflow` connects the Adapter to the scroller. This does not signal completion of the first load. |
| `isLoading`, `isLoading$` | `boolean`, reactive boolean | Indicates whether the scroller is busy with a Workflow cycle. [Details below](#cycles-and-inner-loops). |
| `loopPending`, `loopPending$` | `boolean`, reactive boolean | Indicates whether a Workflow cycle is running an inner loop (fetch/render/adjust). [Details below](#cycles-and-inner-loops). |
| `itemsCount` | `number` | Number of non-invisible Buffer items, including offscreen overscan; not the dataset total. |
| `bufferInfo` | `IBufferInfo` | Summarizes the Buffer range, cache, and dataset boundaries. [Details below](#bufferinfo). |
| `firstVisible`, `firstVisible$` | `IAdapterItem<Data>`, reactive item | First item visible in the viewport, even partially. |
| `lastVisible`, `lastVisible$` | `IAdapterItem<Data>`, reactive item | Last item visible in the viewport, even partially. |
| `bof`, `bof$` | `boolean`, reactive boolean | Indicates whether the Buffer has reached the known beginning of the dataset. |
| `eof`, `eof$` | `boolean`, reactive boolean | Indicates whether the Buffer has reached the known end of the dataset. |
| `paused`, `paused$` | `boolean`, reactive boolean | Indicates whether Workflow processing is paused. |
| `packageInfo` | object | Core and consumer `name`/`version` metadata. |
| `version` | `string` | Core version associated with this Adapter context. |

### Reactive subscriptions

The built-in `$` properties provide `get()` for the current value, `on(callback)` for updates, and `once(callback)` for one notification. Both subscription methods return a cancellation function.

Boolean properties do not emit their current value on subscription. A listener installed before `Workflow` construction observes the initial loading cycle without an extra read. Here, `#loading-indicator` starts hidden in the markup:

```js
const indicator = document.getElementById('loading-indicator');
const off = datasource.adapter.isLoading$.on(loading => {
  indicator.hidden = !loading;
});
new Workflow({ consumer, element, datasource, run });

// When the integration is removed:
off();
```

For a listener installed after the scroller starts, read the scalar value as well to initialize the indicator.

Notifications are synchronous, and identical (`===`) values are not emitted again. `firstVisible$` and `lastVisible$` differ from the boolean properties: they emit their current value on subscription, possibly `EMPTY_ITEM` before an item is visible. Thus, `once()` on either does not necessarily wait for a visible item. Reactive properties report Adapter state; they do not control it. A [custom reactive configuration](datasource.md#consumer-specific-adapter-reactivity) may replace the built-in subscription API.

### Cycles and inner loops

A Workflow cycle is a processing session started by initialization, a relevant scroll event, or an Adapter operation. It remains active until the scroller has finished the resulting work; `isLoading` marks this whole interval. One cycle may contain several inner loops.

An inner workflow loop is one pass through the needed work: determining missing data, fetching it when needed, rendering and measuring rows, clipping the Buffer, and adjusting scrolling geometry. Some steps may be skipped. If a pass reveals more work—for example, the rendered rows are shorter than estimated—another loop follows within the same cycle. `loopPending` marks each individual pass.

Cycles and inner loops are fundamental to VScroll's internal architecture. The [Workflow wiki page](https://github.com/dhilt/vscroll/wiki/VScroll-Workflow) provides detailed flowcharts of both.

### bufferInfo

`bufferInfo` provides a snapshot of the current Buffer state, computed on access rather than updated in place.

| Field | Meaning |
| --- | --- |
| `firstIndex`, `lastIndex` | Lowest and highest indexes in the current Buffer; `NaN` when it is empty or before initialization. |
| `minIndex`, `maxIndex` | Lowest and highest cached indexes, including previously rendered items; `NaN` before initialization, or `startIndex` when the initialized cache is empty. |
| `absMinIndex`, `absMaxIndex` | Known absolute dataset boundaries, supplied by settings or inferred from datasource responses; Adapter operations may change them. Unknown bounds remain infinite. Before initialization, they are `-Infinity` and `Infinity`, respectively. |
| `defaultSize` | Current estimated item size where an individual size is unknown; `NaN` before initialization. |

### Visible items

`firstVisible` and `lastVisible` identify the first and last items intersecting the viewport, including partially visible rows. Unlike the Buffer's edges, these delimit the visible range. When both are available, the visible item count cannot exceed `itemsCount`, which also includes offscreen buffered items:

```js
const visibleCount = adapter.lastVisible.$index - adapter.firstVisible.$index + 1;
expect(visibleCount).toBeLessThanOrEqual(adapter.itemsCount);
```

Tracking of each edge begins when its scalar or `$` property is first accessed. Until a visible item is available, the value is `EMPTY_ITEM`, not an item with a usable `$index` or DOM element. The reactive properties report changes to the visible edges, not every scroll event or in-place change to an item's data.
