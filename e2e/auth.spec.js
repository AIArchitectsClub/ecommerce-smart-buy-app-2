import { test, expect } from '@playwright/test'
import { SignInPage, SignUpPage } from './pages/AuthPages.js'
import { ProductsPage } from './pages/ProductsPage.js'
import { CheckoutShippingPage } from './pages/CheckoutPages.js'
import { NavBar } from './pages/NavBar.js'
import { uniqueTestUser } from './fixtures/testUser.js'
import { deleteTestUser } from './fixtures/db.js'

// Tier 2: auth — sign up/in/out through the real UI forms, and the
// gated-route redirect + redirect-back-after-login behavior, which is a
// common source of real bugs (a session store that hasn't caught up with
// a just-completed login yet).

test.describe('sign up, sign out, sign in', () => {
  let user

  test.beforeEach(() => {
    user = uniqueTestUser()
  })

  test.afterEach(async () => {
    await deleteTestUser(user.email)
  })

  test('sign up logs the user in, sign out clears the session, sign in restores it', async ({ page }) => {
    const signUp = new SignUpPage(page)
    const signIn = new SignInPage(page)
    const nav = new NavBar(page)

    await signUp.goto()
    await signUp.signUp(user)
    await expect(nav.userGreeting).toHaveText(`Hi, ${user.name.split(' ')[0]}`)

    await nav.signOut()
    await expect(nav.signInLink).toBeVisible()

    await signIn.goto()
    await signIn.signIn(user.email, user.password)
    await expect(nav.userGreeting).toHaveText(`Hi, ${user.name.split(' ')[0]}`)
  })
})

test.describe('auth gating on checkout routes', () => {
  let user

  test.beforeEach(() => {
    user = uniqueTestUser()
  })

  test.afterEach(async () => {
    await deleteTestUser(user.email)
  })

  test('visiting checkout while signed out redirects to sign-in, and back to checkout after signing up', async ({
    page,
  }) => {
    const products = new ProductsPage(page)
    const signIn = new SignInPage(page)
    const signUp = new SignUpPage(page)
    const shipping = new CheckoutShippingPage(page)

    // Add to cart as a guest first, so the post-login redirect target
    // (checkout/shipping) doesn't itself bounce to /cart for being empty —
    // that would mask whether the redirect-back behavior actually worked.
    await products.goto()
    await products.addToCartByName('Portable Bluetooth Speaker')

    await page.goto('/checkout/shipping')
    await expect(page).toHaveURL(/\/sign-in$/)

    // RequireAuth lands us on sign-in with the pending destination in
    // router state; this user doesn't have an account yet, so click
    // through to sign-up (which must forward that state, not drop it).
    await signIn.signUpLink.click()
    await expect(page).toHaveURL(/\/sign-up$/)
    await signUp.signUp(user)

    await expect(page).toHaveURL(/\/checkout\/shipping$/)
    await expect(shipping.fullName).toBeVisible()
  })
})
