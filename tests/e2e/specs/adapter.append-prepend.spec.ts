import {
  AdapterPropName as Adapter,
  Direction,
  getDatasource,
  makeItems,
  makeTest,
  Misc,
  MutableDatasource,
  TestConfig,
  TestItem
} from '../scaffolding';

type Operation = Adapter.append | Adapter.prepend;

interface VirtualOutcome {
  absMinIndex: number;
  absMaxIndex: number;
  bufferShift: number;
  edgeIndex: number;
  edgeId: number;
  sourceFirstId: number;
}

interface EmptyGolden {
  firstIndex: number;
  lastIndex: number;
  firstId: number;
  scrollPosition?: number;
}

const min = 1;
const max = 100;
const itemSize = 20;
const bufferSize = 10;
const padding = 0.5;
const amount = 3;
const emptyAmount = 25;
const operations: Operation[] = [Adapter.append, Adapter.prepend];

// Pure geometry derived from the config above (not scroller heuristics): the
// scrollable size is simply the item count times the item size.
const datasetScrollable = (max - min + 1) * itemSize; // full dataset, px
const virtualAddedScrollable = datasetScrollable + amount * itemSize; // + N virtual
const emptyIndexedScrollable = emptyAmount * itemSize; // indexed-empty ds once filled

const getVirtualOutcome = (
  operation: Operation,
  opposite: boolean
): VirtualOutcome => {
  if (operation === Adapter.append) {
    // decrease (opposite) shifts existing indexes down instead of growing max
    const absMinIndex = opposite ? min - amount : min;
    const absMaxIndex = opposite ? max : max + amount;
    return {
      absMinIndex,
      absMaxIndex,
      bufferShift: opposite ? -amount : 0,
      edgeIndex: absMaxIndex,
      edgeId: max + amount,
      sourceFirstId: min
    };
  }
  // prepend; increase (opposite) shifts existing indexes up instead of growing min
  const absMinIndex = opposite ? min : min - amount;
  const absMaxIndex = opposite ? max + amount : max;
  return {
    absMinIndex,
    absMaxIndex,
    bufferShift: opposite ? amount : 0,
    edgeIndex: absMinIndex,
    edgeId: min - amount,
    sourceFirstId: min - amount
  };
};

const indexedEmptyGoldens: Record<Operation, [EmptyGolden, EmptyGolden]> = {
  [Adapter.append]: [
    { firstIndex: 76, lastIndex: 100, firstId: 77, scrollPosition: 0 },
    { firstIndex: 52, lastIndex: 76, firstId: 77, scrollPosition: 300 }
  ],
  [Adapter.prepend]: [
    { firstIndex: 1, lastIndex: 25, firstId: 1, scrollPosition: 300 },
    { firstIndex: 25, lastIndex: 49, firstId: 1, scrollPosition: 0 }
  ]
};

const unboundedEmptyGoldens: Record<Operation, [EmptyGolden, EmptyGolden]> = {
  [Adapter.append]: [
    { firstIndex: 1, lastIndex: 25, firstId: 1 },
    { firstIndex: -23, lastIndex: 1, firstId: 1 }
  ],
  [Adapter.prepend]: [
    { firstIndex: -23, lastIndex: 1, firstId: -23 },
    { firstIndex: 1, lastIndex: 25, firstId: -23 }
  ]
};

const getDirection = (operation: Operation): Direction =>
  operation === Adapter.append ? Direction.forward : Direction.backward;

const getOppositeDirection = (operation: Operation): Direction =>
  operation === Adapter.append ? Direction.backward : Direction.forward;

const addItems = (
  misc: Misc,
  operation: Operation,
  items: TestItem[],
  opposite: boolean,
  boundary?: boolean,
  virtualize = false
) =>
  operation === Adapter.append
    ? misc.adapter.append({
        items,
        decrease: opposite,
        ...(virtualize ? { virtualize: true } : { eof: !!boundary })
      })
    : misc.adapter.prepend({
        items,
        increase: opposite,
        ...(virtualize ? { virtualize: true } : { bof: !!boundary })
      });

const createBasicConfig = (operation: Operation): TestConfig => ({
  datasource: () => getDatasource({ min, max }),
  datasourceSettings: {
    startIndex:
      operation === Adapter.append ? max - bufferSize + 1 - amount : min,
    minIndex: operation === Adapter.append ? min : min + amount,
    maxIndex: operation === Adapter.append ? max - amount : max,
    bufferSize,
    padding
  },
  templateSettings: { viewportHeight: 200, itemHeight: itemSize }
});

const createVirtualConfig = (
  operation: Operation,
  atOperationEdge: boolean
): TestConfig => ({
  datasource: () => new MutableDatasource(min, max),
  datasourceSettings: {
    startIndex: atOperationEdge
      ? operation === Adapter.append
        ? max
        : min
      : operation === Adapter.append
        ? min
        : max,
    minIndex: min,
    maxIndex: max,
    bufferSize,
    padding
  },
  templateSettings: { viewportHeight: 200, itemHeight: itemSize }
});

const createEmptyConfig = (
  operation: Operation,
  indexed: boolean
): TestConfig => ({
  datasource: () => getDatasource({ min: 1, max: 0 }),
  datasourceSettings: indexed
    ? {
        startIndex:
          operation === Adapter.append
            ? max - emptyAmount + 1
            : min + emptyAmount - 1,
        ...(operation === Adapter.append
          ? { maxIndex: max - emptyAmount + 1 }
          : { minIndex: min + emptyAmount - 1 }),
        bufferSize: emptyAmount,
        padding
      }
    : {},
  templateSettings: { viewportHeight: 200, itemHeight: itemSize }
});

const registerImmediate = (operation: Operation, opposite: boolean): void =>
  makeTest({
    config: createBasicConfig(operation),
    title: `should ${operation} immediately${opposite ? ' (opposite)' : ''}`,
    it: misc => async () => {
      await misc.relaxNext();
      const direction = getDirection(operation);
      const items =
        operation === Adapter.append
          ? makeItems(max - amount + 1, amount)
          : makeItems(min, amount).reverse();
      const initialScrollableSize = (max - amount) * itemSize;

      expect(misc.getScrollableSize()).toBe(initialScrollableSize);
      expect(misc.padding[direction].getSize()).toBe(0);

      const result = addItems(misc, operation, items, opposite);
      expect(misc.getScrollableSize()).toBe(initialScrollableSize);
      expect((await result).success).toBe(true);
      await misc.adapter.relax();

      const shift = operation === Adapter.append ? -amount : amount;
      const expectedShift = opposite ? shift : 0;
      const { bufferInfo } = misc.adapter;
      expect(misc.getScrollableSize()).toBe(max * itemSize);
      expect(misc.padding[direction].getSize()).toBe(0);
      expect(bufferInfo.absMinIndex).toBe(min + expectedShift);
      expect(bufferInfo.absMaxIndex).toBe(max + expectedShift);

      const edgeIndex =
        operation === Adapter.append
          ? max + expectedShift
          : min + expectedShift;
      expect(
        operation === Adapter.append ? bufferInfo.maxIndex : bufferInfo.minIndex
      ).toBe(edgeIndex);
      expect(
        misc.checkElementContent(
          edgeIndex,
          operation === Adapter.append ? max : min
        )
      ).toBe(true);
      misc.expect.domIndexesMatchBuffer();
    }
  });

const registerVirtual = (
  operation: Operation,
  opposite: boolean,
  atOperationEdge: boolean
): void =>
  makeTest({
    config: createVirtualConfig(operation, atOperationEdge),
    title:
      `should ${operation} virtually after scroll` +
      (atOperationEdge ? ' (at EOF/BOF)' : '') +
      (opposite ? ' (opposite)' : ''),
    it: misc => async () => {
      await misc.relaxNext();
      const append = operation === Adapter.append;
      const direction = getDirection(operation);
      const oppositeDirection = getOppositeDirection(operation);
      const outcome = getVirtualOutcome(operation, opposite);
      const { viewport, buffer } = misc.scroller;
      const beforeItems = [...buffer.items];
      const firstVisibleId = misc.adapter.firstVisible.data.id;
      const lastVisibleId = misc.adapter.lastVisible.data.id;
      const directionPadding = misc.padding[direction].getSize();
      const oppositePadding = misc.padding[oppositeDirection].getSize();
      const bufferedEdge = append ? buffer.lastIndex : buffer.firstIndex;
      const items = makeItems(append ? 101 : -2, amount);

      expect(misc.getScrollableSize()).toBe(datasetScrollable);
      expect(atOperationEdge ? directionPadding : oppositePadding).toBe(0);

      misc.source<MutableDatasource>().reset(
        outcome.absMinIndex,
        outcome.absMaxIndex,
        outcome.sourceFirstId
      );
      const result = await addItems(
        misc,
        operation,
        items,
        opposite,
        true,
        atOperationEdge
      );
      expect(result.success).toBe(true);

      expect(append ? buffer.lastIndex : buffer.firstIndex).toBe(
        bufferedEdge + outcome.bufferShift
      );
      misc.expect.itemsIdentity(beforeItems, buffer.items);
      expect(misc.adapter.firstVisible.data.id).toBe(firstVisibleId);
      expect(misc.adapter.lastVisible.data.id).toBe(lastVisibleId);
      expect(viewport.getScrollableSize()).toBe(virtualAddedScrollable);
      expect(misc.padding[direction].getSize()).toBe(
        directionPadding + amount * itemSize
      );
      expect(misc.padding[oppositeDirection].getSize()).toBe(oppositePadding);
      expect(buffer.absMinIndex).toBe(outcome.absMinIndex);
      expect(buffer.absMaxIndex).toBe(outcome.absMaxIndex);

      if (append) {
        await misc.scrollMaxRelax();
      } else {
        await misc.scrollMinRelax();
      }

      expect(viewport.getScrollableSize()).toBe(virtualAddedScrollable);
      expect(misc.padding[direction].getSize()).toBe(0);
      expect(buffer.absMinIndex).toBe(outcome.absMinIndex);
      expect(buffer.absMaxIndex).toBe(outcome.absMaxIndex);
      expect(append ? buffer.lastIndex : buffer.firstIndex).toBe(
        outcome.edgeIndex
      );
      expect(misc.checkElementContent(outcome.edgeIndex, outcome.edgeId)).toBe(
        true
      );
      misc.expect.domIndexesMatchBuffer();
    }
  });

const registerEmpty = (
  operation: Operation,
  opposite: boolean,
  indexed: boolean,
  boundary = false
): void =>
  makeTest({
    config: createEmptyConfig(operation, indexed),
    title:
      `should ${operation}${boundary ? ' virtually' : ''} to empty datasource` +
      (indexed ? '' : ' without indexes') +
      (opposite ? ' (opposite)' : ''),
    it: misc => async () => {
      await misc.relaxNext();
      const golden = (indexed ? indexedEmptyGoldens : unboundedEmptyGoldens)[
        operation
      ][Number(opposite)];
      const items = makeItems(golden.firstId, emptyAmount);
      if (operation === Adapter.prepend) {
        items.reverse();
      }

      expect(misc.getScrollableSize()).toBe(200); // empty ds: scrollable == viewport height
      expect(misc.adapter.itemsCount).toBe(0);
      const result = await addItems(misc, operation, items, opposite, boundary);
      expect(result.success).toBe(true);
      await misc.adapter.relax();

      expect(misc.adapter.itemsCount).toBe(emptyAmount);
      expect(misc.adapter.bufferInfo.firstIndex).toBe(golden.firstIndex);
      expect(misc.adapter.bufferInfo.lastIndex).toBe(golden.lastIndex);
      expect(misc.checkElementContent(golden.firstIndex, golden.firstId)).toBe(
        true
      );
      expect(
        misc.checkElementContent(
          golden.lastIndex,
          golden.firstId + emptyAmount - 1
        )
      ).toBe(true);
      if (indexed) {
        expect(misc.getScrollableSize()).toBe(emptyIndexedScrollable);
        expect(misc.getScrollPosition()).toBe(golden.scrollPosition);
      }
      misc.expect.domIndexesMatchBuffer();
    }
  });

describe('Adapter Append-Prepend Spec', () =>
  operations.forEach(operation =>
    [false, true].forEach(opposite => {
      registerImmediate(operation, opposite);
      [false, true].forEach(atEdge =>
        registerVirtual(operation, opposite, atEdge)
      );
      [false, true].forEach(boundary =>
        registerEmpty(operation, opposite, true, boundary)
      );
      registerEmpty(operation, opposite, false);
    })
  ));
