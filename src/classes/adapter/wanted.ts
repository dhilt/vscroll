import { IAdapterProp } from '../../interfaces/index';
import { AdapterPropName } from './props';

interface IWanted {
  box: { [key: string]: boolean };
  block: boolean;
}

const getBox = (id?: number): IWanted['box'] | undefined => {
  return wantedStorage.get(id || -1)?.box;
};

const setBox = ({ name, wanted }: IAdapterProp, id?: number): boolean => {
  const Wanted = wantedStorage.get(id || -1);
  if (wanted && Wanted && !Wanted.box[name] && !Wanted.block) {
    const { firstVisible: a, firstVisible$: a$ } = AdapterPropName;
    const { lastVisible: b, lastVisible$: b$ } = AdapterPropName;
    Wanted.box[a] = Wanted.box[a$] = [a, a$].some(n => n === name) || Wanted.box[a];
    Wanted.box[b] = Wanted.box[b$] = [b, b$].some(n => n === name) || Wanted.box[b];
    return true;
  }
  return false;
};

const setBlock = (value: boolean, id?: number): void => {
  const Wanted = wantedStorage.get(id || -1);
  if (Wanted) {
    Wanted.block = value;
  }
};

export const wantedUtils = {
  getBox,
  setBox,
  setBlock
};

export const wantedStorage = new Map<number, IWanted>();
