import { AdapterProcess, ProcessStatus } from './enums';
import { Scroller } from '../../scroller';
import { ADAPTER_METHODS, validate } from '../../inputs/index';
import { ProcessName, IValidatedData } from '../../interfaces/index';

export interface IParseInput<T> {
  data: IValidatedData;
  params?: T;
}

export interface IBaseProcess {
  new(): any; // eslint-disable-line @typescript-eslint/no-explicit-any
  process: ProcessName;
}

export interface IBaseAdapterProcess extends IBaseProcess {
  parseInput: <T>(scroller: Scroller, options: T, ignoreErrors?: boolean) => IParseInput<T>;
}

export const BaseProcessFactory = (process: ProcessName): IBaseProcess =>

  class BaseProcess {

    static process: ProcessName = process;

  };

export const BaseAdapterProcessFactory = (process: AdapterProcess): IBaseAdapterProcess =>

  class BaseAdapterProcess extends (BaseProcessFactory(process) as IBaseProcess) {

    static process: AdapterProcess = process;

    static parseInput<T>(scroller: Scroller, options: T, ignoreErrors = false): IParseInput<T> {
      const result: IParseInput<T> = {
        data: validate(options, ADAPTER_METHODS[process])
      };

      if (result.data.isValid) {
        result.params = Object.entries(result.data.params)
          .reduce((acc, [key, { value }]) => ({
            ...acc,
            [key]: value
          }), {} as T);
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
