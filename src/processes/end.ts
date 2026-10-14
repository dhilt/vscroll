import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { ScrollerWorkflow } from '../interfaces/index';

const isInterrupted = ({ call }: ScrollerWorkflow): boolean => !!call.interrupted;

export default class End extends BaseProcessFactory(CommonProcess.end) {
  static run(scroller: Scroller, { error }: { error?: unknown } = {}): void {
    const { workflow, state } = scroller;
    const { cycle: { interrupter }, clip } = state;
    // Move the exception out of state so nested End calls cannot throw it again.
    const { hasException, exception } = clip;
    delete clip.exception;
    let next = false;

    if (!error && !interrupter) {
      // Refresh Adapter.firstVisible and Adapter.lastVisible for the current viewport.
      End.calculateParams(scroller);
    }

    // Finalize the inner loop unless the workflow was explicitly interrupted.
    const interrupted = isInterrupted(workflow);
    if (!interrupted) {
      next = End.shouldContinueRun(scroller, !!(hasException || error));
      scroller.state.endInnerLoop();
    }

    workflow.call({
      process: End.process,
      status: next ? ProcessStatus.next : ProcessStatus.done,
      payload: !interrupted && interrupter ? { process: interrupter } : {}
    });

    // Rethrow the original exception only after cycle finalization.
    if (hasException) {
      throw exception;
    }
  }

  static calculateParams(scroller: Scroller): void {
    const { adapter, workflow } = scroller;

    adapter.setFirstOrLastVisible({ first: true, workflow });
    adapter.setFirstOrLastVisible({ last: true, workflow });
  }

  static shouldContinueRun(scroller: Scroller, hasError: boolean = false): boolean {
    const { cycle, fetch, render } = scroller.state;
    // Adapter.reload or Adapter.reset
    if (cycle.interrupter) {
      return true;
    }
    // critical error
    if (hasError) {
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
