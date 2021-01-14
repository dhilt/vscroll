import { ProcessClass, ProcessName, ProcessPayload, ProcessSubject } from './process';
import { IDatasource } from './datasource';
import { IPackage } from './adapter';
import { Item } from '../classes/item';
import { Scroller } from '../scroller';

export type OnDataChanged<Data> = (items: Item<Data>[]) => void;

export interface WorkflowParams<ItemData> {
  datasource: IDatasource;
  consumer: IPackage;
  element: HTMLElement;
  run: OnDataChanged<ItemData>;
}

interface CallWorkflow {
  (process: ProcessSubject): void;
  interrupted?: boolean;
}

export interface ScrollerWorkflow<ItemData = unknown> {
  call: CallWorkflow;
  onDataChanged: OnDataChanged<ItemData>;
}

export interface ScrollerParams<ItemData> {
  datasource: IDatasource;
  consumer?: IPackage;
  element?: HTMLElement;
  workflow?: ScrollerWorkflow<ItemData>;
  scroller?: Scroller<ItemData>; // for re-instantiation
}

export type WorkflowGetter<ItemData> = () => ScrollerWorkflow<ItemData>;

export interface WorkflowError {
  loop: string;
  time: number;
  message: string;
  process: ProcessName;
}

export interface InterruptParams {
  process: ProcessName;
  finalize?: boolean;
  datasource?: IDatasource;
}

export interface StateMachineMethods {
  run: (process: ProcessClass) => (...args: any[]) => void;
  interrupt: (params: InterruptParams) => void;
  done: () => void;
  onError: (process: ProcessName, payload: ProcessPayload) => void;
}

export interface StateMachineParams {
  input: ProcessSubject;
  methods: StateMachineMethods;
}
