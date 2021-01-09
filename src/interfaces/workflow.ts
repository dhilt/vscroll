import { Process, ProcessSubject } from './process';
import { IDatasource } from './datasource';
import { IPackage } from './adapter';
import { Item } from '../classes/item';
import { Scroller } from '../scroller';

export interface WorkflowParams {
  datasource: IDatasource;
  consumer: IPackage;
  element: HTMLElement;
  run: (items: Item[]) => void;
}

interface CallWorkflow {
  (process: ProcessSubject): any;
  interrupted?: boolean;
}

export type OnDataChanged = (items: Item[]) => void;

export interface ScrollerWorkflow {
  call: CallWorkflow;
  onDataChanged: OnDataChanged;
}

export interface ScrollerParams {
  datasource: IDatasource;
  consumer?: IPackage;
  element?: HTMLElement;
  workflow?: ScrollerWorkflow;
  scroller?: Scroller; // for re-instantiation
}

export type WorkflowGetter = () => ScrollerWorkflow;

export interface WorkflowError {
  loop: string;
  time: number;
  message: string;
  process: Process;
}

export interface InterruptParams {
  process: Process;
  finalize: boolean;
  datasource: IDatasource;
}

export interface StateMachineMethods {
  run: (process: any) => (...args: any[]) => void;
  interrupt: (params: InterruptParams) => void;
  done: () => void;
  onError: (process: Process, payload: any) => void;
}

export interface StateMachineParams {
  input: ProcessSubject;
  methods: StateMachineMethods;
}
