import { test, expect } from '@playwright/test'
import { ProductsPage } from './pages/ProductsPage.js'
import { CartPage } from './pages/CartPage.js'
import { CheckoutShippingPage, CheckoutPaymentPage, CheckoutReviewPage } from './pages/CheckoutPages.js'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.js'
import { uniqueTestUser, signUpViaApi } from './fixtures/testUser.js'
import { deleteTestUser, createTestProduct, deleteTestProduct, getProductStock, restoreStock } from './fixtures/db.js'

// Tier 4: two independent browser contexts racing for the same limited
// resource, and one user attempting to reach another user's private data
// by guessing/reusing a URL.

async function reachReview(page, user, productName) {
  const products = new ProductsPage(page)
  const cart = new CartPage(page)
  const shipping = new CheckoutShippingPage(page)
  const payment = new CheckoutPaymentPage(page)

  await products.goto()
  await products.addToCartByName(productName)
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
}

test('two users racing for the last unit — exactly one succeeds', async ({ browser }) => {
  const testProductId = `e2e-race-${Date.now()}`
  await createTestProduct({ id: testProductId, name: 'E2E Race Widget', stock: 1 })

  const userA = uniqueTestUser()
  const userB = uniqueTestUser()
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  try {
    await signUpViaApi(pageA, userA)
    await signUpViaApi(pageB, userB)

    await reachReview(pageA, userA, 'E2E Race Widget')
    await reachReview(pageB, userB, 'E2E Race Widget')

    const reviewA = new CheckoutReviewPage(pageA)
    const reviewB = new CheckoutReviewPage(pageB)

    // Both pages start already sitting on /checkout/review, so a URL-pattern
    // wait that accepts that same path as a "failure" signal resolves
    // instantly — before either order request has even completed. Race each
    // page's OWN outcome signal instead: navigation to order-confirmation
    // (success) vs. the stock-error alert appearing (failure) — both are
    // real state changes that can only happen once the request settles.
    async function outcomeFor(page, review) {
      return Promise.race([
        page.waitForURL(/\/order-confirmation\//).then(() => 'success'),
        review.errorAlert.waitFor({ state: 'visible' }).then(() => 'failure'),
      ])
    }

    // Attach both outcome listeners BEFORE clicking either button, so
    // they're already watching when the requests fire — then fire both
    // clicks together so the two purchases genuinely race server-side.
    const outcomeA = outcomeFor(pageA, reviewA)
    const outcomeB = outcomeFor(pageB, reviewB)
    await Promise.all([reviewA.placeOrder(), reviewB.placeOrder()])
    const outcomes = await Promise.all([outcomeA, outcomeB])

    const successes = outcomes.filter((o) => o === 'success')
    const failures = outcomes.filter((o) => o === 'failure')
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)

    const finalStock = await getProductStock(testProductId)
    expect(finalStock).toBe(0)
  } finally {
    await contextA.close()
    await contextB.close()
    await deleteTestUser(userA.email)
    await deleteTestUser(userB.email)
    await deleteTestProduct(testProductId)
  }
})

test("visiting another user's order by URL shows not-found, not their order", async ({ browser }) => {
  const owner = uniqueTestUser()
  const intruder = uniqueTestUser()
  const ownerContext = await browser.newContext()
  const intruderContext = await browser.newContext()
  const ownerPage = await ownerContext.newPage()
  const intruderPage = await intruderContext.newPage()
  let purchased = false

  try {
    await signUpViaApi(ownerPage, owner)
    await reachReview(ownerPage, owner, 'Everyday Flavors Cookbook')
    const review = new CheckoutReviewPage(ownerPage)
    await review.placeOrder()
    await ownerPage.waitForURL(/\/order-confirmation\//, { timeout: 10_000 })
    purchased = true
    const orderId = new OrderConfirmationPage(ownerPage).orderIdFromUrl()

    await signUpViaApi(intruderPage, intruder)
    const intruderConfirmation = new OrderConfirmationPage(intruderPage)
    await intruderConfirmation.goto(orderId)
    await expect(intruderPage.getByText('Order not found.')).toBeVisible()
  } finally {
    await ownerContext.close()
    await intruderContext.close()
    if (purchased) await restoreStock('book-cookbook', 1)
    await deleteTestUser(owner.email)
    await deleteTestUser(intruder.email)
  }
})
