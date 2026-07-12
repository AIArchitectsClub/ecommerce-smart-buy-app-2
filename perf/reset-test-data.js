// Data-safety cleanup for the k6 perf suite (see SKILL.md Step 2 /
// cookbook "Data-safety: tagging and cleanup").
//
// Deletes every perf-tagged user created by a given run id, and restores
// exactly the stock those users' orders consumed — an additive restore
// based on what THIS run actually consumed, not a reset to a hardcoded
// snapshot, so it doesn't clobber unrelated concurrent activity.
import { pool } from '../server/db.js'

const runId = process.argv[2]
if (!runId) {
  console.error('Usage: node perf/reset-test-data.js <runId>')
  process.exit(1)
}

async function main() {
  const { rows: users } = await pool.query(`SELECT id FROM "user" WHERE email LIKE $1`, [
    `perf-${runId}-%`,
  ])
  const userIds = users.map((u) => u.id)

  if (userIds.length === 0) {
    console.log(`No perf-tagged users found for run ${runId}. Nothing to clean up.`)
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

  // Deleting the users cascades to their orders -> order_items via FK
  // (ON DELETE CASCADE), so this one statement removes all perf-tagged rows.
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds])

  console.log(`Run ${runId}: deleted ${userIds.length} perf-tagged user(s).`)
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
