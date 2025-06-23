import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { Item } from '../../classes/item';
import { Direction } from '../../inputs/index';
import { AdapterUpdateOptions } from '../../interfaces/index';

export default class Update extends BaseAdapterProcessFactory(AdapterProcess.update) {

  static run(scroller: Scroller, options: AdapterUpdateOptions): void {
    const { params } = Update.parseInput(scroller, options);
    if (!params) {
      return;
    }

    const shouldUpdate = Update.doUpdate(scroller, params);

    scroller.workflow.call({
      process: Update.process,
      status: shouldUpdate ? ProcessStatus.next : ProcessStatus.done
    });
  }

  static doUpdate(scroller: Scroller, params: AdapterUpdateOptions): boolean {
    const { buffer, viewport, state: { fetch }, routines, logger } = scroller;
    if (!buffer.items) {
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        logger.log(() => 'no items in Buffer');
      }
      return false;
    }
    const { item: firstItem, index: firstIndex, diff: firstItemDiff } =
      viewport.getEdgeVisibleItem(buffer.items, Direction.backward);

    const { trackedIndex, toRemove } = buffer.updateItems(
      params.predicate,
      (index, data) => new Item(index, data, routines),
      firstIndex,
      !!params.fixRight
    );

    let delta = 0;
    const trackedItem = buffer.get(trackedIndex);
    if (firstItem && firstItem === trackedItem) {
      delta = - buffer.getSizeByIndex(trackedIndex) + firstItemDiff;
    }

    toRemove.forEach(item => item.hide());
    if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
      logger.log(() => toRemove.length
        ? 'items to remove: [' + toRemove.map(({ $index }) => $index).join(',') + ']'
        : 'no items to remove'
      );
    }
    if (toRemove.length) { // insertions will be processed on render
      buffer.checkDefaultSize();
    }

    const toRender = buffer.items.filter(({ toInsert }) => toInsert);
    if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
      logger.log(() => toRender.length
        ? 'items to render: [' + toRender.map(({ $index }) => $index).join(',') + ']'
        : 'no items to render'
      );
    }

    fetch.update(trackedIndex, delta, toRender, toRemove);
    return !!toRemove.length || !!toRender.length;
  }

}
