export enum CommonProcess {
  init = 'init',
  scroll = 'scroll',
  start = 'start',
  preFetch = 'preFetch',
  fetch = 'fetch',
  postFetch = 'postFetch',
  render = 'render',
  preClip = 'preClip',
  clip = 'clip',
  adjust = 'adjust',
  end = 'end',
}

export enum AdapterProcess {
  reset = 'adapter.reset',
  reload = 'adapter.reload',
  append = 'adapter.append',
  check = 'adapter.check',
  remove = 'adapter.remove',
  replace = 'adapter.replace',
  clip = 'adapter.clip',
  insert = 'adapter.insert',
  fix = 'adapter.fix',
}

export enum ProcessStatus {
  start = 'start',
  next = 'next',
  done = 'done',
  error = 'error'
}
