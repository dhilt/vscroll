# Adapter methods

[← Adapter properties](adapter.md) · [Documentation index](index.md) · Working draft

## Results, lifecycle and sequencing

Datasource construction creates the Adapter and permits subscriptions. `Workflow` initialization attaches it and sets `init`; returning from the Workflow constructor does not mean that the first cycle has finished. A scroller-control method called before `init` has no effect, although its result can report `success: true`.

For an integration that remains mounted while initialization completes, the native reactive API permits this sequence:

```js
const adapter = datasource.adapter;
if (!adapter.init) {
  await new Promise(resolve => adapter.init$.once(resolve));
}
const result = await adapter.relax();
```

The `await` after `init$` allows initialization to finish before `relax()` runs. A pending subscription needs cancellation if its integration is disposed first. The same sequence requires the integration's own subscription API when Adapter reactivity has been replaced.

Except for `showLog()`, every method returns a Promise resolving to `{ success: boolean, immediate: boolean, details: string | null }`.

| Field | Meaning |
| --- | --- |
| `success` | Whether the Adapter operation completed without an Adapter error. `true` can also describe a no-op, including a call before initialization. |
| `immediate` | Whether completion required no workflow-settling wait; it does not mean the Promise callback runs synchronously. |
| `details` | An explanation when the operation was ignored, interrupted or failed; otherwise `null`. |

Adapter validation errors resolve with `success: false` rather than rejecting the Promise. This result is not a transaction or a guarantee that application callbacks cannot throw. Dependent operations require explicit sequencing; concurrent calls do not promise an isolated render per call. `reload` and `reset` can interrupt a pending cycle, but do not abort the application's underlying data request. Workflow disposal settles outstanding Adapter work.

### relax

`relax(callback?: () => void)` waits until the scroller is idle, or completes immediately if it already is. The optional callback runs synchronously at that point; its return value is ignored. A superseding `reload`, `reset` or disposal can end a pending wait with `success: false`.

Idleness does not assert that the datasource request succeeded, that a separate consumer render finished, or that the scroller will remain idle. Dependent Adapter calls follow the returned Promise rather than running inside the callback. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#relax).

## Scroller control

### reload

`reload(reloadIndex?: number | string)` discards the rendered Buffer and fetches again around the supplied integer index. Without a valid index it starts at configured `startIndex`; an out-of-range index is clamped to configured bounds. A one-off reload index does not change the configured start.

The existing datasource `get` and settings remain in effect. The internal cache is cleared unless `devSettings.cacheOnReload` is enabled. `reload` can interrupt a busy cycle, but is ignored while paused. It restarts viewport loading rather than retrying one failed range. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#reload).

### reset

`reset(datasource?: { get?, settings?, devSettings? })` reinitializes scroller state, clears the Buffer and cache, and starts a new load. Without an argument it uses the existing datasource configuration. A supplied `get`, `settings` or `devSettings` section replaces that section; omitted sections retain their current values. Individual settings are not deep-merged.

Unlike `reload`, `reset` can apply datasource configuration changes and clears the cache even when `cacheOnReload` is enabled. It is allowed while paused and starts unpaused. It can interrupt a busy cycle while retaining the datasource's public Adapter context. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#reset).

### pause

`pause()` suspends workflow and scroll processing without clearing the Buffer. It does not drain or abort work already in flight; such work may remain pending until `resume()` or `reset()`. While paused, workflow methods other than `resume` and `reset` are ignored; `relax` and `showLog` are not subject to that workflow-method guard. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#pause-resume).

### resume

`resume()` clears the paused state and runs a cycle to reconcile the current viewport. It also starts a cycle when already unpaused. Datasource configuration and buffered data remain in place. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#pause-resume).

## Buffer maintenance

### check

`check()` remeasures buffered DOM rows after an external layout change, updates cached sizes and adjusts scrolling if needed. It does not change datasource values or render DOM changes itself: the changed rows must already be committed before measurement. Unchanged sizes yield an immediate no-op. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#check-size).

### clip

`clip({ forwardOnly?: boolean, backwardOnly?: boolean } = {})` clips eligible offscreen Buffer items, including in `settings.infinite` mode. The viewport and configured overscan are preserved. Without a directional flag, both sides are eligible; `forwardOnly` and `backwardOnly` select the higher- and lower-index sides respectively.

Clipping replaces rows with virtual padding. It does not delete application data or necessarily discard cached sizes. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#clip).

## Item mutations

Adapter mutations change the scroller's Buffer, indexed cache and virtual geometry; they do not persist data in the application collection or server. Subsequent `get(index, count)` responses must reflect the same additions, removals and index shifts, or a later fetch can restore old data. The [basic](https://dhilt.github.io/ngx-ui-scroll/#adapter#append-prepend) and [synchronized](https://dhilt.github.io/ngx-ui-scroll/#adapter#append-prepend-sync) demos illustrate this distinction.

Indexes increase forward—downward in a vertical list, rightward in a horizontal one. Directional options such as `fixRight` refer to lower or higher indexes, not a fixed screen coordinate. `$index` can shift after a mutation and is not an application record ID.

Mutation `items` arrays must be nonempty and contain values with the same JavaScript `typeof`. Predicate callbacks must declare one parameter. Where alternative selectors are shown, exactly one is accepted. Unless stated otherwise, optional flags default to `false`.

### append

`append({ items: Data[], eof?: boolean, decrease?: boolean, virtualize?: boolean })` adds items after the highest cached index. `eof: true` instead targets the known absolute end: items remain virtual when that end is not currently reached. `virtualize: true` keeps a nonempty Buffer unchanged and updates virtual indexes and space, leaving future delivery to `get`. `eof` and `virtualize` are mutually exclusive.

By default, the lower boundary stays fixed and higher indexes extend forward. `decrease: true` fixes the upper side and shifts preceding indexes downward. Array order is preserved. An empty Buffer takes a direct-fill path even with `virtualize`. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#append-prepend).

### prepend

`prepend({ items: Data[], bof?: boolean, increase?: boolean, virtualize?: boolean })` adds before the lowest cached index. `bof: true` targets the known absolute beginning; `virtualize: true` keeps a nonempty Buffer unchanged and reserves virtual space. `bof` and `virtualize` are mutually exclusive.

By default, the upper boundary stays fixed and indexes extend backward. `increase: true` fixes the lower side and shifts following indexes upward instead. In a nonempty Buffer the input array is processed in reverse order: prepending `['X', 'Y']` displays Y before X. An empty Buffer takes the direct-fill path. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#append-prepend).

### insert

`insert({ items: Data[], before?, after?, beforeIndex?: number, afterIndex?: number, decrease?: boolean })` inserts a block relative to exactly one target. `before` and `after` are predicates on buffered items; numeric targets may also address eligible virtual positions within known boundaries. The first predicate match is used.

Array order is preserved. By default, following indexes shift upward; `decrease: true` shifts preceding indexes downward instead. No matching target is an immediate no-op. With an empty Buffer, an integer numeric target establishes a new indexed range. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#insert).

### remove

`remove({ predicate?: (item) => boolean, indexes?: number[], increase?: boolean })` accepts either a predicate for buffered items or a list of indexes that may also include eligible virtual positions. Indexes must be unique integers.

By default, following indexes decrease and the upper boundary shrinks. `increase: true` shifts preceding indexes upward and fixes the upper side instead. No eligible match is an immediate no-op. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#remove).

### replace

`replace({ items: Data[], predicate: (item) => boolean, fixRight?: boolean })` replaces all matching buffered items with one block. Matches need not be adjacent; unmatched items remain. The block is placed at the lowest match by default, or at the highest match with `fixRight: true`.

`fixRight: false` fixes the lower side and lets the upper boundary absorb the count change; `true` fixes the upper side. An unmatched predicate produces a no-op. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#replace).

### update

`update({ predicate: (item) => unknown, fixRight?: boolean })` applies a synchronous transformation to each buffered item. The callback's return value determines the action:

| Return value | Action |
| --- | --- |
| Falsy value or `[]` | Remove the item. |
| Truthy non-array value | Retain the item. |
| Nonempty data array | Replace the item with that array, preserving its order. |

Including the original `item.data` value by identity (`===`) in a returned array retains that core item; other values create new items. Reusing that value twice is unsupported. A returned object alone retains rather than replaces the item, and an async callback returns a truthy Promise rather than an awaited transformation.

`fixRight` has the boundary effect described for `replace` and reverses callback traversal to high-to-low. If every item is retained, the method may finish without a render cycle. [Interactive demo](https://dhilt.github.io/ngx-ui-scroll/#adapter#update).

The older `append(items, eof?)`, `prepend(items, bof?)` and `remove(predicate)` overloads remain available for compatibility. The options-object signatures above avoid ambiguity when a data object itself has an `items` property.

## Advanced and diagnostics

### fix (experimental)

`fix({ scrollPosition?, minIndex?, maxIndex?, updater?, scrollToItem?, scrollToItemOpt? })` performs direct runtime adjustments. Multiple supplied options are processed in the order shown below. The method result does not wait for a cycle caused by scrolling.

| Option | Effect |
| --- | --- |
| `scrollPosition` | Integer pixel position; `-Infinity` and `Infinity` select the beginning and scrollable end. |
| `minIndex`, `maxIndex` | Change the current absolute bounds without fetching or trimming items. |
| `updater` | Callback on buffered item wrappers; its `update()` argument requests a new Buffer-array reference after a change. |
| `scrollToItem` | Predicate locating the first matching buffered item; missing items are not fetched. |
| `scrollToItemOpt` | `boolean` or `ScrollIntoViewOptions` passed to the item-scroll routine; requires `scrollToItem`. |

Bounds changed through `fix` must remain consistent with datasource indexing; a later `reload` restores the stored configured limits. [Position](https://dhilt.github.io/ngx-ui-scroll/#experimental#adapter-fix-position), [updater](https://dhilt.github.io/ngx-ui-scroll/#experimental#adapter-fix-updater) and [scroll-to-item](https://dhilt.github.io/ngx-ui-scroll/#experimental#adapter-fix-scrollToItem) demos cover the separate options.

### showLog

`showLog(): void` flushes buffered diagnostic messages when `devSettings.debug` is enabled and `immediateLog` is disabled. With immediate logging, messages have already reached the console; with debug disabled, there are none to flush. See [Configuration](configuration.md#development-settings).
