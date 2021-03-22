import { ItemAdapter } from './adapter';

export interface Item<Data = unknown> {
  $index: number;
  element: HTMLElement;
  data: Data;
  invisible: boolean;
  get: () => ItemAdapter<Data>;
}
