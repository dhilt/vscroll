import {
  AdapterPropName as Adapter,
  getDefaultAdapterProps,
  getDatasource,
  makeDatasource,
  makeTest,
  Misc,
  starGet,
  DatasourceGet,
  IDatasourceOptional,
  TestConfig
} from '../scaffolding';

interface ResetVariant {
  isNew: boolean;
  options: IDatasourceOptional;
}

type PermanentProp = Adapter.id | Adapter.version;

const Datasource = makeDatasource();
const adapterProps = getDefaultAdapterProps();

const mainConfig: TestConfig = {
  datasource: () => getDatasource({ mode: 'promise' }),
  datasourceSettings: { startIndex: 1 },
  datasourceDevSettings: { initDelay: 10 },
  templateSettings: { viewportHeight: 100 }
};

const bofConfig: TestConfig = {
  datasource: () => getDatasource({ min: 1, max: 100 }),
  datasourceSettings: { startIndex: 1, bufferSize: 25 },
  datasourceDevSettings: { initDelay: 10 },
  templateSettings: { viewportHeight: 100 }
};

const workflowConfig: TestConfig = {
  datasource: () => getDatasource({ delay: 150 }),
  datasourceSettings: { startIndex: 1 },
  templateSettings: { viewportHeight: 100 },
  timeout: 5000
};

const variants: ResetVariant[] = [
  {
    isNew: true,
    options: { get: starGet, settings: { startIndex: 100 } }
  },
  {
    isNew: false,
    options: { get: starGet, settings: { startIndex: 100 } }
  }
];

const bofVariants: ResetVariant[] = [
  { isNew: true, options: { settings: { startIndex: 1 } } },
  { isNew: false, options: { settings: { startIndex: 1 } } }
];

const reset = (misc: Misc, variant: ResetVariant) => {
  if (!variant.isNew) {
    return misc.adapter.reset(variant.options);
  }

  const datasource = new Datasource<unknown>({
    get:
      variant.options.get ??
      (misc.datasource.get as unknown as DatasourceGet<unknown>),
    settings: variant.options.settings,
    devSettings: variant.options.devSettings
  });
  return misc.adapter.reset(datasource).finally(() => datasource.dispose());
};

const expectAdaptersLinked = (
  misc: Misc,
  publicAdapter = misc.adapter
): void => {
  expect(misc.datasource.adapter).toBe(publicAdapter);
  expect(misc.scroller.datasource.adapter).toBe(publicAdapter);
  expect(misc.adapter).toBe(publicAdapter);
};

const adapters = (misc: Misc) => [
  misc.adapter,
  misc.scroller.datasource.adapter,
  misc.scroller.adapter
];

const registerPermanentProp = (
  token: PermanentProp,
  variant: ResetVariant
): void =>
  makeTest({
    config: mainConfig,
    title: `should persist ${token}`,
    meta: variant.isNew ? 'new datasource' : 'partial datasource',
    it: misc => async () => {
      const publicAdapter = misc.adapter;
      const value = misc.scroller.adapter[token];
      const definition = adapterProps.find(prop => prop.name === token);

      expect(value).toBeTruthy();
      expect(definition?.permanent).toBe(true);
      expect(definition?.value).toBeFalsy();
      expectAdaptersLinked(misc, publicAdapter);

      await misc.relaxNext();
      expect(misc.scroller.adapter[token]).toBe(value);
      await reset(misc, variant);

      expectAdaptersLinked(misc, publicAdapter);
      expect(misc.scroller.adapter[token]).toBe(value);
    }
  });

const registerItemsCount = (variant: ResetVariant): void =>
  makeTest({
    config: mainConfig,
    title: 'should keep itemsCount connected to the active buffer',
    meta: variant.isNew ? 'new datasource' : 'partial datasource',
    it: misc => async () => {
      const publicAdapter = misc.adapter;
      const definition = adapterProps.find(
        prop => prop.name === Adapter.itemsCount
      );

      expect(publicAdapter.itemsCount).toBe(definition?.value);
      await misc.relaxNext();
      expect(publicAdapter.itemsCount).toBe(
        misc.scroller.buffer.getVisibleItemsCount()
      );

      await reset(misc, variant);

      expectAdaptersLinked(misc, publicAdapter);
      expect(publicAdapter.itemsCount).toBe(
        misc.scroller.buffer.getVisibleItemsCount()
      );
    }
  });

const registerIsLoading = (variant: ResetVariant): void =>
  makeTest({
    config: mainConfig,
    title: 'should preserve isLoading$ subscriptions',
    meta: variant.isNew ? 'new datasource' : 'partial datasource',
    it: misc => async () => {
      const targets = adapters(misc);
      const emissions = targets.map<boolean[]>(() => []);
      const offs = targets.map((adapter, index) =>
        adapter.isLoading$.on(value => {
          emissions[index].push(value);
          expect(value).toBe(adapter.isLoading);
        })
      );

      await misc.relaxNext();
      await reset(misc, variant);
      offs.forEach(off => off());

      // isLoading toggles once for the initial load and once for the reset load
      emissions.forEach(values =>
        expect(values).toEqual([true, false, true, false])
      );
    }
  });

const registerFirstVisible = (variant: ResetVariant): void =>
  makeTest({
    config: mainConfig,
    title: 'should preserve firstVisible$ subscriptions',
    meta: variant.isNew ? 'new datasource' : 'partial datasource',
    it: misc => async () => {
      const targets = adapters(misc);
      const emissions = targets.map<Array<number | undefined>>(() => []);
      const offs = targets.map((adapter, index) =>
        adapter.firstVisible$.on(value => {
          emissions[index].push(value.$index);
          expect(value.$index).toBe(adapter.firstVisible.$index);
        })
      );

      await misc.relaxNext();
      await reset(misc, variant);
      offs.forEach(off => off());

      // undefined before init, 1 after init (startIndex 1), 100 after reset
      emissions.forEach(values => expect(values).toEqual([undefined, 1, 100]));
    }
  });

const registerBof = (variant: ResetVariant): void =>
  makeTest({
    config: bofConfig,
    title: 'should preserve bof$ subscriptions',
    meta: variant.isNew ? 'new datasource' : 'partial datasource',
    it: misc => async () => {
      const targets = adapters(misc);
      const emissions = targets.map<boolean[]>(() => []);
      const offs = targets.map((adapter, index) =>
        adapter.bof$.on(value => {
          emissions[index].push(value);
          expect(value).toBe(adapter.bof);
        })
      );

      await misc.relaxNext();
      await misc.scrollMaxRelax();
      await reset(misc, variant);
      offs.forEach(off => off());

      // bof at start, false after scrollMax, true again after reset to startIndex 1
      emissions.forEach(values => expect(values).toEqual([true, false, true]));
    }
  });

describe('Adapter Reset Persistence Spec', () => {
  variants.forEach(variant => {
    registerPermanentProp(Adapter.id, variant);
    registerPermanentProp(Adapter.version, variant);
    registerItemsCount(variant);
    registerIsLoading(variant);
    registerFirstVisible(variant);
  });

  bofVariants.forEach(registerBof);

  makeTest({
    config: workflowConfig,
    title: 'should keep workflow calls working after reset',
    it: misc => async () => {
      await misc.relaxNext();
      expect(misc.workflow.cyclesDone).toBe(1);

      const thirdCycle = misc.waitForCycles(3);
      const resetResult = misc.adapter.reset();
      const reloadResult = misc.adapter.reload();
      await thirdCycle;
      await Promise.all([resetResult, reloadResult]);
      expect(misc.workflow.cyclesDone).toBe(3);

      await misc.adapter.reload();
      expect(misc.workflow.cyclesDone).toBe(4);
    }
  });
});
