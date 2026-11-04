import pg from 'pg'
import 'dotenv/config'
import { metrics } from '@opentelemetry/api'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Copy .env.example to .env and fill it in.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Optional tuning (used by the incident exercise). Unset keeps pg's defaults:
  // 10 connections and no connect timeout.
  ...(process.env.DB_POOL_MAX ? { max: Number(process.env.DB_POOL_MAX) } : {}),
  ...(process.env.DB_CONNECT_TIMEOUT_MS ? { connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) } : {}),
})

// Pool saturation gauges. No-ops when OTEL_ENABLED isn't set.
const meter = metrics.getMeter('smartbuy-api')
meter
  .createObservableGauge('db_pool_connections_active', { description: 'Connections checked out of the pool' })
  .addCallback((o) => o.observe(pool.totalCount - pool.idleCount))
meter
  .createObservableGauge('db_pool_connections_max', { description: 'Configured pool size' })
  .addCallback((o) => o.observe(pool.options.max))
meter
  .createObservableGauge('db_pool_connections_waiting', { description: 'Requests waiting for a free connection' })
  .addCallback((o) => o.observe(pool.waitingCount))

export function poolSnapshot() {
  return { active: pool.totalCount - pool.idleCount, total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount, max: pool.options.max }
}
