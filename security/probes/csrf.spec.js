import { test, expect } from '@playwright/test'
import { taggedTestUser } from '../fixtures/testUsers.js'

// Confirms the session cookie's live Set-Cookie attributes — the actual
// CSRF mitigation surface for a cookie-session app is SameSite + HttpOnly,
// not a separate CSRF token. Secure is protocol-dependent (only meaningful
// over https) so isn't asserted here against a local http target — verify
// that one directly against the deployed https URL if needed.
test('session cookie is HttpOnly with SameSite=Lax or Strict', async ({ request }) => {
  const user = taggedTestUser('csrf')
  const res = await request.post('/api/auth/sign-up/email', {
    data: { name: user.name, email: user.email, password: user.password },
  })
  expect(res.ok(), `setup: sign-up must succeed to run this probe (${res.status()})`).toBeTruthy()

  const setCookie = res.headers()['set-cookie'] || ''
  const sessionCookieLine = setCookie
    .split(/,(?=[^;]+?=)/) // split multiple Set-Cookie entries
    .find((line) => /session_token/i.test(line))

  expect(sessionCookieLine, 'expected a session_token Set-Cookie header').toBeTruthy()
  expect(sessionCookieLine, 'session cookie must be HttpOnly').toMatch(/HttpOnly/i)
  expect(sessionCookieLine, 'session cookie must set SameSite=Lax or SameSite=Strict').toMatch(/SameSite=(Lax|Strict)/i)
})
