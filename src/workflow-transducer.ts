import {
  CommonProcess,
  AdapterProcess,
  ProcessStatus as Status,
  Init,
  Scroll,
  Reset,
  Reload,
  Append,
  Check,
  Remove,
  UserClip,
  Insert,
  Replace,
  Update,
  Fix,
  Start,
  PreFetch,
  Fetch,
  PostFetch,
  Render,
  PreClip,
  Clip,
  Adjust,
  End,
} from './processes/index';

import { StateMachineParams } from './interfaces/index';

export const runStateMachine = ({
  input: { process, status, payload = {} },
  methods: { run, interrupt, done, onError }
}: StateMachineParams): void => {
  if (status === Status.error) {
    onError(process, payload);
    if (!process.startsWith('adapter')) {
      run(End)(payload);
    }
    return;
  }
  const { options } = payload;
  switch (process) {
    case CommonProcess.init:
      if (status === Status.start) { // App start
        run(Init)(process);
      }
      if (status === Status.next) {
        run(Start)();
      }
      break;
    case CommonProcess.scroll:
      if (status === Status.start) {
        run(Scroll)(payload);
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.reset:
    case AdapterProcess.reload:
      if (status === Status.start) {
        if (process === AdapterProcess.reset) {
          run(Reset)(options);
        } else {
          run(Reload)(options);
        }
      }
      if (status === Status.next) {
        interrupt({ process, ...payload });
        if (payload.finalize) {
          run(End)();
        } else {
          run(Init)(process);
        }
      }
      break;
    case AdapterProcess.append:
    case AdapterProcess.prepend:
      if (status === Status.start) {
        run(Append)({ process, options });
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.check:
      if (status === Status.start) {
        run(Check)();
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.remove:
      if (status === Status.start) {
        run(Remove)(options);
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.clip:
      if (status === Status.start) {
        run(UserClip)(options);
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.insert:
      if (status === Status.start) {
        run(Insert)(options);
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.replace:
      if (status === Status.start) {
        run(Replace)(options);
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.update:
      if (status === Status.start) {
        run(Update)(options);
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case AdapterProcess.fix:
      if (status === Status.start) {
        run(Fix)(options);
      }
      if (status === Status.next) {
        run(Init)(process);
      }
      break;
    case CommonProcess.start:
      switch (payload.process) {
        case AdapterProcess.append:
        case AdapterProcess.insert:
        case AdapterProcess.replace:
        case AdapterProcess.update:
          if (payload.doRender) {
            run(Render)();
          } else {
            run(Adjust)();
          }
          break;
        case AdapterProcess.check:
          run(Render)();
          break;
        case AdapterProcess.remove:
          run(Adjust)();
          break;
        default:
          run(PreFetch)();
      }
      break;
    case CommonProcess.preFetch:
      if (status === Status.next) {
        switch (payload.process) {
          case AdapterProcess.clip:
            run(PreClip)();
            break;
          default:
            run(Fetch)();
        }
      }
      if (status === Status.done) {
        run(End)();
      }
      break;
    case CommonProcess.fetch:
      run(PostFetch)();
      break;
    case CommonProcess.postFetch:
      if (status === Status.next) {
        run(Render)();
      }
      if (status === Status.done) {
        run(End)();
      }
      break;
    case CommonProcess.render:
      if (status === Status.next) {
        switch (payload.process) {
          case AdapterProcess.append:
          case AdapterProcess.check:
          case AdapterProcess.insert:
          case AdapterProcess.replace:
          case AdapterProcess.update:
            run(Adjust)();
            break;
          default:
            run(PreClip)();
        }
      }
      if (status === Status.done) {
        run(End)();
      }
      break;
    case CommonProcess.preClip:
      if (payload.doClip) {
        run(Clip)();
      } else {
        run(Adjust)();
      }
      break;
    case CommonProcess.clip:
      run(Adjust)();
      break;
    case CommonProcess.adjust:
      run(End)();
      break;
    case CommonProcess.end:
      if (status === Status.next) {
        switch (payload.process) {
          case AdapterProcess.reset:
          case AdapterProcess.reload:
            done();
            run(Init)(payload.process);
            break;
          default:
            run(Start)();
        }
      }
      if (status === Status.done) {
        done();
      }
      break;
  }
};
