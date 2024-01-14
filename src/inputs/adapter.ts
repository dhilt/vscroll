import { VALIDATORS } from './validation';
import { DatasourceProps as AdapterResetParams } from './datasource';
import { AdapterProcess as Process } from '../processes/misc/enums';
import { ICommonProps, AdapterProcessMap } from '../interfaces/index';

const {
  INTEGER,
  INTEGER_UNLIMITED,
  BOOLEAN,
  OBJECT,
  ITEM_LIST,
  FUNC_WITH_X_ARGUMENTS,
  FUNC_WITH_X_AND_MORE_ARGUMENTS,
  FUNC_WITH_X_TO_Y_ARGUMENTS,
  ONE_OF_MUST,
  ONE_OF_CAN,
  OR,
} = VALIDATORS;

enum AdapterNoParams { }
const NO_METHOD_PARAMS: ICommonProps<AdapterNoParams> = {};

const RESET_METHOD_PARAMS: ICommonProps<AdapterResetParams> = {
  [AdapterResetParams.get]: {
    validators: [FUNC_WITH_X_AND_MORE_ARGUMENTS(2)]
  },
  [AdapterResetParams.settings]: {
    validators: [OBJECT]
  },
  [AdapterResetParams.devSettings]: {
    validators: [OBJECT]
  },
};

enum AdapterReloadParams {
  reloadIndex = 'reloadIndex',
}

const RELOAD_METHOD_PARAMS: ICommonProps<AdapterReloadParams> = {
  [AdapterReloadParams.reloadIndex]: {
    validators: [INTEGER]
  },
};

enum AdapterPrependParams {
  items = 'items',
  bof = 'bof',
  increase = 'increase',
}

const PREPEND_METHOD_PARAMS: ICommonProps<AdapterPrependParams> = {
  [AdapterPrependParams.items]: {
    validators: [ITEM_LIST],
    mandatory: true
  },
  [AdapterPrependParams.bof]: {
    validators: [BOOLEAN],
    defaultValue: false
  },
  [AdapterPrependParams.increase]: {
    validators: [BOOLEAN],
    defaultValue: false
  },
};

enum AdapterAppendParams {
  items = 'items',
  eof = 'eof',
  decrease = 'decrease',
}

const APPEND_METHOD_PARAMS: ICommonProps<AdapterAppendParams> = {
  [AdapterAppendParams.items]: {
    validators: [ITEM_LIST],
    mandatory: true
  },
  [AdapterAppendParams.eof]: {
    validators: [BOOLEAN],
    defaultValue: false
  },
  [AdapterAppendParams.decrease]: {
    validators: [BOOLEAN],
    defaultValue: false
  },
};

enum AdapterRemoveParams {
  predicate = 'predicate',
  indexes = 'indexes',
  increase = 'increase',
}

const REMOVE_METHOD_PARAMS: ICommonProps<AdapterRemoveParams> = {
  [AdapterRemoveParams.predicate]: {
    validators: [FUNC_WITH_X_ARGUMENTS(1), ONE_OF_MUST([AdapterRemoveParams.indexes])]
  },
  [AdapterRemoveParams.indexes]: {
    validators: [ITEM_LIST, ONE_OF_MUST([AdapterRemoveParams.predicate])]
  },
  [AdapterRemoveParams.increase]: {
    validators: [BOOLEAN],
    defaultValue: false
  },
};

enum AdapterClipParams {
  backwardOnly = 'backwardOnly',
  forwardOnly = 'forwardOnly',
}

const CLIP_METHOD_PARAMS: ICommonProps<AdapterClipParams> = {
  [AdapterClipParams.backwardOnly]: {
    validators: [BOOLEAN, ONE_OF_CAN([AdapterClipParams.forwardOnly])],
    defaultValue: false
  },
  [AdapterClipParams.forwardOnly]: {
    validators: [BOOLEAN, ONE_OF_CAN([AdapterClipParams.backwardOnly])],
    defaultValue: false
  },
};

enum AdapterInsertParams {
  items = 'items',
  before = 'before',
  after = 'after',
  beforeIndex = 'beforeIndex',
  afterIndex = 'afterIndex',
  decrease = 'decrease',
}

const INSERT_METHOD_PARAMS: ICommonProps<AdapterInsertParams> = {
  [AdapterInsertParams.items]: {
    validators: [ITEM_LIST],
    mandatory: true
  },
  [AdapterInsertParams.before]: {
    validators: [FUNC_WITH_X_ARGUMENTS(1), ONE_OF_MUST([
      AdapterInsertParams.after, AdapterInsertParams.beforeIndex, AdapterInsertParams.afterIndex
    ])]
  },
  [AdapterInsertParams.after]: {
    validators: [FUNC_WITH_X_ARGUMENTS(1), ONE_OF_MUST([
      AdapterInsertParams.before, AdapterInsertParams.beforeIndex, AdapterInsertParams.afterIndex
    ])]
  },
  [AdapterInsertParams.beforeIndex]: {
    validators: [INTEGER, ONE_OF_MUST([
      AdapterInsertParams.before, AdapterInsertParams.after, AdapterInsertParams.afterIndex
    ])]
  },
  [AdapterInsertParams.afterIndex]: {
    validators: [INTEGER, ONE_OF_MUST([
      AdapterInsertParams.before, AdapterInsertParams.after, AdapterInsertParams.beforeIndex
    ])]
  },
  [AdapterInsertParams.decrease]: {
    validators: [BOOLEAN],
    defaultValue: false
  },
};

enum AdapterReplaceParams {
  items = 'items',
  predicate = 'predicate',
  fixRight = 'fixRight',
}

const REPLACE_METHOD_PARAMS: ICommonProps<AdapterReplaceParams> = {
  [AdapterInsertParams.items]: {
    validators: [ITEM_LIST],
    mandatory: true
  },
  [AdapterReplaceParams.predicate]: {
    validators: [FUNC_WITH_X_ARGUMENTS(1)],
    mandatory: true
  },
  [AdapterReplaceParams.fixRight]: {
    validators: [BOOLEAN],
    defaultValue: false
  }
};

enum AdapterUpdateParams {
  predicate = 'predicate',
  fixRight = 'fixRight',
}

const UPDATE_METHOD_PARAMS: ICommonProps<AdapterUpdateParams> = {
  [AdapterUpdateParams.predicate]: {
    validators: [FUNC_WITH_X_ARGUMENTS(1)],
    mandatory: true
  },
  [AdapterUpdateParams.fixRight]: {
    validators: [BOOLEAN],
    defaultValue: false
  },
};

enum AdapterFixParams {
  scrollPosition = 'scrollPosition',
  minIndex = 'minIndex',
  maxIndex = 'maxIndex',
  updater = 'updater',
  scrollToItem = 'scrollToItem',
  scrollToItemOpt = 'scrollToItemOpt',
}

const FIX_METHOD_PARAMS: ICommonProps<AdapterFixParams> = {
  [AdapterFixParams.scrollPosition]: {
    validators: [INTEGER_UNLIMITED]
  },
  [AdapterFixParams.minIndex]: {
    validators: [INTEGER_UNLIMITED]
  },
  [AdapterFixParams.maxIndex]: {
    validators: [INTEGER_UNLIMITED]
  },
  [AdapterFixParams.updater]: {
    validators: [FUNC_WITH_X_TO_Y_ARGUMENTS(1, 2)]
  },
  [AdapterFixParams.scrollToItem]: {
    validators: [FUNC_WITH_X_ARGUMENTS(1)]
  },
  [AdapterFixParams.scrollToItemOpt]: {
    validators: [OR([BOOLEAN, OBJECT])]
  },
};

export const AdapterMethods: AdapterProcessMap<{ [key: string]: string }> = {
  [Process.reset]: AdapterResetParams,
  [Process.reload]: AdapterReloadParams,
  [Process.prepend]: AdapterPrependParams,
  [Process.append]: AdapterAppendParams,
  [Process.check]: AdapterNoParams,
  [Process.remove]: AdapterRemoveParams,
  [Process.clip]: AdapterClipParams,
  [Process.insert]: AdapterInsertParams,
  [Process.replace]: AdapterReplaceParams,
  [Process.update]: AdapterUpdateParams,
  [Process.pause]: AdapterNoParams,
  [Process.fix]: AdapterFixParams,
};

export const ADAPTER_METHODS: AdapterProcessMap<ICommonProps<PropertyKey>> = {
  [Process.reset]: RESET_METHOD_PARAMS,
  [Process.reload]: RELOAD_METHOD_PARAMS,
  [Process.prepend]: PREPEND_METHOD_PARAMS,
  [Process.append]: APPEND_METHOD_PARAMS,
  [Process.check]: NO_METHOD_PARAMS,
  [Process.remove]: REMOVE_METHOD_PARAMS,
  [Process.clip]: CLIP_METHOD_PARAMS,
  [Process.insert]: INSERT_METHOD_PARAMS,
  [Process.replace]: REPLACE_METHOD_PARAMS,
  [Process.update]: UPDATE_METHOD_PARAMS,
  [Process.pause]: NO_METHOD_PARAMS,
  [Process.fix]: FIX_METHOD_PARAMS,
};
