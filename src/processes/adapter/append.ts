import { Scroller } from '../../scroller';
import { Item } from '../../classes/item';
import Update from './update';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { AdapterAppendOptions, AdapterPrependOptions, AdapterUpdateOptions } from '../../interfaces/index';

type AdapterAppendPrependOptions = AdapterAppendOptions & AdapterPrependOptions;

interface AppendRunOptions {
  process: AdapterProcess;
  options: AdapterAppendPrependOptions;
}

export default class Append extends BaseAdapterProcessFactory(AdapterProcess.append) {

  static run(scroller: Scroller, { process, options }: AppendRunOptions): void {

    const { params } = Append.parseInput(scroller, options, false, process);
    if (!params) {
      return;
    }
    const { buffer } = scroller;
    const { items, bof, eof, increase, decrease } = params;
    const prepend = process !== AdapterProcess.append;
    const fixRight = (prepend && !increase) || (!prepend && !!decrease);

    if ((prepend && bof && !buffer.bof.get()) || (!prepend && eof && !buffer.eof.get())) {
      Append.doVirtual(scroller, items, prepend, fixRight);
      scroller.workflow.call({
        process: Append.process,
        status: ProcessStatus.done
      });
      return;
    }

    if (!buffer.size) {
      Append.doEmpty(scroller, items, prepend, fixRight);
    } else {
      Append.doRegular(scroller, items, prepend, fixRight);
    }

    scroller.workflow.call({
      process: Append.process,
      status: ProcessStatus.next
    });
  }

  static doVirtual(scroller: Scroller, items: unknown[], prepend: boolean, fixRight: boolean): void {
    const { buffer, viewport: { paddings } } = scroller;
    const absIndexToken = fixRight ? 'absMinIndex' : 'absMaxIndex';
    if (isFinite(buffer[absIndexToken])) {
      const size = items.length * buffer.defaultSize;
      const padding = prepend ? paddings.backward : paddings.forward;
      padding.size += size;
      if (prepend) {
        buffer.prepend(items.length, fixRight);
        scroller.viewport.scrollPosition += size;
      } else {
        buffer.append(items.length, fixRight);
      }
      scroller.logger.log(() => `buffer.${[absIndexToken]} value is set to ${buffer[absIndexToken]}`);
      scroller.logger.stat(`after virtual ${prepend ? 'prepend' : 'append'}`);
    }
  }

  static doEmpty(scroller: Scroller, items: unknown[], prepend: boolean, fixRight: boolean): void {
    const { buffer, state: { fetch } } = scroller;
    const absIndexToken = fixRight ? 'absMinIndex' : 'absMaxIndex';
    const shift = prepend && !fixRight ? items.length - 1 : (!prepend && fixRight ? 1 - items.length : 0);
    const bufferLimit = buffer[absIndexToken] + (fixRight ? -1 : 1) * (items.length - 1);
    const newItems: Item[] = [];
    const startIndex = scroller.buffer[prepend ? 'minIndex' : 'maxIndex'];
    let index = startIndex;

    items.forEach(item => {
      const newItem = new Item(index + shift, item, scroller.routines);
      Array.prototype[prepend ? 'unshift' : 'push'].call(newItems, newItem);
      index += (prepend ? -1 : 1);
    });

    if (bufferLimit !== buffer[absIndexToken]) {
      buffer[absIndexToken] = bufferLimit;
      scroller.logger.log(() => `buffer.${absIndexToken} value is set to ${buffer[absIndexToken]}`);
    }

    (prepend ? fetch.prepend : fetch.append).call(fetch, newItems);
    buffer.setItems(newItems);
    fetch.first.indexBuffer = !isNaN(buffer.firstIndex) ? buffer.firstIndex : index;
    fetch.last.indexBuffer = !isNaN(buffer.lastIndex) ? buffer.lastIndex : index;
    fetch.firstVisible.index = startIndex;
  }

  static doRegular(scroller: Scroller, items: unknown[], prepend: boolean, fixRight: boolean): boolean {
    const index = scroller.buffer[prepend ? 'firstIndex' : 'lastIndex'];
    const updateOptions: AdapterUpdateOptions = {
      predicate: ({ $index, data }) => {
        if ($index === index) {
          return prepend ? [...items.reverse(), data] : [data, ...items];
        }
        return true;
      },
      fixRight
    };
    return Update.doUpdate(scroller, updateOptions);
  }

}
