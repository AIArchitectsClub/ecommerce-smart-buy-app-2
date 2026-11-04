// Prepares the demo database: makes sure the demo accounts exist, refills stock, and gives the
// demo customer a first order (Express Pay reuses the address and card from the last order).
// Run with the shop server already running:  node load/seed.mjs
import { pool } from '../server/db.js'
import { Client, DEMO_CUSTOMER, SHIPPING, SHOPPERS } from './lib.mjs'

const STOCK = Number(process.env.DEMO_STOCK || 500)

// Neon suspends an idle database; the first connection after a pause can take several seconds.
async function wakeDatabase() {
  for (let i = 1; i <= 8; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (e) {
      console.log(`waiting for the database (${i}/8): ${e.message}`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  throw new Error('the database did not respond')
}

async function main() {
  await wakeDatabase()
  for (const user of [DEMO_CUSTOMER, ...SHOPPERS]) {
    const how = await new Client(user).ensureAccount()
    console.log(`account ${user.email}: ${how}`)
  }

  await pool.query('UPDATE products SET stock = $1', [STOCK])
  console.log(`stock reset to ${STOCK} per product`)

  const { rows: users } = await pool.query('SELECT id FROM "user" WHERE email = $1', [DEMO_CUSTOMER.email])
  const userId = users[0].id
  const { rows: existing } = await pool.query('SELECT 1 FROM orders WHERE user_id = $1 LIMIT 1', [userId])
  if (existing.length === 0) {
    const { rows: products } = await pool.query('SELECT * FROM products ORDER BY id LIMIT 1')
    const p = products[0]
    const { rows: orders } = await pool.query(
      `INSERT INTO orders (user_id, status, subtotal, shipping_fee, tax, total,
        shipping_full_name, shipping_email, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_phone,
        payment_method, payment_card_last4)
       VALUES ($1,'paid',$2,0,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Visa','4242') RETURNING id`,
      [userId, p.price, (p.price * 0.08).toFixed(2), (p.price * 1.08).toFixed(2), SHIPPING.fullName, SHIPPING.email,
        SHIPPING.address, SHIPPING.city, SHIPPING.state, SHIPPING.zip, SHIPPING.phone],
    )
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, name, image, price, quantity, line_total)
       VALUES ($1,$2,$3,$4,$5,1,$5)`,
      [orders[0].id, p.id, p.name, p.image, p.price],
    )
    console.log('first order created for the demo customer')
  }
  await pool.end()
}

main().catch((e) => {
  console.error('seed failed:', e.message)
  process.exit(1)
})
