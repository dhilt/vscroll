import { Scroller } from '../../scroller';
import { Item } from '../../classes/item';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { AdapterAppendOptions, AdapterPrependOptions } from '../../interfaces/index';

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
    const { items, bof, eof } = params;
    const prepend = process !== AdapterProcess.append;
    const _eof = !!(prepend ? bof : eof);

    // virtual prepend case: shift abs min index and update viewport params
    if (
      (prepend && _eof && !scroller.buffer.bof.get()) ||
      (!prepend && _eof && !scroller.buffer.eof.get())
    ) {
      Append.doVirtualize(scroller, items, prepend);
      scroller.workflow.call({
        process: Append.process,
        status: ProcessStatus.done
      });
      return;
    }

    Append.simulateFetch(scroller, items, _eof, prepend);

    scroller.workflow.call({
      process: Append.process,
      status: ProcessStatus.next
    });
  }

  static doVirtualize(scroller: Scroller, items: unknown[], prepend: boolean): void {
    const { buffer, viewport: { paddings } } = scroller;
    const bufferToken = prepend ? 'absMinIndex' : 'absMaxIndex';
    if (isFinite(buffer[bufferToken])) {
      const size = items.length * buffer.averageSize;
      const padding = prepend ? paddings.backward : paddings.forward;
      buffer[bufferToken] += (prepend ? -1 : 1) * items.length;
      padding.size += size;
      if (prepend) {
        scroller.viewport.scrollPosition += size;
      }
      scroller.logger.log(() => `buffer.${[bufferToken]} value is set to ${buffer[bufferToken]}`);
      scroller.logger.stat(`after virtual ${prepend ? 'prepend' : 'append'}`);
    }
  }

  static simulateFetch(scroller: Scroller, items: unknown[], eof: boolean, prepend: boolean): boolean {
    const { buffer, state: { fetch } } = scroller;
    const bufferToken = prepend ? 'absMinIndex' : 'absMaxIndex';
    let indexToAdd = buffer.getIndexToAdd(eof, prepend);
    let bufferLimit = buffer[bufferToken];
    const newItems: Item[] = [];

    for (let i = 0; i < items.length; i++) {
      const itemToAdd = new Item(indexToAdd, items[i], scroller.routines);
      if (isFinite(bufferLimit) && (
        (prepend && indexToAdd < bufferLimit) ||
        (!prepend && indexToAdd > bufferLimit)
      )) {
        bufferLimit += (prepend ? -1 : 1);
      }
      (prepend ? Array.prototype.unshift : Array.prototype.push).apply(newItems, [itemToAdd]);
      // (prepend ? newItems.unshift : newItems.push)(itemToAdd);
      indexToAdd += (prepend ? -1 : 1);
    }

    if (bufferLimit !== buffer[bufferToken]) {
      buffer[bufferToken] = bufferLimit;
      scroller.logger.log(() => `buffer.${bufferToken} value is set to ${buffer[bufferToken]}`);
    }

    (prepend ? fetch.prepend : fetch.append).call(fetch, newItems);
    (prepend ? buffer.prepend : buffer.append).call(buffer, newItems);
    fetch.first.indexBuffer = !isNaN(buffer.firstIndex) ? buffer.firstIndex : indexToAdd;
    fetch.last.indexBuffer = !isNaN(buffer.lastIndex) ? buffer.lastIndex : indexToAdd;

    return true;
  }

}
