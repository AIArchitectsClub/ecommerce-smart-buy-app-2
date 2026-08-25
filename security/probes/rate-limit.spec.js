import { test, expect } from '@playwright/test'
import { taggedTestUser } from '../fixtures/testUsers.js'

// A small, capped burst against a dedicated tagged (non-existent) account —
// never a real user's credentials. better-auth's default special rule for
// /sign-in is window:10s, max:3, so 6 rapid attempts is enough to confirm
// a 429 shows up without hammering the endpoint.
test('login endpoint rate-limits repeated failures', async ({ request }) => {
  const target = taggedTestUser('ratelimit-target')
  const statuses = []
  for (let i = 0; i < 6; i++) {
    const res = await request.post('/api/auth/sign-in/email', {
      data: { email: target.email, password: 'definitely-wrong-password' },
    })
    statuses.push(res.status())
  }
  expect(statuses, `expected a 429 among repeated failures, got: ${statuses.join(', ')}`).toContain(429)
})
