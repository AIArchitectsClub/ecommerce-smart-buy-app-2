export class SignInPage {
  constructor(page) {
    this.page = page
    this.email = page.locator('#email')
    this.password = page.locator('#password')
    this.submitButton = page.getByRole('button', { name: /sign in/i })
    this.errorAlert = page.locator('.alert-error')
    this.signUpLink = page.locator('a[href="/sign-up"]')
  }

  async goto() {
    await this.page.goto('/sign-in')
  }

  async signIn(email, password) {
    await this.email.fill(email)
    await this.password.fill(password)
    await this.submitButton.click()
  }
}

export class SignUpPage {
  constructor(page) {
    this.page = page
    this.name = page.locator('#name')
    this.email = page.locator('#email')
    this.password = page.locator('#password')
    this.submitButton = page.getByRole('button', { name: /sign up/i })
    this.errorAlert = page.locator('.alert-error')
  }

  async goto() {
    await this.page.goto('/sign-up')
  }

  async signUp(user) {
    await this.name.fill(user.name)
    await this.email.fill(user.email)
    await this.password.fill(user.password)
    await this.submitButton.click()
  }
}
