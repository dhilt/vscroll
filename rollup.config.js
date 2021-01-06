
import typescript from 'rollup-plugin-typescript2'
import commonjs from 'rollup-plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

import pkg from './package.json';

const minPlugins = [terser({ output: { comments: false } })];

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: pkg.main.replace('.js', '.min.js'),
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
      plugins: minPlugins,
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: pkg.module.replace('.js', '.min.js'),
      format: 'es',
      exports: 'named',
      sourcemap: true,
      plugins: minPlugins
    },
  ],
  plugins: [
    external(),
    resolve(),
    typescript({
      rollupCommonJSResolveHack: true,
      exclude: '**/__tests__/**',
      clean: true
    }),
    commonjs({
      include: ['node_modules/**']
    })
  ]
}
