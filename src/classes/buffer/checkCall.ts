import { Buffer } from '../buffer';
import { Logger } from '../logger';
import { Direction } from '../../inputs/index';

export class CheckBufferCall<Data> {
  private context: Buffer<Data>;
  private logger: Logger;

  constructor(context: Buffer<Data>, logger: Logger) {
    this.context = context;
    this.logger = logger;
  }

  insert(items: Data[], index: number, direction: Direction): boolean {
    if (!items.length) {
      this.logger.log('no items to insert virtually; empty list');
      return false;
    }
    const { firstIndex, lastIndex, finiteAbsMinIndex, finiteAbsMaxIndex } = this.context;
    if (index < finiteAbsMinIndex || index > finiteAbsMaxIndex) {
      this.logger.log(() =>
        'no items to insert virtually; ' +
        `selected index (${index}) does not match virtual area [${finiteAbsMinIndex}..${finiteAbsMaxIndex}]`
      );
      return false;
    }
    const before = direction === Direction.backward;
    if (!(index < firstIndex + (before ? 1 : 0) || index > lastIndex - (before ? 0 : 1))) {
      this.logger.log(() =>
        `no items to insert virtually; selected index (${index}) belongs Buffer [${firstIndex}..${lastIndex}]`
      );
      return false;
    }
    this.logger.log(() => `going to insert ${items.length} item(s) virtually`);
    return true;
  }

}