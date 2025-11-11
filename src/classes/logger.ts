import { Scroller } from '../scroller';
import { CommonProcess, AdapterProcess, ProcessStatus as Status } from '../processes/index';
import { IPackages, ProcessSubject } from '../interfaces/index';

type LogType = [unknown?, ...unknown[]];

export class Logger {

  readonly debug: boolean;
  readonly immediateLog: boolean;
  readonly logTime: boolean;
  readonly logColor: boolean;
  readonly getTime: () => string;
  readonly getStat: () => string;
  readonly getFetchRange: () => string;
  readonly getWorkflowCycleData: () => string;
  readonly getLoopId: () => string;
  readonly getLoopIdNext: () => string;
  readonly getScrollPosition: () => number;
  private logs: LogType[] = [];

  constructor(scroller: Scroller, packageInfo: IPackages, adapter?: { id: number }) {
    const { settings } = scroller;
    this.debug = settings.debug;
    this.immediateLog = settings.immediateLog;
    this.logTime = settings.logTime;
    this.logColor = settings.logColor;
    this.getTime = (): string =>
      scroller.state && ` // time: ${scroller.state.time}`;
    this.getStat = (): string => {
      const { buffer, viewport } = scroller;
      const first = buffer.getFirstVisibleItem();
      const last = buffer.getLastVisibleItem();
      return 'pos: ' + viewport.scrollPosition + ', ' +
        'size: ' + viewport.getScrollableSize() + ', ' +
        'bwd_p: ' + viewport.paddings.backward.size + ', ' +
        'fwd_p: ' + viewport.paddings.forward.size + ', ' +
        'default: ' + (buffer.defaultSize || 'no') + ', ' +
        'items: ' + buffer.getVisibleItemsCount() + ', ' +
        'range: ' + (first && last ? `[${first.$index}..${last.$index}]` : 'no');
    };
    this.getFetchRange = (): string => {
      const { first: { index: first }, last: { index: last } } = scroller.state.fetch;
      return !Number.isNaN(first) && !Number.isNaN(last)
        ? `[${first}..${last}]`
        : 'no';
    };
    this.getLoopId = (): string => scroller.state.cycle.loopId;
    this.getLoopIdNext = (): string => scroller.state.cycle.loopIdNext;
    this.getWorkflowCycleData = (): string =>
      `${settings.instanceIndex}-${scroller.state.cycle.count}`;
    this.getScrollPosition = () => scroller.routines.getScrollPosition();
    this.log(() =>
      'vscroll Workflow has been started, ' +
      `core: ${packageInfo.core.name} v${packageInfo.core.version}, ` +
      `consumer: ${packageInfo.consumer.name} v${packageInfo.consumer.version}, ` +
      `scroller instance: ${settings.instanceIndex}, adapter ` +
      (!adapter ? 'is not instantiated' : `instance: ${adapter.id}`)
    );
  }

  object(str: string, obj: unknown, stringify?: boolean): void {
    this.log(() => [
      str,
      stringify
        ? JSON.stringify(obj, (k, v) => {
          if (Number.isNaN(v)) {
            return 'NaN';
          }
          if (v === Infinity) {
            return 'Infinity';
          }
          if (v === -Infinity) {
            return '-Infinity';
          }
          if (v instanceof Element) {
            return 'HTMLElement';
          }
          if (v instanceof HTMLDocument) {
            return 'HTMLDocument';
          }
          if (typeof v === 'function') {
            return 'Function';
          }
          return v;
        })
          .replace(/"/g, '')
          .replace(/(\{|:|,)/g, '$1 ')
          .replace(/(\})/g, ' $1')
        : obj
    ]);
  }

  stat(str?: string): void {
    if (this.debug) {
      if (this.logColor) {
        const logStyles = [
          'color: #888; border: dashed #888 0; border-bottom-width: 0px',
          'color: #000; border-width: 0'
        ];
        this.log(() => ['%cstat' + (str ? ` ${str}` : '') + ',%c ' + this.getStat(), ...logStyles]);
      } else {
        this.log(() => ['stat' + (str ? ` ${str}` : '') + ', ' + this.getStat()]);
      }
    }
  }

  fetch(str?: string): void {
    if (this.debug) {
      const _text = 'fetch interval' + (str ? ` ${str}` : '');
      if (this.logColor) {
        const logStyles = ['color: #888', 'color: #000'];
        this.log(() => [`%c${_text}: %c${this.getFetchRange()}`, ...logStyles]);
      } else {
        this.log(() => [`${_text}: ${this.getFetchRange()}`]);
      }
    }
  }

  prepareForLog(data: unknown): unknown {
    return data instanceof Event && data.target
      ? this.getScrollPosition()
      : data;
  }

  logProcess(data: ProcessSubject): void {
    if (!this.debug) {
      return;
    }
    const { process, status, payload } = data;

    // inner loop start-end log
    const loopLog: string[] = [];
    if (
      process === CommonProcess.init && status === Status.next
    ) {
      const loopStart = `---=== loop ${this.getLoopIdNext()} start`;
      loopLog.push(this.logColor ? `%c${loopStart}` : loopStart);
    } else if (
      process === CommonProcess.end
    ) {
      const loopDone = `---=== loop ${this.getLoopId()} done`;
      loopLog.push(this.logColor ? `%c${loopDone}` : loopDone);
      const parent = payload && payload.process;
      if (status === Status.next && (parent !== AdapterProcess.reset && parent !== AdapterProcess.reload)) {
        loopLog[0] += `, loop ${this.getLoopIdNext()} start`;
      }
    }
    if (loopLog.length) {
      this.log(() => this.logColor ? [...loopLog, 'color: #006600;'] : loopLog);
    }
  }

  logCycle(start = true): void {
    const logData = this.getWorkflowCycleData();
    if (this.logColor) {
      const border = start ? '1px 0 0 1px' : '0 0 1px 1px';
      const logStyles = `color: #0000aa; border: solid #555 1px; border-width: ${border}; margin-left: -2px`;
      this.log(() => [`%c   ~~~ WF Cycle ${logData} ${start ? 'STARTED' : 'FINALIZED'} ~~~  `, logStyles]);
    } else {
      this.log(() => [`   ~~~ WF Cycle ${logData} ${start ? 'STARTED' : 'FINALIZED'} ~~~  `]);
    }
  }

  logError(str: string): void {
    if (this.debug) {
      if (this.logColor) {
        const logStyles = ['color: #a00;', 'color: #000'];
        this.log(() => ['error:%c' + (str ? ` ${str}` : '') + `%c (loop ${this.getLoopIdNext()})`, ...logStyles]);
      } else {
        this.log(() => ['error:' + (str ? ` ${str}` : '') + ` (loop ${this.getLoopIdNext()})`]);
      }
    }
  }

  logAdapterMethod = (methodName: string, args?: unknown, add?: string): void => {
    if (!this.debug) {
      return;
    }
    const params = (
      args === void 0 ? [] : (Array.isArray(args) ? args : [args])
    )
      .map((arg: unknown) => {
        if (typeof arg === 'function') {
          return 'func';
        } else if (typeof arg !== 'object' || !arg) {
          return arg;
        } else if (Array.isArray(arg)) {
          return `[of ${arg.length}]`;
        }
        return '{ ' + Object.keys(arg).join(', ') + ' }';
      })
      .join(', ');
    this.log(`adapter: ${methodName}(${params || ''})${add || ''}`);
  };

  log(...args: unknown[]): void {
    if (this.debug) {
      if (typeof args[0] === 'function') {
        args = args[0]();
        if (!Array.isArray(args)) {
          args = [args];
        }
      }
      if (args.every(item => item === void 0)) {
        return;
      }
      if (this.logTime) {
        args = [...args, this.getTime()];
      }
      args = args.map((arg: unknown) => this.prepareForLog(arg));
      if (this.immediateLog) {
        console.log.apply(this, args as LogType);
      } else {
        this.logs.push(args);
      }
    }
  }

  // logNow(...args: unknown[]) {
  //   const immediateLog = this.immediateLog;
  //   const debug = this.debug;
  //   (this as any).debug = true;
  //   (this as any).immediateLog = true;
  //   this.log.apply(this, args);
  //   (this as any).debug = debug;
  //   (this as any).immediateLog = immediateLog;
  // }

  logForce(...args: unknown[]): void {
    if (this.debug) {
      if (!this.immediateLog && this.logs.length) {
        this.logs.forEach(logArgs => console.log.apply(this, logArgs));
        this.logs = [];
      }
      if (args.length) {
        console.log.apply(this, args as LogType);
      }
    }
  }

  getLogs(): LogType[] {
    return this.logs;
  }
}
