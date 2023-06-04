import { Direction } from '../../../src/inputs';
import { BufferUpdater } from '../../../src/interfaces';

export type Id = number | string;

export interface Data {
  id: Id;
  text: string;
  size: number;
}

export type IndexIdList = { [key: number]: Id }[];
export type IndexSizeList = { [key: number]: number }[];

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
  list: IndexIdList;
}

export interface BufferUpdateTrackConfig extends BufferParams {
  title: string;
  index: number;
  predicate: BufferUpdater<Data>;
  fixRight: boolean;
  result: number;
  debug?: boolean;
}

export interface BufferInsertConfig extends BufferParams {
  title: string;
  items: Id[];
  index: number;
  direction: Direction;
  fixRight: boolean;
  result?: {
    list: IndexIdList;
    absMin: number;
    absMax: number;
  };
}
