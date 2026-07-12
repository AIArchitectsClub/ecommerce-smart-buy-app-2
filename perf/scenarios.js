import http from 'k6/http'
import { check } from 'k6'
import { BASE_URL, JSON_HEADERS, pickCheckoutSku, uniqueEmail } from './lib/http.js'

// "Browse" journey — public, read-only: category list -> product list -> product detail.
// This is the bulk of real traffic on any storefront.
export function browse() {
  const categories = http.get(`${BASE_URL}/api/categories`, { tags: { name: 'GetCategories' } })
  check(categories, { 'categories 200': (r) => r.status === 200 })

  const products = http.get(`${BASE_URL}/api/products`, { tags: { name: 'GetProducts' } })
  check(products, { 'products 200': (r) => r.status === 200 })

  const list = products.status === 200 ? products.json() : []
  if (list.length > 0) {
    const pick = list[Math.floor(Math.random() * list.length)]
    const detail = http.get(`${BASE_URL}/api/products/${pick.id}`, { tags: { name: 'GetProductDetail' } })
    check(detail, { 'product detail 200': (r) => r.status === 200 })
  }
}

// "Auth" journey — visitors signing up or (less often) signing back in.
// Every iteration signs up a freshly perf-tagged account rather than reusing
// one, matching real traffic (mostly new visitors) and keeping cleanup simple
// (one tag prefix to delete, no shared fixture account to leak across runs).
export function authFlow() {
  const email = uniqueEmail()
  const signUp = http.post(
    `${BASE_URL}/api/auth/sign-up/email`,
    JSON.stringify({ name: 'Perf Test User', email, password: 'perf-test-password-123' }),
    { ...JSON_HEADERS, tags: { name: 'SignUp' } },
  )
  check(signUp, { 'sign-up 200': (r) => r.status === 200 })
}

// "Checkout" journey — the critical write path: sign up -> place an order.
// This is the one journey that mutates finite shared state (stock) and
// accumulating tables (orders/order_items/user), so it's the one the
// data-safety cleanup script (reset-test-data.js) targets.
export function checkout() {
  const email = uniqueEmail()
  const signUp = http.post(
    `${BASE_URL}/api/auth/sign-up/email`,
    JSON.stringify({ name: 'Perf Test User', email, password: 'perf-test-password-123' }),
    { ...JSON_HEADERS, tags: { name: 'CheckoutSignUp' } },
  )
  const signedUp = check(signUp, { 'checkout sign-up 200': (r) => r.status === 200 })
  if (!signedUp) return

  // k6's per-VU cookie jar automatically carries the session cookie from the
  // sign-up response into this next request — no manual jar wiring needed.
  const sku = pickCheckoutSku()
  const order = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      items: [{ productId: sku, quantity: 1 }],
      shipping: {
        fullName: 'Perf Test User',
        email,
        address: '1 Load Test Way',
        city: 'Perfville',
        state: 'PT',
        zip: '00000',
        phone: '555-0100',
      },
      payment: { method: 'Dummy Card', cardLast4: '4242' },
    }),
    { ...JSON_HEADERS, tags: { name: 'PlaceOrder' } },
  )
  check(order, {
    'checkout 201': (r) => r.status === 201,
    // A 409 (insufficient stock) is a legitimate business outcome, not a
    // script bug, but it should still count against the error-rate
    // threshold — a real spike of these under load is a real capacity signal.
  })
}
