import { getDynamicSize } from '../helpers/dynamicSize';
import { expectDomMatchesBuffer, expectStartVisible } from '../helpers/expect';
import { SizeStrategy } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

interface LayoutSnapshot {
  range: [number, number];
  defaultSize: number;
  backwardPadding: number;
  forwardPadding: number;
  innerLoopCount: number;
}

interface LoadScenario {
  settings: NonNullable<TestBedConfig['datasourceSettings']> & {
    startIndex: number;
  };
  template?: TestBedConfig['templateSettings'];
  expected: LayoutSnapshot;
  firstForwardPadding?: number;
}

const sourceLimits = { min: -50, max: 99 };
const baseTemplate = { viewportHeight: 100, dynamicSize: 'size' };

const initialScenarios: LoadScenario[] = [
  {
    settings: { startIndex: 0, padding: 0.5, bufferSize: 5 },
    template: { viewportHeight: 100 },
    expected: {
      range: [-5, 9],
      defaultSize: 22,
      backwardPadding: 0,
      forwardPadding: 0,
      innerLoopCount: 4
    }
  },
  {
    settings: {
      startIndex: 0,
      padding: 0.5,
      bufferSize: 5,
      minIndex: -20,
      maxIndex: 10
    },
    template: { viewportHeight: 100 },
    expected: {
      range: [-5, 9],
      defaultSize: 22,
      backwardPadding: 330,
      forwardPadding: 22,
      innerLoopCount: 4
    }
  },
  {
    settings: { startIndex: -5, padding: 1.2, bufferSize: 1 },
    template: { viewportHeight: 250 },
    expected: {
      range: [-50, 31],
      defaultSize: 17,
      backwardPadding: 0,
      forwardPadding: 0,
      innerLoopCount: 8
    }
  },
  {
    settings: {
      startIndex: 0,
      padding: 0.25,
      bufferSize: 10,
      windowViewport: true
    },
    template: { noViewportClass: true, viewportHeight: 0 },
    expected: {
      range: [-30, 38],
      defaultSize: 25,
      backwardPadding: 0,
      forwardPadding: 0,
      innerLoopCount: 6
    }
  },
  {
    settings: {
      startIndex: 20,
      padding: 0.75,
      bufferSize: 15,
      horizontal: true
    },
    template: { viewportWidth: 300, horizontal: true },
    expected: {
      range: [5, 34],
      defaultSize: 40,
      backwardPadding: 0,
      forwardPadding: 0,
      innerLoopCount: 3
    }
  }
];

const lackScenarios: LoadScenario[] = [
  {
    settings: {
      startIndex: -25,
      padding: 1.2,
      bufferSize: 1,
      minIndex: -50
    },
    template: { viewportHeight: 250 },
    expected: {
      range: [-50, 99],
      defaultSize: 47,
      backwardPadding: 0,
      forwardPadding: 0,
      innerLoopCount: 8
    },
    firstForwardPadding: 249
  },
  {
    settings: {
      startIndex: 11,
      padding: 0.7,
      bufferSize: 7,
      minIndex: 1
    },
    template: { viewportHeight: 350 },
    expected: {
      range: [1, 28],
      defaultSize: 35,
      backwardPadding: 0,
      forwardPadding: 0,
      innerLoopCount: 5
    },
    firstForwardPadding: 112
  },
  {
    settings: {
      startIndex: 1,
      padding: 0.15,
      bufferSize: 9,
      minIndex: -10,
      windowViewport: true
    },
    template: { noViewportClass: true, viewportHeight: 0 },
    expected: {
      range: [-8, 36],
      defaultSize: 34,
      backwardPadding: 68,
      forwardPadding: 0,
      innerLoopCount: 4
    },
    firstForwardPadding: 543
  },
  {
    settings: {
      startIndex: -10,
      padding: 0.75,
      bufferSize: 4,
      minIndex: -20,
      horizontal: true
    },
    template: { viewportWidth: 300, horizontal: true },
    expected: {
      range: [-20, 33],
      defaultSize: 27,
      backwardPadding: 0,
      forwardPadding: 0,
      innerLoopCount: 5
    },
    firstForwardPadding: 254
  }
];

const scrollScenarios = initialScenarios.filter(
  (_scenario, index) => index !== 2 && index !== 3
);

const createConfig = (scenario: LoadScenario): TestBedConfig => ({
  datasource: () => getDatasource(sourceLimits),
  datasourceSettings: {
    sizeStrategy: SizeStrategy.Average,
    ...scenario.settings
  },
  templateSettings: { ...baseTemplate, ...scenario.template },
  timeout: 4000
});

const takeLayoutSnapshot = (misc: Misc): LayoutSnapshot => ({
  range: [
    misc.adapter.bufferInfo.firstIndex,
    misc.adapter.bufferInfo.lastIndex
  ],
  defaultSize: misc.scroller.buffer.defaultSize,
  backwardPadding: misc.padding.backward.getSize(),
  forwardPadding: misc.padding.forward.getSize(),
  innerLoopCount: misc.innerLoopCount
});

const setDynamicSizes = (misc: Misc): void =>
  misc.setItemProcessor(({ $index, data }) => {
    data.size = getDynamicSize($index);
  });

const reachEdge = async (
  misc: Misc,
  edge: 'bof' | 'eof',
  maxAttempts = 50
): Promise<void> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (misc.scroller.buffer[edge].get()) {
      return;
    }

    const position = misc.getScrollPosition();
    edge === 'eof' ? misc.scrollMax() : misc.scrollMin();
    if (position === misc.getScrollPosition()) {
      break;
    }
    await misc.relaxNext();
  }

  throw new Error(`Unable to reach ${edge.toUpperCase()}`);
};

const registerLoadScenario = (scenario: LoadScenario, index: number): void =>
  makeTest({
    config: createConfig(scenario),
    title:
      scenario.firstForwardPadding !== undefined
        ? `should load with fwd padding shift (${index})`
        : `should fill the viewport with paddings (${index})`,
    before: setDynamicSizes,
    it: misc => async () => {
      const cycleDone = misc.waitNextCycle();
      const loops = await misc.captureInnerLoops(
        scenario.expected.innerLoopCount,
        () => ({
          forwardPadding: misc.padding.forward.getSize(),
          indexes: misc.scroller.buffer.items.map(item => item.$index),
          firstIndex: misc.adapter.bufferInfo.firstIndex,
          lastIndex: misc.adapter.bufferInfo.lastIndex
        })
      );
      await cycleDone;
      await misc.adapter.relax();

      // structural (captured, not predicted): the buffer is a strictly
      // contiguous range at every inner loop of the progressive fill
      loops.forEach(({ indexes, firstIndex, lastIndex }) =>
        expect(indexes).toEqual(
          Array.from(
            { length: lastIndex - firstIndex + 1 },
            (_, offset) => firstIndex + offset
          )
        )
      );

      expectDomMatchesBuffer(misc);
      expectStartVisible(misc, scenario.settings.startIndex);

      expect(takeLayoutSnapshot(misc)).toEqual(scenario.expected);
      if (scenario.firstForwardPadding !== undefined) {
        expect(loops[0].forwardPadding).toBe(scenario.firstForwardPadding);
      }
    }
  });

describe('Dynamic Size Spec for Average strategy', () => {
  describe('Initial load', () =>
    initialScenarios.forEach((scenario, index) =>
      registerLoadScenario(scenario, index)
    ));

  describe('Lack of items on 1st fetch', () =>
    lackScenarios.forEach((scenario, index) =>
      registerLoadScenario(scenario, index)
    ));

  describe('After scroll', () =>
    scrollScenarios.forEach((scenario, index) =>
      makeTest({
        config: createConfig(scenario),
        title: `should fill the viewport with paddings (${index})`,
        before: setDynamicSizes,
        it: misc => async () => {
          await misc.relaxNext();
          await reachEdge(misc, 'eof');
          expect(misc.scroller.buffer.eof.get()).toBe(true);

          await reachEdge(misc, 'bof');

          expect(misc.scroller.buffer.bof.get()).toBe(true);
          expectDomMatchesBuffer(misc);
        }
      })
    ));
});
