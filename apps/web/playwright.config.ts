import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @engineering-lab/api exec tsx src/index.ts',
      cwd: '../..',
      url: 'http://127.0.0.1:4000/api/v1/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @engineering-lab/web dev -- --host 127.0.0.1 --port 5173',
      cwd: '../..',
      url: 'http://127.0.0.1:5173/en',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
