export class OrderConfirmationPage {
  constructor(page) {
    this.page = page
    this.heading = page.locator('.confirmation-header h1')
    this.receipt = page.locator('.receipt')
    this.receiptRows = page.locator('.receipt-table tbody tr')
    this.totalPaid = page.locator('.receipt-totals .summary-total')
  }

  async goto(orderId) {
    await this.page.goto(`/order-confirmation/${orderId}`)
  }

  orderIdFromUrl() {
    const match = this.page.url().match(/order-confirmation\/([^/?#]+)/)
    return match?.[1]
  }
}
