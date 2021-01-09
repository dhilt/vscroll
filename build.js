'use strict';

const shell = require('shelljs');
const chalk = require('chalk');
const config = require('./package.json');

const DIST_DIR = `dist`;
const TYPINGS_DIR = `${DIST_DIR}/typings`;

// Package version 
shell.echo(`Setup package version`);
const versionContent = `export default {
  name: '${config.name}',
  version: '${config.version}'
};`;
const versionFilePath = `./src/version.ts`;
shell.touch(versionFilePath);
shell.echo(versionContent).to(versionFilePath);
shell.echo(chalk.green(`${config.name} v${config.version}`));

shell.echo(`Start building...`);

shell.rm(`-Rf`, `${DIST_DIR}/*`);

shell.echo(`Create TS declarations`);
if (shell.exec(`tsc -p tsconfig-cjs.json --declaration --emitDeclarationOnly --outDir ${TYPINGS_DIR}`).code !== 0) {
  shell.echo(chalk.red(`Error: tsc declarations failed`));
  shell.exit(1);
}

shell.echo(`Run TS -> ESM conversion`);
if (shell.exec(`tsc -p tsconfig.json`).code !== 0) {
  shell.echo(chalk.red(`Error: tsc conversion failed`));
  shell.exit(1);
}

shell.echo(`Run TS -> CommonJS conversion`);
if (shell.exec(`tsc -p tsconfig-cjs.json`).code !== 0) {
  shell.echo(chalk.red(`Error: tsc conversion failed`));
  shell.exit(1);
}

shell.echo(`Run Rollup conversion on package`);
if (shell.exec(`rollup -c rollup.config.js`).code !== 0) {
  shell.echo(chalk.red(`Error: Rollup conversion failed`));
  shell.exit(1);
}

shell.echo(chalk.green(`End building`));
