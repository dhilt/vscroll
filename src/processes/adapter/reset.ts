import { Scroller } from '../../scroller';
import { DatasourceProps } from '../../inputs/index';
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
      Object.keys(DatasourceProps).forEach(key => {
        const param = data.params[key];
        const ds = datasource as unknown as { [key: string]: unknown };
        if (param.isSet || (constructed && ds[key])) {
          ds[key] = param.value;
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
