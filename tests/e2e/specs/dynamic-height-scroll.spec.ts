import { getDynamicSize } from '../helpers/dynamicSize';
import { expectDomMatchesBuffer } from '../helpers/expect';
import { SizeStrategy } from '../miscellaneous/vscroll';
import { Misc } from '../miscellaneous/misc';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';
import type { TestItem } from '../types';

const takeLayoutSnapshot = (misc: Misc) => {
  const { buffer, viewport } = misc.scroller;
  return {
    viewportSize: viewport.getSize(),
    scrollableSize: viewport.getScrollableSize(),
    backwardPadding: viewport.paddings.backward.size,
    forwardPadding: viewport.paddings.forward.size,
    bufferSize: buffer.size,
    firstIndex: buffer.firstIndex,
    lastIndex: buffer.lastIndex,
    defaultSize: buffer.defaultSize
  };
};

const createItems = (start: number, count: number): TestItem[] =>
  Array.from({ length: count }, (_, offset) => {
    const index = start + offset;
    return {
      id: index,
      text: `item #${index}`,
      size: getDynamicSize(index)
    };
  });

const registerFetchCase = (strategy: SizeStrategy): void => {
  const config: TestBedConfig = {
    datasource: () => getDatasource({ min: 1, max: 20 }),
    datasourceSettings: {
      startIndex: 1,
      padding: 0.5,
      bufferSize: 5,
      minIndex: 1,
      maxIndex: 20,
      itemSize: 20,
      sizeStrategy: strategy
    },
    templateSettings: { viewportHeight: 100, dynamicSize: 'size' }
  };

  makeTest({
    config,
    title: `should fetch properly (${strategy})`,
    before: misc =>
      misc.setItemProcessor(({ $index, data }) => {
        data.size = $index === 1 ? 200 : 20;
      }),
    it: misc => async () => {
      await misc.relaxNext();
      const before = takeLayoutSnapshot(misc);

      await misc.scrollToRelax(100);

      expect(takeLayoutSnapshot(misc)).toEqual(before);
      expectDomMatchesBuffer(misc);
    }
  });
};

const registerAppendCase = (strategy: SizeStrategy): void => {
  const maxIndex = 100;
  const appendCount = 50;
  const config: TestBedConfig = {
    datasource: () => getDatasource({ min: -99, max: maxIndex + appendCount }),
    datasourceSettings: {
      startIndex: 50,
      minIndex: -99,
      maxIndex,
      padding: 0.5,
      bufferSize: 5,
      itemSize: 20,
      sizeStrategy: strategy
    },
    templateSettings: { viewportHeight: 200, dynamicSize: 'size' }
  };

  makeTest({
    config,
    title: `should append properly (${strategy})`,
    before: misc =>
      misc.setItemProcessor(({ $index, data }) => {
        data.size = getDynamicSize($index);
      }),
    it: misc => async () => {
      await misc.relaxNext();
      await misc.adapter.append({
        items: createItems(maxIndex + 1, appendCount),
        eof: true
      });

      await misc.scrollMaxRelax();
      const innerLoopCount = misc.innerLoopCount;
      await misc.scrollMaxRelax();

      expect(misc.innerLoopCount).toBe(innerLoopCount + 1);
      expectDomMatchesBuffer(misc);
    }
  });
};

describe('Dynamic Size Scroll Spec', () => {
  for (const strategy of [SizeStrategy.Average, SizeStrategy.Frequent]) {
    registerFetchCase(strategy);
    registerAppendCase(strategy);
  }
});
