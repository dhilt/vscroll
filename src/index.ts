import version from './version';
import { Workflow } from './workflow';
import { makeDatasource } from './classes/datasource';
import { Item } from './classes/item';
import { EMPTY_ITEM } from './classes/adapter/context';

import {
  IDatasourceGeneric,
  IDatasource,
  AdapterPropName,
  IReactivePropConfig,
  IAdapterConfig,
  ItemAdapter,
  IAdapter,
} from './interfaces/index';

// export entities
export { version, Workflow, makeDatasource, Item, EMPTY_ITEM, AdapterPropName };

// export interfaces
export {
  IDatasourceGeneric,
  IDatasource,
  IReactivePropConfig,
  IAdapterConfig,
  ItemAdapter as IAdapterItem,
  IAdapter,
}
