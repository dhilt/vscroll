import { ValidatorType } from '../inputs/validation';

type ValidatorMethod = (value: any, context?: any) => ValidatedValue;

export interface ValidatedValue {
  value: any;
  isSet: boolean;
  isValid: boolean;
  errors: string[];
}

export interface IValidator {
  type: ValidatorType;
  method: ValidatorMethod;
}

export interface ICommonProp {
  validators: IValidator[];
  mandatory?: boolean; // if true, undefined prop will produce error
  defaultValue?: any; // if present, undefined non-mandatory prop will be set to defaultValue
}

export type ICommonProps<T extends PropertyKey> = {
  [key in T]: ICommonProp;
};

export type IValidatedCommonProps<T extends PropertyKey> = {
  [key in T]: ValidatedValue;
};

export interface IValidatedData {
  isValid: boolean;
  errors: string[];
  params: IValidatedCommonProps<any>;
  showErrors: Function;
}
