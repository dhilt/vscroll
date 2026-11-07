import { getDatasource, makeTest, SizeStrategy } from '../scaffolding';

// Chromium serializes large inline sizes with 6 significant digits, e.g. "1.23432e+06px".
describe('Padding Precision Spec', () =>
  [false, true].forEach(horizontal =>
    makeTest({
      config: {
        datasource: () => getDatasource({ min: 1, max: 200000 }),
        datasourceSettings: {
          minIndex: 1,
          maxIndex: 200000,
          startIndex: 94969,
          itemSize: 13,
          sizeStrategy: SizeStrategy.Constant,
          horizontal
        },
        templateSettings: {
          viewportHeight: 400,
          viewportWidth: 400,
          itemHeight: 13,
          itemWidth: 13,
          horizontal
        }
      },
      title: 'should keep a padding over 1M px exact',
      it: misc => async () => {
        await misc.relaxNext();
        misc.expect.startVisible(94969);
        misc.expect.domMatchesBuffer();
      }
    })
  ));
