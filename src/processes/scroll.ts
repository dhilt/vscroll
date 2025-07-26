import { BaseProcessFactory, CommonProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { Direction } from '../inputs/index';
import { ScrollEventData, ScrollerWorkflow } from '../interfaces/index';

export default class Scroll extends BaseProcessFactory(CommonProcess.scroll) {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static run(scroller: Scroller, payload?: { event?: Event }): void {
    const { workflow, viewport } = scroller;
    const position = viewport.scrollPosition;

    if (Scroll.onSynthetic(scroller, position)) {
      return;
    }

    Scroll.onThrottle(scroller, position, () =>
      Scroll.onScroll(scroller, workflow)
    );
  }

  static onSynthetic(scroller: Scroller, position: number): boolean {
    const { scroll } = scroller.state;
    const synthPos = scroll.syntheticPosition;
    if (synthPos !== null) {
      if (scroll.syntheticFulfill) {
        scroll.syntheticPosition = null;
      }
      if (!scroll.syntheticFulfill || synthPos === position) {
        if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
          scroller.logger.log(() => [
            'skipping scroll', position, `[${scroll.syntheticFulfill ? '' : 'pre-'}synthetic]`
          ]);
        }
        return true;
      }
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        scroller.logger.log(() => [
          'synthetic scroll has been fulfilled:', position, position < synthPos ? '<' : '>', synthPos
        ]);
      }
    }
    return false;
  }

  static onThrottle(scroller: Scroller, position: number, done: () => void): void {
    const { state: { scroll }, settings: { throttle }, logger } = scroller;
    scroll.current = Scroll.getScrollEvent(position, scroll.previous);
    const { direction, time } = scroll.current;
    const timeDiff = scroll.previous ? time - scroll.previous.time : Infinity;
    const delta = throttle - timeDiff;
    const shouldDelay = isFinite(delta) && delta > 0;
    const alreadyDelayed = !!scroll.scrollTimer;
    if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
      logger.log(() => [
        direction === Direction.backward ? '\u2934' : '\u2935',
        position,
        shouldDelay ? (timeDiff + 'ms') : '0ms',
        shouldDelay ? (alreadyDelayed ? 'delayed' : `/ ${delta}ms delay`) : ''
      ]);
    }
    if (!shouldDelay) {
      if (scroll.scrollTimer) {
        clearTimeout(scroll.scrollTimer);
        scroll.scrollTimer = null;
      }
      done();
      return;
    }
    if (!alreadyDelayed) {
      scroll.scrollTimer = setTimeout(() => {
        if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
          logger.log(() => {
            const curr = Scroll.getScrollEvent(scroller.viewport.scrollPosition, scroll.current);
            return [
              curr.direction === Direction.backward ? '\u2934' : '\u2935',
              curr.position,
              (curr.time - time) + 'ms',
              'triggered by timer set on',
              position
            ];
          });
        }
        scroll.scrollTimer = null;
        done();
      }, delta);
    }
  }

  static getScrollEvent(position: number, previous: ScrollEventData | null): ScrollEventData {
    const time = Number(new Date());
    let direction: Direction | null = Direction.forward;
    if (previous) {
      if (position === previous.position) {
        direction = previous.direction;
      } else if (position < previous.position) {
        direction = Direction.backward;
      }
    }
    return { position, direction, time };
  }

  static onScroll(scroller: Scroller, workflow: ScrollerWorkflow): void {
    const { state: { scroll, cycle } } = scroller;
    scroll.previous = { ...(scroll.current as ScrollEventData) };
    scroll.current = null;

    if (cycle.busy.get()) {
      if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
        scroller.logger.log(() => ['skipping scroll', (scroll.previous as ScrollEventData).position, '[pending]']);
      }
      return;
    }

    workflow.call({
      process: Scroll.process,
      status: ProcessStatus.next
    });
  }

}
