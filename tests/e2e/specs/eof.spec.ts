import {
  Direction,
  getDatasource,
  makeTest,
  Misc,
  MakeTestConfig,
  OperationConfig,
  TestConfig
} from '../scaffolding';

enum Operation {
  eof = 'eof',
  bof = 'bof'
}
const min = 1,
  max = 100,
  scrollCount = 10;

const config: OperationConfig<Operation> = {
  [Operation.bof]: {
    datasource: () => getDatasource({ min, max, delay: 1 }),
    datasourceSettings: {
      startIndex: min,
      bufferSize: 10,
      padding: 0.5
    },
    templateSettings: { viewportHeight: 200 }
  },
  [Operation.eof]: {
    datasource: () => getDatasource({ min, max, delay: 1 }),
    datasourceSettings: {
      startIndex: max - 10 + 1,
      bufferSize: 10,
      padding: 0.5
    },
    templateSettings: { viewportHeight: 200 }
  }
};

const emptyConfig: TestConfig = {
  ...config[Operation.bof],
  datasource: () => getDatasource({ min: 1, max: 0 }),
  datasourceSettings: {
    ...config[Operation.bof].datasourceSettings
  }
};

const observableCountConfig: TestConfig = {
  ...config[Operation.bof],
  datasourceSettings: {
    ...config[Operation.bof].datasourceSettings,
    minIndex: min,
    maxIndex: max
  }
};

interface Subscription {
  unsubscribe: () => void;
}

interface BEContainer {
  count: number;
  value: boolean;
  subscription: Subscription;
}

interface BofEofContainer {
  eof: BEContainer;
  bof: BEContainer;
}

const initializeBofEofContainer = (misc: Misc) => {
  const { adapter, shared } = misc;
  const bof: BEContainer = {
    count: 0,
    value: adapter.bof,
    subscription: {
      unsubscribe: adapter.bof$.on(value => {
        bof.count++;
        bof.value = value;
      })
    }
  };
  const eof: BEContainer = {
    count: 0,
    value: adapter.eof,
    subscription: {
      unsubscribe: adapter.eof$.on(value => {
        eof.count++;
        eof.value = value;
      })
    }
  };
  shared.bofEofContainer = { bof, eof } as BofEofContainer;
};

const disposeBofEofContainer = (misc: Misc) => {
  const { bof, eof } = misc.shared.bofEofContainer as BofEofContainer;
  eof.subscription.unsubscribe();
  bof.subscription.unsubscribe();
};

const expectLimit = (misc: Misc, direction: Direction, noscroll = false) => {
  const _forward = direction === Direction.forward;
  misc.expect.viewportFilled();
  const elements = misc.getElements();
  expect(
    misc.padding[_forward ? Direction.forward : Direction.backward].getSize()
  ).toEqual(0);
  if (!noscroll) {
    expect(
      misc.padding[_forward ? Direction.backward : Direction.forward].getSize()
    ).toBeGreaterThan(0);
  }
  expect(
    misc.checkElementId(
      elements[_forward ? elements.length - 1 : 0],
      _forward ? max : min
    )
  ).toEqual(true);

  const {
    adapter,
    scroller: {
      buffer: { eof, bof }
    },
    shared
  } = misc;
  expect(bof.get()).toEqual(!_forward);
  expect(bof.get()).toEqual(adapter.bof);
  expect(bof.get()).toEqual(
    (shared.bofEofContainer as BofEofContainer).bof.value
  );
  expect(eof.get()).toEqual(adapter.eof);
  expect(eof.get()).toEqual(_forward);
  expect(eof.get()).toEqual(
    (shared.bofEofContainer as BofEofContainer).eof.value
  );
};

const _makeTest = (data: MakeTestConfig) =>
  makeTest({
    ...data,
    before: (misc: Misc) => initializeBofEofContainer(misc),
    after: (misc: Misc) => disposeBofEofContainer(misc)
  });

const runLimitSuite = (operation = Operation.bof) => {
  const isEOF = operation === Operation.eof;

  describe((isEOF ? 'End' : 'Begin') + ' of file', () => {
    const _operation = isEOF ? Operation.bof : Operation.eof;
    const direction = isEOF ? Direction.forward : Direction.backward;
    const directionOpposite = isEOF ? Direction.backward : Direction.forward;
    const doScroll = (misc: Misc) =>
      isEOF ? misc.scrollMinRelax() : misc.scrollMaxRelax();
    const doScrollOpposite = (misc: Misc) =>
      isEOF ? misc.scrollMaxRelax() : misc.scrollMinRelax();

    _makeTest({
      config: config[operation],
      title: `should get ${operation} on init`,
      it: misc => async () => {
        await misc.relaxNext();
        expectLimit(misc, direction, true);
      }
    });

    _makeTest({
      config: config[operation],
      title: `should reset ${operation} after scroll`,
      it: misc => async () => {
        const {
          scroller: { buffer },
          adapter
        } = misc;
        const bofEofContainer = misc.shared.bofEofContainer as BofEofContainer;

        await misc.relaxNext();
        expect(buffer[operation].get()).toEqual(true);
        expect(adapter[operation]).toEqual(true);
        expect(bofEofContainer[operation].value).toEqual(true);

        await doScroll(misc);
        expect(buffer[operation].get()).toEqual(false);
        expect(adapter[operation]).toEqual(false);
        expect(bofEofContainer[operation].value).toEqual(false);
        expect(buffer[_operation].get()).toEqual(false);
        expect(adapter[_operation]).toEqual(false);
        expect(bofEofContainer[_operation].value).toEqual(false);
      }
    });

    _makeTest({
      config: config[operation],
      title: `should stop when ${operation} is reached again`,
      it: misc => async () => {
        await misc.relaxNext();
        await doScroll(misc);
        await doScrollOpposite(misc);
        expectLimit(misc, direction);
      }
    });

    _makeTest({
      config: config[operation],
      title: `should reach ${_operation} after some scrolls`,
      it: misc => async () => {
        await misc.relaxNext();
        while (misc.workflow.cyclesDone < scrollCount) {
          await doScroll(misc);
        }
        expectLimit(misc, directionOpposite);
      }
    });
  });
};

describe('EOF/BOF Spec', () => {
  runLimitSuite(Operation.bof);
  runLimitSuite(Operation.eof);

  _makeTest({
    config: emptyConfig,
    title: 'should reach both bof and eof during the first WF cycle',
    it: misc => async () => {
      await misc.relaxNext();
      const { bof, eof } = misc.shared.bofEofContainer as BofEofContainer;
      expect(bof.count).toEqual(1);
      expect(eof.count).toEqual(1);
      expect(bof.value).toEqual(true);
      expect(eof.value).toEqual(true);
    }
  });

  _makeTest({
    config: observableCountConfig,
    title: 'should reach bof/eof multiple times',
    it: misc => async () => {
      const COUNT = 10;
      await misc.relaxNext();

      while (misc.workflow.cyclesDone < COUNT) {
        if (misc.workflow.cyclesDone % 2 === 0) {
          await misc.scrollMinRelax();
        } else {
          await misc.scrollMaxRelax();
        }
      }

      const { bof, eof } = misc.shared.bofEofContainer as BofEofContainer;
      expect(bof.count).toEqual(COUNT);
      expect(eof.count).toEqual(COUNT - 1);
    }
  });
});
