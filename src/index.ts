import { Workflow } from './workflow';
import { makeDatasource } from './classes/datasource';
import packageInfo from './version';
import { INVALID_DATASOURCE_PREFIX } from './scroller';
import { AdapterPropName, EMPTY_ITEM, getDefaultAdapterProps } from './classes/adapter/props';
import { Direction, SizeStrategy } from './inputs/index';

import {
  IDatasource,
  IDatasourceConstructed,
  IReactivePropConfig,
  IAdapterConfig,
  ItemAdapter,
  IAdapter,
  Item,
  WorkflowParams,
} from './interfaces/index';

// export entities
export {
  Workflow,
  makeDatasource,
  packageInfo,
  INVALID_DATASOURCE_PREFIX,
  AdapterPropName,
  EMPTY_ITEM,
  getDefaultAdapterProps,
  Direction,
  SizeStrategy,
};

// export interfaces
export {
  IDatasource,
  IDatasourceConstructed,
  IReactivePropConfig,
  IAdapterConfig,
  ItemAdapter as IAdapterItem,
  IAdapter,
  Item,
  WorkflowParams
};
