export class ProductsPage {
  constructor(page) {
    this.page = page
    this.categoryPills = page.locator('.category-pill')
    this.productCards = page.locator('.product-card')
  }

  async goto() {
    await this.page.goto('/')
  }

  categoryPill(name) {
    return this.categoryPills.filter({ hasText: name })
  }

  async filterByCategory(name) {
    await this.categoryPill(name).click()
  }

  productCard(name) {
    return this.productCards.filter({ has: this.page.locator('.product-card-name', { hasText: name }) })
  }

  async addToCartByName(name) {
    await this.productCard(name).locator('button').click()
  }

  async openProductByName(name) {
    await this.productCard(name).locator('.product-card-name').click()
  }
}
