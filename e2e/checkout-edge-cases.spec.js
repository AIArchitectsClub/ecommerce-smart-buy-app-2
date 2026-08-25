import { test, expect } from '@playwright/test'
import { ProductsPage } from './pages/ProductsPage.js'
import { ProductDetailPage } from './pages/ProductDetailPage.js'
import { CartPage } from './pages/CartPage.js'
import { CheckoutShippingPage, CheckoutReviewPage } from './pages/CheckoutPages.js'
import { uniqueTestUser, signUpViaApi } from './fixtures/testUser.js'
import { deleteTestUser, createTestProduct, deleteTestProduct } from './fixtures/db.js'

// Tier 3: client-side state guards + checkout step guards + a real
// insufficient-stock race outcome at the moment of placing an order.
//
// Every checkout/* route is wrapped in RequireAuth (see src/App.jsx), so
// these all need a signed-in session first — otherwise the auth gate
// fires before any of the business-logic guards under test get a chance to.

test('quantity select clamps to available stock, not a fixed max of 10', async ({ page }) => {
  const detail = new ProductDetailPage(page)
  // sports-dumbbell-set is seeded with stock 5 — below the page's own
  // cap of 10, so this proves the clamp uses real stock, not just min(10).
  await detail.goto('sports-dumbbell-set')
  await expect(detail.name).toHaveText('Adjustable Dumbbell Set') // wait for the async product fetch to resolve
  const options = await detail.quantitySelect.locator('option').allTextContents()
  expect(options).toEqual(['1', '2', '3', '4', '5'])
})

test('visiting a later checkout step without its prerequisite redirects back a step', async ({ page }) => {
  const user = uniqueTestUser()
  await signUpViaApi(page, user)

  try {
    const products = new ProductsPage(page)
    const shipping = new CheckoutShippingPage(page)

    // Signed in, but no cart yet — /checkout/payment should bounce to /cart.
    await page.goto('/checkout/payment')
    await expect(page).toHaveURL(/\/cart$/)

    // Cart has an item now, but no shipping info yet — /checkout/review
    // should bounce back to /checkout/shipping, not silently proceed.
    await products.goto()
    await products.addToCartByName('Non-Slip Yoga Mat')
    await page.goto('/checkout/review')
    await expect(page).toHaveURL(/\/checkout\/shipping$/)
    await expect(shipping.fullName).toBeVisible()
  } finally {
    await deleteTestUser(user.email)
  }
})

test('shipping form rejects an invalid email instead of proceeding', async ({ page }) => {
  const user = uniqueTestUser()
  await signUpViaApi(page, user)

  try {
    const products = new ProductsPage(page)
    const shipping = new CheckoutShippingPage(page)

    await products.goto()
    await products.addToCartByName('Non-Slip Yoga Mat')
    await page.goto('/checkout/shipping')

    await shipping.fillAndContinue({
      fullName: 'Bad Email Tester',
      email: 'not-an-email',
      address: '1 Test Way',
      city: 'Testville',
      state: 'TS',
      zip: '12345',
      phone: '555-0100',
    })

    await expect(page).toHaveURL(/\/checkout\/shipping$/)
    await expect(shipping.fieldErrors).toContainText([/valid email/i])
  } finally {
    await deleteTestUser(user.email)
  }
})

test('placing an order that lost its stock in the meantime shows the real error, not a fake success', async ({
  page,
}) => {
  const testProductId = `e2e-edge-${Date.now()}`
  await createTestProduct({ id: testProductId, name: 'E2E Edge Case Widget', stock: 1 })

  const user = uniqueTestUser()
  await signUpViaApi(page, user)

  try {
    const products = new ProductsPage(page)
    const cart = new CartPage(page)
    const shipping = new CheckoutShippingPage(page)
    const review = new CheckoutReviewPage(page)

    await products.goto()
    await products.addToCartByName('E2E Edge Case Widget')

    await cart.goto()
    await cart.proceedToCheckout()
    await shipping.fillAndContinue({
      fullName: 'Edge Case Tester',
      email: user.email,
      address: '1 Test Way',
      city: 'Testville',
      state: 'TS',
      zip: '12345',
      phone: '555-0100',
    })
    await page.locator('#cardName').fill('Edge Case Tester')
    await page.locator('#cardNumber').fill('4242424242424242')
    await page.locator('#expiry').fill('12/30')
    await page.locator('#cvv').fill('123')
    await page.getByRole('button', { name: 'Review Order' }).click()

    // Someone else "buys" the last unit right before this test places its order.
    await createTestProduct({ id: testProductId, name: 'E2E Edge Case Widget', stock: 0 })

    await review.placeOrder()

    await expect(review.errorAlert).toContainText([/no longer available/i])
    await expect(page).toHaveURL(/\/checkout\/review$/)
  } finally {
    await deleteTestUser(user.email)
    await deleteTestProduct(testProductId)
  }
})
