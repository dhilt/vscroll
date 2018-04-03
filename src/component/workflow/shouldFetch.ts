import { Workflow } from '../workflow';
import { Direction } from '../interfaces/index';

export default class ShouldFetch {

  static run(workflow: Workflow) {
    const direction = workflow.direction;
    const paddingEdge = workflow.viewport.padding[direction].getEdge();
    const limit = workflow.viewport.getLimit(direction);

    workflow.fetch[direction].shouldFetch = ShouldFetch.checkEOF(workflow) ? false :
      (direction === Direction.forward) ? paddingEdge < limit : paddingEdge > limit;

    if (workflow.fetch[direction].shouldFetch) {
      ShouldFetch.setStartIndex(workflow);
    }
    return workflow;
  }

  static checkEOF(workflow: Workflow) {
    return (workflow.direction === Direction.forward && workflow.buffer.eof) ||
      (workflow.direction === Direction.backward && workflow.buffer.bof);
  }

  static setStartIndex(workflow: Workflow) {
    const direction = workflow.direction;
    const forward = direction === Direction.forward;
    const back = -workflow.settings.bufferSize;
    let start;
    if (workflow.buffer.lastIndex[direction] === null) {
      start = workflow.settings.startIndex + (forward ? 0 : back);
    } else {
      start = workflow.buffer.lastIndex[direction] + (forward ? 1 : back);
    }
    workflow.fetch[direction].startIndex = start;
  }

}
