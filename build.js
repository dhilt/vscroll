'use strict';

const shell = require('shelljs');
const chalk = require('chalk');
const config = require('./package.json');

const DIST_DIR = 'dist';
const CONF_DIR = 'build';

// Package version 
shell.echo('Setup package version');
const versionContent = `export default {
  name: '${config.name}',
  version: '${config.version}'
};`;
const versionFilePath = './src/version.ts';
shell.touch(versionFilePath);
shell.echo(versionContent).to(versionFilePath);
shell.echo(chalk.green(`${config.name} v${config.version}`));

shell.echo('Start building...');

shell.rm('-Rf', `${DIST_DIR}/*`);

shell.echo('Create TS declarations');
if (shell.exec(`tsc -p ${CONF_DIR}/tsconfig-typings.json`).code !== 0) {
  shell.echo(chalk.red('Error: tsc declarations failed'));
  shell.exit(1);
}

shell.echo('Start transpiling...');

shell.echo('Run TS -> ESM5 conversion');
if (shell.exec(`tsc -p ${CONF_DIR}/tsconfig-esm5.json`).code !== 0) {
  shell.echo(chalk.red('Error: tsc conversion failed'));
  shell.exit(1);
}

shell.echo('Run TS -> ESM2015 conversion');
if (shell.exec(`tsc -p ${CONF_DIR}/tsconfig-esm6.json`).code !== 0) {
  shell.echo(chalk.red('Error: tsc conversion failed'));
  shell.exit(1);
}

shell.echo('Run TS -> CommonJS conversion');
if (shell.exec(`tsc -p ${CONF_DIR}/tsconfig-cjs.json`).code !== 0) {
  shell.echo(chalk.red('Error: tsc conversion failed'));
  shell.exit(1);
}

shell.echo('Indenting 4 -> 2');
shell.ls(`${DIST_DIR}/**/*.js`, `${DIST_DIR}/**/*.d.ts`).forEach(file => {
  shell.sed('-i', /( {4})/g, '  ', file);
});

shell.echo('Start bundling...');

shell.echo('Rollup to FESM5');
if (shell.exec(`rollup -c ${CONF_DIR}/rollup.esm5.config.js`).code !== 0) {
  shell.echo(chalk.red('Error: FESM5 bundling failed'));
  shell.exit(1);
}

shell.echo('Rollup to FESM2015');
if (shell.exec(`rollup -c ${CONF_DIR}/rollup.esm6.config.js`).code !== 0) {
  shell.echo(chalk.red('Error: FESM2015 bundling failed'));
  shell.exit(1);
}

shell.echo('Rollup to UMD');
if (shell.exec(`rollup -c ${CONF_DIR}/rollup.umd.config.js`).code !== 0) {
  shell.echo(chalk.red('Error: UMD bundling failed'));
  shell.exit(1);
}

shell.echo(chalk.green('End building'));
