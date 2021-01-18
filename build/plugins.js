import resolve from '@rollup/plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';
import license from 'rollup-plugin-license';
import { terser } from 'rollup-plugin-terser';

export const plugins = {
  resolve: () => resolve(),
  sourcemaps: () => sourcemaps(),
  license: (token, min) => license({
    sourcemap: true,
    banner: !min
      ? `vscroll (https://github.com/dhilt/vscroll) ${token || ''}
Version: <%= pkg.version %> (<%= (new Date()).toISOString() %>)
Author: Denis Hilt
License: MIT`
      : `vscroll ${token ? '(' + token + ') ' : ''} by Denis Hilt | https://github.com/dhilt/vscroll | <%= (new Date()).toISOString() %> | MIT license`
  }),
  terser: () => terser({ output: { comments: false } })
};
