import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  // Only start local dev server if not using external URL
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          timeout: 120000,
          reuseExistingServer: !process.env.CI,
        },
      }),
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      // The authenticated suite (T5b) runs in its own serial project below.
      testIgnore: ['**/authenticated/**', '**/auth.setup.ts', '**/auth.teardown.ts'],
    },
    // T5b authenticated suite: programmatic login (auth.setup.ts) → serial
    // journey specs → marker-scoped cleanup (auth.teardown.ts). Locally opt-in
    // via E2E_AUTH=1; always on in CI. See e2e/README.md.
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      teardown: 'auth-cleanup',
    },
    {
      name: 'auth-cleanup',
      testMatch: /auth\.teardown\.ts/,
    },
    {
      name: 'chromium-auth',
      use: { browserName: 'chromium' },
      testMatch: /authenticated\/.+\.spec\.ts/,
      dependencies: ['auth-setup'],
      // The journey crosses several edge-function round-trips per test.
      timeout: 120000,
    },
  ],
});
