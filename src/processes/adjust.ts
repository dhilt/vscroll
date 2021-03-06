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
      first = !isNaN(fetch.firstVisibleIndex) ? fetch.firstVisibleIndex : buffer.startIndex;
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
    const { viewport, buffer, state } = scroller;
    const { fetch, render, scrollState } = state;
    let position = viewport.paddings.backward.size;

    // backward outlet increase
    if (!isNaN(fetch.firstVisibleIndex) && !isNaN(buffer.firstIndex)) {
      for (let i = buffer.firstIndex; i < fetch.firstVisibleIndex; i++) {
        position += buffer.getSizeByIndex(i);
      }
      if (fetch.firstVisibleItemDelta) {
        position -= fetch.firstVisibleItemDelta;
      }
    } else {
      if (fetch.isPrepend && fetch.negativeSize) {
        position += fetch.negativeSize;
      }
    }

    // change per slow fetch/render
    if (scrollState.positionBeforeAsync !== null) {
      const diff = render.positionBefore - scrollState.positionBeforeAsync;
      if (diff !== 0) {
        scroller.logger.log(`shift position due to fetch-render difference (${diff})`);
        position += diff;
      }
    }

    // offset increase
    if (viewport.offset > 0 && (position || fetch.positions.before)) {
      position += viewport.offset;
    }

    return Math.round(position);
  }

  static setPosition(scroller: Scroller, position: number, done: () => void): void {
    const { state: { scrollState }, viewport } = scroller;
    if (!scrollState.hasPositionChanged(position)) {
      return done();
    }
    scrollState.syntheticPosition = position;
    scrollState.syntheticFulfill = false;

    scrollState.animationFrameId = requestAnimationFrame(() => {
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
