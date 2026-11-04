// Shared helpers for the demo traffic scripts: a tiny cookie-keeping HTTP client and the demo accounts.
export const BASE = process.env.SHOP_URL || 'http://localhost:3001'
export const SHOPPERS = Array.from({ length: 8 }, (_, i) => ({
  email: `shopper${i + 1}@smartbuy.test`,
  password: 'Shopper!12345',
  name: `Shopper ${i + 1}`,
}))
export const DEMO_CUSTOMER = { email: 'demo.customer@smartbuy.test', password: 'Demo!12345', name: 'Demo Customer' }
export const SHIPPING = {
  fullName: 'Demo Customer', email: 'demo.customer@smartbuy.test', address: '1 Market Street',
  city: 'San Francisco', state: 'CA', zip: '94105', phone: '555-0100',
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const rand = (a, b) => a + Math.random() * (b - a)
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export class Client {
  constructor(user) {
    this.user = user
    this.cookies = new Map()
  }

  async request(method, path, body) {
    const headers = { Origin: BASE }
    if (body) headers['Content-Type'] = 'application/json'
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    const res = await fetch(BASE + path, {
      method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
    })
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1))
    }
    const data = await res.json().catch(() => null)
    return { status: res.status, ok: res.ok, data }
  }

  async signIn() {
    const r = await this.request('POST', '/api/auth/sign-in/email', { email: this.user.email, password: this.user.password })
    return r.ok
  }

  async signUp() {
    const r = await this.request('POST', '/api/auth/sign-up/email', this.user)
    return r.ok
  }

  async ensureAccount() {
    // The database may still be waking up (first connection can time out), so retry before concluding
    // the account does not exist; and sign in again if sign-up says it already does.
    for (let i = 0; i < 4; i++) {
      if (await this.signIn().catch(() => false)) return 'existing'
      await sleep(2000)
    }
    if (await this.signUp().catch(() => false)) return 'created'
    for (let i = 0; i < 3; i++) {
      if (await this.signIn().catch(() => false)) return 'existing'
      await sleep(2000)
    }
    throw new Error(`could not sign in or sign up ${this.user.email}`)
  }
}
