import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Load .env.local before any test or setup code runs.
// Required for DATABASE_URL (used by E2E DB helpers in global-setup and beforeEach resets).
dotenv.config({ path: '.env.local' })

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    // Re-use the dev server if already running — avoids double-start during local dev.
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
})
