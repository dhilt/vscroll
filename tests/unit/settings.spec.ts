/**
 * @jest-environment jsdom
 */
import { Scroller } from '../../src/scroller';
import { Datasource } from '../../src/classes/datasource';
import { SETTINGS } from '../../src/inputs';
import { MIN } from '../../src/inputs/settings';

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

const getScroller = (settings, instance = false) => new Scroller({
  element: MOCK.element,
  workflow: MOCK.workflow,
  datasource: instance ? new Datasource({
    ...MOCK.datasource,
    settings
  }) : {
    ...MOCK.datasource,
    settings
  }
});


[false, true].forEach(instance => {

  describe('Settings Spec' + (instance ? ' (Datasource is instantiated)' : ''), () => {

    it('should set defaults', () => {
      [
        void 0,
        10,
        false,
        'text',
        () => null,
        { test: true },
      ].forEach(badSettings => {
        const scroller = getScroller(badSettings, instance);
        Object.keys(SETTINGS).forEach(key =>
          expect(scroller.settings[key]).toEqual(SETTINGS[key].defaultValue)
        );
      });
    });

    it('should fallback to defaults', () => {
      [
        { bufferSize: { weird: true } },
        { bufferSize: () => 'weird' },
        { bufferSize: 3.14 },
        { bufferSize: 'weird' },
      ].forEach(badSettings => {
        const scroller = getScroller(badSettings, instance);
        Object.keys(SETTINGS).forEach(key =>
          expect(scroller.settings[key]).toEqual(SETTINGS[key].defaultValue)
        );
      });
    });

    it('should fallback to minimum', () => {
      [
        { itemSize: 0 },
        { itemSize: -10 },
        { bufferSize: 0 },
        { bufferSize: -10 },
        { padding: 0 },
        { padding: -1 },
        { padding: 0.000000001 },
      ].forEach(settings => {
        const scroller = getScroller(settings, instance);
        Object.keys(SETTINGS).forEach(key => {
          // eslint-disable-next-line no-prototype-builtins
          const value = settings.hasOwnProperty(key)
            ? MIN[key]
            : SETTINGS[key].defaultValue;
          expect(scroller.settings[key]).toEqual(value);
        });
      });
    });

    it('should merge', () => {
      [
        { startIndex: 99 },
        { bufferSize: 15 },
        { infinite: true },
        { startIndex: 99, bufferSize: 11, infinite: true }
      ].forEach(settings => {
        const scroller = getScroller(settings, instance);
        Object.keys(SETTINGS).forEach(key => {
          // eslint-disable-next-line no-prototype-builtins
          const value = settings.hasOwnProperty(key)
            ? settings[key]
            : SETTINGS[key].defaultValue;
          expect(scroller.settings[key]).toEqual(value);
        });
      });
    });

  });

});



