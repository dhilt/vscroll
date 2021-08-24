import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { Direction } from '../../inputs/index';

export default class Check extends BaseAdapterProcessFactory(AdapterProcess.check) {

  static run(scroller: Scroller): void {
    const { workflow, buffer, state: { fetch }, viewport } = scroller;
    let min = Infinity, max = -Infinity;

    buffer.items.forEach(item => {
      const size = item.size;
      item.setSize();
      if (item.size !== size) {
        buffer.cacheItem(item);
        min = Math.min(min, item.$index);
        max = Math.max(max, item.$index);
      }
    });

    if (Number.isFinite(min)) {
      fetch.first.indexBuffer = buffer.firstIndex;
      fetch.last.indexBuffer = buffer.lastIndex;
      const { index: firstIndex, diff } = viewport.getEdgeVisibleItem(buffer.items, Direction.backward);
      fetch.firstVisible.index = firstIndex;
      if (!isNaN(firstIndex)) {
        fetch.firstVisible.delta = - buffer.getSizeByIndex(firstIndex) + diff;
      }
      fetch.check(
        buffer.items.filter(item => item.$index >= min && item.$index <= max)
      );
    }

    scroller.logger.stat('check');

    workflow.call({
      process: Check.process,
      status: Number.isFinite(min) ? ProcessStatus.next : ProcessStatus.done
    });
  }

}
