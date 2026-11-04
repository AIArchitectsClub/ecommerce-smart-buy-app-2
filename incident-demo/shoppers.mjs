// Demo traffic.
//   node load/shoppers.mjs            background shoppers: browse, view products, order history, regular checkout
//   node load/shoppers.mjs express 6  the demo customer places 6 Express Pay orders (what a real customer does in the UI)
import { BASE, Client, DEMO_CUSTOMER, SHIPPING, SHOPPERS, pick, rand, sleep } from './lib.mjs'

const [mode, countArg] = process.argv.slice(2)
const stats = { ok: 0, failed: 0 }

async function loadCatalog() {
  for (;;) {
    try {
      const c = new Client(null)
      const [cats, prods] = await Promise.all([c.request('GET', '/api/categories'), c.request('GET', '/api/products')])
      if (cats.ok && prods.ok) return { categories: cats.data, products: prods.data }
    } catch {
      // server may still be starting
    }
    await sleep(2000)
  }
}

async function shopper(user, catalog, stop) {
  const c = new Client(user)
  let signedIn = await c.signIn().catch(() => false)
  const count = (r) => (r.ok || r.status < 500 ? stats.ok++ : stats.failed++)
  while (!stop.v) {
    try {
      const roll = Math.random()
      if (!signedIn && roll < 0.2) signedIn = await c.signIn().catch(() => false)
      if (roll < 0.45) {
        count(await c.request('GET', '/api/categories'))
        count(await c.request('GET', `/api/products?category=${pick(catalog.categories).id}`))
      } else if (roll < 0.75) {
        count(await c.request('GET', `/api/products/${pick(catalog.products).id}`))
      } else if (roll < 0.9) {
        const r = await c.request('GET', '/api/orders/mine')
        if (r.status === 401) signedIn = false
        count(r)
      } else {
        const p = pick(catalog.products)
        const r = await c.request('POST', '/api/orders', {
          items: [{ productId: p.id, quantity: 1 }],
          shipping: { ...SHIPPING, fullName: user.name, email: user.email },
          payment: { method: 'Visa', cardLast4: '4242' },
        })
        if (r.status === 401) signedIn = false
        count(r)
      }
    } catch {
      stats.failed++
    }
    await sleep(rand(500, 1800))
  }
}

async function runShoppers() {
  const catalog = await loadCatalog()
  console.log(`${SHOPPERS.length} shoppers browsing ${BASE} (${catalog.products.length} products)`)
  const stop = { v: false }
  process.on('SIGTERM', () => (stop.v = true))
  process.on('SIGINT', () => (stop.v = true))
  setInterval(() => console.log(`requests ok=${stats.ok} failed=${stats.failed}`), 15000).unref()
  await Promise.all(SHOPPERS.map((u, i) => sleep(i * 300).then(() => shopper(u, catalog, stop))))
}

async function expressBurst(n) {
  const c = new Client(DEMO_CUSTOMER)
  if (!(await c.signIn())) throw new Error('demo customer cannot sign in (is the shop running and seeded?)')
  const { products } = await loadCatalog()
  for (let i = 1; i <= n; i++) {
    const p = pick(products)
    const r = await c.request('POST', '/api/orders/express', { items: [{ productId: p.id, quantity: 1 }] })
    console.log(`express pay ${i}/${n}: ${r.status} ${r.data?.id ? 'order ' + r.data.id.slice(0, 8) : r.data?.error ?? ''}`)
    await sleep(1500)
  }
}

if (mode === 'express') await expressBurst(Number(countArg) || 5)
else await runShoppers()
