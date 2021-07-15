import { AdapterPropName, AdapterPropType, getDefaultAdapterProps, reactiveConfigStorage } from './props';
import core from '../../version';
import { Reactive } from '../reactive';
import { IReactivePropsStore, IAdapterConfig } from '../../interfaces/index';

let instanceCount = 0;

export class AdapterContext {

  constructor(config: IAdapterConfig) {
    const { mock, reactive } = config;
    const id = ++instanceCount;
    const conf = { configurable: true };
    const reactivePropsStore: IReactivePropsStore = {};

    // set up permanent props
    Object.defineProperty(this, AdapterPropName.id, { get: () => id, ...conf });
    Object.defineProperty(this, AdapterPropName.mock, { get: () => mock, ...conf });
    Object.defineProperty(this, AdapterPropName.augmented, { get: () => false, ...conf });
    Object.defineProperty(this, AdapterPropName.version, { get: () => core.version, ...conf });

    // set up default props, they will be reassigned during the Adapter instantiation
    getDefaultAdapterProps()
      .filter(({ permanent }) => !permanent)
      .forEach(({ name, value, type }) => {

        // reactive props might be reconfigured by the vscroll consumer
        if (reactive && type === AdapterPropType.Reactive) {
          const react = reactive[name];
          if (react) {
            // here we have a configured reactive property that came from the outer config
            // this prop must be exposed via Adapter, but at the same time we need to
            // persist the original default value as it will be used by the Adapter internally
            reactivePropsStore[name] = {
              ...react,
              default: value as Reactive<unknown> // persisting the default native Reactive prop
            };
            value = react.source; // exposing the configured prop instead of the default one
          }
        }

        Object.defineProperty(this, name, {
          get: () => value,
          ...conf
        });
      });

    if (reactive) { // save both configured and default reactive props in the store
      reactiveConfigStorage.set(id, reactivePropsStore);
    }
  }
}
