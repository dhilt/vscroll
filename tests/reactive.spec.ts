import { Reactive } from '../src/classes/reactive';

describe('Reactive', () => {

  const VALUE = 'test';
  const VALUES = ['test1', 'test2', 'test3', 'test4', 'test5'];

  describe('Initialization', () => {
    it('should initialize without params', () => {
      const $ = new Reactive();
      expect($ instanceof Reactive).toBe(true);
      expect($.get()).toBe(void 0);
    });

    it('should initialize with initial value', () => {
      const $ = new Reactive(VALUE);
      expect($.get()).toBe(VALUE);
    });
  });

  describe('On', () => {
    it('should subscribe and emit', () => {
      let call = 0;
      const $ = new Reactive();
      $.on((v) => {
        call++;
        expect(v).toEqual(VALUE);
        expect($.get()).toEqual(VALUE);
      });
      $.set(VALUE);
      expect(call).toEqual(1);
    });

    it('should emit multiple', () => {
      let call = 0;
      const $ = new Reactive();
      $.on((v) => expect(v).toEqual(VALUES[call++]));
      VALUES.forEach(V => $.set(V));
      expect(call).toEqual(VALUES.length);
      expect($.get()).toEqual(VALUES[call - 1]);
    });
  });

  describe('Once', () => {
    it('should subscribe and emit', () => {
      let call = 0;
      const $ = new Reactive();
      $.once((v) => {
        call++;
        expect(v).toEqual(VALUE);
        expect($.get()).toEqual(VALUE);
      });
      $.set(VALUE);
      expect(call).toEqual(1);
    });

    it('should emit once, but set', () => {
      let call = 0;
      const $ = new Reactive();
      $.once((v) => {
        call++;
        expect(v).toEqual(VALUES[0]);
      });
      VALUES.forEach(V => $.set(V));
      expect($.get()).toEqual(VALUES[VALUES.length - 1]);
      expect(call).toEqual(1);
    });
  });

  describe('emitOnSubscribe', () => {
    it('should emit on subscribe', () => {
      let call = 0;
      const $ = new Reactive(VALUE, { emitOnSubscribe: true });
      $.on((v) => {
        call++;
        expect(v).toEqual(VALUE);
        expect($.get()).toEqual(VALUE);
      });
      expect(call).toEqual(1);
    });

    it('should not emit on subscribe if not set', () => {
      let call = 0;
      const $ = new Reactive(VALUE, { emitOnSubscribe: false });
      $.on(() => call++);
      expect(call).toEqual(0);
    });

    it('should continue emit', () => {
      let call = 0;
      const $ = new Reactive(VALUES[0], { emitOnSubscribe: true });
      $.on((v) => expect(v).toEqual(VALUES[call++]));
      VALUES.forEach((V, i) => i > 0 && $.set(V));
      expect(call).toEqual(VALUES.length);
      expect($.get()).toEqual(VALUES[call - 1]);
    });
  });

  describe('emitEqual', () => {
    it('should emit the same value', () => {
      let call = 0;
      const $ = new Reactive(VALUE, { emitEqual: true });
      $.on((v) => {
        call++;
        expect(v).toEqual(VALUE);
      });
      $.set(VALUE);
      expect(call).toEqual(1);
    });

    it('should not emit the same value if not set', () => {
      let call = 0;
      const $ = new Reactive(VALUE, { emitEqual: false });
      $.on(() => call++);
      $.set(VALUE);
      expect(call).toEqual(0);
    });
  });

  describe('Cancellation', () => {
    it('should stop emitting if the value becomes obsolete', () => {
      let call1 = 0, call2 = 0, call3 = 0, value;
      const NEW_VALUE = VALUE + '*';
      const $ = new Reactive('');

      $.on((v) => { // subscription 1
        call1++;
        expect(v).toEqual(value);
      });

      $.on((v) => { // subscription 2
        call2++;
        expect(v).toEqual(value);
        if (call2 === 1) {
          value = NEW_VALUE;
          $.set(value);
        }
      });

      $.on((v) => { // subscription 3
        call3++;
        expect(v).toEqual(value);
      });

      value = VALUE;
      $.set(value);

      expect(call1).toEqual(2);
      expect(call2).toEqual(2);
      expect(call3).toEqual(1);
    });
  });

});
