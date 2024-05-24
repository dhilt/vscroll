import { VSCROLL, TESTS } from './misc/types';

declare global {
  interface Window {
    __vscroll__: VSCROLL;
    __tests__: TESTS;
  }
}