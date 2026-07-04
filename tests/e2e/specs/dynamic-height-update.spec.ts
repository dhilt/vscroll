import { expectDomIndexesMatchBuffer } from '../helpers/expect';
import { SizeStrategy } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

interface Scenario {
  title: string;
  limits: { min: number; max: number };
  getSize: (index: number) => number;
  action: (misc: Misc) => Promise<unknown>;
  defaultSize: { initial: number; final: number };
}

const itemSize = 20;
const firstFifteen = Array.from({ length: 15 }, (_, index) => index + 1);

const scenarios: Scenario[] = [
  {
    title: 'should remove one big item via Adapter.update',
    limits: { min: 1, max: 50 },
    getSize: index => (index === 10 ? 100 : itemSize),
    action: misc =>
      misc.adapter.update({ predicate: ({ $index }) => $index !== 10 }),
    defaultSize: { initial: 25, final: itemSize }
  },
  {
    title: 'should remove one big item via Adapter.remove in-buffer',
    limits: { min: 1, max: 50 },
    getSize: index => (index === 10 ? 100 : itemSize),
    action: misc =>
      misc.adapter.remove({ predicate: ({ $index }) => $index === 10 }),
    defaultSize: { initial: 25, final: itemSize }
  },
  {
    title: 'should remove some items via Adapter.remove virtually',
    limits: { min: 1, max: 35 },
    getSize: index => index + itemSize,
    action: async misc => {
      await misc.scrollToIndexRelax(35);
      await misc.adapter.remove({ indexes: firstFifteen });
    },
    defaultSize: { initial: 28, final: 46 }
  },
  {
    title:
      'should remove some items via Adapter.remove virtually (interrupted)',
    limits: { min: 1, max: 35 },
    getSize: index => index + itemSize,
    action: async misc => {
      await misc.scrollToIndexRelax(35);
      await misc.adapter.remove({
        indexes: [1, 2, 3, 4, 5, 11, 12, 13, 14, 15]
      });
    },
    defaultSize: { initial: 28, final: 42 }
  },
  {
    title:
      'should remove one big item in-buffer and another one virtually via Adapter.remove',
    limits: { min: 1, max: 35 },
    getSize: index => (index === 1 || index === 35 ? 100 : itemSize),
    action: async misc => {
      await misc.scrollToIndexRelax(35);
      await misc.adapter.remove({ indexes: [1, 35] });
    },
    defaultSize: { initial: 25, final: itemSize }
  },
  {
    title:
      'should remove one big item in-buffer and another one virtually via Adapter.remove (inverted)',
    limits: { min: 1, max: 35 },
    getSize: index => (index === 3 || index === 33 ? 100 : itemSize),
    action: async misc => {
      await misc.scrollToIndexRelax(35);
      await misc.scrollMinRelax();
      await misc.adapter.remove({ indexes: [3, 33] });
    },
    defaultSize: { initial: 25, final: itemSize }
  }
];

const baseSettings: NonNullable<TestBedConfig['datasourceSettings']> = {
  startIndex: 1,
  padding: 0.5,
  bufferSize: 5,
  itemSize,
  sizeStrategy: SizeStrategy.Average
};

describe('Dynamic Size Update Spec', () => {
  scenarios.forEach(scenario =>
    makeTest({
      config: {
        datasource: () => getDatasource(scenario.limits),
        datasourceSettings: baseSettings,
        templateSettings: { viewportHeight: 200, dynamicSize: 'size' },
        timeout: 4000
      },
      title: scenario.title,
      before: misc =>
        misc.setItemProcessor(({ $index, data }) => {
          data.size = scenario.getSize($index);
        }),
      it: misc => async () => {
        await misc.relaxNext();
        expect(misc.scroller.buffer.defaultSize).toBe(
          scenario.defaultSize.initial
        );

        await scenario.action(misc);

        expect(misc.scroller.buffer.defaultSize).toBe(
          scenario.defaultSize.final
        );
        expectDomIndexesMatchBuffer(misc);
      }
    })
  );
});
