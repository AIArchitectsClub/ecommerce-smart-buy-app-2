export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'
export const RUN_ID = __ENV.PERF_RUN_ID || `${Date.now()}`

// High-stock SKUs only (>=30 units as of the last seed/reset) so a short
// validation run never starves a single product mid-test. Rotated across
// so no single SKU absorbs the full checkout scenario's consumption.
export const CHECKOUT_SKUS = [
  'book-scifi-novel',
  'cloth-baseball-cap',
  'elec-power-bank',
  'sports-yoga-mat',
  'elec-bt-speaker',
]

export function pickCheckoutSku() {
  return CHECKOUT_SKUS[(__VU + __ITER) % CHECKOUT_SKUS.length]
}

export function uniqueEmail() {
  return `perf-${RUN_ID}-${__VU}-${__ITER}@example.com`
}

export const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }
