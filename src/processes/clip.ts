import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { Direction } from '../inputs/index';

export default class Clip extends BaseProcessFactory(CommonProcess.clip) {

  static run(scroller: Scroller): void {
    const { workflow } = scroller;

    Clip.doClip(scroller);

    workflow.call({
      process: Clip.process,
      status: ProcessStatus.next
    });
  }

  static doClip(scroller: Scroller): void {
    const { buffer, viewport: { paddings }, state: { clip }, logger } = scroller;
    const size = { [Direction.backward]: 0, [Direction.forward]: 0 };

    logger.stat(`before clip (${++clip.callCount})`);

    const itemsToRemove = buffer.items.filter(item => {
      if (!item.toRemove) {
        return false;
      }
      item.hide();
      size[item.removeDirection] += item.size;
      return true;
    });

    if (itemsToRemove.length) {
      if (size[Direction.backward]) {
        paddings.byDirection(Direction.backward).size += size[Direction.backward];
      }
      if (size[Direction.forward]) {
        paddings.byDirection(Direction.forward).size += size[Direction.forward];
      }
      if (scroller.settings.onBeforeClip) {
        scroller.settings.onBeforeClip(itemsToRemove.map(item => item.get()));
      }
    }

    buffer.clip();

    logger.log(() => {
      const list = itemsToRemove.map(({ $index }) => $index);
      return list.length
        ? [
          `clipped ${list.length} item(s) from Buffer` +
          (size.backward ? `, +${size.backward} fwd px` : '') +
          (size.forward ? `, +${size.forward} bwd px` : '') +
          `, range: [${list[0]}..${list[list.length - 1]}]`
        ]
        : 'clipped 0 items from Buffer';
    });

    logger.stat('after clip');
  }

}
