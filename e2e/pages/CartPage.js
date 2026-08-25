export class CartPage {
  constructor(page) {
    this.page = page
    this.emptyMessage = page.getByText('Your cart is empty.')
    this.cartItems = page.locator('.cart-item')
    this.checkoutButton = page.getByRole('button', { name: 'Proceed to Checkout' })
    this.subtotalRow = page.locator('.summary-row', { hasText: 'Subtotal' })
    this.totalRow = page.locator('.summary-row.summary-total')
  }

  async goto() {
    await this.page.goto('/cart')
  }

  cartItem(productName) {
    return this.cartItems.filter({ hasText: productName })
  }

  async removeItem(productName) {
    await this.cartItem(productName).locator('.btn-remove').click()
  }

  async setQuantity(productName, qty) {
    await this.cartItem(productName).locator('select').selectOption(String(qty))
  }

  async proceedToCheckout() {
    await this.checkoutButton.click()
  }
}
