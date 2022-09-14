import { IValidationContext } from '../interfaces/validation';
import {
  IValidator,
  ValidatedValue,
  IValidatedData,
  IValidatedCommonProps,
  ICommonProps,
  ICommonProp,
} from '../interfaces/index';

export enum ValidatorType {
  number = 'must be a number',
  integer = 'must be an integer',
  integerUnlimited = 'must be an integer or infinity',
  moreOrEqual = 'must be a number greater than (or equal to) {arg1}',
  itemList = 'must be an array of items {arg1}',
  boolean = 'must be a boolean',
  object = 'must be an object',
  element = 'must be an html element',
  function = 'must be a function',
  funcOfxArguments = 'must have {arg1} argument(s)',
  funcOfxAndMoreArguments = 'must have at least {arg1} argument(s)',
  funcOfXToYArguments = 'must have {arg1} to {arg2} arguments',
  oneOfCan = 'can be present as only one item of {arg1} list',
  oneOfMust = 'must be present as only one item of {arg1} list',
  or = 'must satisfy at least 1 validator from {arg1} list',
  enum = 'must belong to {arg1} list',
}

const getError = (msg: ValidatorType, args?: string[]) =>
  (args || ['']).reduce((acc, arg, index) => acc.replace(`{arg${index + 1}}`, arg), msg);

const getNumber = (value: unknown): number =>
  typeof value === 'number' || (typeof value === 'string' && value !== '')
    ? Number(value)
    : NaN;

const onNumber = (value: unknown): ValidatedValue => {
  const parsedValue = getNumber(value);
  const errors = [];
  if (Number.isNaN(parsedValue)) {
    errors.push(ValidatorType.number);
  }
  return { value: parsedValue, isSet: true, isValid: !errors.length, errors };
};

const onInteger = (value: unknown): ValidatedValue => {
  const errors = [];
  value = getNumber(value);
  const parsedValue = parseInt(String(value), 10);
  if (value !== parsedValue) {
    errors.push(ValidatorType.integer);
  }
  return { value: parsedValue, isSet: true, isValid: !errors.length, errors };
};

const onIntegerUnlimited = (value: unknown): ValidatedValue => {
  let parsedValue = value;
  const errors = [];
  value = getNumber(value);
  if (!Number.isFinite(value)) {
    parsedValue = value;
  } else {
    parsedValue = parseInt(String(value), 10);
  }
  if (value !== parsedValue) {
    errors.push(ValidatorType.integerUnlimited);
  }
  return { value: parsedValue, isSet: true, isValid: !errors.length, errors };
};

const onMoreOrEqual = (limit: number, fallback?: boolean) => (value: unknown): ValidatedValue => {
  const result = onNumber(value);
  if (!result.isValid) {
    return result;
  }
  let parsedValue = result.value as number;
  const errors = [];
  if (parsedValue < limit) {
    if (!fallback) {
      errors.push(getError(ValidatorType.moreOrEqual, [String(limit)]));
    } else {
      parsedValue = limit;
    }
  }
  return { value: parsedValue, isSet: true, isValid: !errors.length, errors };
};

const onBoolean = (value: unknown): ValidatedValue => {
  const errors = [];
  let parsedValue = value;
  if (value === 'true') {
    parsedValue = true;
  } else if (value === 'false') {
    parsedValue = false;
  }
  if (typeof parsedValue !== 'boolean') {
    errors.push(ValidatorType.boolean);
  }
  return { value: parsedValue, isSet: true, isValid: !errors.length, errors };
};

const onObject = (value: unknown): ValidatedValue => {
  const errors = [];
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    errors.push(ValidatorType.object);
  }
  return { value, isSet: true, isValid: !errors.length, errors };
};

const onHtmlElement = (value: unknown): ValidatedValue => {
  const errors = [];
  if (!(value instanceof Element) && !(value instanceof HTMLDocument)) {
    errors.push(ValidatorType.element);
  }
  return { value, isSet: true, isValid: !errors.length, errors };
};

const onItemList = (value: unknown): ValidatedValue => {
  let parsedValue = value;
  const errors = [];
  if (!Array.isArray(value)) {
    errors.push(ValidatorType.itemList);
    parsedValue = [];
  } else if (!value.length) {
    errors.push(getError(ValidatorType.itemList, ['with at least 1 item']));
  } else if (value.length > 1) {
    const type = typeof value[0];
    for (let i = value.length - 1; i >= 0; i--) {
      if (typeof value[i] !== type) {
        errors.push(getError(ValidatorType.itemList, ['of items of the same type']));
        break;
      }
    }
  }
  return { value: parsedValue as unknown[], isSet: true, isValid: !errors.length, errors };
};

type Func = (...args: unknown[]) => void;

const onFunction = (value: unknown): ValidatedValue => {
  const errors = [];
  if (typeof value !== 'function') {
    errors.push(ValidatorType.function);
  }
  return { value: value as Func, isSet: true, isValid: !errors.length, errors };
};

const onFunctionWithXArguments = (argsCount: number) => (value: unknown) => {
  const result = onFunction(value);
  if (!result.isValid) {
    return result;
  }
  value = result.value;
  const errors = [];
  if ((value as Func).length !== argsCount) {
    errors.push(getError(ValidatorType.funcOfxArguments, [String(argsCount)]));
  }
  return { value: value as Func, isSet: true, isValid: !errors.length, errors };
};

const onFunctionWithXAndMoreArguments = (argsCount: number) => (value: unknown): ValidatedValue => {
  const result = onFunction(value);
  if (!result.isValid) {
    return result;
  }
  value = result.value;
  const errors = [];
  if ((value as Func).length < argsCount) {
    errors.push(getError(ValidatorType.funcOfxArguments, [String(argsCount)]));
  }
  return { value: value as Func, isSet: true, isValid: !errors.length, errors };
};

const onFunctionWithXToYArguments = (from: number, to: number) => (value: unknown): ValidatedValue => {
  const result = onFunction(value);
  if (!result.isValid) {
    return result;
  }
  value = result.value;
  const errors = [];
  if ((value as Func).length < from || (value as Func).length > to) {
    errors.push(getError(ValidatorType.funcOfXToYArguments, [String(from), String(to)]));
  }
  return { value: value as Func, isSet: true, isValid: !errors.length, errors };
};

const onOneOf = (tokens: string[], must: boolean) => (value: unknown, context?: IValidationContext): ValidatedValue => {
  const errors = [];
  const isSet = value !== void 0;
  let noOneIsPresent = !isSet;
  const err = must ? ValidatorType.oneOfMust : ValidatorType.oneOfCan;
  if (!Array.isArray(tokens) || !tokens.length) {
    errors.push(getError(err, ['undefined']));
  } else {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (typeof token !== 'string') {
        errors.push(getError(err, [tokens.join('", "')]) + ' (non-string token)');
        break;
      }
      const isAnotherPresent = context && Object.prototype.hasOwnProperty.call(context, token);
      if (isSet && isAnotherPresent) {
        errors.push(getError(err, [tokens.join('", "')]) + ` (${token} is present)`);
        break;
      }
      if (noOneIsPresent && isAnotherPresent) {
        noOneIsPresent = false;
      }
    }
    if (must && noOneIsPresent) {
      errors.push(getError(err, [tokens.join('", "')]));
    }
  }
  return { value, isSet, isValid: !errors.length, errors };
};

const onOr = (validators: IValidator[]) => (value: unknown): ValidatedValue => {
  const errors = [];
  if (validators.every(validator => !validator.method(value).isValid)) {
    errors.push(validators.map(v => v.type).join(' OR '));
  }
  return { value, isSet: true, isValid: !errors.length, errors };
};

enum AbstractEnum { }
type TEnum = typeof AbstractEnum;

const onEnum = (list: TEnum) => (value: unknown): ValidatedValue => {
  const errors = [];
  const values = Object.keys(list).filter(k => isNaN(Number(k))).map(k => list[k as unknown as number]);
  if (!values.some(item => item === value)) {
    errors.push(getError(ValidatorType.enum, ['[' + values.join(',') + ']']));
  }
  return { value, isSet: true, isValid: !errors.length, errors };
};

export const VALIDATORS = {
  NUMBER: {
    type: ValidatorType.number,
    method: onNumber
  },
  INTEGER: {
    type: ValidatorType.integer,
    method: onInteger
  },
  INTEGER_UNLIMITED: {
    type: ValidatorType.integerUnlimited,
    method: onIntegerUnlimited
  },
  MORE_OR_EQUAL: (limit: number, fallback?: boolean): IValidator => ({
    type: ValidatorType.moreOrEqual,
    method: onMoreOrEqual(limit, fallback)
  }),
  BOOLEAN: {
    type: ValidatorType.boolean,
    method: onBoolean
  },
  OBJECT: {
    type: ValidatorType.object,
    method: onObject
  },
  ITEM_LIST: {
    type: ValidatorType.itemList,
    method: onItemList
  },
  ELEMENT: {
    type: ValidatorType.element,
    method: onHtmlElement
  },
  FUNC: {
    type: ValidatorType.function,
    method: onFunction
  },
  FUNC_WITH_X_ARGUMENTS: (count: number): IValidator => ({
    type: ValidatorType.funcOfxArguments,
    method: onFunctionWithXArguments(count)
  }),
  FUNC_WITH_X_AND_MORE_ARGUMENTS: (count: number): IValidator => ({
    type: ValidatorType.funcOfxAndMoreArguments,
    method: onFunctionWithXAndMoreArguments(count)
  }),
  FUNC_WITH_X_TO_Y_ARGUMENTS: (from: number, to: number): IValidator => ({
    type: ValidatorType.funcOfXToYArguments,
    method: onFunctionWithXToYArguments(from, to)
  }),
  ONE_OF_CAN: (list: string[]): IValidator => ({
    type: ValidatorType.oneOfCan,
    method: onOneOf(list, false)
  }),
  ONE_OF_MUST: (list: string[]): IValidator => ({
    type: ValidatorType.oneOfMust,
    method: onOneOf(list, true)
  }),
  OR: (list: IValidator[]): IValidator => ({
    type: ValidatorType.or,
    method: onOr(list)
  }),
  ENUM: (list: TEnum): IValidator => ({
    type: ValidatorType.enum,
    method: onEnum(list)
  })
};

export class ValidatedData implements IValidatedData {

  context: IValidationContext;
  isValidContext: boolean;
  isValid: boolean;
  errors: string[];
  params: IValidatedCommonProps<PropertyKey>;

  private contextErrors: string[];

  constructor(context: unknown) {
    this.params = {};
    this.contextErrors = [];
    this.errors = [];
    this.isValid = true;
    this.setContext(context);
  }

  private setContext(context: unknown): void {
    if (!context || Object.prototype.toString.call(context) !== '[object Object]') {
      this.setCommonError('context is not an object');
      this.isValidContext = false;
    } else {
      this.isValidContext = true;
    }
    this.context = context as IValidationContext;
  }

  private setValidity() {
    this.errors = Object.keys(this.params).reduce((acc: string[], key: string) => [
      ...acc, ...this.params[key].errors
    ], []);
    this.isValid = !this.errors.length;
  }

  setCommonError(error: string): void {
    this.contextErrors.push(error);
    this.errors.push(error);
    this.isValid = false;
  }

  setParam(token: string, value: ValidatedValue): void {
    if (!value.isValid) {
      value.errors = !value.isSet
        ? [`"${token}" must be set`]
        : value.errors.map((err: string) =>
          `"${token}" ${err}`
        );
    }
    this.params[token] = value;
    this.setValidity();
  }

  showErrors(): string {
    return this.errors.length
      ? 'validation failed: ' + this.errors.join(', ')
      : '';
  }
}

export const runValidator = (
  current: ValidatedValue,
  validator: IValidator,
  context: IValidationContext
): ValidatedValue => {
  const { value, errors } = current;
  const result = validator.method(value, context);
  const _errors = [...errors, ...result.errors];
  return {
    value: result.value,
    isSet: result.isSet,
    isValid: !_errors.length,
    errors: _errors
  };
};

const getDefault = (value: unknown, prop: ICommonProp): ValidatedValue => {
  const empty = value === void 0;
  const auto = !prop.mandatory && prop.defaultValue !== void 0;
  return {
    value: !empty ? value : (auto ? prop.defaultValue : void 0),
    isSet: !empty || auto,
    isValid: !empty || !prop.mandatory,
    errors: []
  };
};

export const validateOne = (
  context: IValidationContext, name: string, prop: ICommonProp
): ValidatedValue => {
  const result = getDefault(context[name], prop);
  if (!result.isSet) {
    const oneOfMust = prop.validators.find(v => v.type === ValidatorType.oneOfMust);
    if (oneOfMust) {
      return runValidator(result, oneOfMust, context);
    }
  } else {
    for (const validator of Object.values(prop.validators)) {
      const current = runValidator(result, validator, context);
      if (!current.isValid && prop.defaultValue !== void 0) {
        return {
          value: prop.defaultValue,
          isSet: true,
          isValid: true,
          errors: []
        };
      }
      Object.assign(result, current);
    }
  }
  return result;
};

export const validate = (
  context: unknown, params: ICommonProps<PropertyKey>
): IValidatedData => {
  const data = new ValidatedData(context);
  Object.entries(params).forEach(([key, prop]) =>
    data.setParam(key, data.isValidContext
      ? validateOne(data.context, key, prop)
      : getDefault(void 0, prop)
    )
  );
  return data;
};
