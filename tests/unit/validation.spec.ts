import {
  ValidatorType,
  VALIDATORS,
  validateOne,
  validate
} from '../../src/inputs';
import { IValidator } from '../../src/interfaces';

const {
  INTEGER,
  INTEGER_UNLIMITED,
  BOOLEAN,
  OBJECT,
  ITEM_LIST,
  FUNC,
  FUNC_WITH_X_ARGUMENTS,
  FUNC_WITH_X_AND_MORE_ARGUMENTS,
  FUNC_WITH_X_TO_Y_ARGUMENTS,
  ONE_OF_CAN,
  ONE_OF_MUST,
  OR,
  ENUM
} = VALIDATORS;

describe('Input Params Validation', () => {
  describe('[Integer]', () => {
    const integerPassInputs = [
      { value: 23, parsed: 23 },
      { value: '23', parsed: 23 },
      { value: 0, parsed: 0 },
      { value: '0', parsed: 0 },
      { value: '-23', parsed: -23 },
      { value: -23, parsed: -23 },
      { value: '1e1', parsed: 10 },
      { value: 1e1, parsed: 10 },
      { value: 1.1e1, parsed: 11 }
    ];

    const integerBlockInputs = [
      { value: NaN, parsed: NaN },
      { value: '', parsed: NaN },
      { value: '-', parsed: NaN },
      { value: 'no', parsed: NaN },
      { value: '23no', parsed: NaN },
      { value: 23.78, parsed: 23 },
      { value: '23.78', parsed: 23 },
      { value: 1.11e1, parsed: 11 },
      { value: () => null, parsed: NaN },
      { value: {}, parsed: NaN },
      // { value: void 0, parsed: NaN },
      { value: null, parsed: NaN }
    ];

    const intProp = { validators: [INTEGER] };
    const intUnlimitedProp = { validators: [INTEGER_UNLIMITED] };

    it('should pass limited integer', done => {
      integerPassInputs.forEach(input => {
        const parsed = validateOne(input, 'value', intProp);
        expect(parsed.value).toEqual(input.parsed);
        expect(parsed.isValid).toEqual(true);
      });
      done();
    });

    it('should block non limited integer', done => {
      const inputs = [
        ...integerBlockInputs,
        { value: Infinity, parsed: NaN },
        { value: -Infinity, parsed: NaN },
        { value: 'Infinity', parsed: NaN },
        { value: '-Infinity', parsed: NaN }
      ];
      inputs.forEach(input => {
        const parsed = validateOne(input, 'value', intProp);
        expect(parsed).toEqual({
          value: input.parsed,
          isSet: true,
          isValid: false,
          errors: [ValidatorType.integer]
        });
      });
      done();
    });

    it('should pass unlimited integer', done => {
      const inputs = [
        ...integerPassInputs,
        { value: Infinity, parsed: Infinity },
        { value: -Infinity, parsed: -Infinity },
        { value: 'Infinity', parsed: Infinity },
        { value: '-Infinity', parsed: -Infinity }
      ];
      inputs.forEach(input => {
        const parsed = validateOne(input, 'value', intUnlimitedProp);
        expect(parsed.value).toEqual(input.parsed);
        expect(parsed.isValid).toEqual(true);
      });
      done();
    });

    it('should block non unlimited integer', done => {
      integerBlockInputs.forEach(input => {
        const parsed = validateOne(input, 'value', intUnlimitedProp);
        expect(parsed).toEqual({
          value: input.parsed,
          isSet: true,
          isValid: false,
          errors: [ValidatorType.integerUnlimited]
        });
      });
      done();
    });
  });

  describe('[Iterator callback]', () => {
    it('should pass only one-argument function', done => {
      const badInputs = [
        1,
        true,
        {},
        'test',
        () => null,
        (_a: never, _b: never) => null
      ];
      const funcProp = { validators: [FUNC_WITH_X_ARGUMENTS(1)] };
      badInputs.forEach(input =>
        expect(
          validateOne({ value: input }, 'value', funcProp).isValid
        ).toEqual(false)
      );
      expect(
        validateOne({ value: (_item: never) => null }, 'value', funcProp)
          .isValid
      ).toEqual(true);
      done();
    });
  });

  describe('[One of', () => {
    const value = 1;
    const test = 2;
    const add = 3;
    const getProp = (list: string[]) => ({ validators: [ONE_OF_CAN(list)] });

    it('should pass only one of twos', done => {
      [
        [{ value }, 'value', getProp(['value'])],
        [{ value, test }, 'value', getProp(['value'])],
        [{ value, test }, 'test', getProp(['value'])],
        [{ value, test }, 'value', getProp(['test'])],
        [{ value, test }, 'test', getProp(['test'])]
      ].forEach(args => expect(validateOne(...args).isValid).toEqual(false));
      [
        [{ value }, 'value', getProp(['test'])],
        [{ value }, 'test', getProp(['value'])],
        [{ value }, 'value', getProp(['test'])],
        [{ value }, 'test', getProp(['value'])]
      ].forEach(args => expect(validateOne(...args).isValid).toEqual(true));

      done();
    });

    it('should pass only one of mnever', done => {
      [
        [{ value, test, add }, 'value', getProp(['test', 'add'])],
        [{ value, test, add }, 'value', getProp(['value', 'add'])],
        [{ value, test, add }, 'value', getProp(['test', 'value'])],
        [{ value, test, add }, 'value', getProp(['test', 'valueX'])],
        [{ value, test }, 'value', getProp(['test', 'add'])]
      ].forEach(args => expect(validateOne(...args).isValid).toEqual(false));

      [
        [{ value, test }, 'value', getProp(['testX', 'addX'])],
        [{ value }, 'value', getProp(['test', 'add'])],
        [{ test }, 'value', getProp(['test', 'add'])],
        [{ test, add }, 'value', getProp(['test', 'add'])]
      ].forEach(args => expect(validateOne(...args).isValid).toEqual(true));
      done();
    });
  });
});

describe('Validation', () => {
  const token = 'test';
  const run = (context: unknown, validators: IValidator[], mandatory = false) =>
    validate(context, {
      [token]: { validators, mandatory }
    }).isValid;

  describe('Context', () => {
    it('should not pass bad context', () => {
      expect(validate(null, {}).isValid).toBe(false);
      expect(validate(false, {}).isValid).toBe(false);
      expect(validate(12, {}).isValid).toBe(false);
      expect(validate('bad', {}).isValid).toBe(false);
      expect(validate(() => null, {}).isValid).toBe(false);
      expect(validate({}, {}).isValid).toBe(true);
    });
  });

  describe('Mandatory', () => {
    it('should not pass missed mandatory fields', () => {
      expect(run({}, [])).toBe(true);
      expect(run({}, [], true)).toBe(false);
      expect(run({ [token]: 1 }, [], true)).toBe(true);
    });

    it('should deal with mandatory and some other validation', () => {
      expect(run({}, [INTEGER], true)).toBe(false);
      expect(run({ [token]: 'x' }, [INTEGER], true)).toBe(false);
      expect(run({ [token]: 1 }, [INTEGER], true)).toBe(true);
    });
  });

  describe('[One of must]', () => {
    const opt1 = 'opt1';
    const opt2 = 'opt2';

    it('should not pass empty context or empty params', () => {
      expect(
        validate(
          {},
          {
            [opt1]: { validators: [ONE_OF_MUST([opt2])] },
            [opt2]: { validators: [ONE_OF_MUST([opt1])] }
          }
        ).isValid
      ).toBe(false);

      expect(
        validate(
          {},
          {
            [opt1]: { validators: [ONE_OF_MUST([])] },
            [opt2]: { validators: [ONE_OF_MUST([])] }
          }
        ).isValid
      ).toBe(false);
    });

    it('should not pass if more than 1 param is present', () => {
      expect(
        validate(
          { [opt1]: 1, [opt2]: 2 },
          {
            [opt1]: { validators: [ONE_OF_MUST([opt2])] },
            [opt2]: { validators: [ONE_OF_MUST([opt1])] }
          }
        ).isValid
      ).toBe(false);

      const result = validate(
        { [opt1]: 1, [opt2]: 2 },
        {
          [opt1]: { validators: [ONE_OF_MUST([opt2, 'opt3'])] },
          [opt2]: { validators: [ONE_OF_MUST(['opt3'])] }
        }
      );
      expect(result.isValid).toBe(false);
      expect(result.params[opt1].isValid).toBe(false);
      expect(result.params[opt2].isValid).toBe(true);
    });

    it('should pass if only 1 param is present', () => {
      const result = validate(
        { [opt1]: 1 },
        {
          [opt1]: { validators: [ONE_OF_MUST([opt2])] },
          [opt2]: { validators: [ONE_OF_MUST([opt1])] }
        }
      );
      expect(result.isValid).toBe(true);
      expect(result.params[opt1].isSet).toBe(true);
      expect(result.params[opt2].isSet).toBe(false);
    });
  });

  describe('[Item List]', () => {
    it('should not pass non-array', () => {
      [null, true, 'test', 123, { test: true }].forEach(value =>
        expect(run({ [token]: value }, [ITEM_LIST])).toBe(false)
      );
    });

    it('should not pass empty array', () => {
      expect(
        validate({ [token]: [] }, { [token]: { validators: [ITEM_LIST] } })
          .isValid
      ).toBe(false);
    });

    it('should not pass array with items of different types', () => {
      [
        [1, 2, true],
        ['1', '2', 3],
        [{ a: 1 }, { b: 2 }, 3]
      ].forEach(value =>
        expect(
          validate({ [token]: value }, { [token]: { validators: [ITEM_LIST] } })
            .isValid
        ).toBe(false)
      );
    });

    it('should pass array with items of the same types', () => {
      [
        ['just one item'],
        [1, 2, 3],
        ['1', '2', '3'],
        [{ a: 1 }, { b: 2 }, { a: true }]
      ].forEach(value =>
        expect(
          validate({ [token]: value }, { [token]: { validators: [ITEM_LIST] } })
            .isValid
        ).toBe(true)
      );
    });
  });

  describe('[Function with arguments]', () => {
    type N = never;

    const checkNoFunction = validators => {
      expect(run({}, validators)).toBe(true);
      expect(run({}, validators, true)).toBe(false);
      expect(run({ [token]: 1 }, validators)).toBe(false);
      expect(run({ [token]: {} }, validators)).toBe(false);
    };

    const passTwoArgumentsFunction = validators => {
      checkNoFunction(validators);
      expect(run({ [token]: () => null }, validators)).toBe(false);
      expect(run({ [token]: (_x: N) => null }, validators)).toBe(false);
      expect(run({ [token]: (_x: N, _y: N) => null }, validators)).toBe(true);
    };

    it('should pass function', () => {
      const validators = [FUNC];
      checkNoFunction(validators);
      expect(run({ [token]: () => null }, validators)).toBe(true);
      expect(run({ [token]: (_x: N) => null }, validators)).toBe(true);
    });

    it('should pass function with 2 arguments', () => {
      const validators = [FUNC_WITH_X_ARGUMENTS(2)];
      passTwoArgumentsFunction(validators);
      expect(run({ [token]: (_x: N, _y: N, _z: N) => null }, validators)).toBe(
        false
      );
    });

    it('should pass function with 2 or more arguments', () => {
      const validators = [FUNC_WITH_X_AND_MORE_ARGUMENTS(2)];
      passTwoArgumentsFunction(validators);
      expect(run({ [token]: (_x: N, _y: N, _z: N) => null }, validators)).toBe(
        true
      );
    });

    it('should pass function 2 to 4 arguments', () => {
      const validators = [FUNC_WITH_X_TO_Y_ARGUMENTS(2, 4)];
      passTwoArgumentsFunction(validators);
      expect(run({ [token]: (_x: N, _y: N, _z: N) => null }, validators)).toBe(
        true
      );
      expect(
        run({ [token]: (_x: N, _y: N, _z: N, _a: N) => null }, validators)
      ).toBe(true);
      expect(
        run(
          { [token]: (_x: N, _y: N, _z: N, _a: N, _b: N) => null },
          validators
        )
      ).toBe(false);
    });
  });

  describe('[Object]', () => {
    it('should pass object', () => {
      expect(run({}, [OBJECT])).toBe(true);
      expect(run({}, [OBJECT], true)).toBe(false);
      [
        1,
        true,
        '',
        () => null,
        function () {},
        [],
        null,
        class {},
        new Map(),
        new Set(),
        Symbol(),
        new Date(),
        new RegExp('')
      ].forEach(input => expect(run({ [token]: input }, [OBJECT])).toBe(false));
      expect(run({ [token]: {} }, [OBJECT])).toBe(true);
      expect(run({ [token]: { x: 0 } }, [OBJECT])).toBe(true);
    });
  });

  describe('[Or]', () => {
    it('should pass at least 1 of "or" rules', () => {
      const boolOrObj = [OR([BOOLEAN, OBJECT])];
      expect(run({}, boolOrObj)).toBe(true);
      expect(run({}, boolOrObj, true)).toBe(false);
      [1, null, () => null, 'test'].forEach(input =>
        expect(run({ [token]: input }, boolOrObj)).toBe(false)
      );
      expect(run({ [token]: {} }, boolOrObj)).toBe(true);
      expect(run({ [token]: true }, boolOrObj)).toBe(true);
    });
  });

  describe('[Enum]', () => {
    it('should pass an enumerated value', () => {
      enum myEnum {
        a = 'a',
        b = 'b',
        c = 33,
        d
      }
      const enumValidators = [ENUM(myEnum)];
      expect(run({}, enumValidators)).toBe(true);
      expect(run({}, enumValidators, true)).toBe(false);
      [0, 1, '33', '34', 35].forEach(input =>
        expect(run({ [token]: input }, enumValidators)).toBe(false)
      );
      [myEnum.a, myEnum.b, myEnum.c, myEnum.d, 'a', 'b', 33, 34].forEach(
        input => expect(run({ [token]: input }, enumValidators)).toBe(true)
      );
    });
  });
});
