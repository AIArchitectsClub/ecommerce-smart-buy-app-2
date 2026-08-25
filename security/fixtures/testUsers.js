// Tagged test-user generation for the security probe suite. Every account
// created by these probes is tagged sectest-{RUN_ID}-... so security/cleanup.mjs
// can find and remove exactly (and only) what this run created.
export const RUN_ID = process.env.SECURITY_TEST_RUN_ID || `${Date.now()}`

let counter = 0
export function taggedTestUser(label) {
  counter += 1
  return {
    name: `SecTest ${label}`,
    email: `sectest-${RUN_ID}-${counter}-${label}@example.com`,
    password: 'sectest-probe-password-123',
  }
}

export async function signUpViaApi(request, user) {
  const res = await request.post('/api/auth/sign-up/email', {
    data: { name: user.name, email: user.email, password: user.password },
  })
  if (!res.ok()) {
    throw new Error(`Sign-up failed for ${user.email}: ${res.status()} ${await res.text()}`)
  }
  return user
}

export async function signInViaApi(request, user) {
  const res = await request.post('/api/auth/sign-in/email', {
    data: { email: user.email, password: user.password },
  })
  if (!res.ok()) {
    throw new Error(`Sign-in failed for ${user.email}: ${res.status()} ${await res.text()}`)
  }
  return res
}
