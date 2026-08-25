// One-time schema+seed setup for the dedicated e2e database, mirroring
// perf/setup-db.mjs. Safe to re-run (schema.sql/auth-schema.sql are
// idempotent), but only needs to run once per new E2E_DATABASE_URL.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { requireNonProdDatabaseUrl } from '../lib/db-safety.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

const e2eDatabaseUrl = requireNonProdDatabaseUrl({
  repoRoot,
  envFileName: '.env.e2e',
  varName: 'E2E_DATABASE_URL',
})
const pool = new pg.Pool({ connectionString: e2eDatabaseUrl, ssl: { rejectUnauthorized: false } })

async function main() {
  const authSchema = readFileSync(path.join(repoRoot, 'server', 'db', 'auth-schema.sql'), 'utf8')
  const appSchema = readFileSync(path.join(repoRoot, 'server', 'db', 'schema.sql'), 'utf8')
  await pool.query(authSchema)
  await pool.query(appSchema)
  console.log('e2e database schema created and seeded.')
  await pool.end()
}

main().catch((err) => {
  console.error('Failed to set up e2e database:', err)
  process.exit(1)
})
