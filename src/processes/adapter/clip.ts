import { Scroller } from '../../scroller';
import { BaseAdapterProcessFactory, AdapterProcess, ProcessStatus } from '../misc/index';
import { AdapterClipOptions } from '../../interfaces/index';

export default class UserClip extends BaseAdapterProcessFactory(AdapterProcess.clip) {

  static run(scroller: Scroller, options?: AdapterClipOptions): void {
    const { params } = UserClip.parseInput(scroller, options);

    scroller.state.clip.forceForward = !(params && params.backwardOnly);
    scroller.state.clip.forceBackward = !(params && params.forwardOnly);

    scroller.workflow.call({
      process: UserClip.process,
      status: ProcessStatus.next
    });
  }

}
