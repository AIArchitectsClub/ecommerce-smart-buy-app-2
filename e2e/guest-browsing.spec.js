import { test, expect } from '@playwright/test'
import { ProductsPage } from './pages/ProductsPage.js'
import { ProductDetailPage } from './pages/ProductDetailPage.js'
import { CartPage } from './pages/CartPage.js'
import { NavBar } from './pages/NavBar.js'

// Tier 1: happy path / smoke — the flow that matters most for an
// unauthenticated visitor, start to finish. No auth, no server mutation
// beyond localStorage-backed cart state, so no DB cleanup needed here.

test('guest can browse, filter by category, view a product, and manage the cart', async ({ page }) => {
  const products = new ProductsPage(page)
  const detail = new ProductDetailPage(page)
  const cart = new CartPage(page)
  const nav = new NavBar(page)

  await products.goto()
  await expect(products.productCards.first()).toBeVisible()

  await products.filterByCategory('Electronics')
  await expect(products.productCard('Wireless Noise-Cancelling Headphones')).toBeVisible()
  await expect(products.productCard('Non-Slip Yoga Mat')).toHaveCount(0)

  await products.openProductByName('Wireless Noise-Cancelling Headphones')
  await expect(detail.name).toHaveText('Wireless Noise-Cancelling Headphones')
  await detail.addToCart()
  await expect(detail.confirmationBanner).toBeVisible()
  await expect(nav.cartBadge).toHaveText('1')

  await nav.goToCart()
  await expect(cart.cartItem('Wireless Noise-Cancelling Headphones')).toBeVisible()

  await cart.removeItem('Wireless Noise-Cancelling Headphones')
  await expect(cart.emptyMessage).toBeVisible()
})
