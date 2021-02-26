import { Scroller } from '../../scroller';
import Update from './update';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { AdapterInsertOptions, AdapterUpdateOptions, ItemsPredicate } from '../../interfaces/index';

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
    const { before, after, items, decrease } = params;
    const method = (before || after) as ItemsPredicate;
    const found = scroller.buffer.items.find(item => method(item.get()));
    if (!found) {
      scroller.logger.log('no item to insert found');
      return false;
    }

    const indexToInsert = found.$index;
    const updateOptions: AdapterUpdateOptions = {
      predicate: ({ $index, data }) => {
        if (indexToInsert === $index) {
          return before ? [...items, data] : [data, ...items];
        }
        return true;
      },
      fixRight: decrease
    };

    return Update.doUpdate(scroller, updateOptions);
  }

}
