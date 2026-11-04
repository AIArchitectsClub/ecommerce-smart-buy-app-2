import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'
import { metrics } from '@opentelemetry/api'
import { logger } from './logger.js'
import { pool, poolSnapshot } from './db.js'
import { expressPayStats, routeLabel } from './lib/requestInfo.js'
import categoriesRouter from './routes/categories.js'
import productsRouter from './routes/products.js'
import ordersRouter from './routes/orders.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = express()
app.set('trust proxy', 1)

app.use(helmet())
const SERVICE_VERSION = process.env.SERVICE_VERSION || process.env.RENDER_GIT_COMMIT?.slice(0, 7) || 'local'

// One readable line per request (also shipped to Loki), with pool state so saturation is visible in the logs.
function poolText() {
  const p = poolSnapshot()
  return `pool_active=${p.active}/${p.max} pool_waiting=${p.waiting}`
}
app.use(
  pinoHttp({
    logger,
    // pino-http logs everything at 'info' unless told otherwise; make failures findable by level.
    customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    customSuccessMessage: (req, res, ms) => {
      const path = routeLabel(req)
      if (res.statusCode >= 500) {
        const msg = String(res.locals.errorMessage || 'Internal server error').replace(/"/g, "'")
        return `request failed path=${path} status=${res.statusCode} error="${msg}" ${poolText()} duration_ms=${Math.round(ms)}`
      }
      if (res.statusCode >= 400) return `request rejected path=${path} status=${res.statusCode} duration_ms=${Math.round(ms)}`
      if (ms > 1000) return `slow request path=${path} duration_ms=${Math.round(ms)} ${poolText()} waiting for db connection`
      return `request ok path=${path} status=${res.statusCode} duration_ms=${Math.round(ms)}`
    },
    customErrorMessage: (req, res, err) =>
      `request failed path=${routeLabel(req)} status=${res.statusCode} error="${String(res.locals.errorMessage || err?.message).replace(/"/g, "'")}" ${poolText()}`,
  }),
)

// Request counter and latency histogram (names the incident console and alert rule read). No-ops without OTEL.
const meter = metrics.getMeter('smartbuy-api')
const requestCounter = meter.createCounter('http_server_requests', { description: 'HTTP requests handled by the API' })
const durationHistogram = meter.createHistogram('http_server_duration_ms', { unit: 'ms' })
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next()
  const start = performance.now()
  res.on('finish', () => {
    const attrs = { http_route: routeLabel(req), http_status_code: String(res.statusCode), service_version: SERVICE_VERSION }
    requestCounter.add(1, attrs)
    durationHistogram.record(Math.round(performance.now() - start), attrs)
  })
  next()
})

// Pool and feature state for the incident console (not part of the shop API).
app.get('/internal/health', (req, res) => {
  res.json({
    status: 'ok',
    version: SERVICE_VERSION,
    pool: poolSnapshot(),
    express: { orders: expressPayStats.orders, firstAt: expressPayStats.firstAt, lastAt: expressPayStats.lastAt },
  })
})

// Must be mounted before express.json() — Better Auth needs the raw body.
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.get('/api/features', (req, res) => res.json({ expressPay: process.env.EXPRESS_PAY_ENABLED === 'true' }))

app.use('/api/categories', categoriesRouter)
app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

app.use(express.static(distDir))
app.use((req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.use((err, req, res, next) => {
  res.locals.errorMessage = err?.message
  req.log.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
  const commit = process.env.RENDER_GIT_COMMIT
  logger.info(
    `service started version=${SERVICE_VERSION} pool_max=${pool.options.max}` +
      (commit ? ` commit=${commit.slice(0, 7)} branch=${process.env.RENDER_GIT_BRANCH}` : ''),
  )
})
