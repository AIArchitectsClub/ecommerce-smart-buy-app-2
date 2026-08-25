export class CheckoutShippingPage {
  constructor(page) {
    this.page = page
    this.fullName = page.locator('#fullName')
    this.email = page.locator('#email')
    this.address = page.locator('#address')
    this.city = page.locator('#city')
    this.state = page.locator('#state')
    this.zip = page.locator('#zip')
    this.phone = page.locator('#phone')
    this.continueButton = page.getByRole('button', { name: 'Continue to Payment' })
    this.fieldErrors = page.locator('.field-error')
  }

  async fillAndContinue(shipping) {
    await this.fullName.fill(shipping.fullName)
    await this.email.fill(shipping.email)
    await this.address.fill(shipping.address)
    await this.city.fill(shipping.city)
    await this.state.fill(shipping.state)
    await this.zip.fill(shipping.zip)
    await this.phone.fill(shipping.phone)
    await this.continueButton.click()
  }
}

export class CheckoutPaymentPage {
  constructor(page) {
    this.page = page
    this.cardName = page.locator('#cardName')
    this.cardNumber = page.locator('#cardNumber')
    this.expiry = page.locator('#expiry')
    this.cvv = page.locator('#cvv')
    this.reviewButton = page.getByRole('button', { name: 'Review Order' })
    this.fieldErrors = page.locator('.field-error')
  }

  async fillAndContinue(payment) {
    await this.cardName.fill(payment.cardName)
    await this.cardNumber.fill(payment.cardNumber)
    await this.expiry.fill(payment.expiry)
    await this.cvv.fill(payment.cvv)
    await this.reviewButton.click()
  }
}

export class CheckoutReviewPage {
  constructor(page) {
    this.page = page
    this.placeOrderButton = page.getByRole('button', { name: /place order|processing payment/i })
    this.errorAlert = page.locator('.alert-error')
    this.reviewItems = page.locator('.review-item')
  }

  async placeOrder() {
    await this.placeOrderButton.click()
  }
}
