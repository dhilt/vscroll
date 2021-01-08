import { CommonProcess, AdapterProcess, ProcessStatus } from '../processes/index';

export type Process = CommonProcess | AdapterProcess;

export interface ProcessSubject {
  process: Process;
  status: ProcessStatus;
  payload?: any;
}

export type AdapterProcessMap<T> = {
  [key in AdapterProcess]: T;
};
