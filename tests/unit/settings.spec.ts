import { Settings } from '../../src/classes/settings';
import { Routines } from '../../src/classes/domRoutines';
import {
  Settings as ISettings,
  DevSettings
} from '../../src/interfaces/settings';

// Settings validation needs DOM constructors, but no DOM is used in these tests.
Object.assign(globalThis, { Element: class {}, Document: class {} });

const parseSettings = (
  settings?: unknown,
  devSettings?: unknown,
  instanceIndex = 0
): Settings =>
  new Settings(
    settings as ISettings | undefined,
    devSettings as DevSettings | undefined,
    instanceIndex
  );

const delayScenarios: [
  title: string,
  windowViewport: boolean,
  scrollRestoration: boolean,
  initDelay: number | undefined,
  initWindowDelay: number | undefined,
  expected: number
][] = [
  ['default delay', false, false, undefined, undefined, 1],
  ['element viewport', false, false, 10, 100, 10],
  ['browser scroll restoration', true, true, 10, 100, 10],
  ['longer window delay', true, false, 10, 100, 100],
  ['longer general delay', true, false, 100, 10, 100],
  ['delays disabled', true, false, 0, 0, 0]
];

const alignmentScenarios: [string, ISettings | undefined, boolean][] = [
  ['default', undefined, false],
  ['new name enabled', { alignShortContentToEnd: true }, true],
  ['new name disabled', { alignShortContentToEnd: false }, false],
  ['legacy name enabled', { inverse: true }, true],
  ['legacy name disabled', { inverse: false }, false],
  [
    'new true overrides legacy false',
    { alignShortContentToEnd: true, inverse: false },
    true
  ],
  [
    'new false overrides legacy true',
    { alignShortContentToEnd: false, inverse: true },
    false
  ],
  [
    'undefined new name falls back',
    { alignShortContentToEnd: undefined, inverse: true },
    true
  ]
];

describe('Settings', () => {
  describe('Input', () => {
    it('uses defaults for missing or malformed input', () => {
      [undefined, null, 'invalid', 42].forEach(input =>
        expect(parseSettings(input, input)).toMatchObject({
          startIndex: 1,
          bufferSize: 5,
          padding: 0.5,
          itemSize: NaN,
          infinite: false,
          horizontal: false,
          debug: false,
          initDelay: 1,
          throttle: 40
        })
      );
    });

    it('applies settings and devSettings without changing the input', () => {
      const input = Object.freeze({
        startIndex: 99,
        bufferSize: 11,
        infinite: true
      });
      const devInput = Object.freeze({
        debug: true,
        initDelay: 0,
        throttle: 10
      });
      expect(parseSettings(input, devInput, 7)).toMatchObject({
        startIndex: 99,
        bufferSize: 11,
        padding: 0.5,
        itemSize: NaN,
        infinite: true,
        horizontal: false,
        debug: true,
        initDelay: 0,
        throttle: 10,
        instanceIndex: 7
      });
    });

    it('normalizes invalid and below-limit values', () => {
      const cases: [keyof ISettings, unknown, unknown][] = [
        ['startIndex', false, 1],
        ['bufferSize', { invalid: true }, 5],
        ['bufferSize', 5.5, 5],
        ['bufferSize', -1, 1],
        ['padding', 'invalid', 0.5],
        ['padding', -0.1, 0.01],
        ['itemSize', -5, 1],
        ['itemSize', 1.5, NaN],
        ['infinite', 'invalid', false],
        ['horizontal', null, false]
      ];
      cases.forEach(([key, input, expected]) =>
        expect({ key, value: parseSettings({ [key]: input })[key] }).toEqual({
          key,
          value: expected
        })
      );
      expect(
        parseSettings(undefined, {
          debug: 'invalid',
          throttle: -1,
          initDelay: -1
        })
      ).toMatchObject({
        debug: false,
        throttle: 0,
        initDelay: 0
      });
    });

    it('accepts only fields belonging to each settings group', () => {
      const settings = parseSettings(
        { debug: true, extra: true },
        { startIndex: 99, extra: true, instanceIndex: 99 },
        7
      );
      expect(settings).toMatchObject({
        startIndex: 1,
        debug: false,
        instanceIndex: 7
      });
      expect(settings).not.toHaveProperty('extra');
    });

    it('should preserve prototype getters with the legacy name', () => {
      const input = new (class {
        inverse = true;
        get startIndex(): number {
          return 50;
        }
      })();
      const settings = parseSettings(Object.freeze(input));
      expect(settings.startIndex).toBe(50);
      expect(settings.alignShortContentToEnd).toBe(true);
    });
  });

  describe('Initialization delay', () => {
    delayScenarios.forEach(
      ([
        title,
        windowViewport,
        scrollRestoration,
        initDelay,
        initWindowDelay,
        expected
      ]) =>
        it(title, () => {
          Object.assign(globalThis, {
            history: scrollRestoration ? { scrollRestoration: 'auto' } : {}
          });
          expect(
            parseSettings({ windowViewport }, { initDelay, initWindowDelay })
              .initializeDelay
          ).toBe(expected);
        })
    );
  });

  describe('Viewport', () => {
    it('keeps the supplied viewport reference', () => {
      const element = new Element();
      const settings = parseSettings({ viewportElement: element });
      expect(settings.viewportElement).toBe(element);
      expect(settings.viewport).toBe(element);
    });

    it('rejects an element-like object', () => {
      const settings = parseSettings({ viewportElement: { nodeType: 1 } });

      expect(settings.viewportElement).toBeNull();
      expect(settings.viewport).toBeNull();
    });

    it('resolves the viewport factory once during construction', () => {
      const element = new Element();
      let calls = 0;
      const viewportElement = () => {
        calls++;
        return element;
      };
      const settings = parseSettings({ viewportElement });
      expect(settings.viewportElement).toBe(viewportElement);
      expect(settings.viewport).toBe(element);
      expect(calls).toBe(1);
    });

    it('falls back to null for invalid or asynchronous factory results', () => {
      [
        undefined,
        null,
        { nodeType: 1 },
        Promise.resolve(new Element())
      ].forEach(value => {
        const viewportElement = () => value;
        const settings = parseSettings({ viewportElement });
        expect(settings.viewportElement).toBe(viewportElement);
        expect(settings.viewport).toBeNull();
      });
    });
  });

  describe('Short content alignment', () => {
    alignmentScenarios.forEach(([title, input, expected]) =>
      it(title, () => {
        const settings = parseSettings(input && Object.freeze(input));
        expect(settings.alignShortContentToEnd).toBe(expected);
        expect(settings.inverse).toBe(expected);
      })
    );

    it('should preserve boolean parsing and fallback for both names', () => {
      ['alignShortContentToEnd', 'inverse'].forEach(name =>
        [
          ['true', true],
          ['false', false],
          [null, false],
          [1, false]
        ].forEach(([value, expected]) => {
          const settings = parseSettings({ [name]: value });
          expect(settings.alignShortContentToEnd).toBe(expected);
        })
      );
    });

    it('should not use the legacy value when the new value is invalid', () => {
      const settings = parseSettings({
        alignShortContentToEnd: null,
        inverse: true
      });
      expect(settings.alignShortContentToEnd).toBe(false);
    });

    it('should preserve the legacy settings alias in custom onInit', () => {
      const settings = parseSettings({ alignShortContentToEnd: true });
      const element = {
        parentElement: { style: {} }
      } as unknown as HTMLElement;
      new (class extends Routines {
        onInit(settings: Settings): void {
          expect(settings.inverse).toBe(true);
          settings.inverse = false;
          expect(settings.alignShortContentToEnd).toBe(false);
          settings.alignShortContentToEnd = true;
          expect(settings.inverse).toBe(true);
        }
      })(element, settings);
      expect(settings.alignShortContentToEnd).toBe(true);
    });
  });
});
