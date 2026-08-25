import { test, expect } from '@playwright/test'
import { ProductsPage } from './pages/ProductsPage.js'
import { CartPage } from './pages/CartPage.js'
import { CheckoutShippingPage, CheckoutPaymentPage, CheckoutReviewPage } from './pages/CheckoutPages.js'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.js'
import { OrdersHistoryPage } from './pages/OrdersHistoryPage.js'
import { uniqueTestUser, signUpViaApi } from './fixtures/testUser.js'
import { deleteTestUser, getProductStock, restoreStock } from './fixtures/db.js'

// Tier 1: the one flow that matters most — full checkout, start to
// finish, as an authenticated user, verifying the receipt and the stock
// decrement it's supposed to cause.

const PRODUCT_NAME = 'Adjustable Baseball Cap'
const PRODUCT_ID = 'cloth-baseball-cap'

const SHIPPING = {
  fullName: 'Happy Path Tester',
  address: '1 Test Way',
  city: 'Testville',
  state: 'TS',
  zip: '12345',
  phone: '555-0100',
}

const PAYMENT = { cardName: 'Happy Path Tester', cardNumber: '4242424242424242', expiry: '12/30', cvv: '123' }

test('signed-in user completes checkout and gets a correct receipt with stock decremented', async ({ page }) => {
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
    const history = new OrdersHistoryPage(page)

    const stockBefore = await getProductStock(PRODUCT_ID)

    await products.goto()
    await products.addToCartByName(PRODUCT_NAME)

    await cart.goto()
    await cart.proceedToCheckout()

    await expect(page).toHaveURL(/\/checkout\/shipping$/)
    await shipping.fillAndContinue({ ...SHIPPING, email: user.email })

    await expect(page).toHaveURL(/\/checkout\/payment$/)
    await payment.fillAndContinue(PAYMENT)

    await expect(page).toHaveURL(/\/checkout\/review$/)
    await review.placeOrder()

    await expect(page).toHaveURL(/\/order-confirmation\//, { timeout: 10_000 })
    purchased = true
    await expect(confirmation.heading).toContainText('Order Confirmed')
    await expect(confirmation.receiptRows).toContainText([PRODUCT_NAME])

    const stockAfter = await getProductStock(PRODUCT_ID)
    expect(stockAfter).toBe(stockBefore - 1)

    await history.goto()
    await expect(history.orderCards).toHaveCount(1)
  } finally {
    if (purchased) await restoreStock(PRODUCT_ID, 1)
    await deleteTestUser(user.email)
  }
})
