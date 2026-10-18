import { defineConfig, devices } from '@playwright/test';

import { CLIENT_PORT, CLIENT_URL, MOCK_ENV, SERVER_PORT, SERVER_URL, SESSIONS_DIR } from './env';

const env = {
  ...(process.env as Record<string, string>),
  ...MOCK_ENV,
  SERVER_PORT: String(SERVER_PORT),
  VITE_DEV_PORT: String(CLIENT_PORT),
  SERVER_DOMAIN: CLIENT_URL,
  SESSIONS_DIR,
};

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // The tests read the mock's request log, which one test at a time keeps to itself
  workers: 1,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: CLIENT_URL,
    locale: 'en-GB',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'yarn ts-node app.ts',
      cwd: '../server',
      url: `${SERVER_URL}/mock-strava/avatar.svg`,
      env,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'yarn vite',
      cwd: '../client',
      url: CLIENT_URL,
      env,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
