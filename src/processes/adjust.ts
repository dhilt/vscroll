import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import End from './end';

export default class Adjust extends BaseProcessFactory(CommonProcess.adjust) {
  static run(scroller: Scroller): void {
    const { workflow, viewport, state } = scroller;

    state.scroll.positionBeforeAdjust = viewport.scrollPosition;
    Adjust.setPaddings(scroller);
    state.scroll.positionAfterAdjust = viewport.scrollPosition;

    // scroll position adjustments
    const position = Adjust.calculatePosition(scroller);

    // additional adjustment if the position can't be reached during the initial cycle
    Adjust.setAdditionalForwardPadding(scroller, position);

    // set new position using animation frame
    Adjust.setPosition(scroller, position, () =>
      workflow.call({
        process: Adjust.process,
        status: ProcessStatus.done
      })
    );
  }

  static setPaddings(scroller: Scroller): void {
    const { viewport, buffer, settings, state } = scroller;
    const firstItem = buffer.getFirstVisibleItem();
    const lastItem = buffer.getLastVisibleItem();
    let first, last;
    if (firstItem && lastItem) {
      first = firstItem.$index;
      last = lastItem.$index;
    } else {
      const { fetch } = state;
      first = !isNaN(fetch.firstVisible.index) ? fetch.firstVisible.index : buffer.startIndex;
      last = first - 1;
    }
    const { forward, backward } = viewport.paddings;
    let bwdSize = buffer.getRangeSize(buffer.finiteAbsMinIndex, first - 1);
    let fwdSize = buffer.getRangeSize(last + 1, buffer.finiteAbsMaxIndex);

    // lack of items case
    const bufferSize = viewport.getScrollableSize() - forward.size - backward.size;
    const scrollSize = bwdSize + bufferSize + fwdSize;
    const viewportSizeDiff = viewport.getSize() - scrollSize;
    if (viewportSizeDiff > 0) {
      if (settings.alignShortContentToEnd) {
        bwdSize += viewportSizeDiff;
      } else {
        fwdSize += viewportSizeDiff;
      }
      scroller.logger.log(() =>
        settings.alignShortContentToEnd
          ? 'backward'
          : 'forward' + ` padding will be increased by ${viewportSizeDiff} to fill the viewport`
      );
    }

    backward.size = bwdSize;
    forward.size = fwdSize;

    scroller.logger.stat('after paddings adjustments');
  }

  static calculatePosition(scroller: Scroller): number {
    const { viewport, buffer, state } = scroller;
    const { fetch, render, scroll } = state;
    let position = viewport.paddings.backward.size;

    // increase the position to meet the expectation of the first visible item
    if (!isNaN(fetch.firstVisible.index) && !isNaN(buffer.firstIndex)) {
      scroller.logger.log(
        `first index = ${fetch.firstVisible.index}, delta = ${fetch.firstVisible.delta}`
      );
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
    if (scroll.positionBeforeAsync !== null) {
      const diff = render.positionBefore - scroll.positionBeforeAsync;
      if (diff !== 0) {
        scroller.logger.log(`shift position due to fetch-render difference (${diff})`);
        position += diff;
      }
    }

    // increase the position due to viewport's offset
    if (viewport.offset > 0 && (position || fetch.positions.before)) {
      position += viewport.offset;
    }

    // Preserve fractional native positions so rounding alone cannot interrupt smooth scrolling.
    return position;
  }

  static setAdditionalForwardPadding(scroller: Scroller, position: number): void {
    const { viewport, buffer, state } = scroller;
    if (!state.cycle.isInitial || !End.shouldContinueRun(scroller, null)) {
      return;
    }
    const diff = position - viewport.getMaxScrollPosition();
    if (diff <= 0) {
      return;
    }
    const last = buffer.getLastVisibleItem();
    if (!last) {
      return;
    }
    let size = 0;
    let index = last.$index + 1;
    while (size <= diff && index <= buffer.absMaxIndex) {
      size += buffer.getSizeByIndex(index++);
    }
    const shift = Math.min(size, diff);
    if (shift) {
      viewport.paddings.forward.size += shift;
      scroller.logger.log(`increase fwd padding due to lack of items (${diff} -> ${shift})`);
    }
  }

  static setPosition(scroller: Scroller, position: number, done: () => void): void {
    const { state, viewport, routines } = scroller;
    const { scroll } = state;
    if (!scroll.hasPositionChanged(position)) {
      viewport.scrollPosition = position; // commits paddings
      return done();
    }
    scroll.syntheticPosition = position;
    scroll.syntheticFulfill = false;

    scroll.cancelAnimation = routines.animate(() => {
      scroll.cancelAnimation = null;
      // Preserve native motion in either direction while awaiting the animation frame.
      const inertiaDiff = (scroll.positionAfterAdjust as number) - viewport.scrollPosition;
      let diffLog = '';
      if (inertiaDiff) {
        position -= inertiaDiff;
        diffLog = ` (${inertiaDiff > 0 ? '-' : '+'}${Math.abs(inertiaDiff)})`;
      }
      scroll.syntheticFulfill = true;
      // The scroll event reports the position as applied, e.g. rounded to device pixels
      scroll.syntheticPosition = viewport.setPosition(position);
      scroller.logger.stat('after scroll adjustment' + diffLog);
      done();
    });
  }
}
