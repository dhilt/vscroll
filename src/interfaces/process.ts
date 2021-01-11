import { Scroller } from '../scroller';
import { CommonProcess, AdapterProcess, ProcessStatus } from '../processes/index';
import { IDatasourceConstructed } from './datasource';

export type ProcessName = CommonProcess | AdapterProcess;

export interface ProcessClass {
  process: ProcessName;
  run: (scroller: Scroller, ...args: any[]) => void;
  name: string;
}

export interface ProcessPayload {
  process?: ProcessName;
  options?: unknown;
  event?: Event;
  finalize?: boolean;
  doClip?: boolean;
  datasource?: IDatasourceConstructed;
  error?: unknown;
}

export interface ProcessSubject {
  process: ProcessName;
  status: ProcessStatus;
  payload?: ProcessPayload;
}

export type AdapterProcessMap<T> = {
  [key in AdapterProcess]: T;
};
