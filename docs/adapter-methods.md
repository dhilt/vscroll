# Adapter methods

[← Adapter properties](adapter.md) · [Documentation index](index.md) · Working draft

The Adapter exposes methods for working with a running scroller: waiting for it to settle, reloading data, and changing buffered items. The table below lists their arguments and behavior.

| Method | Arguments | Description |
| --- | --- | --- |
| <a name="relax"></a> `relax` | <code>callback?:&nbsp;()&nbsp;=&gt;&nbsp;void</code> | Wait until the scroller is idle. If it is already idle, `callback` may run synchronously before the returned Promise resolves; otherwise it runs when the scroller settles. A reload, reset, or disposal can end a pending wait with `success: false` without calling `callback`. Idle does not imply that a datasource request succeeded. |
| <a name="reload"></a> `reload` | <code>reloadIndex?:&nbsp;number&nbsp;&#124;&nbsp;string</code> | Clear the Buffer, reset the scroll position, and load data starting at `reloadIndex`. If omitted or invalid, the index falls back to `settings.startIndex` (default `1`), within configured bounds; the setting itself is unchanged. An active cycle may be interrupted, but the call completes without performing the operation while paused. The internal cache of item indexes and measured sizes is cleared unless `devSettings.cacheOnReload` is enabled. |
| <a name="reset"></a> `reset` | <code>datasource?:&nbsp;{</code><br>&nbsp;&nbsp;<code>get?:&nbsp;function;</code><br>&nbsp;&nbsp;<code>settings?:&nbsp;object;</code><br>&nbsp;&nbsp;<code>devSettings?:&nbsp;object;</code><br>`}` | Rebuild the scroller and start a new load. With no argument, reuse the current datasource configuration. Supplied `get`, `settings`, or `devSettings` replace the corresponding sections; omitted sections remain, but individual settings omitted from a supplied `settings` object return to their defaults. The Buffer and index-and-size cache are cleared even with `cacheOnReload`. An active cycle can be interrupted; reset also works while paused and resumes processing. The public datasource and Adapter remain the same objects. See [Datasource](datasource.md) for `get` signatures and [Configuration](configuration.md) for settings. |
| <a name="pause"></a> `pause` | — | Pause scroller processing without clearing the Buffer. While paused, viewport scroll events do not trigger processing and most Adapter calls complete without performing an operation; `resume()` and `reset()` remain available. |
| <a name="resume"></a> `resume` | — | Clear the paused state and start a scroller cycle. A cycle also starts if the scroller was not paused. |
| <a name="check"></a> `check` | — | Remeasure rendered rows after a DOM or layout change outside normal scroller processing. If their sizes changed, update size estimates and adjust scrolling; fetching or rendering may follow. The DOM change must be committed before `check()` runs. |
| <a name="clip"></a> `clip` | <code>options?:&nbsp;{</code><br>&nbsp;&nbsp;<code>forwardOnly?:&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>backwardOnly?:&nbsp;boolean;</code><br>`}` | Remove buffered rows beyond the visible area and configured padding, replacing their space with virtual padding; datasource items are not deleted. By default, both sides are eligible for clipping. `forwardOnly` limits clipping to the higher-index side; `backwardOnly` limits it to the lower-index side. The two flags cannot be combined. This also works in `infinite` mode. |
| <a name="append"></a> `append` | <code>options:&nbsp;{</code><br>&nbsp;&nbsp;<code>items:&nbsp;Data[];</code><br>&nbsp;&nbsp;<code>eof?:&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>decrease?:&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>virtualize?:&nbsp;boolean;</code><br>`}` | Add nonempty `items` after the highest cached index, rendering them if they adjoin the current Buffer; otherwise they remain virtual until fetched. `eof: true` instead inserts at the known dataset end and renders only when the Buffer reaches it. `virtualize: true` keeps the items virtual even there; it cannot be combined with `eof`. Later indexes increase by default; `decrease: true` fixes the upper boundary and decreases preceding indexes instead. Input order is preserved. An empty Buffer is filled directly. |
| <a name="prepend"></a> `prepend` | <code>options:&nbsp;{</code><br>&nbsp;&nbsp;<code>items:&nbsp;Data[];</code><br>&nbsp;&nbsp;<code>bof?:&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>increase?:&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>virtualize?:&nbsp;boolean;</code><br>`}` | Add nonempty `items` before the lowest cached index, rendering them if they adjoin the current Buffer; otherwise they remain virtual until fetched. `bof: true` instead inserts at the known dataset beginning and renders only when the Buffer reaches it. `virtualize: true` keeps the items virtual even there; it cannot be combined with `bof`. Earlier indexes decrease by default; `increase: true` fixes the lower boundary and increases later indexes instead. Input order is reversed. An empty Buffer is filled directly. |
| <a name="insert"></a> `insert` | <code>options:&nbsp;{</code><br>&nbsp;&nbsp;<code>items:&nbsp;Data[];</code><br>&nbsp;&nbsp;<code>before?:&nbsp;(item)&nbsp;=&gt;&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>after?:&nbsp;(item)&nbsp;=&gt;&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>beforeIndex?:&nbsp;number;</code><br>&nbsp;&nbsp;<code>afterIndex?:&nbsp;number;</code><br>&nbsp;&nbsp;<code>decrease?:&nbsp;boolean;</code><br>`}` | Insert a nonempty `items` array before or after a target. Exactly one of `before`, `after`, `beforeIndex`, or `afterIndex` is required. The `before` and `after` callbacks select the first matching buffered item; `beforeIndex` and `afterIndex` can also target virtual positions within known dataset bounds. With an empty Buffer, use `beforeIndex` or `afterIndex`. Input order is preserved. Later indexes increase by default; `decrease: true` decreases preceding indexes instead. If no target is found, no insertion occurs. |
| <a name="remove"></a> `remove` | <code>options:&nbsp;{</code><br>&nbsp;&nbsp;<code>predicate?:&nbsp;(item)&nbsp;=&gt;&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>indexes?:&nbsp;number[];</code><br>&nbsp;&nbsp;<code>increase?:&nbsp;boolean;</code><br>`}` | Remove buffered or eligible virtual items. The `predicate` callback tests each buffered item and selects those for which it returns `true`; `indexes` can also target virtual positions. Exactly one of `predicate` or `indexes` is required; indexes should be distinct integers. Following indexes decrease by default; `increase: true` increases preceding indexes instead. If nothing matches, the indexed data remains unchanged. |
| <a name="replace"></a> `replace` | <code>options:&nbsp;{</code><br>&nbsp;&nbsp;<code>items:&nbsp;Data[];</code><br>&nbsp;&nbsp;<code>predicate:&nbsp;(item)&nbsp;=&gt;&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>fixRight?:&nbsp;boolean;</code><br>`}` | Replace buffered items with new data. The `predicate` callback tests each buffered item and should select one contiguous block; `items` supplies the replacements. Virtual items cannot be selected. By default, the lower side stays fixed and later indexes absorb a change in item count. `fixRight: true` fixes the upper side and shifts preceding indexes instead. If `predicate` matches nothing, the indexed data remains unchanged. |
| <a name="update"></a> `update` | <code>options:&nbsp;{</code><br>&nbsp;&nbsp;<code>predicate:&nbsp;(item)&nbsp;=&gt;&nbsp;unknown;</code><br>&nbsp;&nbsp;<code>fixRight?:&nbsp;boolean;</code><br>`}` | Modify the current Buffer by keeping, removing, or replacing items. The `predicate` callback runs synchronously for each buffered item; its result determines the action: a falsy value or `[]` removes it; a truthy non-array value keeps it; a nonempty array replaces it with those data values. Returning an object alone does not replace `item.data`. If an array contains the original `item.data` by identity, that entry retains the existing item and must not be repeated; other values create new items. The callback is not awaited. By default, the lower boundary stays fixed and changes in item count shift later indexes. `fixRight: true` fixes the upper boundary instead and processes items from high to low. |
| <a name="fix"></a> `fix` | <code>options:&nbsp;{</code><br>&nbsp;&nbsp;<code>scrollPosition?:&nbsp;number;</code><br>&nbsp;&nbsp;<code>minIndex?:&nbsp;number;</code><br>&nbsp;&nbsp;<code>maxIndex?:&nbsp;number;</code><br>&nbsp;&nbsp;<code>updater?:&nbsp;(item,&nbsp;update)&nbsp;=&gt;&nbsp;void;</code><br>&nbsp;&nbsp;<code>scrollToItem?:&nbsp;(item)&nbsp;=&gt;&nbsp;boolean;</code><br>&nbsp;&nbsp;<code>scrollToItemOpt?:&nbsp;boolean&nbsp;&#124;&nbsp;ScrollIntoViewOptions;</code><br>`}` | Experimental direct adjustments. `scrollPosition` sets an integer pixel offset; `-Infinity` and `Infinity` select the beginning and end. `minIndex` and `maxIndex` change dataset bounds without fetching or removing buffered items. `updater` visits buffered items; calling its `update()` argument requests a new Buffer reference and render. `scrollToItem` finds the first matching buffered item without fetching, and `scrollToItemOpt` configures how it is scrolled into view. Combined options run in the order shown. The result does not wait for a cycle caused by scrolling. |
| <a name="showlog"></a> `showLog` | — | Print queued diagnostic messages when `devSettings.debug` is enabled and `immediateLog` is disabled. With `immediateLog`, diagnostics are printed as they occur. Unlike the other methods, this one does not return a Promise. |

## Calling methods

Adapter methods can trigger several internal scroller processes, including data fetching, rendering, and viewport adjustment. Some of these processes may be asynchronous. All methods except `showLog()` return a Promise that resolves when the method has finished its work, providing a result object with the following fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `success` | `boolean` | `true` — successful completion; `false` — error or interruption. |
| `immediate` | `boolean` | `true` for immediate completion. `false` does not necessarily mean asynchronous execution. The result is always returned through a Promise. |
| `details` | `string \| null` | Reason for an error, interruption, or completion without performing an operation; otherwise `null`. |

Adapter methods are available as `datasource.adapter` immediately after datasource instantiation from the class returned by `makeDatasource()`. Before `Workflow` initializes the Adapter, calls complete without performing an operation and return `success: true`, `immediate: true`, and `details: 'Adapter is not initialized'`.

```js
const Datasource = makeDatasource();
const datasource = new Datasource({ get });
const adapter = datasource.adapter;

const before = await adapter.relax();
console.log(before); // { success: true, immediate: true, details: 'Adapter is not initialized' }
const initialized = new Promise(resolve => adapter.init$.once(resolve));

new Workflow({ consumer, element, datasource, run }); // Workflow init -> Adapter init
await initialized;
const after = await adapter.relax();
console.log(after); // { success: true, immediate: false | true, details: null }
```

When the scroller is paused through `adapter.pause()`, most Adapter method calls likewise complete without performing an operation, returning `success: true`, `immediate: true`, and `details: 'Scroller is paused'`. The methods `reset()`, `resume()`, `relax()`, and `showLog()` remain available.

Correct sequencing matters in chains of Adapter calls. If an operation depends on the previous one finishing, its call must follow the resolution of the previous method's Promise:

```js
await adapter.reload();
await adapter.append({ items });
```

`reload()` and `reset()` suppress results from superseded `get` calls but do not cancel the underlying external requests. Transport cancellation is the integration's responsibility.

## Callbacks and items

Some Adapter methods take callbacks that select or modify items in the current Buffer. These callbacks receive an `item` of type `IAdapterItem<Data>`, abbreviated as `(item)` in the methods table. It contains the following fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `data` | `Data` | Original application data. |
| `$index` | `number` | Current item position in the dataset. |
| `uid` | `number` | Item instance identifier, retained when its index changes. |
| `element` | `HTMLElement` | Reference to the DOM row, if already available. Optional field. |

For example, the `predicate` parameter of `remove()` selects items for removal by the `id` field in their application data:

```js
await adapter.remove({ predicate: item => item.data.id === idToRemove });
```

The callbacks `before`, `after`, `predicate`, and `scrollToItem` must declare exactly one parameter and return synchronously; returned Promises are not awaited. Selection callbacks return `boolean`; the `predicate` of `update()` determines item changes as described in the methods table. The `fix.updater` callback may declare one or two parameters; the second is an `update()` function of type `() => void`.

Unlike callback arguments, the `items` parameter takes original application data (`Data[]`), not Buffer items. It must be a nonempty array of values with the same JavaScript type (`typeof`).

## Data consistency

Data consistency means that scroller state and `datasource.get` responses reflect the same records in the same order. Adapter insertions, removals, replacements, and updates change scroller state; matching changes in the application's data source are handled by the integration. Otherwise, a later range request after scrolling or `reload()` may lose added records or bring removed ones back.

The sequence is `relax()` → update the data source → call the Adapter method. The method itself may trigger a new `get` call, so the source must already reflect the change. `relax()` waits for current work to finish; it does not lock the scroller against future work.

For example, the datasource reads an array with indexes starting at `1`, and `removeC()` removes the record with `id: 'c'` after scroller initialization:

```js
let DATA = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const datasource = new Datasource({
  get: (index, count, done) => done(DATA.slice(index - 1, index - 1 + count)),
  settings: { startIndex: 1, minIndex: 1 }
});

async function removeC() {
  await datasource.adapter.relax();
  DATA = DATA.filter(data => data.id !== 'c'); // Sync the change at the datasource level
  await datasource.adapter.remove({ predicate: ({ data }) => data.id === 'c' });
}
```

After removal, the record with `id: 'c'` is absent from both the Buffer and `get` responses. A stable record identifier can be stored in `item.data`; in contrast, `item.$index` denotes its current position and can change after insertions or removals.

Index shifts in the source must match the strategy selected through `increase`, `decrease`, or `fixRight`. This also applies to virtual operations on records outside the Buffer. Explicit dataset bounds and any datasource cache must remain consistent with the changes.
