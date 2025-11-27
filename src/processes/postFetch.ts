import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { Item } from '../classes/item';

export default class PostFetch extends BaseProcessFactory(CommonProcess.postFetch) {
  static run(scroller: Scroller): void {
    const { workflow } = scroller;
    if (PostFetch.setItems(scroller)) {
      PostFetch.setBufferLimits(scroller);
      workflow.call({
        process: PostFetch.process,
        status: scroller.state.fetch.hasNewItems ? ProcessStatus.next : ProcessStatus.done
      });
    } else {
      workflow.call({
        process: PostFetch.process,
        status: ProcessStatus.error,
        payload: { error: 'Can not set buffer items' }
      });
    }
  }

  static setBufferLimits(scroller: Scroller): void {
    const { buffer, state } = scroller;
    const { fetch, cycle } = state;
    const { items, first, last } = fetch;
    if (!items.length) {
      if (last.index < buffer.minIndex || cycle.innerLoop.isInitial) {
        buffer.absMinIndex = buffer.minIndex;
      }
      if (first.index > buffer.maxIndex || cycle.innerLoop.isInitial) {
        buffer.absMaxIndex = buffer.maxIndex;
      }
    } else {
      const lastIndex = items.length - 1;
      if (first.index < items[0].$index) {
        buffer.absMinIndex = items[0].$index;
      }
      if (last.index > items[lastIndex].$index) {
        buffer.absMaxIndex = items[lastIndex].$index;
      }
    }
  }

  static setItems(scroller: Scroller): boolean {
    const { buffer, state } = scroller;
    const { fetch, cycle } = state;
    const items = fetch.newItemsData;
    if (!items || !items.length) {
      // empty result
      return true;
    }
    // eof/bof case, need to shift fetch index if bof
    let fetchIndex = fetch.index;
    if (items.length < fetch.count) {
      if (cycle.innerLoop.isInitial) {
        // let's treat initial poor fetch as startIndex-bof
        fetchIndex = buffer.startIndex;
      } else if (fetch.first.index < buffer.minIndex) {
        // normal bof
        fetchIndex = buffer.firstIndex - items.length;
      }
    }
    fetch.items = items.map(
      (item, index: number) => new Item(fetchIndex + index, item, scroller.routines)
    );
    return buffer.setItems(fetch.items);
  }
}
