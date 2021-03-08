import { Workflow } from './workflow';
import { makeDatasource } from './classes/datasource';
import packageInfo from './version';
import { INVALID_DATASOURCE_PREFIX } from './scroller';
import { Item } from './classes/item';
import { AdapterPropName, EMPTY_ITEM, getDefaultAdapterProps } from './classes/adapter/props';
import { Direction } from './inputs/index';

import {
  IDatasource,
  IDatasourceConstructed,
  IReactivePropConfig,
  IAdapterConfig,
  ItemAdapter,
  IAdapter,
} from './interfaces/index';

// export entities
export {
  Workflow,
  makeDatasource,
  packageInfo,
  INVALID_DATASOURCE_PREFIX,
  Item,
  AdapterPropName,
  EMPTY_ITEM,
  getDefaultAdapterProps,
  Direction,
};

// export interfaces
export {
  IDatasource,
  IDatasourceConstructed,
  IReactivePropConfig,
  IAdapterConfig,
  ItemAdapter as IAdapterItem,
  IAdapter,
};
