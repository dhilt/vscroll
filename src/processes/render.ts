import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { Item } from '../classes/item';

export default class Render extends BaseProcessFactory(CommonProcess.render) {
  static run(scroller: Scroller): void {
    const { workflow, state, viewport, routines } = scroller;
    const { cycle, render, scroll, fetch } = state;
    scroller.logger.stat('before new items render');
    if (scroll.positionBeforeAsync === null) {
      scroll.positionBeforeAsync = viewport.scrollPosition;
    }
    render.cancel = routines.render(
      () => {
        render.cancel = null;
        if (Render.doRender(scroller)) {
          workflow.call({
            process: Render.process,
            status: render.noSize ? ProcessStatus.done : ProcessStatus.next,
            payload: { process: cycle.initiator }
          });
        } else {
          workflow.call({
            process: Render.process,
            status: ProcessStatus.error,
            payload: { error: 'Can not associate item with element' }
          });
        }
      },
      { items: fetch.items.map(i => i.get()) }
    );
  }

  static doRender(scroller: Scroller): boolean {
    const { state, viewport, buffer, logger } = scroller;
    const { fetch, render } = state;
    render.positionBefore = viewport.scrollPosition;
    if (!fetch.isCheck) {
      render.sizeBefore = viewport.getScrollableSize();
      if (!fetch.items.every(item => Render.processElement(scroller, item))) {
        return false;
      }
    }
    buffer.checkDefaultSize();
    render.sizeAfter = viewport.getScrollableSize();
    logger.stat('after new items render');
    logger.log(() => (render.noSize ? 'viewport size has not been changed' : void 0));
    return true;
  }

  static processElement(scroller: Scroller, item: Item): boolean {
    const { viewport, buffer } = scroller;
    const element = viewport.findItemElementById(item.nodeId);
    if (!element) {
      return false;
    }
    item.element = element as HTMLElement;
    item.makeVisible();
    item.setSize(buffer.getSizeByIndex(item.$index));
    buffer.cacheItem(item);
    return true;
  }
}
