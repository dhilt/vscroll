import { Scroller } from '../../scroller';
import Update from './update';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { Direction } from '../../inputs/index';
import { AdapterRemoveOptions, AdapterUpdateOptions, ItemsPredicate } from '../../interfaces/index';

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

  static doRemove(scroller: Scroller, params: AdapterRemoveOptions): boolean {
    const { fetch } = scroller.state;
    fetch.firstVisible.index = NaN;
    const removed = Remove.removeBufferedItems(scroller, params);
    const shouldBuffered = removed.length > 0;
    if (shouldBuffered) {
      // exclude just removed in-buffer indexes
      if (params.indexes && params.indexes.length) {
        params.indexes = params.indexes.filter(i => !removed.includes(i));
      }
      // shift virtual indexes that remain
      if (params.indexes && params.indexes.length) {
        const diffLeft = (params.increase ? 1 : 0) * removed.length;
        const diffRight = (params.increase ? 0 : -1) * removed.length;
        params.indexes = params.indexes.map(index =>
          index + (index < removed[0] ? diffLeft : diffRight)
        );
      }
    }
    const shouldVirtual = Remove.removeVirtualItems(scroller, params);
    if (!shouldBuffered && !shouldVirtual) {
      return false;
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

    const indexesToRemove: number[] = scroller.buffer.items.reduce((acc, item) =>
      newPredicate(item) ? [...acc, item.$index] : acc, [] as number[]
    );
    const updateOptions: AdapterUpdateOptions = {
      predicate: item => !newPredicate(item),
      fixRight: increase
    };
    Update.doUpdate(scroller, updateOptions);
    return indexesToRemove;
  }

  static removeVirtualItems(scroller: Scroller, params: AdapterRemoveOptions): boolean {
    const { indexes, increase } = params;
    if (!indexes || !indexes.length) {
      return false;
    }
    const { buffer, viewport, state: { fetch } } = scroller;

    // get items to remove
    const { finiteAbsMinIndex, firstIndex, finiteAbsMaxIndex, lastIndex } = buffer;
    const toRemove = [];
    for (let i = 0, len = indexes.length; i < len; i++) {
      const index = indexes[i];
      if (index >= finiteAbsMinIndex && !isNaN(firstIndex) && index < firstIndex) {
        toRemove.push(index); // backward;
      } else if (index <= finiteAbsMaxIndex && !isNaN(lastIndex) && index > lastIndex) {
        toRemove.push(index); // forward;
      } else {
        continue;
      }
    }

    if (!toRemove.length) {
      return false;
    }

    // what should be shown after remove; Buffer removal has priority
    if (isNaN(fetch.firstVisible.index)) {
      const { index, diff } = viewport.getEdgeVisibleItem(buffer.items, Direction.backward);
      fetch.firstVisible.index = index;
      if (!isNaN(index)) {
        fetch.firstVisible.delta = - buffer.getSizeByIndex(index) + diff;
      }
    }

    // virtual removal
    scroller.logger.log(() => `going to remove ${toRemove.length} item(s) virtually`);
    buffer.removeVirtually(toRemove, !!increase);
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
