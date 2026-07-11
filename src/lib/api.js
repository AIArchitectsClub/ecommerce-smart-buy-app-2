async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.error || 'Request failed')
    error.status = res.status
    error.details = data
    throw error
  }
  return data
}

export function getCategories() {
  return request('/categories')
}

export function getProducts(categoryId) {
  return request(categoryId ? `/products?category=${encodeURIComponent(categoryId)}` : '/products')
}

export function getProduct(id) {
  return request(`/products/${encodeURIComponent(id)}`)
}

export function getOrders() {
  return request('/orders/mine')
}

export function getOrder(id) {
  return request(`/orders/${encodeURIComponent(id)}`)
}

export function placeOrder(payload) {
  return request('/orders', { method: 'POST', body: JSON.stringify(payload) })
}
