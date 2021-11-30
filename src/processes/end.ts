import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { Direction } from '../inputs/index';
import { EMPTY_ITEM } from '../classes/adapter/props';
import { ScrollerWorkflow } from '../interfaces/index';

const isInterrupted = ({ call }: ScrollerWorkflow): boolean => !!call.interrupted;

export default class End extends BaseProcessFactory(CommonProcess.end) {

  static run(scroller: Scroller, { error }: { error?: unknown } = {}): void {
    const { workflow, state: { cycle: { interrupter } } } = scroller;

    if (!error && !interrupter) {
      // set out params accessible via Adapter
      End.calculateParams(scroller, workflow);
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

  static calculateParams(scroller: Scroller, workflow: ScrollerWorkflow): void {
    const { adapter, viewport, buffer: { items } } = scroller;

    if (adapter.wanted.firstVisible) {
      const { item } = viewport.getEdgeVisibleItem(items, Direction.backward);
      if (!item || item.element !== adapter.firstVisible.element) {
        adapter.firstVisible = item ? item.get() : EMPTY_ITEM;
      }
    }

    // the workflow can be interrupter on firstVisible change
    if (adapter.wanted.lastVisible && !isInterrupted(workflow)) {
      const { item } = viewport.getEdgeVisibleItem(items, Direction.forward);
      if (!item || item.element !== adapter.lastVisible.element) {
        adapter.lastVisible = item ? item.get() : EMPTY_ITEM;
      }
    }
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
