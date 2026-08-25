import { test, expect } from '@playwright/test'

// Confirms protected routes reject missing/tampered credentials. A FAILING
// assertion here means the app is vulnerable — see the generated report.

test('orders/mine rejects requests with no session', async ({ request }) => {
  const res = await request.get('/api/orders/mine')
  expect(res.status(), 'unauthenticated request must be rejected').toBe(401)
})

test('orders/mine rejects a tampered/forged session cookie', async ({ request }) => {
  const res = await request.get('/api/orders/mine', {
    headers: { Cookie: 'better-auth.session_token=tampered.invalid.forged-token-value' },
  })
  expect(res.status(), 'tampered session token must be rejected').toBe(401)
})

test('order creation rejects requests with no session', async ({ request }) => {
  const res = await request.post('/api/orders', {
    data: {
      items: [{ productId: 'book-scifi-novel', quantity: 1 }],
      shipping: {
        fullName: 'X', email: 'x@example.com', address: 'x', city: 'x', state: 'x', zip: '00000', phone: '0000000000',
      },
      payment: { method: 'Dummy Card', cardLast4: '0000' },
    },
  })
  expect(res.status(), 'unauthenticated order creation must be rejected').toBe(401)
})

test('a specific order lookup rejects requests with no session', async ({ request }) => {
  const res = await request.get('/api/orders/00000000-0000-0000-0000-000000000000')
  expect(res.status(), 'unauthenticated order lookup must be rejected').toBe(401)
})
