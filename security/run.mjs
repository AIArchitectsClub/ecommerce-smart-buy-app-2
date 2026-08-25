// Orchestrates a full security-probe run: runs the Phase 2 dynamic probes
// (Playwright manages booting/tearing down the app itself via
// security.config.js's webServer), then always cleans up sectest-tagged
// data afterward regardless of pass/fail. Exits with Playwright's own exit
// code so a failing probe (== a confirmed vulnerability) is a non-zero
// result, same as perf/run.mjs does for NFR thresholds.
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
mkdirSync(path.join(__dirname, 'results'), { recursive: true })

const RUN_ID = `${Date.now()}`

console.log(`Running security probe suite (run id ${RUN_ID})...`)
const testResult = spawnSync(
  'npx',
  ['playwright', 'test', '--config=security/security.config.js'],
  { stdio: 'inherit', cwd: repoRoot, shell: true, env: { ...process.env, SECURITY_TEST_RUN_ID: RUN_ID } },
)

console.log('Cleaning up sectest-tagged test data...')
const cleanup = spawnSync('node', ['security/cleanup.mjs', RUN_ID], { stdio: 'inherit', cwd: repoRoot })
if (cleanup.status !== 0) {
  console.error('WARNING: cleanup script failed — check for leftover sectest-tagged rows/stock manually.')
}

process.exit(testResult.status ?? 1)
