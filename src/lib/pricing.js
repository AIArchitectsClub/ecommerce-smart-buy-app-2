export const TAX_RATE = 0.08
export const FLAT_SHIPPING_FEE = 5.99
export const FREE_SHIPPING_THRESHOLD = 75

export function computeTotals(subtotal) {
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + shippingFee + tax) * 100) / 100
  return { subtotal, shippingFee, tax, total }
}

export function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`
}
