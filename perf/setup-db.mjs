// One-time schema+seed setup for a fresh non-production database, so it
// has the same tables/seed data as the app's real database before the
// first perf run. Safe to re-run (schema.sql/auth-schema.sql are
// idempotent), but only needs to run once per new PERF_DATABASE_URL.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { loadPerfDatabaseUrl } from './lib/perf-env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

const perfDatabaseUrl = loadPerfDatabaseUrl(repoRoot)
const pool = new pg.Pool({ connectionString: perfDatabaseUrl, ssl: { rejectUnauthorized: false } })

async function main() {
  const authSchema = readFileSync(path.join(repoRoot, 'server', 'db', 'auth-schema.sql'), 'utf8')
  const appSchema = readFileSync(path.join(repoRoot, 'server', 'db', 'schema.sql'), 'utf8')
  await pool.query(authSchema)
  await pool.query(appSchema)
  console.log('Perf database schema created and seeded.')
  await pool.end()
}

main().catch((err) => {
  console.error('Failed to set up perf database:', err)
  process.exit(1)
})
