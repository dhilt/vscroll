import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';

export default class Pause extends BaseAdapterProcessFactory(AdapterProcess.pause) {
  static run(scroller: Scroller, options?: { resume: boolean }): void {
    const resume = !!options?.resume;

    // pause branch
    if (!resume && !scroller.state.paused.get()) {
      scroller.logger.log('pause scroller');
      scroller.state.paused.set(true);
      scroller.workflow.call({
        process: AdapterProcess.pause,
        status: ProcessStatus.done
      });
      return;
    }

    scroller.logger.log('resume scroller');
    scroller.state.paused.set(false);
    scroller.workflow.call({
      process: AdapterProcess.pause,
      status: ProcessStatus.next
    });
  }
}
