import { Scroller } from '../../scroller';
import Update from './update';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { Direction } from '../../inputs/index';
import { AdapterInsertOptions, AdapterUpdateOptions } from '../../interfaces/index';

export default class Insert extends BaseAdapterProcessFactory(AdapterProcess.insert) {

  static run(scroller: Scroller, options: AdapterInsertOptions): void {
    const { params } = Insert.parseInput(scroller, options);
    if (!params) {
      return;
    }
    const shouldInsert = Insert.doInsert(scroller, params);

    scroller.workflow.call({
      process: Insert.process,
      status: shouldInsert ? ProcessStatus.next : ProcessStatus.done
    });
  }

  static doInsert(scroller: Scroller, params: AdapterInsertOptions): boolean {
    if (!Insert.insertInBuffer(scroller, params)) {
      if (!Insert.insertVirtually(scroller, params)) {
        return false;
      }
    }
    return true;
  }

  static insertInBuffer(scroller: Scroller, params: AdapterInsertOptions): boolean {
    const { before, after, beforeIndex, afterIndex, items, decrease } = params;
    const indexToInsert = scroller.buffer.getIndexToInsert(before || after, beforeIndex, afterIndex);

    if (isNaN(indexToInsert)) {
      return false;
    }
    const isBackward = Number.isInteger(beforeIndex) || before;

    const updateOptions: AdapterUpdateOptions = {
      predicate: ({ $index, data }) => {
        if (indexToInsert === $index) {
          return isBackward ? [...items, data] : [data, ...items];
        }
        return true;
      },
      fixRight: decrease
    };

    return Update.doUpdate(scroller, updateOptions);
  }

  static insertVirtually(scroller: Scroller, params: AdapterInsertOptions): boolean {
    const { beforeIndex, afterIndex, items, decrease } = params;
    const { buffer, state: { fetch }, viewport } = scroller;
    const direction = Number.isInteger(beforeIndex) ? Direction.backward : Direction.forward;
    const indexToInsert = (direction === Direction.backward ? beforeIndex : afterIndex) as number;

    if (!buffer.insertVirtually(items, indexToInsert, direction, !!decrease)) {
      return false;
    }

    const { index, diff } = viewport.getEdgeVisibleItem(buffer.items, Direction.backward);
    fetch.firstVisible.index = index;
    if (!isNaN(index)) {
      fetch.simulate = true;
      fetch.firstVisible.delta = - buffer.getSizeByIndex(index) + diff;
    }

    return true;
  }

}
