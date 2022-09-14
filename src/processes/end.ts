import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { ScrollerWorkflow } from '../interfaces/index';

const isInterrupted = ({ call }: ScrollerWorkflow): boolean => !!call.interrupted;

export default class End extends BaseProcessFactory(CommonProcess.end) {

  static run(scroller: Scroller, { error }: { error?: unknown } = {}): void {
    const { workflow, state: { cycle: { interrupter } } } = scroller;

    if (!error && !interrupter) {
      // set out params accessible via Adapter
      End.calculateParams(scroller);
    }

    // explicit interruption for we don't want to go through the inner loop finalizing
    if (isInterrupted(workflow)) {
      workflow.call({ process: End.process, status: ProcessStatus.done });
      return;
    }

    const next = End.shouldContinueRun(scroller, error);
    scroller.state.endInnerLoop();

    workflow.call({
      process: End.process,
      status: next ? ProcessStatus.next : ProcessStatus.done,
      payload: { ...(interrupter ? { process: interrupter } : {}) }
    });
  }

  static calculateParams(scroller: Scroller): void {
    const { adapter, workflow } = scroller;

    adapter.setFirstOrLastVisible({ first: true, workflow });
    adapter.setFirstOrLastVisible({ last: true, workflow });
  }

  static shouldContinueRun(scroller: Scroller, error: unknown): boolean {
    const { cycle, fetch, render } = scroller.state;
    // Adapter.reload or Adapter.reset
    if (cycle.interrupter) {
      return true;
    }
    // critical error
    if (error) {
      return false;
    }
    // Adapter.check
    if (fetch.simulate && fetch.isCheck && !render.noSize) {
      return true;
    }
    // Adapter.remove or Adapter.update with clip
    if (fetch.simulate && fetch.doRemove) {
      return true;
    }
    // common inner loop (App start, scroll, Adapter.clip) with full fetch
    if (!fetch.simulate && ((fetch.hasNewItems && !render.noSize) || fetch.hasAnotherPack)) {
      return true;
    }
    return false;
  }

}
