import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';

export default class Start extends BaseProcessFactory(CommonProcess.start) {

  static run(scroller: Scroller): void {
    const { state } = scroller;

    state.startInnerLoop();

    scroller.workflow.call({
      process: Start.process,
      status: ProcessStatus.next,
      payload: {
        ...(state.cycle.innerLoop.first ? {
          process: state.cycle.initiator,
          doRender: state.fetch.simulate,
        } : {})
      }
    });
  }

}
