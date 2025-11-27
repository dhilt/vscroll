import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { ProcessPayload } from '../../interfaces/index';

export default class Reload extends BaseAdapterProcessFactory(AdapterProcess.reload) {
  static run(scroller: Scroller, reloadIndex: number): void {
    const { viewport, state, buffer } = scroller;

    const { params } = Reload.parseInput(scroller, { reloadIndex }, true);

    buffer.reset(false, params ? params.reloadIndex : void 0);
    viewport.reset(buffer.startIndex);

    const payload: ProcessPayload = {};
    if (state.cycle.busy.get()) {
      payload.finalize = true;
      state.cycle.interrupter = Reload.process;
    }

    scroller.workflow.call({
      process: Reload.process,
      status: ProcessStatus.next,
      payload
    });
  }
}
