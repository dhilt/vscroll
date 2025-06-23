import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import End from './end';

export default class Adjust extends BaseProcessFactory(CommonProcess.adjust) {

  static run(scroller: Scroller): void {
    const { workflow, viewport, state: { scroll } } = scroller;

    scroll.positionBeforeAdjust = viewport.scrollPosition;
    Adjust.setPaddings(scroller);
    scroll.positionAfterAdjust = viewport.scrollPosition;

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
    const scrollSize = bwdSize + bufferSize + fwdSize;
    const viewportSizeDiff = viewport.getSize() - scrollSize;
    if (viewportSizeDiff > 0) {
      if (inverse) {
        bwdSize += viewportSizeDiff;
      } else {
        fwdSize += viewportSizeDiff;
      }
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        scroller.logger.log(() =>
          inverse ? 'backward' : 'forward' + ` padding will be increased by ${viewportSizeDiff} to fill the viewport`
        );
      }
    }

    backward.size = bwdSize;
    forward.size = fwdSize;

    if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
      scroller.logger.stat('after paddings adjustments');
    }
  }

  static calculatePosition(scroller: Scroller): number {
    const { viewport, buffer, state: { fetch, render, scroll } } = scroller;
    let position = viewport.paddings.backward.size;

    // increase the position to meet the expectation of the first visible item
    if (!isNaN(fetch.firstVisible.index) && !isNaN(buffer.firstIndex)) {
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        scroller.logger.log(`first index = ${fetch.firstVisible.index}, delta = ${fetch.firstVisible.delta}`);
      }
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
        if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
          scroller.logger.log(`shift position due to fetch-render difference (${diff})`);
        }
        position += diff;
      }
    }

    // increase the position due to viewport's offset
    if (viewport.offset > 0 && (position || fetch.positions.before)) {
      position += viewport.offset;
    }

    return Math.round(position);
  }

  static setAdditionalForwardPadding(scroller: Scroller, position: number): void {
    const { viewport, buffer, state: { cycle } } = scroller;
    if (!cycle.isInitial || !End.shouldContinueRun(scroller, null)) {
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
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        scroller.logger.log(`increase fwd padding due to lack of items (${diff} -> ${shift})`);
      }
    }
  }

  static setPosition(scroller: Scroller, position: number, done: () => void): void {
    const { state: { scroll }, viewport, routines } = scroller;
    if (!scroll.hasPositionChanged(position)) {
      return done();
    }
    scroll.syntheticPosition = position;
    scroll.syntheticFulfill = false;

    scroll.cancelAnimation = routines.animate(() => {
      scroll.cancelAnimation = null;
      const inertiaDiff = (scroll.positionAfterAdjust as number) - viewport.scrollPosition;
      let diffLog = '';
      if (inertiaDiff > 0) {
        position -= inertiaDiff;
        scroll.syntheticPosition = position;
        diffLog = ` (-${inertiaDiff})`;
      }
      scroll.syntheticFulfill = true;
      viewport.scrollPosition = position;
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        scroller.logger.stat('after scroll adjustment' + diffLog);
      }
      done();
    });
  }

}
