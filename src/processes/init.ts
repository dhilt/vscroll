import { BaseProcessFactory, CommonProcess, AdapterProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { ProcessName } from '../interfaces/index';

const initProcesses = [CommonProcess.init, AdapterProcess.reset, AdapterProcess.reload];

export default class Init extends BaseProcessFactory(CommonProcess.init) {

  static run(scroller: Scroller, process: ProcessName): void {
    const { state, workflow } = scroller;
    const isInitial = initProcesses.includes(process);
    if (typeof vscroll_enableLogging === 'undefined' || vscroll_enableLogging) {
      scroller.logger.logCycle(true);
    }
    state.startWorkflowCycle(isInitial, process);
    workflow.call({
      process: Init.process,
      status: ProcessStatus.next
    });
  }

}
