import {
  AdapterPropName as Adapter,
  getDatasource,
  makeItem,
  makeTest,
  Misc,
  AdapterMethodResult,
  TestConfig
} from '../scaffolding';

type Resolution = 'async cycle' | 'sync cycle' | 'immediate' | 'error';

interface MethodScenario {
  method: Adapter;
  invoke: (misc: Misc) => Promise<AdapterMethodResult>;
  bufferSize?: number;
  prepare?: (misc: Misc) => void;
}

interface ConcurrentScenario {
  min: number;
  max: number;
  startIndex: number;
  count: number;
  horizontal?: boolean;
  interrupt?: 'reload' | 'reset';
}

const itemSize = 20;

const delayedScenarios: MethodScenario[] = [
  {
    method: Adapter.reset,
    invoke: misc => misc.adapter.reset()
  },
  {
    method: Adapter.reload,
    invoke: misc => misc.adapter.reload()
  },
  {
    method: Adapter.append,
    invoke: misc => misc.adapter.append({ items: [makeItem(100.1)] })
  },
  {
    method: Adapter.prepend,
    invoke: misc => misc.adapter.prepend({ items: [makeItem(100.1)] })
  },
  {
    method: Adapter.check,
    invoke: misc => misc.adapter.check(),
    prepare: misc =>
      misc.adapter.fix({
        updater: ({ $index }) => {
          const element = misc.getElement($index);
          if (element) {
            element.style.height = '5px';
          }
        }
      })
  },
  {
    method: Adapter.remove,
    invoke: misc =>
      misc.adapter.remove({ predicate: ({ $index }) => $index > 1 })
  },
  {
    method: Adapter.insert,
    invoke: misc =>
      misc.adapter.insert({
        after: ({ $index }) => $index === 5,
        items: [makeItem(5.1)]
      })
  },
  {
    method: Adapter.update,
    invoke: misc =>
      misc.adapter.update({ predicate: ({ $index }) => $index !== 1 })
  }
];

const immediateScenarios: MethodScenario[] = [
  {
    method: Adapter.append,
    invoke: misc => misc.adapter.append({ items: [makeItem(100.1)], eof: true })
  },
  {
    method: Adapter.prepend,
    invoke: misc =>
      misc.adapter.prepend({ items: [makeItem(100.1)], bof: true })
  },
  {
    method: Adapter.check,
    invoke: misc => misc.adapter.check()
  },
  {
    method: Adapter.remove,
    invoke: misc =>
      misc.adapter.remove({ predicate: ({ $index }) => $index > 100 })
  },
  {
    method: Adapter.insert,
    invoke: misc =>
      misc.adapter.insert({
        after: ({ $index }) => $index === 55,
        items: [makeItem(55.1)]
      })
  },
  {
    method: Adapter.fix,
    invoke: misc => misc.adapter.fix({ minIndex: -99 })
  },
  {
    method: Adapter.update,
    invoke: misc => misc.adapter.update({ predicate: _item => true })
  }
];

const synchronousScenarios: MethodScenario[] = [1, 40].map(bufferSize => ({
  method: Adapter.clip,
  invoke: misc => misc.adapter.clip(),
  bufferSize
}));

const errorScenarios: MethodScenario[] = [
  {
    method: Adapter.reset,
    invoke: misc => misc.adapter.reset({ get: 'error' } as never)
  },
  {
    method: Adapter.append,
    invoke: misc => misc.adapter.append({ items: 'error' } as never)
  },
  {
    method: Adapter.remove,
    invoke: misc => misc.adapter.remove('error' as never)
  },
  {
    method: Adapter.insert,
    invoke: misc => misc.adapter.insert('error' as never)
  },
  {
    method: Adapter.fix,
    invoke: misc => misc.adapter.fix({ minIndex: 'error' } as never)
  }
];

const concurrentScenarios: ConcurrentScenario[] = [
  { min: 1, max: 100, startIndex: 100, count: 25 },
  {
    min: 51,
    max: 200,
    startIndex: 200,
    count: 30,
    horizontal: true
  },
  { min: 1, max: 100, startIndex: 100, count: 99, interrupt: 'reload' },
  {
    min: 51,
    max: 200,
    startIndex: 200,
    count: 99,
    horizontal: true,
    interrupt: 'reset'
  }
];

const createMethodConfig = (scenario: MethodScenario): TestConfig => ({
  datasource: () => getDatasource({ delay: 25, mode: 'observable' }),
  datasourceSettings: {
    itemSize,
    startIndex: 1,
    bufferSize: scenario.bufferSize ?? 10,
    padding: 0.5
  },
  templateSettings: { viewportHeight: itemSize * 10, itemHeight: itemSize },
  timeout: 4000
});

const createConcurrentConfig = (
  scenario: ConcurrentScenario
): TestConfig => ({
  datasource: () => getDatasource({ min: scenario.min, max: scenario.max }),
  datasourceSettings: {
    startIndex: scenario.startIndex,
    ...(scenario.horizontal ? { horizontal: true } : {})
  },
  templateSettings: scenario.horizontal
    ? { viewportWidth: 450, itemWidth: 100, horizontal: true }
    : { itemHeight: itemSize },
  timeout: 4000
});

const registerMethodScenario =
  (resolution: Resolution) =>
  (scenario: MethodScenario): void => {
    const startsCycle = resolution.endsWith('cycle');
    const completesSynchronously = resolution === 'sync cycle';
    const error = resolution === 'error';

    makeTest({
      config: createMethodConfig(scenario),
      title: `should resolve ${scenario.method} with the expected result`,
      meta: resolution,
      it: misc => async () => {
        await misc.relaxNext();
        expect(misc.workflow.cyclesDone).toBe(1);
        scenario.prepare?.(misc);

        const resultPromise = scenario.invoke(misc);
        expect(misc.workflow.cyclesDone).toBe(completesSynchronously ? 2 : 1);

        const result = await resultPromise;
        expect(misc.workflow.cyclesDone).toBe(startsCycle ? 2 : 1);
        expect(result.immediate).toBe(!startsCycle);
        expect(result.success).toBe(!error);

        if (error) {
          expect(result.details).toBeTruthy();
          expect(misc.workflow.errors).toHaveLength(1);
          expect(misc.workflow.errors[0].process).toBe(
            `adapter.${scenario.method}`
          );
        } else {
          expect(result.details).toBeNull();
          expect(misc.workflow.errors).toHaveLength(0);
        }
      }
    });
  };

const appendAndScroll = async (
  misc: Misc,
  index: number
): Promise<AdapterMethodResult> => {
  const ready = await misc.adapter.relax();
  if (!ready.success) {
    return ready;
  }
  const appended = await misc.adapter.append(makeItem(index));
  if (!appended.success) {
    return appended;
  }
  return misc.adapter.fix({ scrollPosition: Infinity });
};

const registerConcurrentScenario = (scenario: ConcurrentScenario): void =>
  makeTest({
    config: createConcurrentConfig(scenario),
    title: scenario.interrupt
      ? `should settle all promises after ${scenario.interrupt}`
      : 'should run concurrent nested sequences in order',
    it: misc => async () => {
      const initialInstance = misc.scroller.settings.instanceIndex;
      await misc.relaxNext();
      const initialPosition = misc.getScrollPosition();
      const initialSize = misc.scroller.buffer.defaultSize;
      const tasks = Array.from({ length: scenario.count }, (_, index) =>
        appendAndScroll(misc, scenario.startIndex + index + 1)
      );

      if (scenario.interrupt) {
        await misc.adapter[scenario.interrupt]();
      }
      const results = await Promise.all(tasks);
      await misc.adapter.relax();

      expect(results).toHaveLength(scenario.count);
      if (scenario.interrupt) {
        expect(misc.workflow.cyclesDone).toBe(2);
        expect(misc.scroller.settings.instanceIndex).toBe(
          initialInstance + (scenario.interrupt === 'reset' ? 1 : 0)
        );
      } else {
        expect(results.every(result => result.success)).toBe(true);
        expect(misc.getScrollPosition()).toBe(
          initialPosition + initialSize * scenario.count
        );
        expect(misc.workflow.cyclesDone).toBe(scenario.count + 1);
        expect(misc.scroller.settings.instanceIndex).toBe(initialInstance);
      }
    }
  });

describe('Adapter Promises Spec', () => {
  describe('Promisified methods', () => {
    delayedScenarios.forEach(registerMethodScenario('async cycle'));
    synchronousScenarios.forEach(registerMethodScenario('sync cycle'));
    immediateScenarios.forEach(registerMethodScenario('immediate'));
    errorScenarios.forEach(registerMethodScenario('error'));
  });

  describe('Concurrent sequences', () =>
    concurrentScenarios.forEach(registerConcurrentScenario));
});
