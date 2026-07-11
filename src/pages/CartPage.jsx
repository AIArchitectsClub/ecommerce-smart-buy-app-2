import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { computeTotals, formatCurrency } from '../lib/pricing'

export default function CartPage() {
  const { cartDetails, updateQuantity, removeFromCart, subtotal } = useCart()
  const navigate = useNavigate()
  const totals = computeTotals(subtotal)

  if (cartDetails.length === 0) {
    return (
      <div className="page">
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/" className="btn btn-primary">
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Your Cart</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cartDetails.map(({ product, quantity, lineTotal }) => (
            <div className="cart-item" key={product.id}>
              <div className="cart-item-image">{product.image}</div>
              <div className="cart-item-info">
                <Link to={`/products/${product.id}`} className="cart-item-name">
                  {product.name}
                </Link>
                <div className="cart-item-price">{formatCurrency(product.price)} each</div>
              </div>
              <div className="quantity-row">
                <label htmlFor={`qty-${product.id}`}>Qty</label>
                <select
                  id={`qty-${product.id}`}
                  value={quantity}
                  onChange={(e) => updateQuantity(product.id, Number(e.target.value))}
                >
                  {Array.from({ length: Math.min(product.stock, 10) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cart-item-total">{formatCurrency(lineTotal)}</div>
              <button className="btn-remove" onClick={() => removeFromCart(product.id)} aria-label="Remove item">
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{totals.shippingFee === 0 ? 'FREE' : formatCurrency(totals.shippingFee)}</span>
          </div>
          <div className="summary-row">
            <span>Estimated Tax</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/checkout/shipping')}>
            Proceed to Checkout
          </button>
          <Link to="/" className="back-link">
            &larr; Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
