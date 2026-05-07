require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

const isCI = !!process.env.CI;
const ghToken = process.env.GH_TOKEN || '';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: false,
      environmentInfo: {
        node_version: process.version,
        platform: process.platform,
        ci: String(isCI),
      },
    }],
  ],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      fullyParallel: false,
      workers: isCI ? 1 : 2,
      use: {
        baseURL: 'https://api.github.com',
        extraHTTPHeaders: {
          Authorization: ghToken ? `Bearer ${ghToken}` : '',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'masdrtest-playwright-e2e',
        },
        // Traces capture the bearer token in request headers — keep them off here.
        trace: 'off',
      },
    },
    {
      name: 'gui',
      testDir: './tests/gui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://github.com',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
  ],
});
