// Data-safety cleanup for the security probe suite (see ../SKILL.md Step 5).
//
// Deletes every sectest-tagged user created by a given run id, and restores
// exactly the stock those users' orders consumed — additive, based on what
// THIS run actually consumed, not a reset to a hardcoded snapshot.
//
// Builds its own pool from .env.e2e's E2E_DATABASE_URL — deliberately does
// NOT import the app's server/db.js pool, which wires itself to the app's
// own DATABASE_URL. Mirrors perf/reset-test-data.js's approach.
import pg from 'pg'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireNonProdDatabaseUrl } from '../lib/db-safety.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const databaseUrl = requireNonProdDatabaseUrl({
  repoRoot,
  envFileName: '.env.e2e',
  varName: 'E2E_DATABASE_URL',
})
const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

const runId = process.argv[2]
if (!runId) {
  console.error('Usage: node security/cleanup.mjs <runId>')
  process.exit(1)
}

async function main() {
  const { rows: users } = await pool.query(`SELECT id FROM "user" WHERE email LIKE $1`, [
    `sectest-${runId}-%`,
  ])
  const userIds = users.map((u) => u.id)

  if (userIds.length === 0) {
    console.log(`No sectest-tagged users found for run ${runId}. Nothing to clean up.`)
    await pool.end()
    return
  }

  const { rows: restored } = await pool.query(
    `UPDATE products p SET stock = stock + consumed.total_qty
     FROM (
       SELECT oi.product_id, SUM(oi.quantity) AS total_qty
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = ANY($1)
       GROUP BY oi.product_id
     ) consumed
     WHERE p.id = consumed.product_id
     RETURNING p.id, p.stock`,
    [userIds],
  )

  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds])

  console.log(`Run ${runId}: deleted ${userIds.length} sectest-tagged user(s).`)
  if (restored.length > 0) {
    console.log('Stock restored:', restored.map((r) => `${r.id} -> ${r.stock}`).join(', '))
  } else {
    console.log('No orders were placed by this run — no stock to restore.')
  }
  await pool.end()
}

main().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
