import { Buffer } from '../buffer';
import { Logger } from '../logger';
import { Direction } from '../../inputs/index';
import { ItemsPredicate } from '../../interfaces/index';

export class CheckBufferCall<Data> {
  private context: Buffer<Data>;
  private logger: Logger;

  constructor(context: Buffer<Data>, logger: Logger) {
    this.context = context;
    this.logger = logger;
  }

  fillEmpty(items: Data[], before?: number, after?: number): boolean {
    if (!items.length) {
      this.logger.log('no items to fill the buffer; empty list');
      return false;
    }
    if (!Number.isInteger(before) && !Number.isInteger(after)) {
      this.logger.log('no items to fill the buffer; wrong indexes');
      return false;
    }
    this.logger.log(() => `going to fill the buffer with ${items.length} item(s)`);
    return true;
  }

  insertInBuffer(predicate?: ItemsPredicate, before?: number, after?: number): number {
    const index = Number.isInteger(before) ? before : (Number.isInteger(after) ? after : NaN);
    const found = this.context.items.find(item =>
      (predicate && predicate(item.get())) ||
      (Number.isInteger(index) && index === item.$index)
    );
    if (!found) {
      this.logger.log('no items to insert in buffer; empty predicate\'s result');
      return NaN;
    }
    return found.$index;
  }

  insertVirtual(items: Data[], index: number, direction: Direction): boolean {
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
