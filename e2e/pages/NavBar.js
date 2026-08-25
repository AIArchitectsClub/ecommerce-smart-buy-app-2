// Shared nav locators/actions used across most specs — not a page in its
// own right, but present on every page so it earns its own object.
export class NavBar {
  constructor(page) {
    this.page = page
    this.cartLink = page.locator('a[href="/cart"]')
    this.ordersLink = page.locator('a[href="/orders"]')
    this.signInLink = page.locator('a[href="/sign-in"]')
    this.signOutButton = page.getByRole('button', { name: 'Sign Out' })
    this.userGreeting = page.locator('.navbar-user')
    this.cartBadge = page.locator('.cart-badge')
  }

  async goToCart() {
    await this.cartLink.click()
  }

  async goToOrders() {
    await this.ordersLink.click()
  }

  async signOut() {
    await this.signOutButton.click()
  }
}
