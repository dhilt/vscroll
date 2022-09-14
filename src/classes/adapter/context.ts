import { AdapterPropName, AdapterPropType, getDefaultAdapterProps, reactiveConfigStorage } from './props';
import core from '../../version';
import { Reactive } from '../reactive';
import { wantedStorage, wantedUtils } from './wanted';
import { IReactivePropsStore, IAdapterConfig } from '../../interfaces/index';

let instanceCount = 0;

export class AdapterContext {

  constructor(config: IAdapterConfig) {
    const { mock, reactive } = config;
    const id = ++instanceCount;
    const conf = { configurable: true };
    const reactivePropsStore: IReactivePropsStore = {};
    wantedStorage.set(id, { box: {}, block: false });

    // set up permanent props
    Object.defineProperty(this, AdapterPropName.id, { get: () => id, ...conf });
    Object.defineProperty(this, AdapterPropName.mock, { get: () => mock, ...conf });
    Object.defineProperty(this, AdapterPropName.augmented, { get: () => false, ...conf });
    Object.defineProperty(this, AdapterPropName.version, { get: () => core.version, ...conf });

    // set up default props, they will be reassigned during the Adapter instantiation
    getDefaultAdapterProps()
      .filter(({ permanent }) => !permanent)
      .forEach(prop => {
        let { value } = prop;

        // reactive props might be reconfigured by the vscroll consumer
        if (reactive && prop.type === AdapterPropType.Reactive) {
          const react = reactive[prop.name];
          if (react) {
            // here we have a configured reactive property that came from the outer config
            // this prop must be exposed via Adapter, but at the same time we need to
            // persist the original default value as it will be used by the Adapter internally
            reactivePropsStore[prop.name] = {
              ...react,
              default: value as Reactive<unknown> // persisting the default native Reactive prop
            };
            value = react.source; // exposing the configured prop instead of the default one
          }
        }

        Object.defineProperty(this, prop.name, {
          get: () => {
            wantedUtils.setBox(prop, id);
            return value;
          },
          ...conf
        });
      });

    if (reactive) { // save both configured and default reactive props in the store
      reactiveConfigStorage.set(id, reactivePropsStore);
    }
  }
}
