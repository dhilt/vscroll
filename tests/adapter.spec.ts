import { Scroller } from '../src/scroller';
import { AdapterPropName } from '../src/classes/adapter/props';
import { Datasource } from '../src/classes/datasource';
import { wantedUtils } from '../src/classes/adapter/wanted';
import version from '../src/version';

const MOCK = {
  datasource: {
    get: (a, b) => null
  },
  element: {
    parentElement: { style: {}, getBoundingClientRect: () => ({}) },
    querySelector: () => ({}),
    style: {}
  } as unknown as HTMLElement,
  workflow: {
    onDataChanged: () => null,
    call: () => null
  }
};

describe('Adapter Init Spec', () => {

  const ds = new Datasource(MOCK.datasource);

  it('adapter should be available after Datasource instantiation ', () => {
    expect(typeof ds).toBe('object');
    expect(typeof ds.get).toBe('function');
    expect(typeof ds.adapter).toBe('object');
  });

  it('version should match', () => {
    expect(ds.adapter.version).toBe(version.version);
  });

});

describe('Adapter Wanted Spec', () => {
  let scroller;

  const getWanted = ({ scr }: { scr?: Scroller } = {}) => {
    const wantedBox = wantedUtils.getBox((scr || scroller).adapter.id);
    return wantedBox?.[AdapterPropName.firstVisible];
  };

  describe('Datasource is a literal object', () => {
    beforeEach(() => {
      scroller = new Scroller({
        datasource: MOCK.datasource,
        element: MOCK.element,
        workflow: MOCK.workflow
      });
    });

    it('"wanted" should be false before the Adapter is initialized', () => {
      expect(getWanted()).toBeFalsy();
    });

    it('"wanted" should be false after the Adapter is initialized', () => {
      scroller.viewport.reset = () => null;
      scroller.init();
      expect(getWanted()).toBeFalsy();
    });

    it('"wanted" should remain falsy after trying to access prop (before init)', () => {
      scroller.datasource.adapter.firstVisible;
      expect(getWanted()).toBeFalsy();
    });

    it('"wanted" should remain falsy after trying to access prop (after init)', () => {
      scroller.datasource.adapter.firstVisible;
      scroller.viewport.reset = () => null;
      scroller.init();
      scroller.datasource.adapter.firstVisible;
      expect(getWanted()).toBeFalsy();
    });
  });

  describe('Datasource is an instance', () => {
    let datasource;

    beforeEach(() => {
      datasource = new Datasource(MOCK.datasource);
      scroller = new Scroller({
        datasource,
        element: MOCK.element,
        workflow: MOCK.workflow
      });
    });

    it('"wanted" should be false before the Adapter is initialized', () => {
      expect(getWanted()).toBeFalsy();
    });

    it('"wanted" should be false after the Adapter is initialized', () => {
      scroller.viewport.reset = () => null;
      scroller.init();
      expect(getWanted()).toBeFalsy();
    });

    it('"wanted" should remain false after Scroller reset without re-initialization', () => {
      scroller = new Scroller({ datasource, scroller });
      expect(getWanted()).toBeFalsy();
    });

    it('"wanted" should remain false across Scroller reset with re-initialization', () => {
      scroller = new Scroller({ datasource, scroller });
      scroller.viewport.reset = () => null;
      scroller.init();
      expect(getWanted()).toBeFalsy();
    });

    [AdapterPropName.firstVisible, AdapterPropName.firstVisible$].forEach((token) =>
      describe('Explicit access to ' + token, () => {
        it('"wanted" should become true when accessing before the Adapter is instantiated', () => {
          const ds = new Datasource(MOCK.datasource);
          ds.adapter[token];
          const scr = new Scroller({
            datasource: ds,
            element: MOCK.element,
            workflow: MOCK.workflow
          });
          expect(getWanted({ scr })).toBeTruthy();
        });

        it('"wanted" should become true when accessing before init', () => {
          datasource.adapter[token];
          expect(getWanted()).toBeTruthy();
        });

        it('"wanted" should become true when accessing prop after init', () => {
          scroller.viewport.reset = () => null;
          scroller.init();
          datasource.adapter[token];
          expect(getWanted()).toBeTruthy();
        });

        it('"wanted" should remain true after the Scroller reset without 1st and 2nd init', () => {
          datasource.adapter[token];
          scroller = new Scroller({ datasource, scroller });
          expect(getWanted()).toBeTruthy();
        });

        it('"wanted" should remain true after the Scroller reset with only 1st init', () => {
          datasource.adapter[token];
          scroller.viewport.reset = () => null;
          scroller.init();
          scroller = new Scroller({ datasource, scroller });
          expect(getWanted()).toBeTruthy();
        });

        it('"wanted" should remain true after the Scroller reset with only 2nd init', () => {
          datasource.adapter[token];
          scroller = new Scroller({ datasource, scroller });
          scroller.viewport.reset = () => null;
          scroller.init();
          expect(getWanted()).toBeTruthy();
        });

        it('"wanted" should remain true after the Scroller reset with both 1st and 2nd init', () => {
          datasource.adapter[token];
          scroller.viewport.reset = () => null;
          scroller.init();
          scroller = new Scroller({ datasource, scroller });
          scroller.viewport.reset = () => null;
          scroller.init();
          expect(getWanted()).toBeTruthy();
        });
      })
    );

  });
});

