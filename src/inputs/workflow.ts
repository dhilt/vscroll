import { VALIDATORS } from './validation';
import { ICommonProps } from '../interfaces/index';

const { ELEMENT, OBJECT, FUNC, FUNC_WITH_X_ARGUMENTS } = VALIDATORS;

export enum WorkflowProps {
  consumer = 'consumer',
  element = 'element',
  datasource = 'datasource',
  run = 'run',
  Routines = 'Routines',
}

export const WORKFLOW: ICommonProps<WorkflowProps> = {
  [WorkflowProps.consumer]: {
    validators: [OBJECT]
  },
  [WorkflowProps.element]: {
    validators: [ELEMENT],
    mandatory: true
  },
  [WorkflowProps.datasource]: {
    validators: [OBJECT],
    mandatory: true
  },
  [WorkflowProps.run]: {
    validators: [FUNC_WITH_X_ARGUMENTS(1)],
    mandatory: true
  },
  [WorkflowProps.Routines]: {
    validators: [FUNC]
  }
};
