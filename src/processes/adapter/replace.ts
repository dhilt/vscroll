import { Scroller } from '../../scroller';
import Update from './update';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { AdapterReplaceOptions, AdapterUpdateOptions } from '../../interfaces/index';

export default class Replace extends BaseAdapterProcessFactory(AdapterProcess.replace) {

  static run(scroller: Scroller, options: AdapterReplaceOptions): void {
    const { params } = Replace.parseInput(scroller, options);
    if (!params) {
      return;
    }
    const shouldReplace = Replace.doReplace(scroller, params);

    scroller.workflow.call({
      process: Replace.process,
      status: shouldReplace ? ProcessStatus.next : ProcessStatus.done,
    });
  }

  static doReplace(scroller: Scroller, params: AdapterReplaceOptions): boolean {
    const toRemove = scroller.buffer.items
      .filter(item => params.predicate(item))
      .map(item => item.$index);

    if (!toRemove.length) {
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        scroller.logger.log('no items to be replaced');
      }
      return false;
    }

    let injected = false;
    const updateOptions: AdapterUpdateOptions = {
      predicate: ({ $index }) => {
        if (!toRemove.includes($index)) {
          return true;
        }
        if (!injected) {
          injected = true;
          return params.items;
        }
        return false;
      },
      fixRight: params.fixRight
    };

    return Update.doUpdate(scroller, updateOptions);
  }

}
