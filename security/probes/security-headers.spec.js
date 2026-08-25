import { test, expect } from '@playwright/test'

// Confirms the actual live response headers, not just the middleware
// config read during static review — this is what a real browser sees.
test('responses include baseline security headers', async ({ request }) => {
  const res = await request.get('/')
  const headers = res.headers()

  expect(headers['x-content-type-options'], 'missing X-Content-Type-Options: nosniff').toBe('nosniff')
  expect(
    headers['content-security-policy'] || headers['x-frame-options'],
    'missing both Content-Security-Policy and X-Frame-Options (clickjacking exposure)',
  ).toBeTruthy()
  expect(headers['strict-transport-security'], 'missing Strict-Transport-Security (HSTS)').toBeTruthy()
})

test('API responses include baseline security headers', async ({ request }) => {
  const res = await request.get('/api/products')
  const headers = res.headers()
  expect(headers['x-content-type-options'], 'missing X-Content-Type-Options: nosniff on API responses').toBe('nosniff')
})
