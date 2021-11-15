import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';

export default class Adjust extends BaseProcessFactory(CommonProcess.adjust) {

  static run(scroller: Scroller): void {
    const { workflow, viewport, state: { scrollState } } = scroller;

    scrollState.positionBeforeAdjust = viewport.scrollPosition;
    Adjust.setPaddings(scroller);
    scrollState.positionAfterAdjust = viewport.scrollPosition;

    // scroll position adjustments
    const position = Adjust.calculatePosition(scroller);

    // set new position using animation frame
    Adjust.setPosition(scroller, position, () =>
      workflow.call({
        process: Adjust.process,
        status: ProcessStatus.done
      })
    );
  }

  static setPaddings(scroller: Scroller): void {
    const { viewport, buffer, settings: { inverse }, state: { fetch } } = scroller;
    const firstItem = buffer.getFirstVisibleItem();
    const lastItem = buffer.getLastVisibleItem();
    let first, last;
    if (firstItem && lastItem) {
      first = firstItem.$index;
      last = lastItem.$index;
    } else {
      first = !isNaN(fetch.firstVisible.index) ? fetch.firstVisible.index : buffer.startIndex;
      last = first - 1;
    }
    const { forward, backward } = viewport.paddings;
    let index, bwdSize = 0, fwdSize = 0;

    // new backward and forward paddings size
    for (index = buffer.finiteAbsMinIndex; index < first; index++) {
      bwdSize += buffer.getSizeByIndex(index);
    }
    for (index = last + 1; index <= buffer.finiteAbsMaxIndex; index++) {
      fwdSize += buffer.getSizeByIndex(index);
    }

    // lack of items case
    const bufferSize = viewport.getScrollableSize() - forward.size - backward.size;
    const viewportSizeDiff = viewport.getSize() - (bwdSize + bufferSize + fwdSize);
    if (viewportSizeDiff > 0) {
      if (inverse) {
        bwdSize += viewportSizeDiff;
      } else {
        fwdSize += viewportSizeDiff;
      }
      scroller.logger.log(() =>
        inverse ? 'backward' : 'forward' + ` padding will be increased by ${viewportSizeDiff} to fill the viewport`
      );
    }

    backward.size = bwdSize;
    forward.size = fwdSize;

    scroller.logger.stat('after paddings adjustments');
  }

  static calculatePosition(scroller: Scroller): number {
    const { viewport, buffer, state: { fetch, render, scrollState } } = scroller;
    let position = viewport.paddings.backward.size;

    // increase the position to meet the expectation of the first visible item
    if (!isNaN(fetch.firstVisible.index) && !isNaN(buffer.firstIndex)) {
      scroller.logger.log(`first index = ${fetch.firstVisible.index}, delta = ${fetch.firstVisible.delta}`);
      const shouldCheckPreSizeExpectation = fetch.shouldCheckPreSizeExpectation(buffer.lastIndex);
      buffer.items.forEach(item => {
        // 1) shift of the buffered items before the first visible item
        if (item.$index < fetch.firstVisible.index) {
          position += item.size;
          return;
        }
        // 2) delta of the first visible item
        if (item.$index === fetch.firstVisible.index && fetch.firstVisible.delta) {
          position -= fetch.firstVisible.delta;
        }
        // 3) difference between expected and real sizes of fetched items after the first visible
        if (shouldCheckPreSizeExpectation && item.preSize && fetch.items.includes(item)) {
          position += item.size - item.preSize;
        }
      });
    }

    // slow fetch/render case
    if (scrollState.positionBeforeAsync !== null) {
      const diff = render.positionBefore - scrollState.positionBeforeAsync;
      if (diff !== 0) {
        scroller.logger.log(`shift position due to fetch-render difference (${diff})`);
        position += diff;
      }
    }

    // increase the position due to viewport's offset
    if (viewport.offset > 0 && (position || fetch.positions.before)) {
      position += viewport.offset;
    }

    return Math.round(position);
  }

  static setPosition(scroller: Scroller, position: number, done: () => void): void {
    const { state: { scrollState }, viewport, routines } = scroller;
    if (!scrollState.hasPositionChanged(position)) {
      return done();
    }
    scrollState.syntheticPosition = position;
    scrollState.syntheticFulfill = false;

    scrollState.cancelAnimation = routines.animate(() => {
      scrollState.cancelAnimation = null;
      const inertiaDiff = (scrollState.positionAfterAdjust as number) - viewport.scrollPosition;
      let diffLog = '';
      if (inertiaDiff > 0) {
        position -= inertiaDiff;
        scrollState.syntheticPosition = position;
        diffLog = ` (-${inertiaDiff})`;
      }
      scrollState.syntheticFulfill = true;
      viewport.scrollPosition = position;
      scroller.logger.stat('after scroll adjustment' + diffLog);
      done();
    });
  }

}
