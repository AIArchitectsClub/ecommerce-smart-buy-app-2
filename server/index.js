import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'
import { logger } from './logger.js'
import categoriesRouter from './routes/categories.js'
import productsRouter from './routes/products.js'
import ordersRouter from './routes/orders.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = express()
app.set('trust proxy', 1)

app.use(helmet())
app.use(pinoHttp({ logger }))

// Must be mounted before express.json() — Better Auth needs the raw body.
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.use('/api/categories', categoriesRouter)
app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

app.use(express.static(distDir))
app.use((req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.use((err, req, res, next) => {
  req.log.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`))
