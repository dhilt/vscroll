import { plugins } from './plugins';
import pkg from '../package.json';

export default {
  input: 'dist/esm2015/index.js',
  output: [
    {
      file: 'dist/bundles/' + pkg.name + '.esm6.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/bundles/' + pkg.name + '.esm6.min.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      plugins: [plugins.terser()]
    }
  ],
  plugins: [
    plugins.sourcemaps(),
    plugins.license('FESM2015')
  ],
  external: ['tslib']
};
