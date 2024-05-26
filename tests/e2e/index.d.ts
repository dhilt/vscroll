import * as VScroll from '../../src/index';
import { VSCROLL, TESTS } from './misc/types';

declare global {
  interface Window {
    VScroll: typeof VScroll;
    __vscroll__: VSCROLL;
    __tests__: TESTS;
  }
}