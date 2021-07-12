type On<T> = (value: T) => void;
type Off = () => void;

interface Subscription<T> {
  emit: On<T>;
  off: Off;
}

interface Options {
  emitOnSubscribe?: boolean; // if set, emit right on subscribe (like rxjs BehaviorSubject)
  emitEqual?: boolean; // if set, emit when new value is equal to the old one
}

export class Reactive<T> {

  private initialValue: T;
  private value: T;
  private id: number;
  private options: Options;
  private subscriptions: Map<number, Subscription<T>>;

  constructor(value?: T, options?: Options) {
    this.id = 0;
    if (value !== void 0) {
      this.value = value;
      this.initialValue = value;
    }
    this.options = options || {};
    this.subscriptions = new Map();
  }

  set(value: T): void {
    if (this.value === value && !this.options.emitEqual) {
      return;
    }
    this.value = value;
    for (const [, sub] of this.subscriptions) {
      sub.emit(value);
      if (this.value !== value) {
        break;
      }
    }
  }

  get(): T {
    return this.value;
  }

  on(func: On<T>): Off {
    const id = this.id++;
    const subscription: Subscription<T> = {
      emit: func,
      off: () => {
        subscription.emit = () => null;
        this.subscriptions.delete(id);
      }
    };
    this.subscriptions.set(id, subscription);
    if (this.options.emitOnSubscribe) {
      subscription.emit(this.value);
    }
    return () => subscription.off();
  }

  once(func: On<T>): Off {
    const off = this.on(v => {
      off();
      func(v);
    });
    return off;
  }

  reset(): void {
    this.set(this.initialValue);
  }

  dispose(): void {
    this.subscriptions.forEach(sub => sub.off());
  }
}
