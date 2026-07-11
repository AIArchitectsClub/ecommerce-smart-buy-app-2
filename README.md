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

## Project layout

- `src/` — React frontend (catalog browsing, cart, multi-stage checkout, receipts)
- `server/` — Express API + Neon Postgres access (`server/db.js`, `server/routes/*`, `server/db/schema.sql`)
