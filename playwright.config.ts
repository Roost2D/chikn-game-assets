import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.SHOWCASE_PORT ?? 4173);

export default defineConfig({
  testDir: './test-browser',
  timeout: 180_000,
  expect: { timeout: 120_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: `npm run showcase:data && npm run dev -w chikn-game-assets-showcase -- --host 127.0.0.1 --port ${port} --strictPort --force`,
    url: `http://127.0.0.1:${port}/#rig`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
