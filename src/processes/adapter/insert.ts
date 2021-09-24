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
    const index = Number.isInteger(beforeIndex) ? beforeIndex : (Number.isInteger(afterIndex) ? afterIndex : NaN);
    const isBackward = Number.isInteger(beforeIndex) || before;
    const method = before || after;
    const found = scroller.buffer.items.find(item =>
      (method && method(item.get())) || (Number.isInteger(index) && index === item.$index)
    );
    if (!found) {
      scroller.logger.log('no item to insert in buffer');
      return false;
    }

    const indexToInsert = found.$index;
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
    const index = (direction === Direction.backward ? beforeIndex : afterIndex) as number;

    if (isNaN(fetch.firstVisible.index)) { // if in-buffer insertion did not set firstVisible
      const { index, diff } = viewport.getEdgeVisibleItem(buffer.items, Direction.backward);
      fetch.firstVisible.index = index;
      if (!isNaN(index)) {
        fetch.firstVisible.delta = - buffer.getSizeByIndex(index) + diff;
      }
    }

    if (!buffer.insertVirtually(items, index, direction, !!decrease)) {
      return false;
    }

    const { firstVisible } = scroller.state.fetch;
    if (!isNaN(firstVisible.index)) {
      let shift = 0;
      if (index < firstVisible.index && !decrease) {
        shift = items.length;
      } else if (index > firstVisible.index && decrease) {
        shift = -items.length;
      }
      firstVisible.index += shift;
    }

    return true;
  }

}
