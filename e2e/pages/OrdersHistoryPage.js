export class OrdersHistoryPage {
  constructor(page) {
    this.page = page
    this.emptyMessage = page.getByText("You haven't placed any orders yet.")
    this.orderCards = page.locator('.order-summary-card')
  }

  async goto() {
    await this.page.goto('/orders')
  }
}
