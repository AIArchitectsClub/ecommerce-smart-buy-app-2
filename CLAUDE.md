# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SmartBuy — a full-stack e-commerce demo: browse products by category, add to cart, check out through a multi-stage flow (shipping → dummy payment → review), and get a receipt. Stock quantities decrement atomically when an order is placed.

Stack: React 19 + Vite (frontend), Express 5 + Neon Postgres (backend), Better Auth (accounts), deployed to Render as a single Node process.

## Commands

```bash
npm run dev              # Vite dev server + Express API concurrently, proxied to http://localhost:5173
npm run build             # builds frontend into dist/
npm start                 # serves built frontend + API on one port (PORT env, default 3001)
npm run db:setup          # creates tables and seeds categories/products (server/db/setup.js)
npm run lint               # oxlint

npm run test:e2e           # Playwright e2e suite (see e2e/ below)
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:report    # open last HTML report
npx playwright test e2e/checkout-happy-path.spec.js   # run a single spec
npm run e2e:db:setup       # seed the e2e database (run once per new .env.e2e)

npm run perf:smoke         # k6 short sanity check
npm run perf:load          # k6 sustained load run at NFR-derived TPS
npm run perf:db:setup      # seed the perf database (run once per new .env.perf)

npm run security:test      # Playwright-based security probes (see security/ below)

docker compose -f docker-compose.observability.yml up -d    # local Grafana/Tempo/Prometheus/Loki stack
```

There is no unit test runner configured — correctness is covered by the e2e suite.

## Environment setup

Four separate env files, each gitignored, each pointing at a **different** database:

| File | Var | Used by |
|---|---|---|
| `.env` | `DATABASE_URL` | `npm run dev` / `npm start` (the real app) |
| `.env.e2e` | `E2E_DATABASE_URL` | `test:e2e` and `security:test` |
| `.env.perf` | `PERF_DATABASE_URL` | `perf:smoke` / `perf:load` |

Copy the matching `.env*.example` and fill in a Neon connection string before running the corresponding suite. `BETTER_AUTH_SECRET` is also required in `.env`.

**Never point a test suite at the app's real database.** `lib/db-safety.js` (`requireNonProdDatabaseUrl`) is a hard, mechanical gate used by `playwright.config.js`, `security/security.config.js`, and `perf/lib/perf-env.js`: it refuses to run if the suite's env file is missing, or if its DB URL is identical to `.env`'s `DATABASE_URL`. Don't work around this gate — if a suite won't run, fix the env file, don't bypass the check.

## Architecture

**Single Express process serves both API and frontend** (`server/index.js`). In production there's one deployable: `npm run build` outputs static assets to `dist/`, and the Express app serves them with a catch-all `sendFile` for client-side routing, alongside `/api/*` routes.

**Route mounting order matters in `server/index.js`**: Better Auth's handler (`app.all('/api/auth/*splat', ...)`) is mounted *before* `express.json()` because Better Auth needs the raw request body. Keep any new body-parsing middleware after it.

**Auth**: Better Auth (`server/auth.js`), backed directly by the same Postgres `pool` used for app data (not a separate auth DB). `server/middleware/requireAuth.js` guards order routes server-side; `src/components/RequireAuth.jsx` guards checkout/order routes client-side. Both must be kept in sync — client-side guarding is UX only, not a security boundary.

**Sign-in/sign-up must `await getSession()` before navigating** (`src/pages/SignInPage.jsx`, `SignUpPage.jsx`, exported from `src/lib/authClient.js`). Navigating straight into a `RequireAuth`-gated route right after `signIn.email()`/`signUp.email()` resolves is not safe — Better Auth's reactive `useSession()` store can still be stale at that instant, so `RequireAuth` reads a signed-out session and bounces back to `/sign-in`. `getSession()` is a documented trigger that forces the shared session store to refresh before the redirect. Reproduced and fixed locally; don't remove it as dead-looking code.

**Cart/checkout state is cleared on `OrderConfirmationPage`'s mount, not from `CheckoutReviewPage` before navigating to it.** Clearing it earlier can make the still-mounted review page re-render with an empty cart before the route swap finishes, and its own empty-cart guard (`if (cartDetails.length === 0) return <Navigate to="/cart"/>`) wins the race, bouncing back to `/cart` instead of the confirmation page. This was a real, reproduced bug — keep the clearing on the confirmation page.

**`server/index.js` runs `helmet()`** as the first middleware, giving baseline security headers (X-Content-Type-Options, CSP/X-Frame-Options, HSTS) on every response, API included.

**Pricing logic is duplicated intentionally**: `src/lib/pricing.js` (client, for optimistic UI totals) and `server/lib/pricing.js` (server, authoritative) implement identical `computeTotals` logic. The server always recomputes totals from current DB prices at order time — client-computed totals are never trusted. If you change tax rate, shipping fee, or free-shipping threshold, update **both** files.

**Order placement is the one transactional hot path** (`server/routes/orders.js` `POST /`): within a single DB transaction, it decrements stock per line item with a conditional `UPDATE ... WHERE stock >= $qty`, collects any items that failed (insufficient stock) and rolls back the *entire* order if any line item can't be fulfilled, then inserts the order + order_items using server-computed totals. This is the only place that mutates `products.stock`.

**Client state**: three React contexts wrap the whole app in `App.jsx` — `CatalogProvider` (categories/products), `CartProvider` (cart, persisted to `localStorage` via `src/lib/storage.js`), `CheckoutProvider` (in-progress shipping/payment during the multi-step checkout). Cart and customer info survive a page reload via `localStorage`; nothing else does.

**Checkout is a 3-step wizard** enforced by route + `CheckoutSteps` component: `/checkout/shipping` → `/checkout/payment` → `/checkout/review` → `POST /api/orders` → `/order-confirmation/:orderId`. Payment is a dummy form (no real payment processor); only `cardLast4` is persisted.

**DB schema** (`server/db/schema.sql`) also seeds demo categories/products via `INSERT ... ON CONFLICT DO NOTHING`, so `db:setup` is idempotent and safe to rerun. `orders.user_id` references Better Auth's `"user"` table, which lives in `server/db/auth-schema.sql`.

## Observability

OpenTelemetry, gated behind `OTEL_ENABLED` (default off). `server/instrumentation.js` is loaded via `node --import ./server/instrumentation.js` (wired into the `dev`/`start` scripts) *before* `server/index.js`, since HTTP/pg auto-instrumentation must patch those modules before they're first required — see the comment at the top of that file. Ships to a local `grafana/otel-lgtm` container (`docker-compose.observability.yml`): traces → Tempo, metrics → Prometheus, logs → Loki, all in one Grafana UI at `localhost:3000`.

**Logs are shipped to Loki via `pino-opentelemetry-transport`** (a pino transport target in `server/logger.js`, alongside a plain stdout target — pino fans the same log object out to both). `server/logger.js`'s `mixin()` stamps every log line with the active span's `trace_id`/`span_id`/`trace_flags`. **All three fields are required**, not just `trace_id`/`span_id` — the transport's `loadContext()` (`node_modules/pino-opentelemetry-transport/lib/otlp-logger-shim.js`) only promotes them into the emitted LogRecord's native trace context (which is what makes them show up as real Loki labels, giving Grafana its "jump to trace" link) if all three are present; otherwise it silently strips them with no fallback and no warning. This was reproduced locally (trace_id was completely absent from Loki output until `trace_flags` was added) — don't drop `trace_flags` from the mixin.

**`@opentelemetry/instrumentation-express` is deliberately disabled** in `server/instrumentation.js` — as of `auto-instrumentations-node@0.79`, it silently breaks Express 5 route matching (some routes return Express's default 404 instead of hitting their handler; reproduced and confirmed locally on this exact app). Don't re-enable it without re-verifying against Express 5. HTTP and pg spans still cover the full request/DB path either way.

`e2e:test`/`security:test` explicitly force `OTEL_ENABLED: 'false'` in their `webServer.env` (`playwright.config.js`, `security/security.config.js`) — without that override, dotenv would pick up `.env`'s own `OTEL_ENABLED=true` and those suites would leak spans into the dev observability stack. `perf/run.mjs` spawns `node server/index.js` directly (bypassing `npm start` and the `--import` flag entirely), so it's unaffected regardless.

## Testing suites

Three independent Playwright-based suites, each with its own config and its own gated database (see Environment setup above):

- **`e2e/`** — UI end-to-end tests, Page Object Model (`e2e/pages/*.js`), specs organized by journey (happy path, edge cases, auth, concurrency/ownership, persistence, guest browsing). `workers: 1` and `fullyParallel: false` deliberately — specs share a mutable DB (stock, orders). `e2e/global-teardown.js` cleans up after the run.
- **`security/`** — OWASP-style dynamic probes (`security/probes/*.spec.js`: auth-bypass, CSRF, IDOR, injection-canary, rate-limit, security-headers) run with `NODE_ENV=production` deliberately, since some security-relevant defaults (e.g. Better Auth's rate limiter) are gated on `isProduction`. `security/cleanup.mjs` / `security/fixtures/testUsers.js` manage tagged test data.
- **`perf/`** — k6 load tests (`perf/scenarios.js`, `perf/load.js`, `perf/smoke.js`) sized to this app's NFRs (5 TPS today, 10 TPS future-projected; p95<300ms browse/auth, p95<600ms checkout). `perf/run.mjs` builds and boots the real production artifact against `PERF_DATABASE_URL`, runs k6, then auto-cleans perf-tagged users/orders and restores consumed stock. Reports land in `perf/results/` (gitignored). A failing threshold exits non-zero — safe as a pre-merge CI gate.

Each suite boots its own server via Playwright's `webServer` on a distinct port (3001 dev, 3002 e2e default, 3003 security default) with `reuseExistingServer: false` — always fresh, never accidentally reusing a stray server pointed at the wrong database.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: `build` (npm ci + vite build), then `e2e-and-security` (`needs: build`) which runs `test:e2e` then `security:test` **sequentially in the same job** — they share one non-production database (`E2E_DATABASE_URL`), so running them as parallel jobs would let two CI runs mutate the same stock/order rows at once.

`.github/workflows/perf.yml` is **separate and manual-only** (`workflow_dispatch`, not on push/PR) — perf's latency thresholds are more prone to noise on shared GitHub-hosted runners than on a real dev machine, so it shouldn't gate merges. Its smoke-test step also has `continue-on-error: true` for the same reason: a threshold breach is signal to look at, not a reason to fail the workflow run.

Both workflows need repo secrets to do anything beyond `build`: `E2E_DATABASE_URL`, `PERF_DATABASE_URL`, `BETTER_AUTH_SECRET`. `.env.e2e`/`.env.perf` are materialized from these secrets at job start (`echo "...URL=${{ secrets.... }}" > .env.e2e`), since `lib/db-safety.js` reads them from disk, not from `process.env` directly.

If e2e/security CI failures don't reproduce with `npm run test:e2e` / `npm run security:test` locally, treat that as the anomaly to explain, not a reason to relax the test — every failure investigated so far here has been a real bug (a client-side navigation race, a stale session-store read, a missing security header, a test locator matching two elements, a test race condition) rather than CI-environment flakiness.
