import { Scroller } from '../../scroller';
import { ADAPTER_METHODS } from '../../inputs/index';
import { Datasource } from '../../classes/datasource';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { IDatasourceOptional, ProcessPayload } from '../../interfaces/index';

export default class Reset extends BaseAdapterProcessFactory(AdapterProcess.reset) {

  static run(scroller: Scroller, options?: IDatasourceOptional): void {
    const { datasource, buffer, viewport: { paddings }, state: { cycle } } = scroller;

    if (options) {
      const { data } = Reset.parseInput(scroller, options);
      if (!data.isValid) {
        return;
      }
      const constructed = options instanceof Datasource;
      Object.keys(ADAPTER_METHODS[Reset.process]).forEach(key => {
        const param = data.params[key];
        if (param.isSet || (constructed && datasource[key])) {
          datasource[key] = param.value;
        }
      });
    }

    buffer.reset(true);
    paddings.backward.reset();
    paddings.forward.reset();

    const payload: ProcessPayload = { datasource };
    if (cycle.busy.get()) {
      payload.finalize = true;
      cycle.interrupter = Reset.process;
    }

    scroller.workflow.call({
      process: Reset.process,
      status: ProcessStatus.next,
      payload
    });
  }

}
