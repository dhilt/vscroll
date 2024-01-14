import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';

export default class Pause extends BaseAdapterProcessFactory(AdapterProcess.pause) {

  static run(scroller: Scroller, options?: { resume: boolean }): void {
    const resume = !!options?.resume;

    if (!resume) {
      if (!scroller.state.paused.get()) {
        scroller.state.paused.set(true);
        scroller.logger.log('pause scroller');
      } else {
        scroller.logger.log('pause scroller (cancelled)');
      }
      return;
    }

    if (!scroller.state.paused.get()) {
      scroller.logger.log('resume scroller (cancelled)');
      return;
    }

    scroller.state.paused.set(false);
    scroller.logger.log('resume scroller');

    scroller.workflow.call({
      process: AdapterProcess.pause,
      status: ProcessStatus.done
    });
  }

}
