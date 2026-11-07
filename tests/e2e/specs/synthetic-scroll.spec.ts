import { getDatasource, makeTest, Misc } from '../scaffolding';

// The scroll event of an adjustment reports the position as the browser
// applied it, e.g. rounded to device pixels, unlike a fractional target.
const expectNoExtraCycle = async (
  misc: Misc,
  cycles: number
): Promise<void> => {
  await misc.delay(150);
  await misc.adapter.relax();
  expect(misc.workflow.cyclesDone).toBe(cycles);
};

describe('Synthetic Scroll Spec', () =>
  makeTest({
    config: {
      datasource: () => getDatasource(),
      datasourceSettings: { startIndex: 50, bufferSize: 5, padding: 0.5 },
      templateSettings: { viewportHeight: 200, itemHeight: 20.5 }
    },
    title: 'should not treat own scroll adjustments as user scrolling',
    it: misc => async () => {
      await misc.relaxNext();
      await expectNoExtraCycle(misc, 1);

      // a backward fetch makes the adjustment shift the position
      await misc.scrollToRelax(0);
      await expectNoExtraCycle(misc, 2);
    }
  }));
