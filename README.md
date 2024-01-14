[![build status](https://github.com/dhilt/vscroll/actions/workflows/build.yml/badge.svg)](https://github.com/dhilt/vscroll/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/vscroll.svg)](https://www.npmjs.com/package/vscroll)

# VScroll

- [Overview](#overview)
- [Getting started](#getting-started)
- [Usage](#usage)
  - [Consumer](#1-consumer)
  - [Element](#2-element)
  - [Datasource](#3-datasource)
  - [Run](#4-run)
  - [Routines](#5-routines)
- [Live](#live)
- [Adapter API](#adapter-api)
- [Thanks](#thanks)

## Overview

VScroll is a JavaScript library providing virtual scroll engine. Can be seen as a core for platform-specific solutions designed to represent unlimited datasets using virtualization technique. Below is the diagram of how the VScroll engine is being distributed to the end user.

<br>
<p align="center">
  <img src="https://user-images.githubusercontent.com/4365660/104845671-ad1d4b80-58e7-11eb-9cc9-4a00ebcbc9e8.png">
</p>

Basically, the consumer layer can be omitted and the end Application developers can use VScroll directly. This repository has a [minimal demo page](https://dhilt.github.io/vscroll/) of direct use of the VScroll library in a non-specific environment. There are also several consumer implementations built on top of VScroll:

  - [ngx-ui-scroll](https://github.com/dhilt/ngx-ui-scroll), Angular virtual scroll directive
  - [vscroll-native](https://github.com/dhilt/vscroll-native), virtual scroll module for native JavaScript applications
  - [Vue integration sample](https://stackblitz.com/edit/vscroll-vue-integration?file=src%2Fcomponents%2FVScroll.vue), very rough implementation for Vue

## Getting started

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/vscroll"></script>
<script>
  const workflow = new VScroll.Workflow(...);
</script>
```

### NPM

```
npm install vscroll
```

```js
import { Workflow } from 'vscroll';

const workflow = new Workflow(...);
```

## Usage

The main entity distributed via `vscroll` is the `Workflow` class. Its instantiating runs the virtual scroll engine.

```js
new Workflow({ consumer, element, datasource, run });
```

The constructor of the `Workflow` class requires an argument of the following type:

```typescript
interface WorkflowParams<ItemData> {
  consumer: IPackage;
  element: HTMLElement;
  datasource: IDatasource<ItemData>;
  run: OnDataChanged<ItemData>;
  Routines?: RoutinesClassType;
}
```

This is a TypeScript definition, but speaking of JavaScript, an argument object must contain 4 fields described below.

### 1. Consumer

A simple data object that provides information about a consumer. It is not critical to omit this, but if the result solution is going to be published as a separate 3d-party library ("consumer"), the name and the version of the result package should be passed as follows:

```js
const consumer = {
  name: 'my-vscroll-consumer',
  version: 'v1.0.0-alpha.1'
};
```

### 2. Element

An HTML element the `Workflow` should use as a scrollable part of the viewport. It should be present in DOM before instantiating the `Workflow`.

```js
const element = document.getElementById('vscroll');
```

This element should be wrapped with another container with constrained height and overflow scroll/auto. And it also must have two special padding elements marked with special attributes for the virtualization purpose.

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

### 3. Datasource

This is a special object, providing dataset items in runtime. There is a separate wiki document describing the Datasource: [github.com/dhilt/vscroll/wiki/Datasource](https://github.com/dhilt/vscroll/wiki/Datasource). Below is a short version.

The Datasource can be defined in two ways. First, as an object literal:

```js
const datasource = {
  get: (index, count, success) => {
    const data = [];
    for (let i = index; i < index + count; i++) {
      data.push({ id: i, text: 'item #' + i });
    }
    success(data);
  }
};
```

Second, as an instance of Datasource class which can be obtained through a special factory method. Along with the `Workflow` class, VScroll exposes the `makeDatasource` method which can be used for creating Datasource class, so the end datasource object can be instantiated via operator `new`:

```js
import { makeDatasource } from 'vscroll';
const Datasource = makeDatasource();

const datasource = new Datasource({
  get: (index, length, success) =>
    success(Array.from({ length }).map((_, i) =>
      ({ id: index + i, text: 'item #' + (index + i) })
    ))
});
```

The argument of the Datasource class is the same object literal as in the first case. It has one mandatory field which is the core of the App-Scroller integration: method `get`. The `Workflow` requests data via the `Datasource.get` method in runtime.

For more solid understanding the concept of the Datasource with examples, please, refer to [the Datasource doc](https://github.com/dhilt/vscroll/wiki/Datasource).

### 4. Run

A callback that is called every time the Workflow decides that the UI needs to be changed. Its argument is a list of items to be present in the UI. This is a consumer responsibility to detect changes and display them in the UI.

```js
const run = newItems => {
  // assume oldItems contains a list of items that are currently present in the UI
  if (!newItems.length && !oldItems.length) {
    return;
  }
  // make newItems to be present in the UI instead of oldItems
  processItems(newItems, oldItems);
  oldItems = newItems;
};
```

Each item (in both `newItems` and `oldItems` lists) is an instance of the [Item class](https://github.com/dhilt/vscroll/blob/v1.5.0/src/classes/item.ts) implementing the [Item interface](https://github.com/dhilt/vscroll/blob/v1.5.0/src/interfaces/item.ts), whose props can be used for proper implementation of the `run` callback:

|Name|Type|Description|
|:--|:--|:----|
|element|_HTMLElement_|HTML element associated with the item|
|$index|_number_|Integer index of the item in the Datasource. Correlates with the first argument of the Datasource.get method|
|data|_Data_|Data (contents) of the item. This is what the Datasource.get passes to the Scroller via success-callback as an array of data-items typed as Data[]|
|invisible|_boolean_|Flag that determines whether the item should be hidden (if _true_) or visible (if _false_) when the _run_ method is called|
|get|_()&nbsp;=>&nbsp;ItemAdapter&lt;Data&gt;_|Shortcut method returning { element, $index, data } object|

`Run` callback is the most complex and environment-specific part of the `vscroll` API, which is fully depends on the environment for which the consumer is being created. Framework specific consumer should rely on internal mechanism of the framework to provide runtime DOM modifications.

There are some requirements on how the items should be processed by `run` call:
 - after the `run` callback is completed, there must be `newItems.length` elements in the DOM between backward and forward padding elements;
- old items that are not in the new item list should be removed from DOM; use `oldItems[].element` references for this purpose;
 - old items that are in the list should not be removed and recreated, as it may lead to an unwanted shift of the scroll position; just don't touch them;
 - new items elements should be rendered in accordance with `newItems[].$index` comparable to `$index` of elements that remain: `$index` must increase continuously and the directions of increase must persist across the `run` calls; Scroller maintains `$index` internally, so you only need to properly inject a set of `newItems[].element` into the DOM;
 - new elements should be rendered but not visible, and this should be achieved by "fixed" positioning and "left"/"top" coordinates placing the item element out of view; the Workflow will take care of visibility after calculations; an additional attribute `newItems[].invisible` can be used to determine if a given element should be hidden; this requirement can be changed by the `Routines` class setting, see below;
 - new items elements should have "data-sid" attribute, which value should reflect `newItems[].$index`.

### 5. Routines

A special class allowing to override the default behavior related to the DOM. All DOM-specific operations are implemented as the [DOM Routines class](https://github.com/dhilt/vscroll/blob/v1.5.0/src/classes/domRoutines.ts) methods inside core. When the `Routines` class setting is passed among the Workflow arguments, it replaces the core Routines. The custom Routines class must extend the core class, which can be taken from the VScroll imports:

```js
import { Routines, Workflow } from 'vscroll';

class CustomRoutines extends Routines { ... }

new Workflow({
  // consumer, element, datasource, run,
  Routines: CustomRoutines
})
```

The Routines methods description can be taken from the [IRoutines interface](https://github.com/dhilt/vscroll/blob/v1.5.0/src/interfaces/routines.ts) sources. For example, there is a method that calculates the scroller's offset:

```typescript
getOffset(): number {
  const get = (element: HTMLElement) =>
    (this.settings.horizontal ? element.offsetLeft : element.offsetTop) || 0;
  return get(this.element) - (!this.settings.window ? get(this.viewport) : 0);
}
```

If we have a table layout case where we need to specify the offset of the table header, the base method can be overridden as follows:

```js
new Workflow({
  // consumer, element, datasource, run,
  Routines: class extends Routines {
    getOffset(element) {
      return document.querySelector('#viewport thead')?.offsetHeight || 0;
    }
  }
});
```

It's worth noting that thanks to the extending, we can use parent methods and have access to the correct context after the engine instantiates the Routines:

```js
class CustomRoutines extends Routines {
  onInit(...args) {
    console.log('Routines settings:', this.settings);
    super.onInit(...args);
  }
}
```

Various DOM calculations, setting/getting the scroll position, render process and other logic can be adjusted, improved or completely replaced by custom methods of the `Routines` class setting.

## Live

This repository has a minimal demonstration of the App-consumer implementation considering all of the requirements listed above: https://dhilt.github.io/vscroll/. This is all-in-one HTML demo with `vscroll` taken from CDN. The source code of the demo is [here](https://github.com/dhilt/vscroll/blob/main/demo/index.html). The approach is rough and non-optimized, if you are seeking for more general solution for native JavaScript applications, please have a look at [vscroll-native](https://github.com/dhilt/vscroll-native) project. It is relatively new and has no good documentation, but its [source code](https://github.com/dhilt/vscroll-native/tree/main/src) and its [demo](https://github.com/dhilt/vscroll-native/tree/main/demo) may shed light on `vscroll` usage in no-framework environment.

Another example is [ngx-ui-scroll](https://github.com/dhilt/ngx-ui-scroll). Before 2021 `vscroll` was part of `ngx-ui-scroll`, and its [demo page](https://dhilt.github.io/ngx-ui-scroll/#/) contains well-documented samples that can be used to get an idea on the API and functionality offered by `vscroll`. The code of the [UiScrollComponent](https://github.com/dhilt/ngx-ui-scroll/blob/v2.3.1/src/ui-scroll.component.ts) clearly demonstrates the `Workflow` instantiation in the context of Angular. Also, since ngx-ui-scroll is the intermediate layer between `vscroll` and the end Application, the Datasource is being provided from the outside. Method `makeDatasource` is used to provide `Datasource` class to the end Application.

## Adapter API

Adapter API is a powerful feature of the `vscroll` engine allowing to collect the statistics and provide runtime manipulations with the viewport: adding, removing, updating items. This API is very useful when building the real-time interactive applications when data can change over time by not only scrolling (like chats).

Please refer to the ngx-ui-scroll [Adapter API doc](https://github.com/dhilt/ngx-ui-scroll#adapter-api) as it can be applied to `vscroll` case with only one important difference: vscroll does not have RxJs entities, it has [Reactive](https://github.com/dhilt/vscroll/blob/main/src/classes/reactive.ts) ones instead. It means, for example, `eof$` has no "subscribe" method, but "on":

```js
// ngx-ui-scroll
myDatasource.adapter.bof$.subscribe(value =>
  value && console.log('Begin of file is reached')
);
// vscroll
myDatasource.adapter.bof$.on(value =>
  value && console.log('Begin of file is reached')
);
```

Adapter API becomes available as the `Datasource.adapter` property after the Datasource is instantiated via operator "new". In terms of "vscroll" you need to get a Datasource class by calling the `makeDatasource` method, then you can instantiate it. `makeDatasource` accepts 1 argument, which is an Adapter custom configuration. Currently this config can only be used to redefine the just mentioned Adapter reactive props. Here's an example of how simple Reactive props can be overridden with RxJs Subject and BehaviorSubject entities: [ui-scroll.datasource.ts](https://github.com/dhilt/ngx-ui-scroll/blob/v2.3.1/src/ui-scroll.datasource.ts). 

An important note is that the Adapter getting ready breaks onto 2 parts: instantiation (which is synchronous with the Datasource instantiation) and initialization (which occurs during the Workflow instantiating). Adapter gets all necessary props and methods during the first phase, but they start work only when the second phase is done. Practically this means 
 - you may arrange any Adapter reactive subscriptions in your app/consumer right after the Datasource is instantiated, 
 - some of the initial (default) values can be unusable, like `Adapter.bufferInfo.minIndex` = NaN (because Scroller's Buffer is empty before the very first `Datasource.get` call),
 - Adapter methods do nothing when called before phase 2, they immediately resolve some default "good" value (`{ immediate: true, success: true, ... }`).

If there is some logic that could potentially run before the Adapter initialization and you don't want this to happen, the following approach can be applied:

```js
myDatasource = new VScroll.makeDatasource()({...});
myDatasource.adapter.init$.once(() => {
  console.log('The Adapter is initialized'); // 2nd output
});
workflow = new VScroll.Workflow({...});
console.log('The Workflow runs'); // 1st output
```

VScroll will receive its own Adapter API documentation later, but for now please refer to [ngx-ui-scroll](https://github.com/dhilt/ngx-ui-scroll#adapter-api).

## Thanks

 \- to [Mike Feingold](https://github.com/mfeingold) as he started all this story in far 2013,

 \- to [Joshua Toenyes](https://github.com/JoshuaToenyes) as he transferred ownership to the "vscroll" npm repository which he owned but did not use,

 \- to all contributors of related repositories ([link](https://github.com/angular-ui/ui-scroll/graphs/contributors), [link](https://github.com/dhilt/ngx-ui-scroll/graphs/contributors)),

 \- to all donators as their great support does increase motivation.

 <br>

 __________

2023 &copy; [Denis Hilt](https://github.com/dhilt)
