import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsRoot = fileURLToPath(new URL('./', import.meta.url));
const dependency = (...parts) => path.join(testsRoot, 'node_modules', ...parts);

export default {
  rootDir: '..',
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      dependency('babel-jest'),
      {
        presets: [
          [dependency('@babel', 'preset-env'), { targets: { node: 'current' } }],
          dependency('@babel', 'preset-typescript')
        ]
      }
    ]
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/interfaces/**/*.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/unit',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'json', 'json-summary', 'lcov', 'cobertura'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 40,
      lines: 55,
      statements: 55
    }
  }
};
