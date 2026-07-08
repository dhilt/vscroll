import {
  makeTest,
  Misc,
  TestConfig,
  Workflow
} from '../scaffolding';

const baseConfig: TestConfig = {
  datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.5 },
  templateSettings: { viewportHeight: 200, itemHeight: 20 }
};

const getWorkflowState = <Data,>(workflow: Workflow<Data>) => ({
  initialized: workflow.isInitialized,
  internalAdapterInitialized: workflow.scroller?.adapter?.init,
  disposed: workflow.disposed
});

const getInstanceState = (misc: Misc) => ({
  initialized: misc.workflow.isInitialized,
  scrollerId: misc.scroller.settings.instanceIndex,
  internalAdapterId: misc.scroller.adapter.id,
  adapterId: misc.adapter.id,
  elementCount: misc.getElements().length
});

describe('Recreation Spec', () => {
  describe('Destroying (plain DS)', () => {
    makeTest({
      config: { ...baseConfig, noAdapter: true, skipInvariantAutoCheck: true },
      title: 'should not reset Datasource on destroy',
      it: misc => async () => {
        await misc.relaxNext();
        const workflow = misc.workflow;
        const before = getWorkflowState(workflow);

        misc.dispose();
        const after = getWorkflowState(workflow);

        expect(before.initialized).toBe(true);
        expect(before.internalAdapterInitialized).toBe(true);
        expect(before.disposed).toBe(false);
        expect(after.initialized).toBe(false);
        expect(after.internalAdapterInitialized).toBe(undefined);
        expect(after.disposed).toBe(true);
      }
    });
  });

  describe('Recreation (instance DS)', () => {
    makeTest({
      config: baseConfig,
      title: 'should switch Adapter.init three times',
      it: misc => async () => {
        let initCount = 0;
        let initializedDuringFirstAdapterInit = true;
        const off = misc.adapter.init$.on(initialized => {
          if (initialized && ++initCount === 1) {
            initializedDuringFirstAdapterInit = misc.workflow.isInitialized;
          }
        });

        await misc.relaxNext();
        await misc.recreate();
        await misc.recreate();
        off();

        expect(initializedDuringFirstAdapterInit).toBe(false);
        expect(initCount).toBe(3);
      }
    });

    makeTest({
      config: baseConfig,
      title: 'should re-render the viewport',
      it: misc => async () => {
        await misc.relaxNext();
        const before = getInstanceState(misc);

        await misc.recreate();
        const after = getInstanceState(misc);

        expect(after.initialized).toBe(true);
        expect(after.scrollerId).toBe(before.scrollerId + 1);
        expect(after.internalAdapterId).toBe(before.adapterId);
        expect(after.adapterId).toBe(before.adapterId);
        expect(after.elementCount).toBe(before.elementCount);
      }
    });

    makeTest({
      config: baseConfig,
      title: 'should scroll and take firstVisible',
      it: misc => async () => {
        await misc.relaxNext();
        await misc.recreate();
        expect(misc.adapter.firstVisible.$index).toBe(1);

        await misc.scrollToRelax(200);
        expect(misc.adapter.firstVisible.$index).toBeGreaterThan(1);
      }
    });
  });
});
