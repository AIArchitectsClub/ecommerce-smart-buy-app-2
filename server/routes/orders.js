import { Router } from 'express'
import { pool } from '../db.js'
import { computeTotals } from '../lib/pricing.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

function toOrderJson(order, items) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shipping_fee),
    tax: Number(order.tax),
    total: Number(order.total),
    shipping: {
      fullName: order.shipping_full_name,
      email: order.shipping_email,
      address: order.shipping_address,
      city: order.shipping_city,
      state: order.shipping_state,
      zip: order.shipping_zip,
      phone: order.shipping_phone,
    },
    payment: {
      method: order.payment_method,
      cardLast4: order.payment_card_last4,
    },
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.name,
      image: item.image,
      price: Number(item.price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
    })),
  }
}

router.get('/mine', async (req, res, next) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id],
    )
    const { rows: items } = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ANY($1::uuid[])',
      [orders.map((o) => o.id)],
    )
    const itemsByOrder = new Map()
    for (const item of items) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, [])
      itemsByOrder.get(item.order_id).push(item)
    }
    res.json(orders.map((order) => toOrderJson(order, itemsByOrder.get(order.id) || [])))
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const { rows: orderRows } = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    )
    if (orderRows.length === 0) return res.status(404).json({ error: 'Not found' })
    const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id])
    res.json(toOrderJson(orderRows[0], items))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const { items, shipping, payment } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' })
  }
  const requiredShippingFields = ['fullName', 'email', 'address', 'city', 'state', 'zip', 'phone']
  if (!shipping || requiredShippingFields.some((f) => !shipping[f]?.trim())) {
    return res.status(400).json({ error: 'Complete shipping information is required' })
  }
  if (!payment?.method || !payment?.cardLast4) {
    return res.status(400).json({ error: 'Payment information is required' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const decrementedProducts = []
    const insufficient = []

    for (const item of items) {
      const { rows } = await client.query(
        `UPDATE products SET stock = stock - $2
         WHERE id = $1 AND stock >= $2
         RETURNING id, name, price, image, stock`,
        [item.productId, item.quantity],
      )
      if (rows.length === 0) {
        const { rows: currentRows } = await client.query('SELECT name, stock FROM products WHERE id = $1', [
          item.productId,
        ])
        insufficient.push({
          productId: item.productId,
          name: currentRows[0]?.name || item.productId,
          requested: item.quantity,
          available: currentRows[0]?.stock ?? 0,
        })
      } else {
        decrementedProducts.push({ ...rows[0], quantity: item.quantity })
      }
    }

    if (insufficient.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Some items are no longer available in the requested quantity', insufficient })
    }

    const subtotal = decrementedProducts.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0)
    const totals = computeTotals(Math.round(subtotal * 100) / 100)

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (
        user_id, status, subtotal, shipping_fee, tax, total,
        shipping_full_name, shipping_email, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_phone,
        payment_method, payment_card_last4
      ) VALUES ($1, 'paid', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        req.user.id,
        totals.subtotal,
        totals.shippingFee,
        totals.tax,
        totals.total,
        shipping.fullName.trim(),
        shipping.email.trim(),
        shipping.address.trim(),
        shipping.city.trim(),
        shipping.state.trim(),
        shipping.zip.trim(),
        shipping.phone.trim(),
        payment.method,
        payment.cardLast4,
      ],
    )
    const order = orderRows[0]

    const insertedItems = []
    for (const p of decrementedProducts) {
      const lineTotal = Math.round(Number(p.price) * p.quantity * 100) / 100
      const { rows } = await client.query(
        `INSERT INTO order_items (order_id, product_id, name, image, price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [order.id, p.id, p.name, p.image, p.price, p.quantity, lineTotal],
      )
      insertedItems.push(rows[0])
    }

    await client.query('COMMIT')
    res.status(201).json(toOrderJson(order, insertedItems))
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})

export default router
