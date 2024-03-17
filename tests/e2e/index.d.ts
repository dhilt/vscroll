import { VSCROLL } from './misc/types';

declare global {
  interface Window {
    __vscroll__: VSCROLL;
  }
}