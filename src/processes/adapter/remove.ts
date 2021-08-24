import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { Direction } from '../../inputs/index';
import { AdapterRemoveOptions, ItemsPredicate } from '../../interfaces/index';

export default class Remove extends BaseAdapterProcessFactory(AdapterProcess.remove) {

  static run(scroller: Scroller, options: AdapterRemoveOptions): void {
    const { params } = Remove.parseInput(scroller, options);
    if (!params) {
      return;
    }
    const shouldRemove = Remove.doRemove(scroller, params);

    scroller.workflow.call({
      process: Remove.process,
      status: shouldRemove ? ProcessStatus.next : ProcessStatus.done
    });
  }

  static doRemove(scroller: Scroller, params: AdapterRemoveOptions, sequenceOnly = false): boolean {
    const { fetch } = scroller.state;
    fetch.firstVisible.index = NaN;
    const bufferRemoveList = Remove.removeBufferedItems(scroller, params);
    if (params.indexes && params.indexes.length) { // to avoid duplicate buffer-virtual removals
      params.indexes = params.indexes.filter(i => !bufferRemoveList.includes(i));
    }
    const shouldRemoveBuffered = bufferRemoveList.length > 0;
    const shouldRemoveVirtual = Remove.removeVirtualItems(scroller, params, sequenceOnly);
    if (!shouldRemoveBuffered && !shouldRemoveVirtual) {
      return false;
    }
    if (!isNaN(fetch.firstVisible.index)) {
      fetch.remove();
    }
    scroller.logger.stat('after remove');
    return true;
  }

  static removeBufferedItems(scroller: Scroller, options: AdapterRemoveOptions): number[] {
    const { predicate, indexes, increase } = options;
    if (!predicate && !indexes) {
      return [];
    }
    const newPredicate: ItemsPredicate = item =>
      (predicate && predicate(item)) ||
      (!!indexes && indexes.includes(item.$index));
    return Remove.runPredicateOverBuffer(scroller, newPredicate, !!increase);
  }

  static runPredicateOverBuffer(scroller: Scroller, predicate: ItemsPredicate, increase: boolean): number[] {
    const { viewport, buffer, buffer: { items }, state: { fetch: { firstVisible } } } = scroller;

    // get items to remove
    const clipList = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (predicate(item.get())) {
        clipList.push(item);
        item.toRemove = true;
      } else if (clipList.length) {
        break; // allow only first strict uninterrupted sequence
      }
    }
    if (!clipList.length) {
      return [];
    }

    // what item should be shown after remove (1-4)
    const firstClipIndex = clipList[0].$index, lastClipIndex = clipList[clipList.length - 1].$index;
    // 1) current first visible item will remain
    const { index: firstIndex, diff } = viewport.getEdgeVisibleItem(buffer.items, Direction.backward);
    if (firstIndex < firstClipIndex || firstIndex > lastClipIndex) {
      firstVisible.index = firstIndex;
      firstVisible.delta = - buffer.getSizeByIndex(firstIndex) + diff;
    }
    // 2) next after the last removed item
    if (isNaN(firstVisible.index) && lastClipIndex < buffer.finiteAbsMaxIndex) {
      firstVisible.index = lastClipIndex + 1;
    }
    // 3) prev before the first removed item
    if (isNaN(firstVisible.index) && firstClipIndex > buffer.finiteAbsMinIndex) {
      firstVisible.index = firstClipIndex - 1;
    }
    // 4) prev before the first removed item
    if (isNaN(firstVisible.index)) {
      firstVisible.index = buffer.finiteAbsMinIndex;
    }

    // logical removal
    const indexListToRemove = clipList.map(item => item.$index);
    scroller.logger.log(() =>
      `going to remove ${clipList.length} item(s) from Buffer: [${indexListToRemove.join(',')}]`
    );
    buffer.removeItems(indexListToRemove, increase, false);
    buffer.checkDefaultSize();
    Remove.shiftFirstVisibleIndex(scroller, indexListToRemove, increase);

    // physical removal (hiding)
    clipList.forEach(item => item.hide());

    return indexListToRemove;
  }

  static removeVirtualItems(scroller: Scroller, params: AdapterRemoveOptions, sequenceOnly: boolean): boolean {
    const { indexes, increase } = params;
    if (!indexes || !indexes.length) {
      return false;
    }
    const { buffer, viewport, state: { fetch } } = scroller;

    // get items to remove
    const { finiteAbsMinIndex, firstIndex, finiteAbsMaxIndex, lastIndex } = buffer;
    const toRemove = [];
    let last = NaN;
    for (let i = 0, len = indexes.length; i < len; i++) {
      const index = indexes[i];
      if (index >= finiteAbsMinIndex && !isNaN(firstIndex) && index < firstIndex) {
        toRemove.push(index); // backward;
      } else if (index <= finiteAbsMaxIndex && !isNaN(lastIndex) && index > lastIndex) {
        toRemove.push(index); // forward;
      } else {
        continue;
      }
      if (sequenceOnly && !isNaN(last) && Math.abs(last - index) > 1) {
        // allow only first strict uninterrupted sequence
        break;
      }
      last = index;
    }

    if (!toRemove.length) {
      return false;
    }

    // what should be shown after remove; Buffer removal has priority
    if (isNaN(fetch.firstVisible.index)) {
      const { index, diff } = viewport.getEdgeVisibleItem(buffer.items, Direction.backward);
      if (!isNaN(index)) {
        fetch.firstVisible.index = index;
        fetch.firstVisible.delta = - buffer.getSizeByIndex(index) + diff;
      }
    }

    // virtual removal
    scroller.logger.log(() => `going to remove ${toRemove.length} item(s) virtually`);
    buffer.removeItems(toRemove, !!increase, true);
    buffer.checkDefaultSize();
    Remove.shiftFirstVisibleIndex(scroller, toRemove, !!increase);

    return true;
  }

  static shiftFirstVisibleIndex(scroller: Scroller, listToRemove: number[], increase: boolean): void {
    const { firstVisible } = scroller.state.fetch;
    if (isNaN(firstVisible.index)) {
      return;
    }
    const shift = listToRemove.reduce((acc, index) => acc + (
      ((increase && index > firstVisible.index) || (!increase && index < firstVisible.index)) ? 1 : 0
    ), 0);
    firstVisible.index = firstVisible.index + (increase ? shift : -shift);
  }

}
