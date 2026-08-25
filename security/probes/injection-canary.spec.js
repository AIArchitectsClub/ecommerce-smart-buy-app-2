import { test, expect } from '@playwright/test'

// Safe canary payloads only — designed to reveal a DB error or behavioral
// tell if the query is unsafely built, never to alter or destroy data.
const CANARY = "' OR '1'='1"
const DB_ERROR_SIGNATURE = /syntax error|SQLITE_ERROR|pg_|relation .* does not exist|column .* does not exist|ORA-\d+|ECONNREFUSED|stack trace|at Object\.<anonymous>/i

test('product category filter does not leak DB errors on injection canary', async ({ request }) => {
  const res = await request.get(`/api/products?category=${encodeURIComponent(CANARY)}`)
  const body = await res.text()
  expect(body, 'response must not contain a raw DB error/stack trace').not.toMatch(DB_ERROR_SIGNATURE)
  // A safely parameterized query just finds no matching category — 200 with [].
  expect(res.status(), 'malformed category should not crash the request').toBeLessThan(500)
})

test('product id lookup does not leak DB errors on injection canary', async ({ request }) => {
  const res = await request.get(`/api/products/${encodeURIComponent(CANARY)}`)
  const body = await res.text()
  expect(body, 'response must not contain a raw DB error/stack trace').not.toMatch(DB_ERROR_SIGNATURE)
  expect(res.status(), 'malformed id should 404, not 500').toBe(404)
})

test('sign-in email field does not leak DB errors on injection canary', async ({ request }) => {
  const res = await request.post('/api/auth/sign-in/email', {
    data: { email: CANARY, password: 'irrelevant' },
  })
  const body = await res.text()
  expect(body, 'response must not contain a raw DB error/stack trace').not.toMatch(DB_ERROR_SIGNATURE)
  expect(res.status(), 'malformed email should be a clean 4xx, not a 500').toBeLessThan(500)
})
