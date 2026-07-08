import {
  AdapterMethodResult,
  AdapterPropName as Adapter,
  makeTest,
  Misc
} from '../scaffolding';

interface BlockedCall {
  method: Adapter;
  invoke: (misc: Misc) => Promise<AdapterMethodResult>;
}

const pausedResult: AdapterMethodResult = {
  success: true,
  immediate: true,
  details: 'Scroller is paused'
};

const blockedCalls: BlockedCall[] = [
  { method: Adapter.reload, invoke: misc => misc.adapter.reload() },
  { method: Adapter.clip, invoke: misc => misc.adapter.clip() },
  {
    method: Adapter.fix,
    invoke: misc => misc.adapter.fix({ scrollPosition: 0 })
  },
  { method: Adapter.pause, invoke: misc => misc.adapter.pause() }
];

const attemptScroll = async (misc: Misc, position: number): Promise<void> => {
  const cyclesDone = misc.workflow.cyclesDone;
  misc.viewportElement.scrollTop = position;
  misc.viewportElement.dispatchEvent(new Event('scroll'));
  await misc.waitForPaint();

  expect(misc.workflow.cyclesDone).toBe(cyclesDone);
  expect(misc.adapter.isLoading).toBe(false);
};

const expectBlocked = async (
  misc: Misc,
  scenario: BlockedCall
): Promise<void> => {
  const cyclesDone = misc.workflow.cyclesDone;
  const result = await scenario.invoke(misc);

  expect(result, `${scenario.method} should be blocked`).toEqual(pausedResult);
  expect(misc.workflow.cyclesDone).toBe(cyclesDone);
  expect(misc.adapter.isLoading).toBe(false);
};

describe('Adapter Pause/Resume Spec', () => {
  makeTest({
    title: 'should pause & resume',
    config: {},
    it: misc => async () => {
      const { adapter, workflow } = misc;
      let reactivePaused = adapter.paused;
      const offPaused = adapter.paused$.on(value => (reactivePaused = value));

      await misc.relaxNext();
      const lastVisibleIndex = adapter.lastVisible.$index;
      const maxIndex = adapter.bufferInfo.maxIndex;

      expect(workflow.cyclesDone).toBe(1);
      expect(adapter.paused).toBe(false);
      expect(reactivePaused).toBe(false);

      const pauseResult = await adapter.pause();
      expect(pauseResult).toMatchObject({ success: true, immediate: true });
      expect(adapter.paused).toBe(true);
      expect(reactivePaused).toBe(true);

      const relaxResult = await adapter.relax();
      expect(relaxResult).toMatchObject({ success: true, immediate: true });

      await attemptScroll(misc, 0);
      await attemptScroll(misc, 9999);
      for (const scenario of blockedCalls) {
        await expectBlocked(misc, scenario);
      }

      expect(workflow.cyclesDone).toBe(1);
      expect(adapter.lastVisible.$index).toBe(lastVisibleIndex);
      expect(adapter.bufferInfo.maxIndex).toBe(maxIndex);

      const resumeResult = await adapter.resume();
      expect(resumeResult).toMatchObject({ success: true, immediate: false });
      expect(adapter.paused).toBe(false);
      expect(reactivePaused).toBe(false);
      expect(workflow.cyclesDone).toBe(2);
      expect(adapter.lastVisible.$index).toBe(maxIndex);
      expect(adapter.bufferInfo.maxIndex).toBeGreaterThan(maxIndex);

      await misc.scrollMaxRelax();
      expect(workflow.cyclesDone).toBe(3);
      await adapter.reload();
      expect(workflow.cyclesDone).toBe(4);

      offPaused();
    }
  });

  makeTest({
    title: 'should allow reset while paused',
    config: {},
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.workflow.cyclesDone).toBe(1);

      await misc.adapter.pause();
      await expectBlocked(misc, blockedCalls[0]);
      expect(misc.workflow.cyclesDone).toBe(1);
      expect(misc.adapter.paused).toBe(true);

      await misc.adapter.reset();
      expect(misc.workflow.cyclesDone).toBe(2);
      expect(misc.adapter.paused).toBe(false);

      await misc.scrollMaxRelax();
      expect(misc.workflow.cyclesDone).toBe(3);
      await misc.adapter.reload();
      expect(misc.workflow.cyclesDone).toBe(4);
    }
  });
});
