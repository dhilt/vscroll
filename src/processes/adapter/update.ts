import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { AdapterUpdateOptions } from '../../interfaces/index';

export default class Update extends BaseAdapterProcessFactory(AdapterProcess.update) {

  static run(scroller: Scroller, options: AdapterUpdateOptions): void {
    const { params } = Update.parseInput(scroller, options);
    if (!params) {
      return;
    }

    scroller.workflow.call({
      process: Update.process,
      status: ProcessStatus.done,
    });
  }

}
