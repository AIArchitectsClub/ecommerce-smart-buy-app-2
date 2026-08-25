# SmartBuy

A full-stack e-commerce demo: browse products by category, add to cart,
check out through a multi-stage flow (shipping → dummy payment → review),
and get a receipt. Stock quantities decrement atomically when an order is
placed.

Stack: React + Vite (frontend), Express + Neon Postgres (backend), Better
Auth (accounts), deployed to Render as a single process.

## Setup

1. Create a Neon Postgres project and copy its connection string.
2. `cp .env.example .env` and fill in `DATABASE_URL` (and `BETTER_AUTH_SECRET`
   once auth is wired up).
3. `npm install`
4. `npm run db:setup` — creates tables and seeds categories/products.
5. `npm run dev` — starts the Vite dev server (frontend) and the Express API
   together, proxied so both run same-origin at `http://localhost:5173`.

## Production

```bash
npm run build   # builds the frontend into dist/
npm start       # serves the built frontend + API on one port (PORT env var, default 3001)
```

## Performance testing (k6)

`perf/` holds a repeatable load-test suite sized to this app's NFRs
(5 TPS today, 10 TPS future-projected; p95<300ms browse/auth, p95<600ms
checkout). Requires [k6](https://k6.io) on PATH.

**Runs against a dedicated non-production database — never the database
in `.env`.** One-time setup:
1. `cp .env.perf.example .env.perf` and fill in `PERF_DATABASE_URL` with a
   connection string for a database that is NOT the one in `.env` (a
   separate Neon project/branch, a disposable local Postgres instance,
   etc.).
2. `npm run perf:db:setup` — creates tables and seeds categories/products
   in that database (safe to re-run; only needed once per new
   `PERF_DATABASE_URL`).

`perf/run.mjs` refuses to run at all if `.env.perf` is missing, if
`PERF_DATABASE_URL` is unset, or if it's identical to `.env`'s
`DATABASE_URL` — there's no fallback path to the app's real database.

```bash
npm run perf:smoke          # short, low-rate sanity check
npm run perf:load           # sustained run at today's NFR-derived rate (5 TPS)
PERF_TARGET_TPS=10 npm run perf:load   # re-run at the future-projected rate
```

Each run builds and boots the real production artifact against
`PERF_DATABASE_URL`, runs k6 against it, then automatically deletes the
perf-tagged test users/orders it created and restores any stock they
consumed — safe to run repeatedly. Reports land in `perf/results/`
(gitignored): `*-report-<runId>.html` for a human-readable breakdown,
`*-raw-<runId>.json` for the full time series to dig into a threshold
breach. A failing threshold exits non-zero, so `npm run perf:load` is a
valid pre-merge CI gate.

## Observability (OpenTelemetry + Grafana)

The app can export structured logs, traces, and metrics to a local Grafana
stack (Tempo for traces, Prometheus for metrics, Loki for logs, all bundled
in `grafana/otel-lgtm`). Off by default; nothing changes unless you opt in.

1. `docker compose -f docker-compose.observability.yml up -d` — starts the
   stack. Grafana: http://localhost:3000 (admin/admin). Data persists in a
   named Docker volume across restarts.
2. In `.env`, set `OTEL_ENABLED=true` (`OTEL_SERVICE_NAME` and
   `OTEL_EXPORTER_OTLP_ENDPOINT` have sane defaults — see `.env.example`).
3. `npm run dev` or `npm start` as usual. Every request creates an HTTP span
   (and a child span per Postgres query), custom counters track orders
   placed / rejected for insufficient stock, and every pino log line carries
   the active `trace_id`/`span_id` so a log and its trace are one click apart
   in Grafana.

`e2e/`, `security/`, and `perf/` force `OTEL_ENABLED=false` (or never load
the instrumentation entrypoint at all) regardless of `.env`, so those suites
never cross-contaminate the dev observability stack — same isolation
principle as the database gating above.

Note: `@opentelemetry/instrumentation-express` is explicitly disabled in
`server/instrumentation.js` — its Express 5 support currently breaks route
matching for some routes. HTTP and Postgres spans still cover the full
request path; only the extra per-route-layer span is missing.

## Project layout

- `src/` — React frontend (catalog browsing, cart, multi-stage checkout, receipts)
- `server/` — Express API + Neon Postgres access (`server/db.js`, `server/routes/*`, `server/db/schema.sql`, `server/instrumentation.js`, `server/logger.js`)
- `perf/` — k6 load-test suite (see above)
- `docker-compose.observability.yml` — local Grafana/Tempo/Prometheus/Loki stack (see Observability above)
