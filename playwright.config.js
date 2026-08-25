import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireNonProdDatabaseUrl } from './lib/db-safety.js'

const repoRoot = path.dirname(fileURLToPath(import.meta.url))

// Mandatory, mechanical non-production database gate — see lib/db-safety.js.
// Refuses to run at all if .env.e2e is missing or matches the app's real
// .env DATABASE_URL. This override happens BEFORE webServer spawns the
// app, and Node's child_process inherits process.env at spawn time, so
// the spawned server boots against the e2e database, never the app's own.
process.env.DATABASE_URL = requireNonProdDatabaseUrl({
  repoRoot,
  envFileName: '.env.e2e',
  varName: 'E2E_DATABASE_URL',
})

const PORT = process.env.E2E_PORT || '3002'
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.js',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  // Shared mutable DB (stock, orders) across specs — correctness over
  // speed until the suite is large enough for this to actually matter.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: !!process.env.CI,
    launchOptions: { slowMo: process.env.CI ? 0 : 250 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm start',
    url: BASE_URL,
    // BETTER_AUTH_URL must also be overridden to this port — Better Auth
    // validates the request Origin against baseURL, and .env's value is
    // hardcoded to the main dev port (3001). Without this, every auth call
    // is rejected with "Invalid origin" against the e2e port (3002).
    // OTEL_ENABLED is force-disabled — without this override, dotenv would
    // pick up .env's own value (true, for local dev) and this suite's runs
    // would silently export spans/metrics into the dev observability stack.
    env: { PORT, DATABASE_URL: process.env.DATABASE_URL, BETTER_AUTH_URL: BASE_URL, OTEL_ENABLED: 'false' },
    timeout: 120_000,
    // Deliberately never reuse an already-running server, even locally —
    // a stray server on this port from a dev session or the perf suite
    // would be running against a DIFFERENT database, which is exactly
    // the isolation bug this suite exists to prevent.
    reuseExistingServer: false,
  },
})
