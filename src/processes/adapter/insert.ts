import { Scroller } from '../../scroller';
import Update from './update';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
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
      return false;
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

}
