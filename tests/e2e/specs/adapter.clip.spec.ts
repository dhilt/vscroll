import {
  getDatasource,
  makeTest,
  Misc,
  withUninitializedAdapter,
  AdapterClipOptions,
  TestConfig
} from '../scaffolding';

interface BaseScenario {
  startIndex: number;
  bufferSize: number;
  padding: number;
  itemSize: number;
  viewportSize: number;
  horizontal?: boolean;
}

interface ClipSnapshot {
  range: [number, number];
  backwardPadding: number;
  forwardPadding: number;
  itemsCount: number;
  firstVisible: number;
  scrollableSize: number;
  defaultSize: number;
}

interface ClipScenario {
  base: BaseScenario;
  options?: AdapterClipOptions;
  expected: ClipSnapshot;
}

const newItemsCount = 50;

const baseScenarios: BaseScenario[] = [
  {
    startIndex: 1,
    bufferSize: 5,
    padding: 0.2,
    itemSize: 20,
    viewportSize: 100
  },
  {
    startIndex: -158,
    bufferSize: 11,
    padding: 0.68,
    itemSize: 20,
    viewportSize: 77
  },
  {
    startIndex: 1,
    bufferSize: 5,
    padding: 1,
    itemSize: 100,
    viewportSize: 450,
    horizontal: true
  },
  {
    startIndex: -274,
    bufferSize: 3,
    padding: 1.22,
    itemSize: 75,
    viewportSize: 320,
    horizontal: true
  }
];

const snapshot = (
  range: [number, number],
  backwardPadding: number,
  forwardPadding: number,
  firstVisible: number,
  scrollableSize: number,
  defaultSize: number
): ClipSnapshot => ({
  range,
  backwardPadding,
  forwardPadding,
  itemsCount: range[1] - range[0] + 1,
  firstVisible,
  scrollableSize,
  defaultSize
});

// Each `expected` is the settled post-clip state captured EMPIRICALLY (buffer
// edges, paddings, scrollable size). Clip is a vscroll heuristic, so these are
// harvested rather than recomputed.
const clipScenarios: ClipScenario[] = [
  {
    base: baseScenarios[0],
    expected: snapshot([0, 6], 80, 1000, 1, 1220, 20)
  },
  {
    base: baseScenarios[1],
    expected: snapshot([-161, -152], 160, 1080, -158, 1440, 20)
  },
  {
    base: baseScenarios[2],
    expected: snapshot([-4, 9], 0, 5000, 1, 6400, 100)
  },
  {
    base: baseScenarios[3],
    expected: snapshot([-280, -265], 0, 3750, -274, 4950, 75)
  },
  {
    base: baseScenarios[0],
    options: { forwardOnly: true },
    expected: snapshot([-4, 6], 0, 1000, 1, 1220, 20)
  },
  {
    base: baseScenarios[1],
    options: { backwardOnly: true },
    expected: snapshot([-161, -98], 160, 0, -158, 1440, 20)
  },
  {
    base: baseScenarios[2],
    options: { forwardOnly: true },
    expected: snapshot([-4, 9], 0, 5000, 1, 6400, 100)
  },
  {
    base: baseScenarios[3],
    options: { backwardOnly: true },
    expected: snapshot([-280, -215], 0, 0, -274, 4950, 75)
  },
  {
    base: baseScenarios[0],
    options: { forwardOnly: true, backwardOnly: true },
    expected: snapshot([0, 6], 80, 1000, 1, 1220, 20)
  }
];

const createConfig = (
  scenario: BaseScenario,
  infinite = false
): TestConfig => ({
  datasource: () => getDatasource(),
  datasourceSettings: {
    startIndex: scenario.startIndex,
    bufferSize: scenario.bufferSize,
    padding: scenario.padding,
    itemSize: scenario.itemSize,
    infinite,
    ...(scenario.horizontal ? { horizontal: true } : {})
  },
  templateSettings: scenario.horizontal
    ? {
        viewportWidth: scenario.viewportSize,
        itemWidth: scenario.itemSize,
        horizontal: true
      }
    : {
        viewportHeight: scenario.viewportSize,
        itemHeight: scenario.itemSize
      }
});

const takeSnapshot = (misc: Misc): ClipSnapshot => ({
  range: [
    misc.adapter.bufferInfo.firstIndex,
    misc.adapter.bufferInfo.lastIndex
  ],
  backwardPadding: misc.padding.backward.getSize(),
  forwardPadding: misc.padding.forward.getSize(),
  itemsCount: misc.adapter.itemsCount,
  firstVisible: misc.adapter.firstVisible.$index,
  scrollableSize: misc.getScrollableSize(),
  defaultSize: misc.scroller.buffer.defaultSize
});

const registerClipScenario = (scenario: ClipScenario): void =>
  makeTest({
    config: createConfig(scenario.base),
    title: 'should clip after appending many items',
    meta: scenario.options
      ? Object.keys(scenario.options).join(' + ')
      : 'both directions',
    it: misc => async () => {
      await misc.relaxNext();
      const { buffer } = misc.scroller;
      const firstIndex = buffer.firstIndex;
      const indexToAppend = buffer.lastIndex + 1;
      const items = Array.from({ length: newItemsCount }, (_, offset) => ({
        id: indexToAppend - offset,
        text: `!item #${indexToAppend - offset}`
      }));

      await misc.adapter.append({ items });
      expect(buffer.firstIndex).toBe(firstIndex);
      expect(buffer.lastIndex).toBe(indexToAppend + newItemsCount - 1);
      expect(misc.padding.backward.getSize()).toBe(0);

      await misc.adapter.clip(scenario.options);

      misc.expect.uniqueItems(buffer.items);
      expect(takeSnapshot(misc)).toEqual(scenario.expected);
      misc.expect.domIndexesMatchBuffer();
    }
  });

const registerInfiniteScenario = (scenario: BaseScenario): void =>
  makeTest({
    config: createConfig(scenario, true),
    title: 'should clip after scroll in infinite mode',
    it: misc => async () => {
      await misc.relaxNext();
      const initialCount = misc.adapter.itemsCount;

      await misc.scrollMaxRelax();
      const beforeItems = [...misc.scroller.buffer.items];
      const expandedCount = misc.adapter.itemsCount;
      expect(expandedCount).toBeGreaterThan(initialCount);

      await misc.adapter.clip();
      expect(misc.adapter.itemsCount).toBeLessThan(expandedCount);
      misc.expect.itemsIdentity(beforeItems, misc.scroller.buffer.items);

      const clipCount = misc.scroller.state.clip.callCount;
      await misc.scrollMaxRelax();
      expect(misc.scroller.state.clip.callCount).toBe(clipCount);
      misc.expect.domIndexesMatchBuffer();
    }
  });

describe('Adapter Clip Spec', () => {
  clipScenarios.forEach(registerClipScenario);
  registerInfiniteScenario(baseScenarios[0]);
  registerInfiniteScenario(baseScenarios[3]);

  test('should resolve immediately before initialization', async () =>
    withUninitializedAdapter(async adapter => {
      const result = await adapter.clip();
      expect(result).toEqual({
        immediate: true,
        success: true,
        details: 'Adapter is not initialized'
      });
    }));
});
