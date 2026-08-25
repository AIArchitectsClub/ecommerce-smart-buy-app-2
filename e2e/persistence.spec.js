import { test, expect } from '@playwright/test'
import { ProductsPage } from './pages/ProductsPage.js'
import { CartPage } from './pages/CartPage.js'
import { CheckoutShippingPage, CheckoutPaymentPage, CheckoutReviewPage } from './pages/CheckoutPages.js'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.js'
import { NavBar } from './pages/NavBar.js'
import { uniqueTestUser, signUpViaApi } from './fixtures/testUser.js'
import { deleteTestUser, restoreStock } from './fixtures/db.js'

// Tier 5: does state survive a hard reload, not just client-side
// navigation? Many bugs only show up on a fresh mount before async data
// (a session check, an order fetch) has resolved.

test('cart persists across a hard reload for a guest', async ({ page }) => {
  const products = new ProductsPage(page)
  const nav = new NavBar(page)

  await products.goto()
  await products.addToCartByName('20,000mAh Power Bank')
  await expect(nav.cartBadge).toHaveText('1')

  await page.reload()
  await expect(nav.cartBadge).toHaveText('1')
})

test('signed-in session persists across a hard reload', async ({ page }) => {
  const user = uniqueTestUser()
  await signUpViaApi(page, user)

  try {
    const nav = new NavBar(page)
    await page.goto('/')
    await expect(nav.userGreeting).toHaveText(`Hi, ${user.name.split(' ')[0]}`)

    await page.reload()
    await expect(nav.userGreeting).toHaveText(`Hi, ${user.name.split(' ')[0]}`)
  } finally {
    await deleteTestUser(user.email)
  }
})

test('order confirmation page survives a hard reload', async ({ page }) => {
  const user = uniqueTestUser()
  await signUpViaApi(page, user)
  let purchased = false

  try {
    const products = new ProductsPage(page)
    const cart = new CartPage(page)
    const shipping = new CheckoutShippingPage(page)
    const payment = new CheckoutPaymentPage(page)
    const review = new CheckoutReviewPage(page)
    const confirmation = new OrderConfirmationPage(page)

    await products.goto()
    await products.addToCartByName('Empires of the Ancient World')
    await cart.goto()
    await cart.proceedToCheckout()
    await shipping.fillAndContinue({
      fullName: user.name,
      email: user.email,
      address: '1 Test Way',
      city: 'Testville',
      state: 'TS',
      zip: '12345',
      phone: '555-0100',
    })
    await payment.fillAndContinue({ cardName: user.name, cardNumber: '4242424242424242', expiry: '12/30', cvv: '123' })
    await review.placeOrder()
    await page.waitForURL(/\/order-confirmation\//, { timeout: 10_000 })
    purchased = true

    await page.reload()
    await expect(confirmation.heading).toContainText('Order Confirmed')
    await expect(confirmation.receiptRows).toContainText(['Empires of the Ancient World'])
  } finally {
    if (purchased) await restoreStock('book-history', 1)
    await deleteTestUser(user.email)
  }
})
