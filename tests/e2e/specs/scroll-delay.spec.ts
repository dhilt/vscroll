import {
  getDatasource,
  makeTest,
  Misc,
  TestConfig
} from '../scaffolding';

const baseConfig: TestConfig = {
  datasource: () => getDatasource({ delay: 150 }),
  datasourceSettings: {
    startIndex: 1,
    bufferSize: 5,
    padding: 0.5,
    itemSize: 20
  },
  templateSettings: { viewportHeight: 200, itemHeight: 20 },
  timeout: 5000
};

const waitUntilCycle = async (misc: Misc, target: number): Promise<void> => {
  while (misc.workflow.cyclesDone < target) {
    await misc.waitNextCycle();
  }
  await misc.adapter.relax();
};

const runAlternatingBurst = (
  misc: Misc,
  count: number,
  interval: number
): Promise<number> =>
  new Promise(resolve => {
    let completed = 0;
    const timer = setInterval(() => {
      completed++;
      if (completed % 2 === 0) {
        misc.scrollMin();
      } else {
        misc.scrollMax();
      }
      if (completed === count) {
        clearInterval(timer);
        resolve(completed);
      }
    }, interval);
  });

const startProgressiveBurst = (misc: Misc, startPosition: number) => {
  let count = 0;
  let endPosition = startPosition;
  const frames = new Set<number>();
  const timer = setInterval(() => {
    const frame = requestAnimationFrame(() => {
      frames.delete(frame);
      endPosition = startPosition + ++count * 5;
      misc.scrollTo(endPosition);
    });
    frames.add(frame);
  }, 25);

  return {
    stop: () => {
      clearInterval(timer);
      frames.forEach(cancelAnimationFrame);
      frames.clear();
    },
    getEndPosition: () => endPosition
  };
};

describe('Delay Scroll Spec', () => {
  makeTest({
    config: {
      ...baseConfig,
      datasourceDevSettings: { throttle: 500 }
    },
    title: 'should work with throttled scroll event handling',
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.workflow.cyclesDone).toBe(1);

      const thirdCycle = waitUntilCycle(misc, 3);
      const count = await runAlternatingBurst(misc, 10, 10);
      await thirdCycle;

      expect(count).toBe(10);
    }
  });

  makeTest({
    config: baseConfig,
    title: 'should handle additional scrolling during slow fetch',
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.workflow.cyclesDone).toBe(1);

      const startPosition = misc.getScrollPosition();
      const nextCycle = misc.waitNextCycle();
      const burst = startProgressiveBurst(misc, startPosition);
      await nextCycle;
      burst.stop();
      await misc.adapter.relax();

      const endPosition = burst.getEndPosition();
      expect(endPosition).toBeGreaterThan(startPosition);
      expect(misc.getScrollPosition()).toBe(endPosition);
    }
  });
});
