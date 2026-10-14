import { onTestFinished } from 'vitest';
import {
  getDatasource,
  makeTest,
  AdapterMethodResult,
  ItemAdapter,
  TestConfig
} from '../scaffolding';

const config: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 100 }),
  datasourceSettings: {
    minIndex: 1,
    maxIndex: 100,
    itemSize: 20
  },
  datasourceDevSettings: { throttle: 0 },
  templateSettings: { viewportHeight: 120, itemHeight: 20 }
};

const waitForError = (error: unknown): Promise<unknown> =>
  new Promise(resolve => {
    const onError = (event: ErrorEvent) => {
      if (event.error === error) {
        event.preventDefault();
        window.removeEventListener('error', onError);
        resolve(event.error);
      }
    };
    window.addEventListener('error', onError);
    onTestFinished(() => window.removeEventListener('error', onError));
  });

describe('OnBeforeClip Spec', () => {
  [
    { error: new Error('onBeforeClip failure'), adjust: false },
    { error: undefined, adjust: false },
    { error: new Error('onBeforeClip failure'), adjust: true }
  ].forEach(({ error, adjust }) =>
    makeTest({
      config: {
        ...config,
        datasourceSettings: { ...config.datasourceSettings, infinite: true }
      },
      meta: `${error === undefined ? 'throw undefined' : 'throw Error'}, ` +
        `${adjust ? 'animation frame' : 'unchanged position'}`,
      title: 'should finish clipping before rethrowing the original error',
      it: misc => async () => {
        await misc.relaxNext();
        await misc.scrollToRelax(400);
        const cyclesDone = misc.workflow.cyclesDone;
        if (adjust) {
          misc.scroller.viewport.scrollPosition = 400.5;
        }

        let animated = false;
        const routines = misc.scroller.routines;
        const animate = routines.animate.bind(routines);
        routines.animate = callback => {
          animated = true;
          return animate(callback);
        };

        let clipped: ItemAdapter[] = [];
        let relaxPromise: Promise<AdapterMethodResult> | undefined;
        misc.scroller.settings.onBeforeClip = items => {
          clipped = items;
          relaxPromise = misc.adapter.relax();
          throw error;
        };

        const errorPromise = adjust ? waitForError(error) : null;
        const clipPromise = misc.adapter.clip();
        if (adjust) {
          // Frame cleanup completes the Adapter call; its throw reaches the browser instead.
          await expect(clipPromise).resolves.toEqual({
            success: true,
            immediate: false,
            details: null
          });
          expect(await errorPromise).toBe(error);
        } else {
          // Without a position change, End rethrows before the Adapter call returns.
          await expect(clipPromise).rejects.toBe(error);
        }
        expect(animated).toBe(adjust);

        expect(clipped.length).toBeGreaterThan(0);
        expect(clipped.every(item => !misc.getElement(item.$index))).toBe(true);
        expect(misc.adapter.isLoading).toBe(false);
        expect(misc.adapter.loopPending).toBe(false);
        expect(relaxPromise).toBeDefined();
        expect((await relaxPromise)?.success).toBe(true);
        misc.expect.domMatchesBuffer();
        misc.expect.uniformPaddings();
        expect(misc.getScrollPosition()).toBe(400);
        // The internal scroll adjustment must not start another cycle.
        await misc.waitForPaint();
        expect(misc.workflow.cyclesDone).toBe(cyclesDone + 1);

        misc.scroller.settings.onBeforeClip = null;
        await misc.scrollMinRelax();
        await misc.adapter.clip();
        misc.expect.startVisible(1);
      }
    })
  );

  makeTest({
    config: {
      ...config,
      datasourceSettings: { ...config.datasourceSettings, infinite: true }
    },
    title:
      'should preserve the original error when onBeforeClip resets the scroller',
    it: misc => async () => {
      await misc.relaxNext();
      await misc.scrollToRelax(400);
      const error = new Error('onBeforeClip reset failure');
      let resetPromise: Promise<AdapterMethodResult> | undefined;
      misc.scroller.settings.onBeforeClip = () => {
        resetPromise = misc.adapter.reset();
        throw error;
      };

      await expect(misc.adapter.clip()).rejects.toBe(error);
      expect(resetPromise).toBeDefined();
      await resetPromise;
      await misc.adapter.relax();

      expect(misc.adapter.isLoading).toBe(false);
      expect(misc.adapter.loopPending).toBe(false);
      misc.expect.domMatchesBuffer();
      misc.expect.uniformPaddings();
      misc.expect.startVisible(1);
      await misc.scrollToRelax(600);
      await expect(misc.adapter.clip()).resolves.toMatchObject({
        success: true
      });
    }
  });

  makeTest({
    config: {
      ...config,
      datasourceSettings: { ...config.datasourceSettings, infinite: true },
      skipInvariantAutoCheck: true
    },
    title:
      'should preserve the original error when onBeforeClip disposes the workflow',
    it: misc => async () => {
      await misc.relaxNext();
      await misc.scrollToRelax(400);
      const adapter = misc.adapter;
      const workflow = misc.workflow;
      const error = new Error('onBeforeClip disposal failure');
      misc.scroller.settings.onBeforeClip = () => {
        misc.dispose();
        throw error;
      };

      await expect(adapter.clip()).rejects.toBe(error);
      expect(workflow.disposed).toBe(true);
      expect(adapter.isLoading).toBe(false);
      expect(adapter.loopPending).toBe(false);
    }
  });

  makeTest({
    config: {
      ...config,
      datasourceSettings: { ...config.datasourceSettings, infinite: true },
      skipInvariantAutoCheck: true
    },
    title: 'should preserve a pending error when disposed before scroll adjustment',
    it: misc => async () => {
      await misc.relaxNext();
      await misc.scrollToRelax(400);
      const { adapter, workflow, scroller } = misc;
      const error = new Error('onBeforeClip failure before disposal');
      scroller.settings.onBeforeClip = () => {
        throw error;
      };

      // Force an adjustment frame, then dispose before it can deliver the exception.
      scroller.viewport.scrollPosition = 400.5;
      const errorPromise = waitForError(error);
      const clipPromise = adapter.clip();
      expect(scroller.state.clip.hasException).toBe(true);
      expect(scroller.state.scroll.cancelAnimation).not.toBeNull();
      misc.dispose();

      expect(await errorPromise).toBe(error);
      await expect(clipPromise).resolves.toEqual({
        success: false,
        immediate: false,
        details: 'Adapter was disposed'
      });
      expect(workflow.disposed).toBe(true);
      expect(scroller.disposed).toBe(true);
      expect(scroller.state.clip.hasException).toBe(false);
      expect(adapter.isLoading).toBe(false);
      expect(adapter.loopPending).toBe(false);
    }
  });

  makeTest({
    config,
    title: 'should not pass a clip error to reload triggered by firstVisible',
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      const error = new Error('onBeforeClip failure before reload');
      let reloadPromise: Promise<AdapterMethodResult> | undefined;
      let off = () => {};
      off = misc.adapter.firstVisible$.on(({ $index }) => {
        if ($index === 21) {
          off();
          reloadPromise = misc.adapter.reload(60);
        }
      });
      misc.scroller.settings.onBeforeClip = () => {
        misc.scroller.settings.onBeforeClip = null;
        throw error;
      };

      const errorPromise = waitForError(error);
      const finished = misc.waitForCycles(misc.workflow.cyclesDone + 2);
      misc.scrollTo(400);
      expect(await errorPromise).toBe(error);
      expect(reloadPromise).toBeDefined();
      await expect(reloadPromise).resolves.toMatchObject({ success: true });
      await finished;
      await misc.adapter.relax();

      expect(misc.adapter.isLoading).toBe(false);
      expect(misc.adapter.loopPending).toBe(false);
      misc.expect.domMatchesBuffer();
      misc.expect.uniformPaddings();
      misc.expect.startVisible(60);
    }
  });

  [false, true].forEach(resize =>
    makeTest({
      config: {
        ...config,
        datasource: () => getDatasource({ min: 1, max: 100, size: 20 }),
        templateSettings: { ...config.templateSettings, dynamicSize: 'size' }
      },
      meta: resize ? 'new rows have a different size' : 'uniform rows',
      title:
        'should finish an automatic clip before rethrowing and allow further scrolling',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        if (resize) {
          misc.setItemProcessor(({ data }) => (data.size = 40));
        }

        const error = new Error('automatic onBeforeClip failure');
        let clipped: ItemAdapter[] = [];
        misc.scroller.settings.onBeforeClip = items => {
          clipped = items;
          throw error;
        };

        // Default rendering is asynchronous, so its throw reaches the browser's error event.
        const errorPromise = waitForError(error);
        const cycleDone = misc.waitNextCycle();
        misc.scrollTo(400);
        expect(await errorPromise).toBe(error);
        await cycleDone;
        await misc.adapter.relax();

        expect(clipped.length).toBeGreaterThan(0);
        expect(clipped.every(item => !misc.getElement(item.$index))).toBe(true);
        expect(misc.adapter.isLoading).toBe(false);
        expect(misc.adapter.loopPending).toBe(false);
        misc.expect.domMatchesBuffer();
        if (!resize) {
          misc.expect.uniformPaddings();
        }
        misc.expect.startVisible(21);

        misc.scroller.settings.onBeforeClip = null;
        await misc.scrollMinRelax();
        misc.expect.startVisible(1);
      }
    })
  );
});
