import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: './playwright-report' }]],
  // timeout: 10 * 60 * 1000, // 10 minutes per test

  use: {
    baseURL: 'about:blank',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // headless: false,  // Show browser window
    // slowMo: 500,      // Slow down actions by 500ms for visibility
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

