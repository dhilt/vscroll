import { createRequire } from 'module';
import { plugins } from './plugins.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

export default {
  input: 'dist/esm5/index.js',
  output: [
    {
      file: 'dist/bundles/' + pkg.name + '.esm5.js',
      format: 'es',
      sourcemap: true,
      plugins: [plugins.license('FESM5')]
    },
    {
      file: 'dist/bundles/' + pkg.name + '.esm5.min.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      plugins: [plugins.terser(), plugins.license('FESM5', true)]
    }
  ],
  plugins: [
    plugins.sourcemaps()
  ],
  external: ['tslib']
};
