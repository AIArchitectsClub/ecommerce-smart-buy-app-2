export class ProductDetailPage {
  constructor(page) {
    this.page = page
    this.name = page.locator('.product-detail-body h1')
    this.price = page.locator('.product-detail-price')
    this.stockBadge = page.locator('.product-detail-body .badge')
    this.quantitySelect = page.locator('#qty')
    this.addToCartButton = page.getByRole('button', { name: /add to cart|out of stock/i })
    this.goToCartButton = page.getByRole('button', { name: 'Go to Cart' })
    this.confirmationBanner = page.locator('.confirmation-banner')
  }

  async goto(productId) {
    await this.page.goto(`/products/${productId}`)
  }

  async setQuantity(qty) {
    await this.quantitySelect.selectOption(String(qty))
  }

  async addToCart() {
    await this.addToCartButton.click()
  }
}
