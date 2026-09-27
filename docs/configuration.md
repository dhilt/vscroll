# Configuration

[← Documentation index](index.md) · Working draft

Configuration is supplied through the [datasource](datasource.md) passed to `Workflow`. Its optional `settings` object controls scrolling; `devSettings` controls diagnostics and lower-level behavior. Both are read when the scroller is created. Sizes below are CSS pixels along the scrolling axis, and delays are milliseconds.

```js
const datasource = new Datasource({
  get,
  settings: { startIndex: 1, padding: 0.5 },
  devSettings: { debug: true }
});
```

## Settings

### Bounds and initial positioning

The scroller requests items by consecutive integer indexes. Bounds describe the available dataset, while `startIndex` selects the initial position.

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `startIndex` | Integer | `1` | Initial index, clamped to the bounds; zero and negative indexes are valid. |
| `minIndex` | Integer or infinity | `-Infinity` | Inclusive lower bound. |
| `maxIndex` | Integer or infinity | `Infinity` | Inclusive upper bound. |

For a nonempty dataset, use `minIndex <= startIndex <= maxIndex`. Unknown ends are discovered through [short responses](datasource.md#data-ranges-and-boundaries). Indexes are positions, not permanent record IDs.

Bounds also shape the scrollbar. With neither bound known, its range reflects the items discovered so far and grows as more data is fetched. A known bound lets the scroller estimate virtual space on that side; with both bounds known, the scrollbar represents the estimated extent of the full dataset from the initial load. The scrollable range and thumb size can still change as rendered rows are measured.

### Buffering and scrolling mode

The buffer includes visible rows and a margin of offscreen rows. These settings determine how much is requested and retained around the viewport.

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `bufferSize` | Integer ≥ `1` | `5` | Minimum fetch batch target, not a limit on buffered rows or a fixed `get` count. |
| `padding` | Number ≥ `0.01` | `0.5` | Target offscreen content on each side, measured in viewport sizes. `0.5` means roughly half a viewport per side. |
| `infinite` | `boolean` | `false` | Disables automatic clipping, so loaded rows remain in the buffer and DOM. |

Increasing `padding` or `bufferSize` can reduce fetch frequency at the cost of more rendered content. In infinite mode, explicit [Adapter `clip()`](adapter-methods.md#clip) is still available.

### Size estimates and layout

Before the first render, the scroller estimates how many rows to request for the viewport and its outlets. Without `itemSize`, the first request uses `bufferSize` as its batch target.

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `itemSize` | Integer ≥ `1` | `NaN` (unknown) | Initial row-height estimate, or row-width estimate in horizontal mode, used to size the first request and estimate virtual space. It does not set a CSS size. |
| `sizeStrategy` | `SizeStrategy` | `'average'` | Estimate unknown rows using an average, the most frequent measured size, or a constant estimate: `'average'`, `'frequent'`, or `'constant'`. |

After rendering, the scroller measures actual row sizes. With `'average'` (the default) or `'frequent'`, later requests use those measurements rather than the initial `itemSize` estimate. With `'constant'`, `itemSize` remains the estimate for unseen rows; if omitted, the first measured size takes its place. No strategy forces equal CSS sizes. In TypeScript, use the exported `SizeStrategy` enum (for example, `SizeStrategy.Frequent`). See [Rendering](rendering.md) for the DOM and layout requirements.

### Viewport and horizontal scrolling

The viewport is the scrollable area whose position and size the scroller tracks; by default, it is the content element's parent. `windowViewport` and `viewportElement` choose a different scroll target, while `horizontal` changes the scroll axis.

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `windowViewport` | `boolean` | `false` | Use the browser window for scrolling and viewport dimensions. |
| `viewportElement` | `HTMLElement`, synchronous function returning one, or `null` | `null` | Use an explicit viewport instead of the content element's parent. Experimental. |
| `horizontal` | `boolean` | `false` | Scroll and measure along the horizontal axis; the DOM/CSS layout must also be horizontal. |

`windowViewport` takes precedence over `viewportElement`. A viewport factory is evaluated when the scroller is created; it must return an element synchronously. An invalid result falls back to the parent viewport.

### Other settings

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `inverse` | `boolean` | `false` | Align content shorter than the viewport to the bottom/right without reversing item order. Experimental. |
| `onBeforeClip` | `(items: IAdapterItem<T>[]) => void` or `null` | `null` | Called synchronously after clipped rows are hidden, before their items leave the buffer. Experimental. |

## Development settings

`devSettings` exposes diagnostic logging as well as timing, cache, and browser-behavior controls. The [development log](https://github.com/dhilt/vscroll/wiki/Dev-Log) explains how a trace reveals workflow cycles, data fetches, rendering, clipping, and scroll adjustments. For a focused trace, set `devSettings: { debug: true, immediateLog: false }` and call `datasource.adapter.showLog()` after the activity of interest; this requires an [Adapter-enabled datasource](datasource.md#creating-a-datasource-with-an-adapter).

### Diagnostics

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `debug` | `boolean` | `false` | Enable core logging; the other logging options have no effect without it. |
| `immediateLog` | `boolean` | `true` | Print messages immediately. If false, keep them in memory until [Adapter `showLog()`](adapter-methods.md#showlog) flushes them. |
| `logProcessRun` | `boolean` | `false` | Include process fire/run events. |
| `logTime` | `boolean` | `false` | Include elapsed workflow time. |
| `logColor` | `boolean` | `true` | Apply console colors to logs. |

### Timing, caching, and browser behavior

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `throttle` | Integer ≥ `0` | `40` | Throttle scroll-event handling in milliseconds. |
| `initDelay` | Integer ≥ `0` | `1` | Base delay before workflow initialization, in milliseconds. |
| `initWindowDelay` | Integer ≥ `0` | `40` | Initialization-delay candidate in window mode when `history.scrollRestoration` is unavailable; the larger applicable delay is used. |
| `cacheData` | `boolean` | `false` | Retain item data with measured sizes and indexes in the internal cache; it does not answer `get` requests. |
| `cacheOnReload` | `boolean` | `false` | Retain the internal cache and size estimate across [Adapter `reload()`](adapter-methods.md#reload), not rendered rows. |
| `dismissOverflowAnchor` | `boolean` | `true` | Disable native overflow anchoring on the viewport so it does not compete with scroller adjustments. |
| `directionPriority` | `'backward'` or `'forward'` | `'backward'` | Choose which side stays fixed when measured sizes change: usually top/left; `'forward'` can anchor bottom/right when fetching before retained items. |

Retained cache entries are useful only while their indexes still refer to the same data and layout. They are separate from an [application-side cache of datasource requests](datasource.md#caching-datasource-requests).

With native routines, window mode sets `history.scrollRestoration` to `'manual'` where supported, and `dismissOverflowAnchor` sets an inline viewport style. Workflow disposal does not restore these browser settings.

## Validation and applying changes

All fields are optional. Missing or invalid values take their defaults; unknown fields are ignored. Valid numbers below a listed minimum are clamped to it. For example, `bufferSize: 0` becomes `1`, while a fractional `bufferSize` is invalid and falls back to `5`. TypeScript expects numbers and booleans, although runtime validation also accepts numeric strings and the exact strings `'true'` and `'false'`.

Configuration is read during scroller construction: changing the original object does not update a running scroller. [Adapter `reload()`](adapter-methods.md#reload) retains its settings; [Adapter `reset()`](adapter-methods.md#reset) can supply new datasource configuration. A supplied `settings` or `devSettings` section replaces that section rather than merging individual fields, so include the options that must be retained. For TypeScript, the datasource can be typed as `IDatasource<T>`; `Settings` and `DevSettings` are not package-root exports.
