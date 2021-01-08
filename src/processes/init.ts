import { getBaseProcess, CommonProcess, AdapterProcess, ProcessStatus } from './misc/index';
import { Scroller } from '../scroller';
import { Process } from '../interfaces/index';

const initProcesses = [CommonProcess.init, AdapterProcess.reset, AdapterProcess.reload];

export default class Init extends getBaseProcess(CommonProcess.init) {

  static run(scroller: Scroller, process: Process) {
    const { state: { cycle }, workflow } = scroller;
    const isInitial = initProcesses.includes(process);
    scroller.logger.logCycle(true);
    cycle.start(isInitial, process);
    workflow.call({
      process: Init.process,
      status: ProcessStatus.next
    });
  }

}
