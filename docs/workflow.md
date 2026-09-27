# Workflow and lifecycle

[← Documentation index](index.md) · Working draft

Constructing `Workflow` starts the virtual scroll engine for a mounted list. Prepare the content DOM and renderer first. See [Virtual scrolling model](virtual-scrolling.md) for how the datasource, item buffer and DOM fit together.

## Constructor

```ts
import { Workflow, makeDatasource } from 'vscroll';

const Datasource = makeDatasource();
const datasource = new Datasource<MyRecord>({ get, settings });

const workflow = new Workflow<MyRecord>({
  consumer: { name: 'my-integration', version: '1.0.0' },
  element: contentElement,
  datasource,
  run: items => render(items)
});
```

Here `MyRecord`, `get`, `settings`, `contentElement` and `render` are supplied by the integration. The datasource can also be a plain object with `get`; the factory makes the [Adapter API](adapter.md) available before Workflow construction.

| Parameter | Type | Contract |
| --- | --- | --- |
| `consumer` | `{ name: string; version: string }` | Static integration metadata used in diagnostics. |
| `element` | `HTMLElement` | Mounted **content** element containing the padding elements, not the scrollable viewport. See [Rendering](rendering.md#required-dom-and-layout). |
| `datasource` | `IDatasource<Data>` | Supplies indexed data and optional scrolling configuration. See [Datasource](datasource.md). |
| `run` | `(items: Item<Data>[]) => void` | Consumer callback for rendering buffered items. It must declare one parameter; its return value is not awaited. See [Rendering](rendering.md#the-runitems-callback). |
| `Routines` | Subclass of `Routines`, optional | Customizes DOM operations and render scheduling. See [Custom Routines](routines.md). |

`run(items)` receives the complete current buffer of VScroll items. The integration uses it to make the DOM represent that buffer: one row per item, in order, reusing retained rows and removing obsolete ones. This is the core rendering contract; the [Rendering and DOM contract](rendering.md) explains its requirements with examples. A consumer can encapsulate both `run` and the `Workflow` lifecycle, so applications using it need not handle either directly.

The engine calls `run(items)` whenever it assigns a new item buffer—for example, after fetching data, clipping distant items or applying an Adapter mutation. It is not called for every scroll event, nor is it limited to one call per cycle.

The first call is `run([])` during construction, before the constructor returns, even if later initialization is delayed. Prepare the renderer beforehand; `run` must not depend on the `workflow` variable being assigned yet.

The constructor can throw on invalid inputs. Returning from it does not mean the initial data has finished loading. Use the [Adapter API](adapter-methods.md#results-lifecycle-and-sequencing) to observe initialization and wait for the first cycle to settle. See [Development settings](configuration.md#development-settings) for initialization delays.

## Disposal and recreation

Call `workflow.dispose()` once before removing the view. It detaches the scroll listener, cancels scheduled core work and detaches the Adapter. It does **not** abort datasource requests, cancel consumer-owned rendering, remove DOM nodes or release application subscriptions. The integration must clean up those resources; do not expect a final `run([])` call. If the constructed datasource will not be reused, call its `dispose()` afterward to release its factory bookkeeping.

To recreate, dispose the old Workflow, reset the consumer's rendered-item state, leave or restore the two empty padding elements, then construct a new Workflow with the same datasource. Do not dispose that datasource between instances or attach it to two live workflows.

Use [Adapter `reload`](adapter-methods.md#reload) to re-read data and [Adapter `reset`](adapter-methods.md#reset) to change datasource configuration without replacing the Workflow.

## Diagnostics

While the Workflow is alive, `isInitialized` and `disposed` describe its lifecycle; `cyclesDone` and `interruptionCount` count completed cycles and interruptions. `errors` records engine failures with `process`, `message`, `time` and `loop`, but does not capture arbitrary exceptions from application code. Read diagnostics before disposal: most instance fields are removed then.

`cyclesDone$` notifies completed cycles before the final loading-state transition. It is useful for observation, not for waiting until idle; use `adapter.relax()` for that. Control a running scroller through the [Adapter](adapter-methods.md), not Workflow's internal process methods. See [Troubleshooting](troubleshooting.md) for failure diagnosis.
