import {
  getDynamicSize,
  makeTest,
  Misc,
  MutableDatasource,
  SizeStrategy,
  TestConfig
} from '../scaffolding';

interface RemovalScenario {
  config: TestConfig;
  indexes: number[];
  increase?: boolean;
  useIndexes?: boolean;
  byId?: boolean;
}

interface DynamicScenario {
  startIndex: number;
  indexToRemove: number;
  strategy: SizeStrategy;
  increase: boolean;
  reloadIndex?: number;
}

interface FlushScenario {
  startIndex: number;
  maxIndex: number;
  fixRight: boolean;
  expectedRange: [number, number];
  meta: string;
}

interface MixedScenario {
  startIndex: number;
  indexes: number[];
  increase: boolean;
  expected: { min: number; max: number };
  meta: string;
}

const min = -99;
const max = 100;
const itemSize = 20;
const oversizedItemSize = 100;

const createConfig = (
  datasourceSettings: NonNullable<TestConfig['datasourceSettings']>,
  sourceMin = min,
  sourceMax = max,
  templateSettings: TestConfig['templateSettings'] = { viewportHeight: 100 }
): TestConfig => ({
  datasource: () => new MutableDatasource(sourceMin, sourceMax),
  datasourceSettings,
  templateSettings,
  timeout: 4000
});

const bufferConfigs = [
  createConfig({
    startIndex: 1,
    bufferSize: 5,
    padding: 0.2,
    itemSize
  }),
  createConfig({
    startIndex: 55,
    bufferSize: 8,
    padding: 1,
    itemSize
  }),
  createConfig({
    startIndex: 10,
    bufferSize: 5,
    padding: 0.2,
    itemSize
  })
];

const baseRemovals = [
  [3, 4, 5],
  [54, 55, 56, 57, 58],
  [7, 8, 9]
];

const interruptedRemovals = [
  [2, 3, 5, 6],
  [54, 56, 57, 58]
];

const bufferScenarios: RemovalScenario[] = [
  ...bufferConfigs.flatMap((config, index) => [
    { config, indexes: baseRemovals[index] },
    { config, indexes: baseRemovals[index], byId: true }
  ]),
  ...interruptedRemovals.map((indexes, index) => ({
    config: bufferConfigs[index],
    indexes
  })),
  ...bufferConfigs.map((config, index) => ({
    config,
    indexes: baseRemovals[index],
    increase: true
  })),
  {
    config: bufferConfigs[0],
    indexes: baseRemovals[0],
    useIndexes: true
  },
  {
    config: bufferConfigs[1],
    indexes: interruptedRemovals[1],
    useIndexes: true
  },
  {
    config: bufferConfigs[2],
    indexes: baseRemovals[2],
    increase: true,
    useIndexes: true
  }
];

const virtualConfig = createConfig({
  startIndex: 1,
  minIndex: min,
  maxIndex: max,
  bufferSize: 5,
  padding: 0.2,
  itemSize
});

const virtualScenarios: RemovalScenario[] = [
  {
    config: virtualConfig,
    indexes: [51, 52, 53, 54, 55],
    useIndexes: true
  },
  {
    config: virtualConfig,
    indexes: [-51, -52, -53, -54, -55],
    useIndexes: true
  },
  {
    config: virtualConfig,
    indexes: [-51, -52, -53, -54, -55, 51, 52, 53, 54, 55],
    useIndexes: true
  }
];

const dynamicScenarios: DynamicScenario[] = [
  {
    startIndex: 10,
    indexToRemove: 11,
    strategy: SizeStrategy.Average,
    increase: false
  },
  {
    startIndex: 11,
    indexToRemove: 9,
    strategy: SizeStrategy.Frequent,
    increase: false
  },
  {
    startIndex: 10,
    indexToRemove: 11,
    strategy: SizeStrategy.Average,
    increase: true
  },
  {
    startIndex: 11,
    indexToRemove: 9,
    strategy: SizeStrategy.Frequent,
    increase: true
  },
  {
    startIndex: 20,
    indexToRemove: 20,
    strategy: SizeStrategy.Average,
    increase: false,
    reloadIndex: 2
  },
  {
    startIndex: 1,
    indexToRemove: 1,
    strategy: SizeStrategy.Frequent,
    increase: false,
    reloadIndex: 15
  },
  {
    startIndex: 20,
    indexToRemove: 20,
    strategy: SizeStrategy.Average,
    increase: true,
    reloadIndex: 2
  },
  {
    startIndex: 1,
    indexToRemove: 1,
    strategy: SizeStrategy.Frequent,
    increase: true,
    reloadIndex: 15
  }
];

const flushScenarios: FlushScenario[] = [
  {
    startIndex: 1,
    maxIndex: 20,
    fixRight: false,
    expectedRange: [1, 8],
    meta: 'BOF'
  },
  {
    startIndex: 1,
    maxIndex: 15,
    fixRight: true,
    expectedRange: [9, 15],
    meta: 'BOF, 15 items'
  },
  {
    startIndex: 1,
    maxIndex: 30,
    fixRight: true,
    expectedRange: [9, 16],
    meta: 'BOF, 30 items'
  },
  {
    startIndex: 20,
    maxIndex: 20,
    fixRight: false,
    expectedRange: [5, 12],
    meta: 'EOF'
  },
  {
    startIndex: 15,
    maxIndex: 15,
    fixRight: true,
    expectedRange: [9, 15],
    meta: 'EOF, 15 items'
  },
  {
    startIndex: 15,
    maxIndex: 25,
    fixRight: true,
    expectedRange: [18, 25],
    meta: 'EOF, 25 items'
  }
];

const mixedScenarios: MixedScenario[] = [
  {
    startIndex: 1,
    indexes: [1, 20],
    increase: false,
    expected: { min: 1, max: 18 },
    meta: 'forward, edge items'
  },
  {
    startIndex: 1,
    indexes: [1, 20],
    increase: true,
    expected: { min: 3, max: 20 },
    meta: 'forward, edge items, increase'
  },
  {
    startIndex: 20,
    indexes: [1, 20],
    increase: false,
    expected: { min: 1, max: 18 },
    meta: 'backward, edge items'
  },
  {
    startIndex: 20,
    indexes: [1, 20],
    increase: true,
    expected: { min: 3, max: 20 },
    meta: 'backward, edge items, increase'
  },
  {
    startIndex: 1,
    indexes: [2, 3, 17, 18],
    increase: false,
    expected: { min: 1, max: 16 },
    meta: 'forward, inner items'
  },
  {
    startIndex: 1,
    indexes: [2, 3, 17, 18],
    increase: true,
    expected: { min: 5, max: 20 },
    meta: 'forward, inner items, increase'
  },
  {
    startIndex: 20,
    indexes: [2, 3, 17, 18],
    increase: false,
    expected: { min: 1, max: 16 },
    meta: 'backward, inner items'
  },
  {
    startIndex: 20,
    indexes: [2, 3, 17, 18],
    increase: true,
    expected: { min: 5, max: 20 },
    meta: 'backward, inner items, increase'
  }
];

const remove = async (
  misc: Misc,
  scenario: Pick<
    RemovalScenario,
    'indexes' | 'increase' | 'useIndexes' | 'byId'
  >
) => {
  const { indexes, increase, useIndexes, byId } = scenario;
  misc.source<MutableDatasource>().remove(indexes, increase);
  return useIndexes
    ? misc.adapter.remove({ indexes, increase })
    : misc.adapter.remove({
        predicate: item => indexes.includes(byId ? item.data.id : item.$index),
        increase
      });
};

const registerBufferRemoval = (scenario: RemovalScenario): void =>
  makeTest({
    config: scenario.config,
    title: 'should remove buffered items',
    meta:
      (scenario.byId
        ? 'by id'
        : scenario.useIndexes
          ? 'indexes API'
          : 'by index') + (scenario.increase ? ', increase' : ''),
    it: misc => async () => {
      await misc.relaxNext();
      const { buffer } = misc.scroller;
      const before = {
        size: buffer.size,
        minIndex: buffer.minIndex,
        maxIndex: buffer.maxIndex,
        absMinIndex: buffer.absMinIndex,
        absMaxIndex: buffer.absMaxIndex,
        scrollableSize: misc.getScrollableSize()
      };
      const firstLoop = misc.captureInnerLoops(1, () => ({
        size: buffer.size,
        minIndex: buffer.minIndex,
        maxIndex: buffer.maxIndex,
        absMinIndex: buffer.absMinIndex,
        absMaxIndex: buffer.absMaxIndex,
        scrollableSize: misc.getScrollableSize()
      }));

      await remove(misc, scenario);
      const [after] = await firstLoop;
      const count = scenario.indexes.length;
      const increase = !!scenario.increase;

      expect(after).toEqual({
        size: before.size - count,
        minIndex: before.minIndex + (increase ? count : 0),
        maxIndex: before.maxIndex - (increase ? 0 : count),
        absMinIndex: before.absMinIndex + (increase ? count : 0),
        absMaxIndex: before.absMaxIndex - (increase ? 0 : count),
        scrollableSize: before.scrollableSize - count * itemSize
      });

      buffer.items.forEach(item => {
        const shift = scenario.indexes.reduce(
          (total, removedIndex) =>
            total +
            (increase
              ? item.data.id < removedIndex
                ? -1
                : 0
              : item.data.id > removedIndex
                ? 1
                : 0),
          0
        );
        expect(item.data.id).toBe(item.$index + shift);
      });
    }
  });

const registerVirtualRemoval = (scenario: RemovalScenario): void =>
  makeTest({
    config: scenario.config,
    title: 'should remove fixed-size items outside the buffer',
    meta: scenario.indexes.every(index => index < 0)
      ? 'backward'
      : scenario.indexes.every(index => index > 0)
        ? 'forward'
        : 'both directions',
    it: misc => async () => {
      await misc.relaxNext();
      const {
        $index: firstVisibleIndex,
        uid: firstVisibleUid,
        data: { id: firstVisibleId }
      } = misc.adapter.firstVisible;
      const expectedSize = (max - min + 1 - scenario.indexes.length) * itemSize;
      const removedBefore = scenario.indexes.filter(
        index => index < firstVisibleIndex
      ).length;

      await remove(misc, scenario);

      expect(misc.getScrollableSize()).toBe(expectedSize);
      expect(misc.adapter.firstVisible.$index).toBe(
        firstVisibleIndex - removedBefore
      );
      expect(misc.adapter.firstVisible.uid).toBe(firstVisibleUid);
      expect(misc.adapter.firstVisible.data.id).toBe(firstVisibleId);
      misc.expect.uniqueItems();

      const firstRemoved = Math.min(...scenario.indexes);
      const previous = firstRemoved - 1;
      const sortedIndexes = [...scenario.indexes].sort((a, b) => a - b);
      const gap = sortedIndexes.findIndex(
        (index, offset) => index !== firstRemoved + offset
      );
      const adjacentRemoved = gap < 0 ? sortedIndexes.length : gap;
      await misc.scrollToRelax((previous - min) * itemSize);
      expect(misc.adapter.firstVisible.$index).toBe(previous);
      expect(misc.checkElementContentByIndex(previous)).toBe(true);
      expect(
        misc.checkElementContent(firstRemoved, firstRemoved + adjacentRemoved)
      ).toBe(true);

      await misc.scrollMaxRelax();
      expect(misc.adapter.lastVisible.$index).toBe(
        max - scenario.indexes.length
      );
      expect(misc.checkElementContent(max - scenario.indexes.length, max)).toBe(
        true
      );
      expect(misc.getScrollableSize()).toBe(expectedSize);
    }
  });

const registerDynamicRemoval = (scenario: DynamicScenario): void => {
  const source = () => {
    const datasource = new MutableDatasource(1, 20);
    datasource.setSizes(getDynamicSize);
    datasource.setSize(scenario.indexToRemove, oversizedItemSize);
    return datasource;
  };
  const config: TestConfig = {
    datasource: source,
    datasourceSettings: {
      startIndex: scenario.startIndex,
      minIndex: 1,
      maxIndex: 20,
      bufferSize: 1,
      padding: 0.5,
      sizeStrategy: scenario.strategy
    },
    datasourceDevSettings:
      scenario.reloadIndex === undefined ? {} : { cacheOnReload: true },
    templateSettings: { viewportHeight: 100, dynamicSize: 'size' },
    timeout: 4000
  };

  makeTest({
    config,
    title: 'should remove a dynamic-size item',
    meta:
      `${scenario.strategy}, ${scenario.reloadIndex === undefined ? 'buffered' : 'virtual'}` +
      (scenario.increase ? ', increase' : ''),
    it: misc => async () => {
      await misc.relaxNext();
      if (scenario.reloadIndex !== undefined) {
        await misc.adapter.reload(scenario.reloadIndex);
      }

      const firstVisibleIndex = misc.adapter.firstVisible.$index;
      const firstVisibleId = misc.adapter.firstVisible.data.id;
      const defaultSize = misc.scroller.buffer.defaultSize;
      misc
        .source<MutableDatasource>()
        .remove([scenario.indexToRemove], scenario.increase);
      await misc.adapter.remove({
        indexes: [scenario.indexToRemove],
        increase: scenario.increase
      });

      const shift = scenario.increase
        ? Number(scenario.indexToRemove > firstVisibleIndex)
        : -Number(scenario.indexToRemove < firstVisibleIndex);
      expect(misc.adapter.firstVisible.$index).toBe(firstVisibleIndex + shift);
      expect(misc.adapter.firstVisible.data.id).toBe(firstVisibleId);
      if (scenario.strategy === SizeStrategy.Average) {
        expect(misc.scroller.buffer.defaultSize).not.toBe(defaultSize);
      }

      await misc.scrollMinRelax();
      await misc.scrollToIndexRelax(scenario.increase ? 20 : 19, 30);
      const remainingSize = Array.from(
        { length: 20 },
        (_, offset) => offset + 1
      )
        .filter(index => index !== scenario.indexToRemove)
        .reduce((total, index) => total + getDynamicSize(index), 0);
      expect(misc.getScrollableSize()).toBe(remainingSize);
    }
  });
};

const registerFlush = (scenario: FlushScenario): void => {
  const config = createConfig(
    {
      startIndex: scenario.startIndex,
      minIndex: 1,
      maxIndex: scenario.maxIndex,
      bufferSize: 1,
      padding: 0.5
    },
    1,
    scenario.maxIndex
  );

  makeTest({
    config,
    title: 'should continue after removing the entire buffer',
    meta: scenario.meta + (scenario.fixRight ? ', increase' : ''),
    it: misc => async () => {
      await misc.relaxNext();
      const indexes = misc.scroller.buffer.items.map(item => item.$index);

      misc.source<MutableDatasource>().remove(indexes, scenario.fixRight);
      await misc.adapter.remove({
        predicate: _item => true,
        increase: scenario.fixRight
      });

      expect(misc.workflow.cyclesDone).toBe(2);
      expect(misc.scroller.state.cycle.innerLoop.count).toBeGreaterThan(1);
      misc.expect.bufferRange(scenario.expectedRange);
    }
  });
};

const registerMixedRemoval = (scenario: MixedScenario): void => {
  const config = createConfig(
    {
      startIndex: scenario.startIndex,
      minIndex: 1,
      maxIndex: 20,
      bufferSize: 1,
      padding: 0.3
    },
    1,
    20
  );

  makeTest({
    config,
    title: 'should remove buffered and virtual items together',
    meta: scenario.meta,
    it: misc => async () => {
      await misc.relaxNext();
      misc
        .source<MutableDatasource>()
        .remove(scenario.indexes, scenario.increase);
      await misc.adapter.remove({
        indexes: scenario.indexes,
        increase: scenario.increase
      });

      expect(misc.scroller.buffer.absMinIndex).toBe(scenario.expected.min);
      expect(misc.scroller.buffer.absMaxIndex).toBe(scenario.expected.max);
    }
  });
};

describe('Adapter Remove Spec', () => {
  describe('Buffer', () => bufferScenarios.forEach(registerBufferRemoval));

  describe('No-op and invalid input', () => {
    [
      { predicate: ({ $index }: { $index: number }) => $index > 999 },
      { indexes: [999] }
    ].forEach(options =>
      makeTest({
        config: bufferConfigs[0],
        title: 'should not run a cycle when nothing is removed',
        meta: 'predicate' in options ? 'predicate' : 'indexes',
        it: misc => async () => {
          await misc.relaxNext();
          const innerLoops = misc.innerLoopCount;

          await misc.adapter.remove(options);

          expect(misc.workflow.cyclesDone).toBe(1);
          expect(misc.innerLoopCount).toBe(innerLoops);
          expect(misc.workflow.errors).toHaveLength(0);
        }
      })
    );

    [null, () => null, (_item: unknown, _extra: unknown) => null].forEach(
      predicate =>
        makeTest({
          config: bufferConfigs[0],
          title: 'should reject an invalid predicate',
          it: misc => async () => {
            await misc.relaxNext();
            const innerLoops = misc.innerLoopCount;

            const result = await misc.adapter.remove({
              predicate: predicate as never
            });

            expect(result.success).toBe(false);
            expect(misc.workflow.cyclesDone).toBe(1);
            expect(misc.innerLoopCount).toBe(innerLoops);
            expect(misc.workflow.errors).toHaveLength(1);
            expect(misc.workflow.errors[0].process).toContain('remove');
          }
        })
    );
  });

  describe('Virtual', () => virtualScenarios.forEach(registerVirtualRemoval));
  describe('Dynamic size', () =>
    dynamicScenarios.forEach(registerDynamicRemoval));
  describe('Flush', () => flushScenarios.forEach(registerFlush));
  describe('Buffer and virtual', () =>
    mixedScenarios.forEach(registerMixedRemoval));
});
