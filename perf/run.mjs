// Orchestrates a full perf-test run so `npm run perf:smoke` / `perf:load`
// is genuinely one command: build the real production artifact, boot it,
// wait for it to be healthy, run k6 against it, tear the server down, then
// clean up any perf-tagged data the run created — regardless of whether
// the k6 run passed or failed. Exits with k6's own exit code so a CI job
// running this script is gated by the NFR thresholds automatically.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
mkdirSync(path.join(__dirname, 'results'), { recursive: true })

const mode = process.argv[2]
if (mode !== 'smoke' && mode !== 'load') {
  console.error('Usage: node perf/run.mjs <smoke|load>')
  process.exit(1)
}

const PORT = process.env.PORT || '3001'
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
const RUN_ID = `${Date.now()}`

function resolveK6Path() {
  // Prefer plain `k6` (works once it's on PATH, any OS). Fall back to the
  // default Windows winget install location for a same-session run right
  // after install, before a terminal restart has picked up the updated PATH.
  const probe = spawnSync('k6', ['version'], { stdio: 'ignore' })
  if (probe.status === 0) return 'k6'
  if (process.platform === 'win32') {
    const winDefault = 'C:\\Program Files\\k6\\k6.exe'
    const probeWin = spawnSync(winDefault, ['version'], { stdio: 'ignore' })
    if (probeWin.status === 0) return winDefault
  }
  console.error('Could not find the k6 binary on PATH. Install it (winget install k6 / brew install k6) and retry.')
  process.exit(1)
}

async function waitForHealthy(url, attempts = 30, delayMs = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${url}/api/categories`)
      if (res.ok) return true
    } catch {
      // server not up yet — keep polling
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: repoRoot, ...opts })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`)
  }
}

async function main() {
  console.log('Building production artifact...')
  run('npm', ['run', 'build'], { shell: true })

  console.log(`Starting server on ${BASE_URL}...`)
  const server = spawn('node', ['server/index.js'], {
    cwd: repoRoot,
    env: { ...process.env, PORT },
    stdio: 'inherit',
  })

  let k6ExitCode = 1
  try {
    const healthy = await waitForHealthy(BASE_URL)
    if (!healthy) {
      throw new Error(`Server did not become healthy at ${BASE_URL} within the timeout.`)
    }

    const k6Bin = resolveK6Path()
    const scriptPath = path.join('perf', `${mode}.js`)
    console.log(`Running k6 ${mode} test (run id ${RUN_ID})...`)
    const k6Args = ['run', '-e', `BASE_URL=${BASE_URL}`, '-e', `PERF_RUN_ID=${RUN_ID}`]
    for (const passthrough of ['PERF_TARGET_TPS', 'PERF_RAMP', 'PERF_HOLD', 'PERF_RAMPDOWN']) {
      if (process.env[passthrough]) k6Args.push('-e', `${passthrough}=${process.env[passthrough]}`)
    }
    k6Args.push('--out', `json=perf/results/${mode}-raw-${RUN_ID}.json`, scriptPath)

    const k6Result = spawnSync(k6Bin, k6Args, { stdio: 'inherit', cwd: repoRoot })
    k6ExitCode = k6Result.status ?? 1
  } finally {
    server.kill()
  }

  console.log('Cleaning up perf-tagged test data...')
  const cleanup = spawnSync('node', ['perf/reset-test-data.js', RUN_ID], { stdio: 'inherit', cwd: repoRoot })
  if (cleanup.status !== 0) {
    console.error('WARNING: cleanup script failed — check for leftover perf-tagged rows/stock manually.')
  }

  process.exit(k6ExitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
