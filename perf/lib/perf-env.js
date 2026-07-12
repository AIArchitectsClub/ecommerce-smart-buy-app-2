// Loads perf/.env.perf and enforces that the perf DB is never the app's
// own database — used by run.mjs, setup-db.mjs, and reset-test-data.js so
// the guard lives in exactly one place.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

function parseEnvFile(filePath) {
  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=')
        return [line.slice(0, idx), line.slice(idx + 1)]
      }),
  )
}

export function loadPerfDatabaseUrl(repoRoot) {
  const envPerfPath = path.join(repoRoot, '.env.perf')
  if (!existsSync(envPerfPath)) {
    console.error(
      '\nMissing .env.perf — refusing to run.\n' +
        'Create .env.perf (gitignored, see .env.perf.example) with:\n' +
        '  PERF_DATABASE_URL=<a non-production database connection string>\n' +
        "This suite will NOT fall back to the app's own DATABASE_URL/.env.\n",
    )
    process.exit(1)
  }

  const perfEnv = parseEnvFile(envPerfPath)
  const perfDatabaseUrl = perfEnv.PERF_DATABASE_URL?.trim()
  if (!perfDatabaseUrl) {
    console.error('.env.perf exists but PERF_DATABASE_URL is not set in it. Refusing to run.')
    process.exit(1)
  }

  const appEnvPath = path.join(repoRoot, '.env')
  if (existsSync(appEnvPath)) {
    const appEnv = parseEnvFile(appEnvPath)
    const appDatabaseUrl = appEnv.DATABASE_URL?.trim()
    if (appDatabaseUrl && appDatabaseUrl === perfDatabaseUrl) {
      console.error(
        '\nPERF_DATABASE_URL in .env.perf is IDENTICAL to DATABASE_URL in .env.\n' +
          "This almost certainly means the app's real database was pasted in by mistake.\n" +
          'Refusing to run — use a genuinely separate non-production database.\n',
      )
      process.exit(1)
    }
  }

  return perfDatabaseUrl
}
