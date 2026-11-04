# Incident demo scripts

Run from the repository root with Node, against any running copy of the shop (local or deployed).

```bash
SHOP_URL=https://your-shop.onrender.com node incident-demo/seed.mjs          # demo accounts, stock refill, first order
SHOP_URL=https://your-shop.onrender.com node incident-demo/shoppers.mjs      # 8 simulated shoppers until stopped (Ctrl+C)
SHOP_URL=https://your-shop.onrender.com node incident-demo/shoppers.mjs express 6   # the demo customer places 6 Express Pay orders
```

`seed.mjs` uses `DATABASE_URL` from `.env`, so it must point at the same database the shop uses.

The shop-side switches are `EXPRESS_PAY_ENABLED`, `DB_POOL_MAX`, `DB_CONNECT_TIMEOUT_MS` and `OTEL_SERVICE_NAME`; see `.env.example`.
