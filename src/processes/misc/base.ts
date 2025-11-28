import { AdapterProcess, ProcessStatus } from './enums';
import { Scroller } from '../../scroller';
import { ADAPTER_METHODS, validate } from '../../inputs/index';
import {
  ProcessName,
  IBaseProcess,
  IBaseAdapterProcess,
  IAdapterInput
} from '../../interfaces/index';

export const BaseProcessFactory = (process: ProcessName): IBaseProcess =>
  class BaseProcess {
    static process: ProcessName = process;
  };

export const BaseAdapterProcessFactory = (process: AdapterProcess): IBaseAdapterProcess =>
  class BaseAdapterProcess extends (BaseProcessFactory(process) as IBaseProcess) {
    static process: AdapterProcess = process;

    static parseInput<T>(
      scroller: Scroller,
      options: T,
      ignoreErrors = false,
      _process?: AdapterProcess
    ): IAdapterInput<T> {
      const result: IAdapterInput<T> = {
        data: validate(options, ADAPTER_METHODS[_process || process])
      };

      if (result.data.isValid) {
        result.params = Object.entries(result.data.params).reduce(
          (acc, [key, { value }]) => ({
            ...acc,
            [key]: value
          }),
          {} as T
        );
      } else {
        scroller.logger.log(() => result.data.showErrors());
        if (!ignoreErrors) {
          scroller.workflow.call({
            process,
            status: ProcessStatus.error,
            payload: { error: `Wrong argument of the "${process}" method call` }
          });
        }
      }

      return result;
    }
  };
