export class ClipModel {
  doClip: boolean;
  callCount: number;
  forceForward: boolean;
  forceBackward: boolean;

  get force(): boolean {
    return this.forceForward || this.forceBackward;
  }

  constructor() {
    this.callCount = 0;
    this.reset();
  }

  reset(force?: boolean): void {
    this.doClip = false;
    if (!force) {
      this.forceForward = false;
      this.forceBackward = false;
    }
  }
}
