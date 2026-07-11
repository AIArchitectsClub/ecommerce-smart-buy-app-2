import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../lib/api'
import { formatCurrency } from '../lib/pricing'

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load orders')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="page">
        <h1>My Orders</h1>
        <p>Loading orders…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <h1>My Orders</h1>
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="page">
        <h1>My Orders</h1>
        <p>You haven't placed any orders yet.</p>
        <Link to="/" className="btn btn-primary">
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>My Orders</h1>
      <div className="orders-list">
        {orders.map((order) => (
          <div className="order-summary-card" key={order.id}>
            <div>
              <strong>Order #{order.id.slice(0, 8).toUpperCase()}</strong>
              <div className="order-summary-meta">
                {new Date(order.createdAt).toLocaleString()} &middot; {order.items.length} item
                {order.items.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="order-summary-total">{formatCurrency(order.total)}</div>
            <span className="badge badge-in">{order.status}</span>
            <Link to={`/order-confirmation/${order.id}`} className="btn btn-secondary">
              View Receipt
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
