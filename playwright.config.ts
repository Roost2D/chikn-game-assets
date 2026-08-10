import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test-browser',
  timeout: 180_000,
  expect: { timeout: 120_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run showcase:data && npm run dev -w chikn-game-assets-showcase -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/#rig',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
