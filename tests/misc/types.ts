import { BufferUpdater } from '../../src/interfaces';

export type Id = number | string;

export interface Data {
  id: Id;
  text: string;
  size: number;
}

export type CheckIndexList = { [key: string]: Id }[];

export interface BufferParams {
  min: number;
  max: number;
  start?: number;
  minCache?: number;
  maxCache?: number;
}

export interface BufferUpdateConfig extends BufferParams {
  title: string;
  predicate: BufferUpdater<Data>;
  fixRight: boolean;
  list: CheckIndexList;
}

export interface BufferUpdateTrackConfig extends BufferParams {
  title: string;
  index: number;
  predicate: BufferUpdater<Data>;
  fixRight: boolean;
  result: number;
  debug?: boolean;
}
