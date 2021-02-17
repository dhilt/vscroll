import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { Item } from '../../classes/item';
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
      status: shouldUpdate ? ProcessStatus.next : ProcessStatus.done,
    });
  }

  static doUpdate(scroller: Scroller, params: AdapterUpdateOptions): boolean {
    const { buffer, state: { fetch, clip }, routines, logger } = scroller;
    if (!buffer.items) {
      return false;
    }
    const before = [...buffer.items];

    buffer.updateItems(
      params.predicate,
      (index, data) => new Item(index, data, routines),
      params.fixRight
    );

    const itemsToRemove = before.filter(({ toRemove }) => toRemove);
    if (itemsToRemove) {
      clip.update();
      itemsToRemove.forEach(item => item.hide());
    }
    logger.log(() => itemsToRemove.length
      ? 'items to remove: [' + itemsToRemove.map(({ $index }) => $index).join(',') + ']'
      : 'no items to remove'
    );

    const itemsToRender = buffer.items.filter(({ element }) => !element);
    if (itemsToRender.length) {
      fetch.update(itemsToRender);
    }
    logger.log(() => itemsToRender.length
      ? 'items to render: [' + itemsToRender.map(({ $index }) => $index).join(',') + ']'
      : 'no items to render'
    );

    return !!itemsToRemove.length || !!itemsToRender.length;
  }

}
