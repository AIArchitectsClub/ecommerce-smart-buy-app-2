import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, icon FROM categories ORDER BY name')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

export default router
