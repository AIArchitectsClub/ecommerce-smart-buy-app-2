const CART_KEY = 'smartbuy.cart'
const CUSTOMER_KEY = 'smartbuy.customerInfo'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadCart() {
  return loadJSON(CART_KEY, [])
}
export function saveCart(cart) {
  saveJSON(CART_KEY, cart)
}

export function loadCustomerInfo() {
  return loadJSON(CUSTOMER_KEY, null)
}
export function saveCustomerInfo(info) {
  saveJSON(CUSTOMER_KEY, info)
}
