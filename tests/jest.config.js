export default {
  testMatch: ['**/unit/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['../src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/']
};

