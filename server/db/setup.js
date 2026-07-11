import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authSchema = readFileSync(path.join(__dirname, 'auth-schema.sql'), 'utf8')
const appSchema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

async function main() {
  await pool.query(authSchema)
  await pool.query(appSchema)
  console.log('Schema created and seeded.')
  await pool.end()
}

main().catch((err) => {
  console.error('Failed to set up database:', err)
  process.exit(1)
})
