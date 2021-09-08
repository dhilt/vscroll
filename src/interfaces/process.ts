import { Scroller } from '../scroller';
import { CommonProcess, AdapterProcess, ProcessStatus } from '../processes/index';
import { IDatasourceConstructed } from './datasource';
import { IAdapterInput } from './adapter';

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
  doRender?: boolean;
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

export interface IBaseProcess {
  new(): any; // eslint-disable-line @typescript-eslint/no-explicit-any
  process: ProcessName;
}

export interface IBaseAdapterProcess extends IBaseProcess {
  parseInput: <T>(
    scroller: Scroller, options: T, ignoreErrors?: boolean, process?: AdapterProcess
  ) => IAdapterInput<T>;
}
