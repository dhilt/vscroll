import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';

export default class Pause extends BaseAdapterProcessFactory(AdapterProcess.pause) {

  static run(scroller: Scroller, options?: { resume: boolean }): void {
    const resume = !!options?.resume;

    if (!resume) {
      if (!scroller.state.paused.get()) {
        scroller.logger.log('pause scroller');
        scroller.state.paused.set(true);
      } else {
        scroller.logger.log('pause scroller (cancelled)');
      }
      return;
    }

    if (!scroller.state.paused.get()) {
      scroller.logger.log('resume scroller (cancelled)');
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
