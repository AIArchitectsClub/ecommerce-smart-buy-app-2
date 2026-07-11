import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrder } from '../lib/api'
import { formatCurrency } from '../lib/pricing'

export default function OrderConfirmationPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getOrder(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load order')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="page">
        <p>Loading receipt…</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="page">
        <p>Order not found.</p>
        <Link to="/">Back to shop</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="confirmation-header">
        <h1>✅ Order Confirmed</h1>
        <p>Thank you, {order.shipping.fullName.split(' ')[0]}! Your order has been placed successfully.</p>
      </div>

      <div className="receipt" id="receipt">
        <div className="receipt-header">
          <h2>🛒 SmartBuy — Receipt</h2>
          <p>
            Order #{order.id.slice(0, 8).toUpperCase()}
            <br />
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="receipt-section">
          <h3>Shipped To</h3>
          <p>
            {order.shipping.fullName}
            <br />
            {order.shipping.address}, {order.shipping.city}, {order.shipping.state} {order.shipping.zip}
            <br />
            {order.shipping.email}
          </p>
        </div>

        <div className="receipt-section">
          <h3>Payment</h3>
          <p>
            {order.payment.method} ending in {order.payment.cardLast4} &middot; Status:{' '}
            <span className="badge badge-in">{order.status}</span>
          </p>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td>
                  {item.image} {item.name}
                </td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.price)}</td>
                <td>{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{order.shippingFee === 0 ? 'FREE' : formatCurrency(order.shippingFee)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total Paid</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="button-row">
        <button className="btn btn-secondary" onClick={() => window.print()}>
          Print Receipt
        </button>
        <Link to="/orders" className="btn btn-secondary">
          View My Orders
        </Link>
        <Link to="/" className="btn btn-primary">
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
