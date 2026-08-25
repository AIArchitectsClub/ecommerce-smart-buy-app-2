// Generates a unique test user per test and signs up via the API.
// Uses page.request (not the global `request` fixture) so the session
// cookie lands in the same browser context the test's page uses.
export function uniqueTestUser() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  return {
    name: 'E2E Test User',
    email: `e2e-${suffix}@example.com`,
    password: 'e2e-test-password-123',
  }
}

export async function signUpViaApi(page, user) {
  const res = await page.request.post('/api/auth/sign-up/email', {
    data: { name: user.name, email: user.email, password: user.password },
  })
  if (!res.ok()) {
    throw new Error(`Sign-up failed: ${res.status()} ${await res.text()}`)
  }
  return user
}
