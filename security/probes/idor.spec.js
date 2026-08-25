import { test, expect } from '@playwright/test'
import { taggedTestUser, signUpViaApi } from '../fixtures/testUsers.js'

// Two dedicated, tagged test accounts. User B places a real order (a single
// unit of a cheap, well-stocked seeded product); User A then tries to read
// it by substituting the order id. security/cleanup.mjs removes both users
// (cascades to their orders) and restores the one unit of stock consumed.
const PROBE_PRODUCT_ID = 'book-scifi-novel'
const PROBE_QUANTITY = 1
const BASE_URL = `http://localhost:${process.env.SECURITY_TEST_PORT || '3003'}`

test('user A cannot read user B\'s order by id substitution (IDOR)', async ({ request, playwright }) => {
  const userA = taggedTestUser('idor-a')
  const userB = taggedTestUser('idor-b')

  await signUpViaApi(request, userA) // userA's session now lives in the `request` fixture's cookie jar

  const bCtx = await playwright.request.newContext({ baseURL: BASE_URL })
  await signUpViaApi(bCtx, userB)

  const orderRes = await bCtx.post('/api/orders', {
    data: {
      items: [{ productId: PROBE_PRODUCT_ID, quantity: PROBE_QUANTITY }],
      shipping: {
        fullName: userB.name,
        email: userB.email,
        address: '123 Sectest St',
        city: 'Testville',
        state: 'CA',
        zip: '90001',
        phone: '5555550123',
      },
      payment: { method: 'Dummy Card', cardLast4: '4242' },
    },
  })
  expect(orderRes.ok(), `setup: user B's order must succeed to run this probe (${orderRes.status()})`).toBeTruthy()
  const order = await orderRes.json()

  const asA = await request.get(`/api/orders/${order.id}`)
  expect(asA.status(), "user A must NOT be able to read user B's order").toBe(404)

  await bCtx.dispose()
})
