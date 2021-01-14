import { ProcessClass, ProcessName, ProcessPayload, ProcessSubject } from './process';
import { IDatasource } from './datasource';
import { IPackage } from './adapter';
import { Item } from '../classes/item';
import { Scroller } from '../scroller';

export type OnDataChanged<Data> = (items: Item<Data>[]) => void;

export interface WorkflowParams<ItemData> {
  datasource: IDatasource<ItemData>;
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
  datasource: IDatasource<ItemData>;
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

export interface InterruptParams<ItemData> {
  process: ProcessName;
  finalize?: boolean;
  datasource?: IDatasource<ItemData>;
}

export interface StateMachineMethods<ItemData> {
  run: (process: ProcessClass) => (...args: any[]) => void;
  interrupt: (params: InterruptParams<ItemData>) => void;
  done: () => void;
  onError: (process: ProcessName, payload: ProcessPayload) => void;
}

export interface StateMachineParams<ItemData = unknown> {
  input: ProcessSubject;
  methods: StateMachineMethods<ItemData>;
}
