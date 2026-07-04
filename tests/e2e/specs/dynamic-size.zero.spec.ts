import { makeTest } from '../scaffolding/runner';
import { getDatasource } from '../scaffolding/datasources';
import { SizeStrategy } from '../miscellaneous/vscroll';

const baseConfig = {
  datasourceSettings: {
    bufferSize: 5,
    minIndex: 1,
    sizeStrategy: SizeStrategy.Average
  },
  templateSettings: { dynamicSize: 'size', viewportHeight: 200 }
};

describe('Dynamic Zero Size Spec', () => {
  describe('Items with zero size', () =>
    makeTest({
      config: {
        ...baseConfig,
        datasource: () => getDatasource({ min: 1, max: 100, size: 0 })
      },
      title: 'should stop the Workflow after the first loop',
      it: misc => async done => {
        await misc.relaxNext();
        expect(misc.innerLoopCount).toEqual(1);
        done();
      }
    }));

  describe('Items with zero size started from 2 pack', () =>
    makeTest({
      config: {
        ...baseConfig,
        datasource: () => getDatasource({ min: 1, max: 100 })
      },
      title: 'should stop the Workflow after the second loop',
      it: misc => async done => {
        misc.setItemProcessor(
          ({ $index, data }) => (data.size = $index >= 6 ? 0 : 20)
        );
        await misc.relaxNext();
        expect(misc.innerLoopCount).toEqual(2);
        done();
      }
    }));

  describe('Items get non-zero size asynchronously', () =>
    makeTest({
      config: {
        ...baseConfig,
        datasource: () => getDatasource({ min: 1, max: 100, size: 0 })
      },
      title: 'should continue the Workflow after re-size and check',
      it: misc => async done => {
        const {
          scroller: { viewport },
          adapter
        } = misc;
        await misc.relaxNext();

        expect(viewport.getScrollableSize()).toEqual(
          viewport.paddings.forward.size
        );
        misc.setItemProcessor(({ data }) => (data.size = 20));
        adapter.fix({
          updater: ({ element, data }) => {
            data.size = 20;
            ((element as HTMLElement).children[0] as HTMLElement).style.height =
              '20px';
          }
        });
        await adapter.check();

        expect(viewport.getScrollableSize()).toBeGreaterThan(0);
        expect(viewport.paddings.forward.size).toEqual(0);
        done();
      }
    }));
});
