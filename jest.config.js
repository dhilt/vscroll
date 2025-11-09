export default {
  testMatch: ['**/tests/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transform: {
    '^.+\\.ts$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/']
};

