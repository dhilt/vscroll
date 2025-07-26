import { createRequire } from 'module';
import { plugins } from './plugins.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

export default {
  input: 'dist/bundles/vscroll.esm5.js',
  output: [
    {
      file: 'dist/bundles/' + pkg.name + '.umd.js',
      format: 'umd',
      name: 'VScroll',
      exports: 'named',
      amd: { id: 'vscroll' },
      sourcemap: true,
      plugins: [plugins.license('UMD')]
    },
    {
      file: 'dist/bundles/' + pkg.name + '.umd.min.js',
      format: 'umd',
      name: 'VScroll',
      exports: 'named',
      amd: { id: 'vscroll' },
      sourcemap: true,
      plugins: [plugins.terser(), plugins.license('UMD', true)]
    }
  ],
  plugins: [
    plugins.resolve(),
    plugins.sourcemaps()
  ]
};
