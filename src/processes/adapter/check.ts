import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { Direction } from '../../inputs/index';

export default class Check extends BaseAdapterProcessFactory(AdapterProcess.check) {
  static run(scroller: Scroller): void {
    const { workflow, buffer, state, viewport, routines } = scroller;
    const insetsChanged = viewport.updateInsets();
    let min = Infinity,
      max = -Infinity;

    buffer.items.forEach(item => {
      const size = item.size;
      item.setSize();
      if (item.size !== size) {
        buffer.cacheItem(item);
        min = Math.min(min, item.$index);
        max = Math.max(max, item.$index);
      }
    });

    const changed = Number.isFinite(min) || insetsChanged;
    if (changed) {
      const { fetch } = state;
      fetch.first.indexBuffer = buffer.firstIndex;
      fetch.last.indexBuffer = buffer.lastIndex;
      const { index: firstIndex, diff } = viewport.getEdgeVisibleItem(
        buffer.items,
        Direction.backward
      );
      fetch.firstVisible.index = firstIndex;
      if (!isNaN(firstIndex)) {
        // Keep the anchor delta in virtual-padding coordinates.
        const leadingInset =
          routines.getEdge(viewport.paddings.backward.element, Direction.backward) -
          routines.getEdge(routines.element, Direction.backward);
        fetch.firstVisible.delta = -buffer.getSizeByIndex(firstIndex) + diff - leadingInset;
      }
      fetch.check(buffer.items.filter(item => item.$index >= min && item.$index <= max));
    }

    scroller.logger.stat('check');

    workflow.call({
      process: Check.process,
      status: changed ? ProcessStatus.next : ProcessStatus.done
    });
  }
}
