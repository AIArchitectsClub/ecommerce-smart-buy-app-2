// Shared non-production-database guard, used by both the perf/ (k6) and
// e2e/ (Playwright) test suites. See the standing rule this codifies:
// any heavy, sustained, data-mutating test run must be pointed at a
// database confirmed separate from the app's real DATABASE_URL — this is
// a hard gate, not a preference, enforced mechanically so it can't be
// skipped by forgetting to ask.
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

// envFileName e.g. '.env.perf' or '.env.e2e'; varName e.g. 'PERF_DATABASE_URL'.
export function requireNonProdDatabaseUrl({ repoRoot, envFileName, varName }) {
  const envFilePath = path.join(repoRoot, envFileName)
  if (!existsSync(envFilePath)) {
    console.error(
      `\nMissing ${envFileName} — refusing to run.\n` +
        `Create ${envFileName} (gitignored, see ${envFileName}.example) with:\n` +
        `  ${varName}=<a non-production database connection string>\n` +
        "This suite will NOT fall back to the app's own DATABASE_URL/.env.\n",
    )
    process.exit(1)
  }

  const parsed = parseEnvFile(envFilePath)
  const url = parsed[varName]?.trim()
  if (!url) {
    console.error(`${envFileName} exists but ${varName} is not set in it. Refusing to run.`)
    process.exit(1)
  }

  const appEnvPath = path.join(repoRoot, '.env')
  if (existsSync(appEnvPath)) {
    const appEnv = parseEnvFile(appEnvPath)
    const appDatabaseUrl = appEnv.DATABASE_URL?.trim()
    if (appDatabaseUrl && appDatabaseUrl === url) {
      console.error(
        `\n${varName} in ${envFileName} is IDENTICAL to DATABASE_URL in .env.\n` +
          "This almost certainly means the app's real database was pasted in by mistake.\n" +
          'Refusing to run — use a genuinely separate non-production database.\n',
      )
      process.exit(1)
    }
  }

  return url
}
