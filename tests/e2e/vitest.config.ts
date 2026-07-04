import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const testsRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  root: testsRoot,
  server: {
    fs: {
      allow: [repositoryRoot]
    }
  },
  test: {
    include: ['e2e/specs/**/*.spec.ts'],
    globals: true,
    testTimeout: 5000,
    hookTimeout: 5000,
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      viewport: { width: 1024, height: 768 },
      instances: [{ browser: 'chromium' }]
    }
  }
});
