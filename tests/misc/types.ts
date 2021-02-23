import { BufferUpdater } from '../../src/interfaces';

export type Id = number | string;

export interface Data {
  id: Id;
  text: string;
  size: number;
}

export type CheckIndexList = { [key: string]: Id }[];

// [absMin..minCache..min..max..maxCache..absMax]
export interface BufferParams {
  min: number; // index of first item in Buffer
  max: number; // index of last item in Buffer
  minCache?: number; // index of first item in Cache
  maxCache?: number; // index of last item in Cache
  absMin?: number; // absolute left Buffer border
  absMax?: number; // absolute right Buffer border
  start?: number;
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
