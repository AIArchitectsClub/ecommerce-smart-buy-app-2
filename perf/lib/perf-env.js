// Loads perf/.env.perf and enforces that the perf DB is never the app's
// own database — see ../../lib/db-safety.js for the shared guard logic
// (also used by the e2e/ Playwright suite).
import { requireNonProdDatabaseUrl } from '../../lib/db-safety.js'

export function loadPerfDatabaseUrl(repoRoot) {
  return requireNonProdDatabaseUrl({ repoRoot, envFileName: '.env.perf', varName: 'PERF_DATABASE_URL' })
}
