[![Build Status](https://travis-ci.com/dhilt/vscroll.svg?branch=main)](https://travis-ci.com/dhilt/vscroll)
[![npm version](https://badge.fury.io/js/vscroll.svg)](https://www.npmjs.com/package/vscroll)

# VScroll

VScroll is a JavaScript library providing virtual scroll engine. Can be seen as a core for platform-specific solutions designed to represent unlimited datasets using virtualization technique. Below is the diagram of how the VScroll engine is being distributed to the end user.

<br>
<p align="center">
  <img src="https://user-images.githubusercontent.com/4365660/104845671-ad1d4b80-58e7-11eb-9cc9-4a00ebcbc9e8.png">
</p>

Basically, the consumer layer can be omitted and the end Application developers can use VScroll directly. Currently there exist two consumer implementations built on top of VScroll:

  - [ngx-ui-scroll](https://www.npmjs.com/package/ngx-ui-scroll), Angular virtual scroll directive
  - [vscroll-native](https://www.npmjs.com/package/vscroll-native), virtual scroll module for native JavaScript applications

## Getting started

### from CDN

```html
<script src="https://cdn.jsdelivr.net/npm/vscroll"></script>
<script>
  const workflow = new VScroll.Workflow({...});
</script>
```

### via NPM

```
npm install vscroll
```

```js
import { Workflow } from 'vscroll';

const workflow = new Workflow({...});
```

## Usage

The main entity distributed via `vscroll` is the `Workflow` class. Its instantiating runs the virtual scroll engine. The constructor of the `Workflow` class requires an argument of the following type:

```typescript
interface WorkflowParams<ItemData> {
  consumer: IPackage;
  element: HTMLElement;
  datasource: IDatasource<ItemData>;
  run: OnDataChanged<ItemData>;
}
```

This is a TypeScript definition, but speaking of JavaScript, an argument object must contain 4 fields described below.

### Consumer

This is a simple data object that provides information about a consumer. It is not critical to omit this, but if the result solution is going to be published, the name and the version of the result package should be passed as follows:

```js
consumer: {
  name: 'my-vscroll-consumer',
  version: 'v1.0.0-alpha.1'
},
```

### Element

An HTML element the `Workflow` should use as a scrollable part of the viewport. It should be present in DOM before instantiating the `Workflow`.

```js
element: document.getElementById('vscroll'),
```

It should be wrapped with another container with constrained height and overflow scroll/auto. And it also must have two special padding elements marked with special attributes for the virtualization purpose.

```html
<div id="viewport">
  <div id="vscroll">
    <div data-padding-backward></div>
    <div data-padding-forward></div>
  </div>
</div>
```

```css
#viewport {
  height: 300px;
  overflow-y: scroll;
}
```

### Datasource

This is a special object, providing dataset items in runtime. Basically, a consumer app should expose a Datasource factory to be used by the end App, but in the simplest case it can be defined as follows:

```js
datasource: {
  get: (index, count, success) => {
    const data = [];
    for (let i = index; i <= index + count - 1; i++) {
      data.push({ id: i, text: 'item #' + i });
    }
    success(data);
  }
},
```

The `Workflow` will request data via `get` method. This particular Datasource sample implements an unlimited synchronous stream of data generated in runtime, but depends on the end App needs it can be limited or partially limited, asynchronous, index-inverted, Promise- or even Observable-based (instead of callback-based) etc.

Along with the `Workflow`, VScroll exposes method `makeDatasource` which can be used for creating Datasource factory, so the end Datasource might be instantiated via operator `new`:

```js
const Datasource = VScroll.makeDatasource();
...
datasource: new Datasource({
  get: (index, count, success) => ...
}),
```

This option also makes the Adapter API available via `datasource.adapter` property. It provides massive functionality to assess and manipulate data at runtime the VScroll engine deals with.

### Run

A callback that is being called every time the Workflow decides that the UI needs to be changed. Its argument is a list of items to be present in the UI. This is a consumer responsibility to detect changes and display them in the UI.

```js
run: items => {
  if (!items.length && !currentItems.length) {
    return;
  }
  displayNewItemsOverTheOldOnes(items, currentItems);
  currentItems = items;
}
```

This is the most complex and environment-specific part of the `vscroll` API. Its implementation is fully depends on the environment for which the consumer is being created. Framework specific consumer should rely on internal mechanism of the framework to provide runtime DOM modifications.

There are some requirements on how new items should be processed by `run` callback:
 - as the result of the `run` callback invocation, there must be `items.length` elements in the DOM between backward and forward padding elements;
 - old items that are not in the list should be removed from DOM; use reference to DOM element for this purpose: `currentItems[].element`;
 - old items that are in the list should  not be removed and recreated, as it may lead to an unwanted shift of the scroll position; just don't touch them;
 - new items elements should have "data-sid" attribute, which value should be taken from `items[].nodeId`;
 - new elements should be rendered but not visible, and this should be achieved by "fixed" positioning and "left"/"top" coordinates placing the item element out of view; the Workflow will take care of visibility after calculations; an additional attribute `items[].invisible` can be used to determine if a given element should be hidden.

## Live

This repository has a minimal demonstration of the App-consumer implementation considering all of the requirements listed above: https://dhilt.github.io/vscroll/. This is all-in-one HTML demo with `vscroll` taken from CDN. The source code of the demo is [here](https://github.com/dhilt/vscroll/blob/main/demo/index.html). The approach is rough and non-optimized, if you are seeking for more general solution for native JavaScript applications, please take a look at [vscroll-native](https://github.com/dhilt/vscroll-native) project. It is relatively new and has no good documentation, but its [source code](https://github.com/dhilt/vscroll-native/tree/main/src) and [demo](https://github.com/dhilt/vscroll-native/tree/main/demo) may shed light on `vscroll` usage in no-framework environment.

Another example is [ngx-ui-scroll](https://github.com/dhilt/ngx-ui-scroll). Before 2021 `vscroll` was part of `ngx-ui-scroll`, and its [demo page](https://dhilt.github.io/ngx-ui-scroll/#/) contains well-documented samples that can be used to get an idea on the API and functionality offered by `vscroll`.

The code of the [UiScrollComponent](https://github.com/dhilt/ngx-ui-scroll/blob/v2.0.0-rc.1/src/ui-scroll.component.ts) clearly demonstrates the `Workflow` instantiation in the context of Angular. Also, since ngx-ui-scroll is the intermediate layer between `vscroll` and the end Application, the Datasource is being provided from the outside. Method `makeDatasource` is used to provide `Datasource` class to the end Application.

## Adapter API

Adapter API is the powerful feature of `vscroll` engine. Please refer to the ngx-ui-scroll [Adapter API doc](https://github.com/dhilt/ngx-ui-scroll#adapter-api) as it can be applied to `vscroll` direct usage with only one difference: all RxJs entities are replaced with tiny custom [Reactive](https://github.com/dhilt/vscroll/blob/main/src/classes/reactive.ts) ones. VScroll will receive its own Adapter API documentation later.

## Thanks

 \- to [Mike Feingold](https://github.com/mfeingold) as he started all this story in far 2013,

 \- to [Joshua Toenyes](https://github.com/JoshuaToenyes) as he signed over the rights to "vscroll" npm repository he owned but not used,

 \- to all contributors of related repositories ([link](https://github.com/angular-ui/ui-scroll/graphs/contributors), [link](https://github.com/dhilt/ngx-ui-scroll/graphs/contributors)).

 <br>

 __________

2021 &copy; [dhilt](https://github.com/dhilt), [Hill30 Inc](http://www.hill30.com/)