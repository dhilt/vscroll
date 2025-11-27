import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';

export default class Start extends BaseProcessFactory(CommonProcess.start) {
  static run(scroller: Scroller): void {
    const payload = scroller.state.startInnerLoop();

    scroller.workflow.call({
      process: Start.process,
      status: ProcessStatus.next,
      payload
    });
  }
}
