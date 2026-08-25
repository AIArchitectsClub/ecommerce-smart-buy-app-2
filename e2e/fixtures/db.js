// Direct DB connection for test cleanup/assertions only — never imported
// by the app itself. Builds its own pool from .env.e2e's E2E_DATABASE_URL
// via the shared guard (../../lib/db-safety.js), independent of however
// the app's own server/db.js sources its DATABASE_URL.
import pg from 'pg'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireNonProdDatabaseUrl } from '../../lib/db-safety.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..', '..')
const e2eDatabaseUrl = requireNonProdDatabaseUrl({
  repoRoot,
  envFileName: '.env.e2e',
  varName: 'E2E_DATABASE_URL',
})
const pool = new pg.Pool({ connectionString: e2eDatabaseUrl, ssl: { rejectUnauthorized: false } })

// Deleting a user cascades to their orders -> order_items via FK
// (ON DELETE CASCADE both levels), so this is the only delete a test needs.
export async function deleteTestUser(email) {
  await pool.query('DELETE FROM "user" WHERE email = $1', [email])
}

export async function getProductStock(productId) {
  const { rows } = await pool.query('SELECT stock FROM products WHERE id = $1', [productId])
  return rows[0]?.stock
}

// Additive restore — adds back exactly what a test consumed, rather than
// resetting to a hardcoded snapshot, so it can't clobber concurrent runs.
export async function restoreStock(productId, amount) {
  if (amount === 0) return
  await pool.query('UPDATE products SET stock = stock + $2 WHERE id = $1', [productId, amount])
}

export async function snapshotState() {
  const { rows: userCount } = await pool.query('SELECT count(*) FROM "user"')
  const { rows: orderCount } = await pool.query('SELECT count(*) FROM orders')
  const { rows: stock } = await pool.query('SELECT id, stock FROM products ORDER BY id')
  return {
    userCount: Number(userCount[0].count),
    orderCount: Number(orderCount[0].count),
    stock,
  }
}

// A dedicated, disposable product for tests that need to control stock
// precisely (insufficient-stock and concurrency races) without touching
// any seeded product other tests/specs might also be using.
export async function createTestProduct({ id, categoryId = 'electronics', name, price = 9.99, stock }) {
  await pool.query(
    `INSERT INTO products (id, category_id, name, description, price, stock, image, rating)
     VALUES ($1, $2, $3, 'e2e test product', $4, $5, '\u{1F9EA}', 5.0)
     ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock`,
    [id, categoryId, name, price, stock],
  )
}

// Call only after deleting any test users that ordered this product —
// order_items.product_id has no ON DELETE CASCADE, so a referencing row
// would otherwise block this delete with a FK violation.
export async function deleteTestProduct(id) {
  await pool.query('DELETE FROM products WHERE id = $1', [id])
}

export async function closeDb() {
  await pool.end()
}
