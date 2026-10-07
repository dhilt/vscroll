# Troubleshooting

[← Documentation index](index.md)

The scroller depends on data retrieval, rendering the buffer in the DOM and measuring its geometry. The table below connects common problems to these requirements; the diagnostic log shows the engine's actions and changes in list state.

## Common problems

| Symptom | Possible cause |
| --- | --- |
| Error during scroller construction | The exception message identifies an invalid argument or a missing padding element. `run` must declare one parameter, and `get` at least two. The contracts are described in [Workflow](workflow.md#constructor), [Datasource](datasource.md#asynchronous-delivery-and-errors) and [Rendering](rendering.md#required-dom-and-layout). |
| `Can not associate item with element` | When new rows are processed, the DOM has not yet been updated or a row cannot be found by its current `data-sid`. See the [`run` contract and rendering timing](rendering.md#the-runitems-callback). |
| Loading never finishes | An unsettled Promise, a missing callback invocation or an Observable completing without an array or an error leaves the `get` request pending. Returning an array directly is not supported. This is a data-delivery problem, not a datasource validation failure; see [supported `get` signatures](datasource.md#asynchronous-delivery-and-errors). |
| Loading stops before the end of the dataset | A short or empty `get` response signals a dataset boundary, not a partial page or an error. See [data boundaries](datasource.md#data-ranges-and-boundaries). |
| Data arrives, but the list or scroll range is missing | The viewport must be scrollable and have a constrained size, and rows must be measurable. `itemSize` provides an estimate, not a CSS size. See the [DOM geometry requirements](rendering.md#required-dom-and-layout). |
| The list jumps when rows are added or removed | Recreating retained DOM nodes, incorrect row order or unaccounted margins and gaps disrupt position preservation and geometry. See the [rendering requirements](rendering.md#the-runitems-callback). |
| Images or other content change row sizes later | Size changes are not tracked automatically. After the DOM update, [Adapter `check()`](adapter-methods.md#check) remeasures rows and corrects the geometry if needed. |
| A changed setting has no effect | Settings are read during scroller construction; modifying the original object does not update a running instance. New configuration is supplied through `reset()`. See [applying settings](configuration.md#validation-and-applying-changes). |
| An Adapter method succeeds without performing an operation | Before initialization or while paused, a call may complete with `success: true`, `immediate: true` and an explanation in `details`. See [calling methods](adapter-methods.md#calling-methods). |
| Removed data reappears after scrolling | Adapter operations change the scroller's list, not the application's underlying data. Subsequent `get` responses must reflect these changes; see [data consistency](adapter-methods.md#data-consistency). |

## Development log

The diagnostic log connects data requests, rendering, clipping and viewport adjustments. It shows where a problem occurs and how the buffer and geometry change.

### Obtaining a log

Logging is enabled through the datasource's `devSettings.debug`. For example, deferred output can be configured as follows:

```js
import { makeDatasource } from 'vscroll';

const Datasource = makeDatasource();
const datasource = new Datasource({
  get,
  devSettings: { debug: true, immediateLog: false }
});
```

Here, `get` is the application's data-retrieval function, and `datasource` is passed to `Workflow`. After the relevant actions, the recorded messages can be printed through the Adapter:

```js
datasource.adapter.showLog();
```

`showLog()` prints and clears the recorded log. With `immediateLog: true` (the default), messages appear in the console immediately; with `debug: false`, logging is disabled. Deferred messages remain in memory until printed, so leaving deferred logging enabled can increase memory usage.

`logProcessRun: true` adds internal process-start events, while `logColor: false` disables color formatting for plain-text output. Timing and other options are described in [diagnostic settings](configuration.md#diagnostics).

### Reading a log

The log begins with the core and consumer versions, followed by settings with defaults applied. The `WF Cycle … STARTED/FINALIZED` markers delimit a Workflow cycle: work triggered by initialization, a relevant scroll event or an Adapter operation. Within it, `loop … start/done` marks inner loops—passes through data retrieval, rendering, clipping and viewport adjustments. Unnecessary steps are skipped; remaining work starts another loop.

The `fetch interval` entries show range calculations, including intermediate ones. An actual request is marked `going to fetch …`, and its response `resolved … items (index, count)`. Multiple calculated ranges do not imply multiple `get` calls.

The `stat` entries connect row processing to geometry: `pos` is the scroll position, `size` the content element's size along the scroll axis, `bwd_p` and `fwd_p` the padding element sizes, and `default` the estimated row size. `items` and `range` describe the count and index range of revealed buffer rows, including those outside the visible area.

The following initial-load example from the [Dev-Log wiki](https://github.com/dhilt/vscroll/wiki/Dev-Log) contains one cycle and three inner loops.

![Initial-load log: one Workflow cycle and three inner loops](https://user-images.githubusercontent.com/4365660/133511893-4854cf97-27e7-4657-ad7a-d00d639dd1a1.png)

1. **The first loop** requests 10 items starting at index `1`. After rendering, measurements produce a row-size estimate of `20`; `items` becomes `10`, and `range` becomes `[1..10]`.
2. **The second loop** loads 10 preceding items starting at index `-9`. The buffer expands to `[-9..10]`, and the scroll position is adjusted to `200`, preserving the original position of item `1` in the viewport.
3. **The third loop** determines that no new data is needed: `fetch interval after Buffer flushing` reports `no`. There is no `get` request, and the cycle ends with `FINALIZED`.

Multiple loops and requests within one cycle are not, by themselves, signs of a problem.

The log is complemented by `workflow.errors`, which records engine failures with their process, message, time and inner loop. This list is available until `workflow.dispose()` and does not capture all JavaScript exceptions.

## Reporting a problem

Problems with the scroller can be reported through [GitHub issues](https://github.com/dhilt/vscroll/issues). A report must include a link to a minimal runnable demo that reproduces the issue, hosted on StackBlitz or another publicly accessible platform.

The [VScroll test demo](https://stackblitz.com/edit/vscroll-1-8-4-test-demo) can be forked as a starting point.

The report describes the steps to reproduce, expected behavior and actual behavior. Diagnostic logs and error messages can be attached when available.
