import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const dataDir = process.env.CHRONICLE_E2E_DATA_DIR ?? mkdtempSync(join(tmpdir(), 'chronicle-playwright-'));
process.env.CHRONICLE_E2E_DATA_DIR = dataDir;
process.env.DBF_DATA_DIR = dataDir;
process.env.PUBLIC_BASE_URL = 'http://127.0.0.1:5173';
process.env.VITE_API_URL = 'http://127.0.0.1:8787';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  globalTeardown: './tests/e2e/global-teardown.ts',
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5173',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: [
    {
      command: 'npm run serve',
      url: 'http://127.0.0.1:8787/api/health',
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
