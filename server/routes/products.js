import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

function toProductJson(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: row.stock,
    image: row.image,
    rating: Number(row.rating),
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query
    const { rows } = category
      ? await pool.query('SELECT * FROM products WHERE category_id = $1 ORDER BY name', [category])
      : await pool.query('SELECT * FROM products ORDER BY name')
    res.json(rows.map(toProductJson))
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(toProductJson(rows[0]))
  } catch (err) {
    next(err)
  }
})

export default router
