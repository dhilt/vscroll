export type Id = number | string;

export interface Data {
  id: Id;
  text: string;
  size: number;
}

export interface BufferParams {
  start?: number;
  min: number;
  max: number;
}

export type CheckIndexList = { [key: string]: Id }[];
