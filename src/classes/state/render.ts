export class RenderModel {
  sizeBefore: number;
  sizeAfter: number;
  positionBefore: number;
  cancel: (() => void) | null;

  get noSize(): boolean {
    return this.sizeBefore === this.sizeAfter;
  }

  constructor() {
    this.reset();
  }

  reset(): void {
    this.sizeBefore = 0;
    this.sizeAfter = 0;
    this.positionBefore = 0;
    this.cancel = null;
  }
}
