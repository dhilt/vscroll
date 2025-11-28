import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'], // Detailed console output
    ['html', { outputFolder: './playwright-report', open: 'never' }]
  ],
  timeout: 5000, // 5 seconds per test

  use: {
    baseURL: 'about:blank',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
    // headless: true,
    // slowMo: 500,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 517 }
      }
    }
  ]
});
