import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireNonProdDatabaseUrl } from '../lib/db-safety.js'

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Mandatory, mechanical non-production database gate — mirrors
// playwright.config.js. Reuses the existing E2E_DATABASE_URL (confirmed
// with the user as safe to reuse for these probes), never the app's own
// .env DATABASE_URL. This override happens BEFORE webServer spawns the
// app, and Node's child_process inherits process.env at spawn time.
process.env.DATABASE_URL = requireNonProdDatabaseUrl({
  repoRoot,
  envFileName: '.env.e2e',
  varName: 'E2E_DATABASE_URL',
})

const PORT = process.env.SECURITY_TEST_PORT || '3003'
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './probes',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'security/results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: 'npm run build && npm start',
    cwd: repoRoot,
    url: BASE_URL,
    // Same reasoning as playwright.config.js: Better Auth validates the
    // request Origin against baseURL, so it must be overridden to this port.
    // NODE_ENV=production deliberately matches the real deployment (see
    // render.yaml) — several security-relevant defaults (e.g. better-auth's
    // rate limiter) are gated on isProduction, so testing in dev mode would
    // give a false read on behavior the real deployment doesn't have.
    // OTEL_ENABLED is force-disabled for the same reason as playwright.config.js.
    env: {
      PORT,
      DATABASE_URL: process.env.DATABASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      NODE_ENV: 'production',
      OTEL_ENABLED: 'false',
    },
    timeout: 120_000,
    // Never reuse a stray already-running server — it could be pointed at
    // a different database (dev, e2e, or worse, production).
    reuseExistingServer: false,
  },
})
