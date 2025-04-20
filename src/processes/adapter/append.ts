import { Scroller } from '../../scroller';
import Insert from './insert';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { AdapterAppendOptions, AdapterPrependOptions } from '../../interfaces/index';

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

    const shouldAppend = Append.doAppend(scroller, process, params);

    scroller.workflow.call({
      process: Append.process,
      status: shouldAppend ? ProcessStatus.next : ProcessStatus.done
    });
  }

  static doAppend(scroller: Scroller, process: AdapterProcess, params: AdapterAppendPrependOptions): boolean {
    const { bof, eof, increase, decrease } = params;
    const { buffer } = scroller;
    const prepend = process === AdapterProcess.prepend;
    const opposite = prepend ? !increase : decrease;
    let beforeIndex, afterIndex, items = params.items;
    if (prepend) {
      beforeIndex = (bof ? buffer.absMinIndex : buffer.minIndex) + (!buffer.size ? 1 : 0);
      items = [...items].reverse();
    } else {
      afterIndex = (eof ? buffer.absMaxIndex : buffer.maxIndex) - (!buffer.size && !opposite ? 1 : 0);
    }
    return Insert.doInsert(scroller, {
      items,
      beforeIndex,
      afterIndex,
      decrease: opposite,
      virtualize: params.virtualize
    });
  }

}
