import {
  makeItem,
  makeItems,
  makeTest,
  Misc,
  MutableDatasource,
  TestConfig
} from '../scaffolding';

const min = -40;
const max = 40;
const virtualAmount = 10;

// `prependOne` / `prependMany` run against the default unbounded datasource
// (these configs set no `datasource`); only the virtual cases below build a
// bounded MutableDatasource.
const configs: TestConfig[] = [
  {
    datasourceSettings: {
      startIndex: 100,
      bufferSize: 4,
      padding: 0.22,
      itemSize: 20
    },
    templateSettings: { viewportHeight: 71, itemHeight: 20 }
  },
  {
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 0.2,
      itemSize: 20
    },
    templateSettings: { viewportHeight: 100 }
  },
  {
    datasourceSettings: {
      startIndex: -15,
      bufferSize: 12,
      padding: 0.98,
      itemSize: 20
    },
    templateSettings: { viewportHeight: 66, itemHeight: 20 }
  },
  {
    datasourceSettings: {
      startIndex: 1,
      bufferSize: 5,
      padding: 1,
      horizontal: true,
      itemSize: 100
    },
    templateSettings: { viewportWidth: 450, itemWidth: 100, horizontal: true }
  },
  {
    datasourceSettings: {
      startIndex: -74,
      bufferSize: 4,
      padding: 0.72,
      horizontal: true,
      itemSize: 75
    },
    templateSettings: { viewportWidth: 300, itemWidth: 75, horizontal: true }
  }
];

const manyConfigs = [configs[1], configs[4]];

const virtualConfigs = [configs[0], configs[3]].map<TestConfig>(config => ({
  ...config,
  datasource: () => new MutableDatasource(min, max),
  datasourceSettings: {
    ...config.datasourceSettings,
    minIndex: min,
    maxIndex: max,
    startIndex: 10
  },
  timeout: 4000
}));

const prependOne = (misc: Misc) => async () => {
  await misc.relaxNext();
  const index = misc.adapter.bufferInfo.firstIndex - 1;

  await misc.adapter.prepend({ items: [makeItem(index)] });

  expect(misc.padding.backward.getSize()).toBe(0);
  expect(misc.adapter.bufferInfo.firstIndex).toBe(index);
  expect(misc.checkElementContentByIndex(index)).toBe(true);
};

const prependMany = (misc: Misc) => async () => {
  await misc.relaxNext();
  const amount = 50;
  const lastIndex = misc.adapter.bufferInfo.firstIndex - 1;
  const firstIndex = lastIndex - amount + 1;
  const items = makeItems(firstIndex, amount).reverse();

  await misc.adapter.prepend({ items });

  expect(misc.padding.backward.getSize()).toBe(0);
  expect(misc.adapter.bufferInfo.firstIndex).toBe(firstIndex);
  expect(misc.checkElementContentByIndex(firstIndex)).toBe(true);
};

const registerVirtual = (config: TestConfig, increase: boolean): void =>
  makeTest({
    config,
    title: `should prepend virtually${increase ? ' (increase)' : ''}`,
    it: misc => async () => {
      await misc.relaxNext();
      const itemSize = misc.scroller.settings.itemSize;
      const newMin = increase ? min : min - virtualAmount;
      const newMax = increase ? max + virtualAmount : max;
      const firstId = min - virtualAmount;
      const items = makeItems(firstId, virtualAmount);
      const { buffer } = misc.scroller;
      const before = {
        firstIndex: buffer.firstIndex,
        lastIndex: buffer.lastIndex,
        backwardPadding: misc.padding.backward.getSize(),
        forwardPadding: misc.padding.forward.getSize()
      };

      misc.source<MutableDatasource>().reset(newMin, newMax, firstId);
      await misc.adapter.prepend({ items, bof: true, increase });

      expect(misc.getScrollableSize()).toBe((newMax - newMin + 1) * itemSize);
      expect(misc.padding.backward.getSize()).toBe(
        before.backwardPadding + virtualAmount * itemSize
      );
      expect(misc.padding.forward.getSize()).toBe(before.forwardPadding);
      expect(buffer.absMinIndex).toBe(newMin);
      expect(buffer.absMaxIndex).toBe(newMax);
      expect(buffer.firstIndex).toBe(
        before.firstIndex + (increase ? virtualAmount : 0)
      );
      expect(buffer.lastIndex).toBe(
        before.lastIndex + (increase ? virtualAmount : 0)
      );

      await misc.scrollToIndexRelax(newMax, 30);
      await misc.scrollToIndexRelax(newMin, 30);

      expect(misc.getScrollableSize()).toBe((newMax - newMin + 1) * itemSize);
      expect(buffer.absMinIndex).toBe(newMin);
      expect(buffer.absMaxIndex).toBe(newMax);
      expect(buffer.firstIndex).toBe(newMin);
      expect(misc.checkElementContent(newMin, firstId)).toBe(true);
    }
  });

describe('Adapter Prepend Spec', () => {
  configs.forEach(config =>
    makeTest({ config, title: 'should prepend', it: prependOne })
  );

  manyConfigs.forEach(config =>
    makeTest({ config, title: 'should prepend many', it: prependMany })
  );

  [false, true].forEach(increase =>
    virtualConfigs.forEach(config => registerVirtual(config, increase))
  );
});
