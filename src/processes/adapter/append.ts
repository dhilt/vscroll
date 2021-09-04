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

    const { params } = Append.parseInput(scroller, options);
    if (!params) {
      return;
    }
    const { buffer } = scroller;
    const { items, bof, eof } = params;
    const prepend = process !== AdapterProcess.append;

    if ((prepend && bof && !buffer.bof.get()) || (!prepend && eof && !buffer.eof.get())) {
      Append.doVirtual(scroller, items, prepend);
      scroller.workflow.call({
        process: Append.process,
        status: ProcessStatus.done
      });
      return;
    }

    if (!buffer.size) {
      Append.doEmpty(scroller, items, prepend);
    } else {
      Append.doRegular(scroller, items, prepend);
    }

    scroller.workflow.call({
      process: Append.process,
      status: ProcessStatus.next
    });
  }

  static doVirtual(scroller: Scroller, items: unknown[], prepend: boolean): void {
    const { buffer, viewport: { paddings } } = scroller;
    const absIndexToken = prepend ? 'absMinIndex' : 'absMaxIndex';
    if (isFinite(buffer[absIndexToken])) {
      const size = items.length * buffer.defaultSize;
      const padding = prepend ? paddings.backward : paddings.forward;
      buffer[absIndexToken] += (prepend ? -1 : 1) * items.length;
      padding.size += size;
      if (prepend) {
        scroller.viewport.scrollPosition += size;
      }
      scroller.logger.log(() => `buffer.${[absIndexToken]} value is set to ${buffer[absIndexToken]}`);
      scroller.logger.stat(`after virtual ${prepend ? 'prepend' : 'append'}`);
    }
  }

  static doEmpty(scroller: Scroller, items: unknown[], prepend: boolean): void {
    const { buffer, state: { fetch } } = scroller;
    const absIndexToken = prepend ? 'absMinIndex' : 'absMaxIndex';
    let index = scroller.buffer[prepend ? 'minIndex' : 'maxIndex'];
    let bufferLimit = buffer[absIndexToken];
    const newItems: Item[] = [];

    items.forEach(item => {
      const newItem = new Item(index, item, scroller.routines);
      Array.prototype[prepend ? 'unshift' : 'push'].call(newItems, newItem);
      bufferLimit += prepend ? (index < bufferLimit ? -1 : 0) : (index > bufferLimit ? 1 : 0);
      index += prepend ? -1 : 1;
    });

    if (bufferLimit !== buffer[absIndexToken]) {
      buffer[absIndexToken] = bufferLimit;
      scroller.logger.log(() => `buffer.${absIndexToken} value is set to ${buffer[absIndexToken]}`);
    }

    (prepend ? fetch.prepend : fetch.append).call(fetch, newItems);
    (prepend ? buffer.prepend : buffer.append).call(buffer, newItems);
    fetch.first.indexBuffer = !isNaN(buffer.firstIndex) ? buffer.firstIndex : index;
    fetch.last.indexBuffer = !isNaN(buffer.lastIndex) ? buffer.lastIndex : index;
  }

  static doRegular(scroller: Scroller, items: unknown[], prepend: boolean): boolean {
    const index = scroller.buffer[prepend ? 'firstIndex' : 'lastIndex'];
    const updateOptions: AdapterUpdateOptions = {
      predicate: ({ $index, data }) => {
        if ($index === index) {
          return prepend ? [...items.reverse(), data] : [data, ...items];
        }
        return true;
      },
      fixRight: prepend
    };
    return Update.doUpdate(scroller, updateOptions);
  }

}
