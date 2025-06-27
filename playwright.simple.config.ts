import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.test.ts',
  timeout: 30000, // 30 seconds
  expect: {
    timeout: 5000, // 5 seconds
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 10000, // 10 seconds
    navigationTimeout: 15000, // 15 seconds
  },
});
