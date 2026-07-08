import {
  getDatasource,
  makeDatasource,
  makeTest,
  TestHost,
  DatasourceProcessor,
  ItemAdapter,
  TestConfig,
  TestItem
} from '../scaffolding';

const Datasource = makeDatasource();
const removedIndexes = [1, 2, 3, 4, 5];
const replacementMin = 2;
const replacementMax = 5;
const clippedIndexes: number[] = [];

const shiftDatasourceAfterReplacement: DatasourceProcessor = items =>
  items.forEach(({ data }) => {
    if (data.id < replacementMin) {
      return;
    }
    data.id += replacementMax - replacementMin + 1;
    data.text = `item #${data.id}`;
  });

const removeDatasourceBeginning: DatasourceProcessor = items => {
  for (let index = items.length - 1; index >= 0; index--) {
    if (removedIndexes.includes(items[index].data.id)) {
      items.splice(index, 1);
    }
  }
};

const emptyScrollableConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 0 }),
  templateSettings: { viewportPadding: 200 }
};

const bothEdgesConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 100 }),
  datasourceSettings: { padding: 5 },
  templateSettings: { viewportHeight: 300, itemHeight: 15 }
};

const reloadConfig: TestConfig = {
  datasource: () => getDatasource({ delay: 150 }),
  datasourceSettings: { bufferSize: 15 },
  timeout: 4000
};

const inverseConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 10 }),
  datasourceSettings: {
    startIndex: -1,
    bufferSize: 7,
    itemSize: 20,
    inverse: true
  },
  templateSettings: { viewportHeight: 300, dynamicSize: 'size' }
};

const replacementConfig: TestConfig = {
  datasource: () => getDatasource({ min: -99, max: 100 }),
  datasourceSettings: { startIndex: replacementMin - 1 }
};

const clipConfig: TestConfig = {
  datasource: () => getDatasource(),
  datasourceSettings: { bufferSize: 50 }
};

const beforeClipConfig: TestConfig = {
  datasource: () => getDatasource(),
  datasourceSettings: {
    onBeforeClip: items =>
      items.forEach(({ $index }) => clippedIndexes.push($index))
  }
};

const infiniteConfig: TestConfig = {
  datasource: () => getDatasource({ delay: 25 }),
  datasourceSettings: { bufferSize: 50, infinite: true },
  timeout: 4000
};

const removeConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 100 }),
  datasourceSettings: {
    startIndex: 1,
    minIndex: 1,
    maxIndex: 100,
    bufferSize: 5
  }
};

const largePaddingConfig: TestConfig = {
  datasource: () => getDatasource(),
  datasourceSettings: {
    startIndex: 1,
    minIndex: 1,
    maxIndex: 123456,
    bufferSize: 5
  }
};

const negativeCutConfig: TestConfig = {
  datasource: () => getDatasource({ min: -10, max: 100 }),
  datasourceSettings: { startIndex: 1, bufferSize: 5 },
  templateSettings: { viewportHeight: 250, itemHeight: 22 }
};

describe('Bug Spec', () => {
  makeTest({
    config: emptyScrollableConfig,
    title: 'should stop empty datasource cycles on the first inner loop',
    it: misc => async () => {
      await misc.relaxNext();
      await misc.scrollMaxRelax();
      await misc.scrollMinRelax();
      await misc.scrollMaxRelax();

      expect(misc.workflow.cyclesDone).toBe(4);
      expect(misc.innerLoopCount).toBe(4);
      expect(misc.scroller.buffer.size).toBe(0);
    }
  });

  makeTest({
    config: bothEdgesConfig,
    title: 'should update firstVisible and lastVisible at both edges',
    it: misc => async () => {
      let firstUpdates = 0;
      let lastUpdates = 0;
      let checkedFirst = 0;
      let checkedLast = 0;
      const offFirst = misc.adapter.firstVisible$.on(() => firstUpdates++);
      const offLast = misc.adapter.lastVisible$.on(() => lastUpdates++);
      const check = () => {
        expect(misc.adapter.bof).toBe(true);
        expect(misc.adapter.eof).toBe(true);
        expect(firstUpdates).toBeGreaterThan(checkedFirst);
        expect(lastUpdates).toBeGreaterThan(checkedLast);
        checkedFirst = firstUpdates;
        checkedLast = lastUpdates;
        misc.expect.visibleWithinBuffer();
      };

      try {
        await misc.relaxNext();
        check();
        await misc.scrollMaxRelax();
        check();
        await misc.scrollMinRelax();
        check();
      } finally {
        offFirst();
        offLast();
      }
    }
  });

  makeTest({
    config: reloadConfig,
    title: 'should recover from repeated reload interruptions',
    it: misc => async () => {
      if (!misc.adapter.init) {
        await misc.waitForAdapterInit();
      }

      const reloads: Array<ReturnType<typeof misc.adapter.reload>> = [];
      const reloadTwice = () => {
        reloads.push(misc.adapter.reload(), misc.adapter.reload());
      };

      reloadTwice();
      await misc.delay(25);
      reloadTwice();
      await misc.delay(25);
      reloadTwice();

      const results = await Promise.all(reloads);
      await misc.adapter.relax();

      expect(results).toHaveLength(6);
      expect(results.every(result => result.success)).toBe(true);
      expect(misc.workflow.isInitialized).toBe(true);
      misc.expect.domMatchesBuffer();

      const cyclesDone = misc.workflow.cyclesDone;
      await misc.adapter.reload();
      expect(misc.workflow.cyclesDone).toBeGreaterThan(cyclesDone);
    }
  });

  makeTest({
    config: inverseConfig,
    title: 'should not extend forward padding for an oversized inverse item',
    before: misc =>
      misc.setItemProcessor(({ $index, data }) => {
        data.size = $index === 4 ? 120 : 20;
      }),
    it: misc => async () => {
      await misc.relaxNext();

      expect(misc.padding.backward.getSize()).toBe(0);
      expect(misc.padding.forward.getSize()).toBe(0);
      misc.expect.domIndexesMatchBuffer();
    }
  });

  test('should deliver firstVisible to an early subscriber', async () => {
    const source = getDatasource({ min: 1, max: 100 });
    const datasource = new Datasource<TestItem>({
      get: source.get.bind(source),
      settings: { startIndex: 1 }
    });
    let firstVisible: ItemAdapter<TestItem> | undefined;
    const off = datasource.adapter.firstVisible$.on(value => {
      firstVisible = value;
    });
    const host = new TestHost({ datasource: () => datasource });

    try {
      await host.relaxNext();
      expect(firstVisible).toBe(host.adapter.firstVisible);
      expect(firstVisible?.$index).toBe(1);
    } finally {
      off();
      host.dispose();
    }
  });

  makeTest({
    config: replacementConfig,
    title: 'should keep firstVisible while replacing via remove and insert',
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.adapter.firstVisible.$index).toBe(replacementMin - 1);

      misc.setDatasourceProcessor(shiftDatasourceAfterReplacement);
      await misc.adapter.remove({
        predicate: ({ $index }) =>
          $index >= replacementMin && $index <= replacementMax
      });
      await misc.adapter.insert({
        items: [{ id: replacementMax + 1, text: `item #${replacementMax} *` }],
        after: ({ $index }) => $index === replacementMin - 1
      });

      expect(misc.adapter.firstVisible.$index).toBe(replacementMin - 1);
      misc.scroller.buffer.items.forEach(item => {
        const expected =
          item.$index === replacementMin
            ? `${replacementMax} *`
            : String(
                item.$index > replacementMin
                  ? item.$index + replacementMax - replacementMin
                  : item.$index
              );
        expect(item.data.text).toBe(`item #${expected}`);
      });
      misc.expect.domIndexesMatchBuffer();
    }
  });

  makeTest({
    config: clipConfig,
    title: 'should clip only once',
    it: misc => async () => {
      const { clip } = misc.scroller.state;
      await misc.relaxNext();
      expect(clip.callCount).toBe(0);

      await misc.adapter.clip();
      expect(clip.callCount).toBe(1);

      await misc.adapter.clip();
      expect(clip.callCount).toBe(1);
    }
  });

  makeTest({
    config: beforeClipConfig,
    title: 'should pass exactly removed items to onBeforeClip',
    before: () => {
      clippedIndexes.length = 0;
    },
    it: misc => async () => {
      await misc.relaxNext();
      const before = misc.scroller.buffer.items.map(item => item.$index);

      await misc.scrollMaxRelax();

      const after = new Set(
        misc.scroller.buffer.items.map(item => item.$index)
      );
      const removed = before.filter(index => !after.has(index)).sort();

      expect(removed.length).toBeGreaterThan(0);
      expect([...clippedIndexes].sort()).toEqual(removed);
    }
  });

  makeTest({
    config: infiniteConfig,
    title: 'should finish a scroll cycle in infinite mode',
    it: misc => async () => {
      await misc.relaxNext();
      const cyclesDone = misc.workflow.cyclesDone;

      await misc.scrollMinRelax();

      expect(misc.workflow.cyclesDone).toBe(cyclesDone + 1);
      expect(misc.scroller.state.cycle.busy.get()).toBe(false);
      misc.expect.domMatchesBuffer();
    }
  });

  makeTest({
    config: removeConfig,
    title: 'should shift startIndex after removal with increase',
    it: misc => async () => {
      await misc.relaxNext();
      const { buffer } = misc.scroller;
      const startIndex = buffer.startIndex;
      const stableBufferSize = buffer.size;

      await misc.adapter.remove({
        predicate: ({ $index }) => removedIndexes.includes($index),
        increase: true
      });
      misc.setDatasourceProcessor(removeDatasourceBeginning);

      expect(buffer.startIndex).toBe(startIndex + removedIndexes.length);
      await misc.scrollMaxRelax();
      await misc.scrollMinRelax();

      misc.expect.domMatchesBuffer();
      expect(buffer.size).toBeLessThanOrEqual(stableBufferSize);
    }
  });

  makeTest({
    config: largePaddingConfig,
    title: 'should not jump when padding is larger than one million pixels',
    it: misc => async () => {
      await misc.relaxNext();
      await misc.scrollMaxRelax();

      expect(misc.adapter.eof).toBe(true);
      expect(misc.getScrollPosition()).toBe(
        misc.getScrollableSize() - misc.getViewportSize()
      );
      misc.expect.consistent();
    }
  });

  makeTest({
    config: negativeCutConfig,
    title: 'should not leave a gap after cutting negative indexes',
    it: misc => async () => {
      await misc.relaxNext();
      await misc.scrollMaxRelax();
      await misc.scrollMinRelax();

      expect(misc.adapter.bof).toBe(true);
      expect(misc.adapter.bufferInfo.minIndex).toBe(-10);
      expect(misc.adapter.bufferInfo.firstIndex).toBe(-10);
      expect(misc.adapter.bufferInfo.absMinIndex).toBe(-10);
      expect(misc.adapter.firstVisible.$index).toBe(-5);
      expect(misc.checkElementContentByIndex(-5)).toBe(true);
      misc.expect.domMatchesBuffer();
    }
  });
});
