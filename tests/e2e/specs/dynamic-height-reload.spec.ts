import { getDynamicSize } from '../helpers/dynamicSize';
import { expectDomMatchesBuffer } from '../helpers/expect';
import { SizeStrategy } from '../miscellaneous/vscroll';
import { getDatasource } from '../scaffolding/datasources';
import { makeTest, TestBedConfig } from '../scaffolding/runner';

const reloadIndexes = [
  -99, -98, -90, -75, -35, -20, -10, -5, -2, -1, 0, 1, 2, 5, 10, 20, 35, 50, 75,
  90
];

const baseConfig: TestBedConfig = {
  datasource: () => getDatasource({ min: -99, max: 100 }),
  datasourceSettings: {
    startIndex: 1,
    padding: 0.5,
    bufferSize: 10,
    minIndex: -99,
    maxIndex: 100,
    itemSize: 20,
    sizeStrategy: SizeStrategy.Average
  },
  templateSettings: { viewportHeight: 600, dynamicSize: 'size' },
  timeout: 4000
};

describe('Dynamic Size Reload Spec', () => {
  reloadIndexes.forEach(reloadIndex =>
    makeTest({
      config: baseConfig,
      title: 'should reload properly',
      meta: `reloadIndex: ${reloadIndex}`,
      before: misc =>
        misc.setItemProcessor(({ $index, data }) => {
          data.size = getDynamicSize($index);
        }),
      it: misc => async () => {
        await misc.relaxNext();
        await misc.adapter.reload(reloadIndex);
        await misc.adapter.relax();

        expectDomMatchesBuffer(misc);
        expect(misc.adapter.firstVisible.$index).toBe(reloadIndex);
      }
    })
  );
});
