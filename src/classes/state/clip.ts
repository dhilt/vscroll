import { ProcessName } from '../../interfaces/index';
import { AdapterProcess } from '../../processes/index';
import { Direction } from '../../inputs/index';

class VirtualClip {
  [Direction.backward]: number[];
  [Direction.forward]: number[];
  only: boolean;

  get all(): number[] {
    return [...this[Direction.backward], ...this[Direction.forward]];
  }

  get has(): boolean {
    return !!this[Direction.backward].length || !!this[Direction.forward].length;
  }

  constructor() {
    this.reset();
  }

  reset() {
    this[Direction.backward] = [];
    this[Direction.forward] = [];
    this.only = false;
  }
}

export class ClipModel {
  doClip: boolean;
  simulate: boolean;
  increase: boolean;
  callCount: number;
  forceForward: boolean;
  forceBackward: boolean;
  virtual: VirtualClip;
  initiator: ProcessName;

  get force(): boolean {
    return this.forceForward || this.forceBackward;
  }

  constructor() {
    this.callCount = 0;
    this.virtual = new VirtualClip();
    this.reset();
  }

  reset(isForce?: boolean): void {
    this.doClip = false;
    if (!isForce) {
      this.forceReset();
    } else {
      this.stopSimulate();
    }
    this.virtual.reset();
  }

  forceReset(): void {
    this.stopSimulate();
    this.forceForward = false;
    this.forceBackward = false;
  }

  startSimulate(): void {
    this.simulate = true;
  }

  stopSimulate(): void {
    this.simulate = false;
    this.increase = false;
  }

  remove(virtualOnly: boolean, increase: boolean): void {
    this.startSimulate();
    this.initiator = AdapterProcess.remove;
    if (virtualOnly) {
      this.virtual.only = true;
    }
    this.increase = increase;
  }

  update(): void {
    this.startSimulate();
    this.initiator = AdapterProcess.update;
  }
}
