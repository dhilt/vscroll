import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const testsRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceRoot = fileURLToPath(new URL('../../src/', import.meta.url)).replaceAll(
  '\\',
  '/'
);
const testFilesRoot = testsRoot.replaceAll('\\', '/');

export default defineConfig({
  root: testsRoot,
  server: {
    fs: {
      allow: [repositoryRoot]
    }
  },
  test: {
    include: ['e2e/specs/**/*.spec.ts'],
    fileParallelism: process.env.CI === 'true',
    attachmentsDir: '.vitest-attachments',
    globals: true,
    testTimeout: 5000,
    hookTimeout: 5000,
    coverage: {
      provider: 'istanbul',
      allowExternal: true,
      exclude: [
        `${testFilesRoot}**/*`,
        '**/node_modules/**',
        `${sourceRoot}interfaces/**/*.ts`
      ],
      reportsDirectory: '../coverage/e2e',
      reporter: ['text', 'json', 'json-summary', 'lcov', 'cobertura'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 85,
        statements: 85
      }
    },
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: true,
      screenshotDirectory: '.vitest-attachments/screenshots',
      viewport: { width: 1024, height: 768 },
      instances: [{ browser: 'chromium' }]
    }
  }
});
