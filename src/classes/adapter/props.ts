import { Reactive } from '../reactive';
import { IAdapterProp, IBufferInfo, ItemAdapter, IPackages, AdapterMethodResult } from '../../interfaces/index';

export enum AdapterPropName {
  id = 'id',
  mock = 'mock',
  version = 'version',
  init = 'init',
  init$ = 'init$',
  packageInfo = 'packageInfo',
  itemsCount = 'itemsCount',
  bufferInfo = 'bufferInfo',
  isLoading = 'isLoading',
  isLoading$ = 'isLoading$',
  loopPending = 'loopPending',
  loopPending$ = 'loopPending$',
  firstVisible = 'firstVisible',
  firstVisible$ = 'firstVisible$',
  lastVisible = 'lastVisible',
  lastVisible$ = 'lastVisible$',
  bof = 'bof',
  bof$ = 'bof$',
  eof = 'eof',
  eof$ = 'eof$',
  reset = 'reset',
  reload = 'reload',
  append = 'append',
  prepend = 'prepend',
  check = 'check',
  remove = 'remove',
  clip = 'clip',
  insert = 'insert',
  replace = 'replace',
  update = 'update',
  fix = 'fix',
  relax = 'relax',
  showLog = 'showLog',
}

export enum AdapterPropType {
  Scalar,
  Reactive,
  WorkflowRunner,
  Function,
}

const Name = AdapterPropName;
const Type = AdapterPropType;

const noop = () => null;

export const methodPreResult: AdapterMethodResult = {
  immediate: true,
  success: true,
  details: 'Adapter is not initialized'
};

const noopWF = () => Promise.resolve(methodPreResult);

const emptyPackageInfo: IPackages = {
  core: {
    name: '',
    version: ''
  },
  consumer: {
    name: '',
    version: ''
  }
};

const bufferInfoDefault: IBufferInfo = {
  firstIndex: NaN,
  lastIndex: NaN,
  minIndex: NaN,
  maxIndex: NaN,
  absMinIndex: -Infinity,
  absMaxIndex: +Infinity,
  defaultSize: NaN,
};

export const EMPTY_ITEM = {
  data: {},
  element: {}
} as ItemAdapter;

export const getDefaultAdapterProps = (): IAdapterProp[] => [
  {
    type: Type.Scalar,
    name: Name.id,
    value: 0,
    permanent: true
  },
  {
    type: Type.Scalar,
    name: Name.mock,
    value: true,
    permanent: true
  },
  {
    type: Type.Scalar,
    name: Name.version,
    value: '',
    permanent: true
  },
  {
    type: Type.Scalar,
    name: Name.init,
    value: false,
    reactive: Name.init$
  },
  {
    type: Type.Scalar,
    name: Name.packageInfo,
    value: emptyPackageInfo,
    onDemand: true
  },
  {
    type: Type.Scalar,
    name: Name.itemsCount,
    value: 0,
    onDemand: true
  },
  {
    type: Type.Scalar,
    name: Name.bufferInfo,
    value: bufferInfoDefault,
    onDemand: true
  },
  {
    type: Type.Scalar,
    name: Name.isLoading,
    value: false,
    reactive: Name.isLoading$
  },
  {
    type: Type.Scalar,
    name: Name.loopPending,
    value: false,
    reactive: Name.loopPending$
  },
  {
    type: Type.Scalar,
    name: Name.firstVisible,
    value: EMPTY_ITEM,
    reactive: Name.firstVisible$,
    wanted: true
  },
  {
    type: Type.Scalar,
    name: Name.lastVisible,
    value: EMPTY_ITEM,
    reactive: Name.lastVisible$,
    wanted: true
  },
  {
    type: Type.Scalar,
    name: Name.bof,
    value: false,
    reactive: Name.bof$
  },
  {
    type: Type.Scalar,
    name: Name.eof,
    value: false,
    reactive: Name.eof$
  },
  {
    type: Type.WorkflowRunner,
    name: Name.reset,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.reload,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.append,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.prepend,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.check,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.remove,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.clip,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.insert,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.replace,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.update,
    value: noopWF
  },
  {
    type: Type.WorkflowRunner,
    name: Name.fix,
    value: noopWF
  },
  {
    type: Type.Function,
    name: Name.relax,
    value: noop
  },
  {
    type: Type.Function,
    name: Name.showLog,
    value: noop
  },
  {
    type: Type.Reactive,
    name: Name.init$,
    value: new Reactive<boolean>()
  },
  {
    type: Type.Reactive,
    name: Name.isLoading$,
    value: new Reactive<boolean>()
  },
  {
    type: Type.Reactive,
    name: Name.loopPending$,
    value: new Reactive<boolean>()
  },
  {
    type: Type.Reactive,
    name: Name.firstVisible$,
    value: new Reactive<ItemAdapter>(EMPTY_ITEM, { emitOnSubscribe: true })
  },
  {
    type: Type.Reactive,
    name: Name.lastVisible$,
    value: new Reactive<ItemAdapter>(EMPTY_ITEM, { emitOnSubscribe: true })
  },
  {
    type: Type.Reactive,
    name: Name.bof$,
    value: new Reactive<boolean>()
  },
  {
    type: Type.Reactive,
    name: Name.eof$,
    value: new Reactive<boolean>()
  }
];
