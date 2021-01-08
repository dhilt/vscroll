import { getBaseProcess, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';

export default class Start extends getBaseProcess(CommonProcess.start) {

  static run(scroller: Scroller) {
    const { state } = scroller;

    state.startInnerLoop();

    scroller.workflow.call({
      process: Start.process,
      status: ProcessStatus.next,
      payload: { ...(state.cycle.innerLoop.first ? { process: state.cycle.initiator } : {}) }
    });
  }

}
