import { Scroller } from '../../scroller';
import { AdapterMethods } from '../../inputs/index';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import {
  ItemsPredicate,
  ItemsLooper,
  AdapterFixOptions,
  IValidatedData,
} from '../../interfaces/index';

const { [AdapterProcess.fix]: FixParams } = AdapterMethods;

export default class Fix extends BaseAdapterProcessFactory(AdapterProcess.fix) {

  static run(scroller: Scroller, options: AdapterFixOptions): void {
    const { workflow } = scroller;

    const { data, params } = Fix.parseInput(scroller, options);
    if (!params) {
      return;
    }

    Object.entries(data.params).forEach(([key, value]) => {
      if (value.isSet && value.isValid) {
        Fix.runByType(scroller, key, value.value, data);
      }
    });

    workflow.call({
      process: Fix.process,
      status: ProcessStatus.done
    });
  }

  static runByType(scroller: Scroller, token: string, value: unknown, methodData: IValidatedData): void {
    switch (token) {
      case FixParams.scrollPosition:
        return Fix.setScrollPosition(scroller, value as number);
      case FixParams.minIndex:
        return Fix.setMinIndex(scroller, value as number);
      case FixParams.maxIndex:
        return Fix.setMaxIndex(scroller, value as number);
      case FixParams.updater:
        return Fix.updateItems(scroller, value as ItemsLooper);
      case FixParams.scrollToItem:
        if (methodData.params) {
          const scrollToItemOpt = methodData.params[FixParams.scrollToItemOpt];
          const options = scrollToItemOpt ? scrollToItemOpt.value as AdapterFixOptions['scrollToItemOpt'] : void 0;
          return Fix.scrollToItem(scroller, value as ItemsPredicate, options);
        }
        return;
      case FixParams.scrollToItemOpt:
        return;
    }
  }

  static setScrollPosition({ viewport }: Scroller, value: number): void {
    let result = value;
    if (value === -Infinity) {
      result = 0;
    } else if (value === Infinity) {
      result = viewport.getScrollableSize();
    }
    viewport.setPosition(result);
  }

  static setMinIndex({ buffer, settings }: Scroller, value: number): void {
    settings.minIndex = value;
    buffer.absMinIndex = value;
  }

  static setMaxIndex({ buffer, settings }: Scroller, value: number): void {
    settings.maxIndex = value;
    buffer.absMaxIndex = value;
  }

  static updateItems({ buffer }: Scroller, value: ItemsLooper): void {
    buffer.items.forEach(item => value(item.get()));
  }

  static scrollToItem(scroller: Scroller, value: ItemsPredicate, options?: boolean | ScrollIntoViewOptions): void {
    const found = scroller.buffer.items.find(item => value(item.get()));
    if (!found) {
      scroller.logger.log(() => 'scrollToItem cancelled, item not found');
      return;
    }
    found.scrollTo(options);
  }

}
