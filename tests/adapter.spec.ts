import { Datasource } from '../src/classes/datasource';
import { Scroller } from '../src/scroller';
import version from '../src/version';

const MOCK = {
  datasource: {
    get: (a, b) => null
  },
  element: {
    parentElement: { style: {} },
    querySelector: () => ({})
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

  it('wanted-firstVisible should be false after init when the Datasource is a literal object', () => {
    const scroller = new Scroller({
      datasource: MOCK.datasource,
      element: MOCK.element,
      workflow: MOCK.workflow
    });
    expect(scroller.adapter.wanted.firstVisible).toBe(false);
  });

  it('wanted-firstVisible should be false after init when the Datasource is an instance', () => {
    const scroller = new Scroller({
      datasource: new Datasource(MOCK.datasource),
      element: MOCK.element,
      workflow: MOCK.workflow
    });
    expect(scroller.adapter.wanted.firstVisible).toBe(false);
  });

  it('wanted-firstVisible should become true after explicit access', () => {
    const datasource = new Datasource(MOCK.datasource);
    const scroller = new Scroller({
      datasource,
      element: MOCK.element,
      workflow: MOCK.workflow
    });
    expect(scroller.adapter.wanted.firstVisible).toBe(false);
    expect(datasource.adapter.firstVisible).toBeTruthy();
    expect(scroller.adapter.wanted.firstVisible).toBe(true);
  });
});

