import { commands } from 'vitest/browser';
import {
  getDatasource,
  makeItems,
  makeTest,
  Misc,
  Routines,
  SizeStrategy,
  TestConfig
} from '../scaffolding';

interface Scenario {
  max: number;
  size: number;
  start: number;
}

const scenarios: Scenario[] = [
  { max: 3000000, size: 13, start: 1500000 },
  { max: 500000000, size: 20, start: 250000000 },
  { max: 500000000, size: 20, start: 499990000 }
];
const uncompressedScenario: Scenario = { max: 1000, size: 20, start: 500 };

const configFor = (scenario: Scenario, horizontal: boolean): TestConfig => ({
  datasource: () => getDatasource({ min: 1, max: scenario.max + 100 }),
  datasourceSettings: {
    minIndex: 1,
    maxIndex: scenario.max,
    startIndex: scenario.start,
    itemSize: scenario.size,
    sizeStrategy: SizeStrategy.Constant,
    bufferSize: 20,
    horizontal
  },
  templateSettings: {
    viewportHeight: 400,
    viewportWidth: 400,
    itemHeight: scenario.size,
    itemWidth: scenario.size,
    horizontal
  },
  timeout: 5000
});

const expectLayout = (misc: Misc, logicalSize: number): void => {
  expect(misc.getScrollableSize()).toBe(logicalSize);
  expect(misc.scroller.routines.getScrollerSize()).toBeLessThanOrEqual(
    15000002
  );
  expect(misc.adapter.itemsCount).toBeLessThan(200);
  expect(misc.adapter.isLoading).toBe(false);
  expect(misc.workflow.errors).toEqual([]);
  misc.expect.domMatchesBuffer();
};

const getItemOffset = (misc: Misc, element: HTMLElement): number => {
  const edge = misc.horizontal ? 'left' : 'top';
  return (
    element.getBoundingClientRect()[edge] -
    misc.viewportElement.getBoundingClientRect()[edge]
  );
};

// Near the 15M native extent, coordinate rounding can affect alignment by two CSS pixels.
// Keep this absolute budget fixed across commands; logical pixel commands remain exact.
const alignmentTolerance = 2;

const expectAlignedItem = (misc: Misc, index: number): void => {
  const element = misc.getElement(index)!;
  expect(element).not.toBeNull();
  expect(misc.getElementIndex(element)).toBe(index);
  expect(misc.checkElementContentByIndex(index)).toBe(true);
  expect(Math.abs(getItemOffset(misc, element))).toBeLessThanOrEqual(alignmentTolerance);
};

const expectFirstVisibleMatchesDom = (misc: Misc): void => {
  const start = misc.horizontal ? 'left' : 'top';
  const end = misc.horizontal ? 'right' : 'bottom';
  const viewport = misc.viewportElement.getBoundingClientRect();
  const first = misc.getElements().find(element => {
    const rect = element.getBoundingClientRect();
    return rect[end] > viewport[start] && rect[start] < viewport[end];
  })!;
  expect(first).toBeDefined();
  expect(misc.adapter.firstVisible.element).toBe(first);
  expect(misc.adapter.firstVisible.$index).toBe(misc.getElementIndex(first));
};

const scrollBufferedItem = async (
  misc: Misc,
  target: number,
  size: number,
  behavior: ScrollBehavior = 'auto'
): Promise<number> => {
  const settled = misc.relaxNext();
  const result = misc.adapter.fix({
    scrollToItem: item => item.$index === target,
    scrollToItemOpt: { behavior, block: 'start', inline: 'start' }
  });
  const position = misc.getScrollPosition();
  expect(Math.abs(position - (target - 1) * size)).toBeLessThanOrEqual(alignmentTolerance);
  expectAlignedItem(misc, target);
  await result;
  await settled;
  expect(misc.getScrollPosition()).toBe(position);
  expectAlignedItem(misc, target);
  expectFirstVisibleMatchesDom(misc);
  return position;
};

const scrollNative = async (misc: Misc, position: number): Promise<void> => {
  const settled = misc.relaxNext();
  misc.scroller.routines.setScrollPosition(position);
  await settled;
};

// Trusted wheel input; Firefox animates it, so wait until the native position settles.
const scrollWheel = async (misc: Misc, delta: number): Promise<void> => {
  const settled = misc.relaxNext();
  await commands.wheel(misc.horizontal ? delta : 0, misc.horizontal ? 0 : delta);
  await settled;
  for (let still = 0, native = NaN; still < 5; ) {
    await misc.waitForPaint();
    const current = misc.scroller.routines.getScrollPosition();
    still = current === native ? still + 1 : 0;
    native = current;
  }
  await misc.adapter.relax();
};

// Firefox may round huge native offsets and expose less than a pixel of the preceding row.
const expectStartVisible = (misc: Misc, index: number): void => {
  const first = misc.adapter.firstVisible.$index;
  if (first === index - 1) {
    const end = misc.horizontal ? 'right' : 'bottom';
    const start = misc.horizontal ? 'left' : 'top';
    const sliver =
      misc.getElement(first)!.getBoundingClientRect()[end] -
      misc.viewportElement.getBoundingClientRect()[start];
    expect(sliver).toBeLessThan(1);
  } else {
    expect(first).toBe(index);
  }
  expect(misc.checkElementContentByIndex(index)).toBe(true);
};

const startNativeSmoothScroll = async (
  misc: Misc,
  target: number,
  behavior: ScrollBehavior = 'smooth'
): Promise<void> => {
  const initialOffset = getItemOffset(misc, misc.getElement(target)!);
  await misc.adapter.fix({
    scrollToItem: item => item.$index === target,
    scrollToItemOpt: { behavior, block: 'start', inline: 'start' }
  });
  await expect
    .poll(
      () => {
        const offset = getItemOffset(misc, misc.getElement(target)!);
        return offset > 1 && offset < initialOffset - 1;
      },
      { interval: 16, timeout: 1000 }
    )
    .toBe(true);
};

describe('Large Dataset Spec', () => {
  [false, true].forEach(horizontal => {
    scenarios.forEach(scenario =>
      makeTest({
        config: configFor(scenario, horizontal),
        title: 'should preserve indexes across large jumps and reload',
        it: misc => async () => {
          misc.trackVisibleItems();
          await misc.relaxNext();
          const expectAnchor = (index: number): void => {
            if (scenario === scenarios[0]) expectStartVisible(misc, index);
            expectAlignedItem(misc, index);
            expectFirstVisibleMatchesDom(misc);
          };
          expectAnchor(scenario.start);
          expect(
            misc.scroller.routines.getSize(misc.adapter.firstVisible.element!)
          ).toBe(scenario.size);
          expectLayout(misc, scenario.max * scenario.size);

          const index = Math.floor(scenario.max / 3);
          await misc.scrollToRelax((index - 1) * scenario.size);
          expect(misc.getScrollPosition()).toBe((index - 1) * scenario.size);
          expectAnchor(index);
          expectLayout(misc, scenario.max * scenario.size);

          await misc.scrollMaxRelax();
          expect(misc.adapter.lastVisible.$index).toBe(scenario.max);
          expectLayout(misc, scenario.max * scenario.size);

          await misc.scrollMinRelax();
          misc.expect.startVisible(1);
          await misc.adapter.reload(scenario.start);
          expectAnchor(scenario.start);
          expectLayout(misc, scenario.max * scenario.size);
        }
      })
    );

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should preserve the anchor during virtual append and size checks',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size, start } = scenarios[1];
        await misc.adapter.append({
          items: makeItems(max + 1, 2),
          eof: true
        });
        misc.expect.startVisible(start);
        expectLayout(misc, (max + 2) * size);

        misc.getElement(start)!.style[horizontal ? 'width' : 'height'] =
          `${size * 2}px`;
        await misc.adapter.check();
        misc.expect.startVisible(start);
        expectLayout(misc, (max + 3) * size);
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should map small logical steps to equal native steps',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size, start } = scenarios[1];
        const position = (start - 1) * size;
        const nativePosition = misc.scroller.routines.getScrollPosition();

        for (const delta of [size, 0, -size, 0, size, 0, -size, 0]) {
          await misc.scrollToRelax(position + delta);
          expectAlignedItem(misc, start + delta / size);
          expectFirstVisibleMatchesDom(misc);
          expect(misc.getScrollPosition()).toBe(position + delta);
          // Firefox rounds large native positions
          expect(
            Math.abs(misc.scroller.routines.getScrollPosition() - (nativePosition + delta))
          ).toBeLessThanOrEqual(1);
          expectLayout(misc, max * size);
        }
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should scroll to a buffered item in the compressed region',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size, start } = scenarios[1];
        for (let step = 0; step < 20; step++) {
          const target = start + (step % 2 ? 10 : 5);
          await scrollBufferedItem(misc, target, size);
          expectLayout(misc, max * size);
        }

        const position = misc.getScrollPosition();
        const offset = getItemOffset(misc, misc.getElement(start + 10)!);
        for (let frame = 0; frame < 3; frame++) {
          await misc.waitForPaint();
          expect(misc.getScrollPosition()).toBe(position);
          expect(getItemOffset(misc, misc.getElement(start + 10)!)).toBe(offset);
          expectFirstVisibleMatchesDom(misc);
        }
        expectLayout(misc, max * size);
      }
    });

    [false, { block: 'center', inline: 'center' }].forEach(options =>
      makeTest({
        config: configFor(scenarios[1], horizontal),
        title: `should align a buffered item at the ${options === false ? 'end' : 'center'}`,
        it: misc => async () => {
          misc.trackVisibleItems();
          await misc.relaxNext();
          const { max, size, start } = scenarios[1];
          const target = start + 25;
          const settled = misc.relaxNext();

          await misc.adapter.fix({
            scrollToItem: item => item.$index === target,
            scrollToItemOpt: options as boolean | ScrollIntoViewOptions
          });
          await settled;

          const expectedOffset =
            (misc.getViewportSize() - size) / (options === false ? 1 : 2);
          expect(
            Math.abs(
              getItemOffset(misc, misc.getElement(target)!) - expectedOffset
            )
          ).toBeLessThanOrEqual(1);
          expectLayout(misc, max * size);
        }
      })
    );

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title:
        'should use nearest alignment without moving an already visible item',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size, start } = scenarios[1];
        const position = misc.getScrollPosition();
        const options: ScrollIntoViewOptions = {
          block: 'nearest',
          inline: 'nearest'
        };

        await misc.adapter.fix({
          scrollToItem: item => item.$index === start + 5,
          scrollToItemOpt: options
        });
        await misc.waitForPaint();
        expect(misc.getScrollPosition()).toBe(position);

        const target = start + 25;
        const settled = misc.relaxNext();
        await misc.adapter.fix({
          scrollToItem: item => item.$index === target,
          scrollToItemOpt: options
        });
        await settled;

        expect(
          Math.abs(
            getItemOffset(misc, misc.getElement(target)!) -
              (misc.getViewportSize() - size)
          )
        ).toBeLessThanOrEqual(1);
        expectLayout(misc, max * size);
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should move the content 1:1 with native scrolling',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size, start } = scenarios[1];
        await misc.scrollToRelax(misc.getScrollPosition() + size);
        const position = misc.getScrollPosition();
        const nativePosition = misc.scroller.routines.getScrollPosition();
        const anchor = misc.getElement(start + 10)!;
        const offset = getItemOffset(misc, anchor);

        await scrollNative(misc, nativePosition + 100);

        expect(Math.abs(misc.getScrollPosition() - (position + 100))).toBeLessThanOrEqual(1);
        expect(Math.abs(getItemOffset(misc, anchor) - (offset - 100))).toBeLessThanOrEqual(1);
        expect(misc.adapter.firstVisible.$index).toBe(
          Math.floor(misc.getScrollPosition() / size) + 1
        );
        expectFirstVisibleMatchesDom(misc);
        expectLayout(misc, max * size);

        await scrollNative(misc, nativePosition);

        expect(misc.getScrollPosition()).toBe(position);
        misc.expect.startVisible(start + 1);
        expect(
          Math.abs(getItemOffset(misc, misc.adapter.firstVisible.element!))
        ).toBeLessThanOrEqual(1);
        expectLayout(misc, max * size);
      }
    });

    [uncompressedScenario, scenarios[1]].forEach(scenario =>
      [
        { minSize: 0, insets: 55 },
        { minSize: 400, insets: 0 },
        { minSize: 400, insets: 55 }
      ].forEach(({ minSize, insets }) => {
        let measurements = 0;
        makeTest({
          config: {
            ...configFor(scenario, horizontal),
            Routines: class extends Routines {
              getScrollerInsets(): number {
                measurements++;
                return super.getScrollerInsets();
              }
            }
          },
          title: 'should preserve content geometry across resets and checks',
          meta: `${insets}px insets, ${minSize}px minimum size`,
          before: misc => {
            const style = misc.contentElement.style;
            style[horizontal ? 'minWidth' : 'minHeight'] = `${minSize}px`;
            if (insets) {
              style.cssText += horizontal
                ? ';padding:0 30px 0 20px;border-left:2px solid;border-right:3px solid;'
                : ';padding:20px 0 30px;border-top:2px solid;border-bottom:3px solid;';
            }
          },
          it: misc => async () => {
            misc.trackVisibleItems();
            await misc.relaxNext();
            const size = scenario.max * scenario.size + insets;
            expect(misc.getScrollableSize()).toBe(size);
            expect(measurements).toBe(1);
            await misc.scrollMaxRelax();
            expect(misc.getScrollableSize()).toBe(size);
            expect(
              Math.abs(
                misc.getScrollPosition() - (size - misc.getViewportSize())
              )
            ).toBeLessThanOrEqual(1);
            expect(misc.adapter.lastVisible.$index).toBe(scenario.max);
            expect(
              misc.scroller.routines.getScrollerSize()
            ).toBeLessThanOrEqual(15000002);
            await misc.scrollMinRelax();
            expect(misc.adapter.firstVisible.$index).toBe(1);
            expect(misc.getScrollableSize()).toBe(size);
            expect(measurements).toBe(1);
            await misc.adapter.reload(scenario.start);
            expect(misc.getScrollableSize()).toBe(size);
            expect(measurements).toBe(2);
            await misc.adapter.reset();
            expect(misc.getScrollableSize()).toBe(size);
            expect(measurements).toBe(3);
            expect(misc.workflow.errors).toEqual([]);
            misc.expect.domMatchesBuffer();

            const style = misc.contentElement.style;
            const originalStyle = style.cssText;
            const anchor = misc.getElement(scenario.start + 5)!;
            for (const currentInsets of [75, 0]) {
              style.padding = '0';
              style.border = '0';
              style[horizontal ? 'paddingLeft' : 'paddingTop'] =
                `${currentInsets ? currentInsets - 5 : 0}px`;
              style[horizontal ? 'borderLeft' : 'borderTop'] =
                currentInsets ? '5px solid' : '0';
              const cycles = misc.workflow.cyclesDone;
              const offset = getItemOffset(misc, anchor);

              await misc.adapter.check();

              expect(misc.workflow.cyclesDone).toBe(cycles + 1);
              expect(misc.getScrollableSize()).toBe(
                scenario.max * scenario.size + currentInsets
              );
              expect(
                Math.abs(getItemOffset(misc, anchor) - offset)
              ).toBeLessThanOrEqual(alignmentTolerance);
              misc.scroller.buffer.items.forEach(item =>
                expect(item.size).toBe(scenario.size)
              );
              expect(misc.workflow.errors).toEqual([]);
              misc.expect.domMatchesBuffer();
            }
            expect(measurements).toBe(5);
            const cycles = misc.workflow.cyclesDone;
            await misc.adapter.check();
            expect(measurements).toBe(6);
            expect(misc.workflow.cyclesDone).toBe(cycles);
            style.cssText = originalStyle;
            await misc.adapter.check();

            const leading = horizontal ? 'paddingLeft' : 'paddingTop';
            style.fontSize = '16px';
            for (const boxSizing of ['content-box', 'border-box']) {
              style.boxSizing = boxSizing;
              style[leading] = '1.5em';
              expect(misc.scroller.routines.getScrollerInsets()).toBe(
                (insets ? 35 : 0) + 24
              );
              style[leading] = '20.25px';
              expect(misc.scroller.routines.getScrollerInsets()).toBe(
                (insets ? 35 : 0) + 20.25
              );
            }
            style.cssText = originalStyle;
          }
        });
      })
    );

    [
      [false, uncompressedScenario],
      [true, uncompressedScenario],
      [false, scenarios[1]],
      [true, scenarios[1]]
    ].forEach(([css, scenario]) =>
      makeTest({
        config: configFor(scenario as Scenario, horizontal),
        title:
          `should retain native smooth scrolling ${scenario === uncompressedScenario ? 'without' : 'with'} ` +
          `compression (${css ? 'CSS smooth, auto' : 'smooth'})`,
        it: misc => async () => {
          misc.trackVisibleItems();
          await misc.relaxNext();
          const { max, size, start } = scenario as Scenario;
          const target = start + 25;
          if (css) misc.viewportElement.style.scrollBehavior = 'smooth';

          await startNativeSmoothScroll(misc, target, css ? 'auto' : 'smooth');
          // Firefox rounds large native positions, so the animation may end 1px apart
          await expect
            .poll(
              () =>
                Math.abs(misc.getScrollPosition() - (target - 1) * size) <= 1 &&
                Math.abs(getItemOffset(misc, misc.getElement(target)!)) <= 1,
              { interval: 16, timeout: 1500 }
            )
            .toBe(true);
          await misc.adapter.relax();

          expect(
            Math.abs(getItemOffset(misc, misc.getElement(target)!))
          ).toBeLessThanOrEqual(1);
          expectLayout(misc, max * size);
        }
      })
    );

    ['fix', 'reload'].forEach(operation =>
      makeTest({
        config: configFor(scenarios[1], horizontal),
        title: `should retain a subsequent ${operation} position after an immediate smooth request`,
        it: misc => async () => {
          misc.trackVisibleItems();
          await misc.relaxNext();
          const { max, size, start } = scenarios[1];
          misc.viewportElement.style.scrollBehavior = 'smooth';
          const settled = misc.relaxNext();
          await misc.adapter.fix({
            scrollToItem: item => item.$index === start + 25,
            scrollToItemOpt: { behavior: 'smooth', block: 'start', inline: 'start' }
          });
          await settled;
          // Smooth scrolling is native in compressed ranges too
          await expect
            .poll(() => Math.abs(misc.getScrollPosition() - (start + 24) * size) <= 1, {
              interval: 16,
              timeout: 1500
            })
            .toBe(true);
          await misc.adapter.relax();
          const target = start + (operation === 'fix' ? -5 : 100);

          if (operation === 'fix') {
            await misc.scrollToRelax((target - 1) * size);
          } else {
            await misc.adapter.reload(target);
          }

          // CSS smooth must not leave a pending animation that later changes the new position.
          const until = performance.now() + 500;
          do {
            await misc.waitForPaint();
            expect(misc.getScrollPosition()).toBe((target - 1) * size);
            misc.expect.startVisible(target);
            expect(
              Math.abs(getItemOffset(misc, misc.adapter.firstVisible.element!))
            ).toBeLessThanOrEqual(1);
          } while (performance.now() < until);
          expectLayout(misc, max * size);
        }
      })
    );

    ['prepend', 'remove'].forEach(operation =>
      makeTest({
        config: configFor(scenarios[1], horizontal),
        title: `should retain the visible anchor after virtual ${operation} before it`,
        it: misc => async () => {
          misc.trackVisibleItems();
          await misc.relaxNext();
          const anchor = misc.adapter.firstVisible.element!;
          const data = misc.adapter.firstVisible.data;
          const offset = getItemOffset(misc, anchor);

          if (operation === 'prepend') {
            await misc.adapter.prepend({ items: makeItems(-1, 2), bof: true });
          } else {
            await misc.adapter.remove({ indexes: [1, 2] });
          }

          expect(misc.adapter.firstVisible.element).toBe(anchor);
          expect(misc.adapter.firstVisible.data).toBe(data);
          expect(
            Math.abs(getItemOffset(misc, anchor) - offset)
          ).toBeLessThanOrEqual(1);
          misc.expect.domIndexesMatchBuffer();
          expect(misc.workflow.errors).toEqual([]);
        }
      })
    );

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title:
        'should retain the anchor when a preceding buffered row changes size',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size, start } = scenarios[1];
        const preceding = misc.getElement(start - 1)!;

        for (const rowSize of [size * 2, size]) {
          preceding.style[horizontal ? 'width' : 'height'] = `${rowSize}px`;
          // check() preserves the visible DOM anchor after the external resize has committed.
          const viewportEdge =
            misc.viewportElement.getBoundingClientRect()[
              horizontal ? 'left' : 'top'
            ];
          const anchor = misc
            .getElements()
            .find(
              element =>
                element.getBoundingClientRect()[
                  horizontal ? 'right' : 'bottom'
                ] > viewportEdge
            )!;
          const offset = getItemOffset(misc, anchor);
          await misc.adapter.check();

          expect(misc.adapter.firstVisible.element).toBe(anchor);
          expect(
            Math.abs(getItemOffset(misc, anchor) - offset)
          ).toBeLessThanOrEqual(1);
          expectLayout(misc, max * size + rowSize - size);
        }
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title:
        'should keep both dataset edges aligned when a request exceeds the range',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size } = scenarios[1];
        const total = max * size;
        await misc.scrollMaxRelax();

        for (const position of [Infinity, total + 1000]) {
          await misc.adapter.fix({ scrollPosition: position });
          await misc.waitForPaint();
          await misc.adapter.relax();

          expect(misc.getScrollPosition()).toBe(total - misc.getViewportSize());
          expect(misc.adapter.lastVisible.$index).toBe(max);
          expect(
            Math.abs(
              getItemOffset(misc, misc.getElement(max)!) +
                size -
                misc.getViewportSize()
            )
          ).toBeLessThanOrEqual(1);
          expectLayout(misc, total);
        }

        await misc.scrollMinRelax();

        for (const position of [-Infinity, -1000]) {
          await misc.adapter.fix({ scrollPosition: position });
          await misc.waitForPaint();
          await misc.adapter.relax();

          expect(misc.getScrollPosition()).toBe(0);
          misc.expect.startVisible(1);
          expect(
            Math.abs(getItemOffset(misc, misc.getElement(1)!))
          ).toBeLessThanOrEqual(1);
          expectLayout(misc, total);
        }
      }
    });

    [true, false].forEach(knownMinimum =>
      makeTest({
        config: {
          ...configFor(scenarios[1], horizontal),
          datasourceSettings: {
            ...configFor(scenarios[1], horizontal).datasourceSettings,
            minIndex: knownMinimum ? 1 : undefined,
            maxIndex: knownMinimum ? undefined : scenarios[1].max
          }
        },
        title: `should reach a distant known ${knownMinimum ? 'minimum' : 'maximum'} with the other bound unknown`,
        it: misc => async () => {
          misc.trackVisibleItems();
          await misc.relaxNext();
          misc.expect.startVisible(scenarios[1].start);

          if (knownMinimum) {
            await misc.scrollMinRelax();
            misc.expect.startVisible(1);
          } else {
            await misc.scrollMaxRelax();
            expect(misc.adapter.lastVisible.$index).toBe(scenarios[1].max);
          }

          expect(misc.adapter.itemsCount).toBeLessThan(200);
          expect(misc.workflow.errors).toEqual([]);
          misc.expect.domMatchesBuffer();
        }
      })
    );

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should restore unscaled geometry when reset reduces the dataset',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const settings = { ...misc.datasource.settings };
        await misc.adapter.reset({
          settings: { ...settings, maxIndex: 1000, startIndex: 500 }
        });
        misc.expect.startVisible(500);
        expectLayout(misc, 20000);
        expect(misc.scroller.routines.getScrollerSize()).toBe(20000);

        await misc.adapter.reset({ settings });
        misc.expect.startVisible(scenarios[1].start);
        expectLayout(misc, scenarios[1].max * scenarios[1].size);
      }
    });

    makeTest({
      config: {
        ...configFor(scenarios[1], horizontal),
        datasourceSettings: {
          ...configFor(scenarios[1], horizontal).datasourceSettings,
          infinite: true
        }
      },
      title:
        'should preserve geometry through explicit clipping and its callback',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size, start } = scenarios[1];
        await misc.scrollToRelax((start + 100 - 1) * size);
        const { buffer, settings } = misc.scroller;
        const count = buffer.size;
        const observations: { size: number; count: number }[] = [];
        settings.onBeforeClip = () =>
          observations.push({
            size: misc.getScrollableSize(),
            count: buffer.size
          });

        await misc.adapter.clip();

        expect(observations).toEqual([{ size: max * size, count }]);
        expect(buffer.size).toBeLessThan(count);
        misc.expect.startVisible(start + 100);
        expectLayout(misc, max * size);
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should map a native jump into empty space proportionally',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size } = scenarios[1];
        const { routines } = misc.scroller;
        const nativeMax = routines.getScrollerSize() - misc.getViewportSize();

        await scrollNative(misc, Math.round(nativeMax / 4));
        expect(Math.abs(misc.adapter.firstVisible.$index - max / 4) / max).toBeLessThan(0.01);
        expectFirstVisibleMatchesDom(misc);
        expectLayout(misc, max * size);

        await scrollNative(misc, nativeMax);
        expect(misc.adapter.lastVisible.$index).toBe(max);
        expect(
          Math.abs(misc.getScrollPosition() - (max * size - misc.getViewportSize()))
        ).toBeLessThanOrEqual(1);
        expectLayout(misc, max * size);

        await scrollNative(misc, 0);
        misc.expect.startVisible(1);
        expect(misc.getScrollPosition()).toBe(0);
        expectLayout(misc, max * size);
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should keep trusted wheel input 1:1 beyond the rendered rows',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        // let the compositor learn the new scroller before routing wheel input to it
        await misc.waitForPaint();
        await misc.waitForPaint();
        const { max, size } = scenarios[1];

        for (const delta of [100, 1000, 5000, -1000, -5000]) {
          const position = misc.getScrollPosition();
          const native = misc.scroller.routines.getScrollPosition();
          await scrollWheel(misc, delta);
          // Firefox limits a wheel step to about a page natively; the list follows natively 1:1
          const nativeDelta = misc.scroller.routines.getScrollPosition() - native;
          expect(Math.sign(nativeDelta)).toBe(Math.sign(delta));
          expect(Math.abs(nativeDelta)).toBeLessThanOrEqual(Math.abs(delta) + 1);
          expect(Math.abs(misc.getScrollPosition() - (position + nativeDelta))).toBeLessThanOrEqual(1);
          expectFirstVisibleMatchesDom(misc);
          expectLayout(misc, max * size);
        }
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should map only jumps beyond the scrollbar resolution proportionally',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size } = scenarios[1];
        const { routines } = misc.scroller;
        // a scrollbar track pixel moves the native position by about 15M / viewport size
        const trackPixel = 15000000 / misc.getViewportSize();
        const position = misc.getScrollPosition();

        await scrollNative(misc, routines.getScrollPosition() + trackPixel / 4);
        expect(
          Math.abs(misc.getScrollPosition() - (position + trackPixel / 4))
        ).toBeLessThanOrEqual(1);

        await scrollNative(misc, routines.getScrollPosition() + trackPixel);
        expect(misc.getScrollPosition() - position).toBeGreaterThan(trackPixel * 100);
        expectFirstVisibleMatchesDom(misc);
        expectLayout(misc, max * size);
      }
    });

    makeTest({
      config: configFor(scenarios[1], horizontal),
      title: 'should map a native jump made while paused proportionally',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size } = scenarios[1];
        const { routines } = misc.scroller;
        const nativeMax = routines.getScrollerSize() - misc.getViewportSize();

        await misc.adapter.pause();
        routines.setScrollPosition(Math.round(nativeMax / 4));
        await misc.waitForPaint(); // the scroll event arrives while paused
        const settled = misc.relaxNext();
        await misc.adapter.resume();
        await settled;
        expect(Math.abs(misc.adapter.firstVisible.$index - max / 4) / max).toBeLessThan(0.01);
        expectFirstVisibleMatchesDom(misc);
        expectLayout(misc, max * size);
      }
    });

    makeTest({
      config: {
        ...configFor(scenarios[1], horizontal),
        // the next scroll event comes before the resumed cycle renders the rows
        datasource: () => getDatasource({ min: 1, max: scenarios[1].max + 100, delay: 50 })
      },
      title: 'should keep native steps made while paused 1:1',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size } = scenarios[1];
        const { routines } = misc.scroller;
        const trackPixel = 15000000 / misc.getViewportSize();
        const position = misc.getScrollPosition();
        const native = routines.getScrollPosition();

        await misc.adapter.pause();
        // steps below the jump threshold, a scrollbar track pixel in total
        while (routines.getScrollPosition() - native < trackPixel) {
          routines.setScrollPosition(routines.getScrollPosition() + 2000);
          await misc.waitForPaint();
        }
        const distance = routines.getScrollPosition() - native;
        const settled = misc.relaxNext();
        const resumed = misc.adapter.resume();
        routines.setScrollPosition(routines.getScrollPosition() + 1);
        await resumed;
        await settled;
        await misc.adapter.relax();
        expect(Math.abs(misc.getScrollPosition() - (position + distance + 1))).toBeLessThanOrEqual(1);
        expectFirstVisibleMatchesDom(misc);
        expectLayout(misc, max * size);
      }
    });

    makeTest({
      config: { ...configFor(scenarios[1], horizontal), timeout: 20000 },
      title: 'should keep the native position proportional while scrolling 1:1',
      it: misc => async () => {
        misc.trackVisibleItems();
        await misc.relaxNext();
        const { max, size } = scenarios[1];
        const { routines } = misc.scroller;
        const position = misc.getScrollPosition();
        const step = misc.getViewportSize() - 10;

        for (let i = 1; i <= 60; i++) {
          await scrollNative(misc, routines.getScrollPosition() + step);
          expect(Math.abs(misc.getScrollPosition() - (position + i * step))).toBeLessThanOrEqual(1);
          expectFirstVisibleMatchesDom(misc);
        }
        const nativeMax = routines.getScrollerSize() - misc.getViewportSize();
        const ratio = nativeMax / (max * size - misc.getViewportSize());
        expect(
          Math.abs(routines.getScrollPosition() - misc.getScrollPosition() * ratio)
        ).toBeLessThan(20000);
        expectLayout(misc, max * size);
      }
    });
  });

  makeTest({
    config: {
      ...configFor(scenarios[0], false),
      datasourceSettings: {
        ...configFor(scenarios[0], false).datasourceSettings,
        windowViewport: true
      },
      templateSettings: {
        itemHeight: 13,
        noViewportClass: true,
        headerHeight: 50
      }
    },
    title: 'should retain the window viewport offset with compressed padding',
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      misc.expect.startVisible(scenarios[0].start);
      const offset = misc.scroller.viewport.offset;
      expect(offset).toBeGreaterThanOrEqual(50);
      await misc.scrollMaxRelax();
      expect(misc.adapter.lastVisible.$index).toBe(scenarios[0].max);
      await misc.scrollMinRelax();
      misc.expect.startVisible(1);
      expect(misc.scroller.routines.getOffset()).toBe(offset);
      expectLayout(misc, scenarios[0].max * scenarios[0].size);
    }
  });

  makeTest({
    config: {
      ...configFor(scenarios[1], false),
      datasource: () =>
        getDatasource({ min: 1, max: scenarios[1].max, delay: 20 }),
      datasourceSettings: {
        ...configFor(scenarios[1], false).datasourceSettings,
        itemSize: undefined
      }
    },
    title:
      'should initialize an asynchronous datasource without a size estimate',
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      misc.expect.startVisible(scenarios[1].start);
      expectLayout(misc, scenarios[1].max * scenarios[1].size);
    }
  });

  makeTest({
    config: {
      ...configFor(scenarios[1], false),
      datasourceSettings: {
        ...configFor(scenarios[1], false).datasourceSettings,
        viewportElement: () =>
          document.querySelector<HTMLElement>('[data-test-viewport]')
      }
    },
    title: 'should retain an external viewport offset during large jumps',
    before: misc => {
      const header = document.createElement('div');
      header.style.height = '40px';
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      misc.viewportElement.prepend(header);
      misc.viewportElement.append(wrapper);
      wrapper.append(misc.contentElement);
    },
    it: misc => async () => {
      misc.trackVisibleItems();
      await misc.relaxNext();
      misc.expect.startVisible(scenarios[1].start);
      expect(misc.scroller.viewport.offset).toBe(40);
      await misc.scrollMaxRelax();
      expect(misc.adapter.lastVisible.$index).toBe(scenarios[1].max);
      await misc.scrollMinRelax();
      misc.expect.startVisible(1);
      expect(misc.scroller.routines.getOffset()).toBe(40);
      expectLayout(misc, scenarios[1].max * scenarios[1].size);
    }
  });
});
