import { Routines } from '../src/classes/domRoutines';
import { Settings } from '../src/classes/settings';

const settings = new Settings(void 0, void 0, 0);
const element = { parentElement: { style: {} } } as unknown as HTMLElement;
const elementBad = { parentElement: null } as unknown as HTMLElement;

describe('Routines', () => {

  describe('Standard instantiation', () => {
    it('should instantiate if element & settings are correct', () => {
      const routines = new Routines(element, settings);
      expect(routines instanceof Routines).toBe(true);
      expect(typeof routines.checkElement).toBe('function');
    });

    it('should not instantiate if element is not correct', () => {
      let routines;
      try {
        routines = new Routines(elementBad, settings);
      } catch (e) {
        expect(e.message).toBe('HTML element is not defined');
      }
      expect(typeof routines).toBe('undefined');
    });

    it('should not instantiate if settings is not correct', () => {
      let routines;
      try {
        routines = new Routines(element, null as unknown as Settings);
      } catch (e) {
        // "Cannot read property 'viewport' of null"
        expect(e instanceof TypeError).toBe(true);
      }
      expect(typeof routines).toBe('undefined');
    });
  });

  describe('Override', () => {
    class CustomRoutines {
      checkElement(element: HTMLElement) {
        if (!element) {
          throw new Error('HTML element is not defined (custom)');
        }
      }
    }

    it('should override "checkElement" method and work as before', () => {
      const routines = new Routines(element, settings, CustomRoutines);
      expect(routines instanceof Routines).toBe(true);
      expect(typeof routines.checkElement).toBe('function');
      expect(typeof routines.getSize).toBe('function');
    });

    it('should override "checkElement" method and throw an error if element is incorrect', () => {
      let routines;
      try {
        routines = new Routines(elementBad, settings, CustomRoutines);
      } catch (e) {
        expect(e.message).toBe('HTML element is not defined (custom)');
      }
      expect(typeof routines).toBe('undefined');
    });

    it('should override "checkElement" method and throw an error anyway', () => {
      class CustomRoutines {
        checkElement() {
          throw new Error('Throw anyway');
        }
      }
      [elementBad, element].forEach(elt => {
        let routines;
        try {
          routines = new Routines(elt, settings, CustomRoutines);
        } catch (e) {
          expect(e.message).toBe('Throw anyway');
        }
        expect(typeof routines).toBe('undefined');
      });
    });

    it('should not pass extra method', () => {
      type Extra = { extra: () => unknown };
      class CustomRoutines {
        checkElement(): void {
        }
        extra() {
          return true;
        }
      }
      const routines = new Routines(element, settings, CustomRoutines);
      try {
        routines.checkElement(element);
        (routines as unknown as Extra).extra();
      } catch (e) {
        // "routines.extra is not a function"
        expect(e instanceof TypeError).toBe(true);
      }
      expect(typeof (routines as unknown as Extra).extra).toBe('undefined');
    });
  });

});
