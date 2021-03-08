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
  prepend = 'adapter.prepend',
  check = 'adapter.check',
  remove = 'adapter.remove',
  replace = 'adapter.replace',
  update = 'adapter.update',
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
