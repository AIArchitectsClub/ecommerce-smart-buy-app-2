import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCheckout } from '../context/CheckoutContext'
import { useCatalog } from '../context/CatalogContext'
import { placeOrder } from '../lib/api'
import { computeTotals, formatCurrency } from '../lib/pricing'
import CheckoutSteps from '../components/CheckoutSteps'

export default function CheckoutReviewPage() {
  const { cartDetails, cartItems, subtotal, clearCart } = useCart()
  const { shippingInfo, paymentInfo, resetCheckout } = useCheckout()
  const { checkStock, refreshProducts } = useCatalog()
  const navigate = useNavigate()
  const [placing, setPlacing] = useState(false)
  const [stockError, setStockError] = useState(null)
  const [serverError, setServerError] = useState(null)

  if (cartDetails.length === 0) {
    return <Navigate to="/cart" replace />
  }
  if (!shippingInfo?.fullName) {
    return <Navigate to="/checkout/shipping" replace />
  }
  if (!paymentInfo) {
    return <Navigate to="/checkout/payment" replace />
  }

  const totals = computeTotals(subtotal)

  async function handlePlaceOrder() {
    const preCheck = checkStock(cartItems)
    if (!preCheck.ok) {
      setStockError(preCheck.insufficient)
      return
    }
    setStockError(null)
    setServerError(null)
    setPlacing(true)

    try {
      const order = await placeOrder({
        items: cartItems.map(({ productId, quantity }) => ({ productId, quantity })),
        shipping: shippingInfo,
        payment: { method: paymentInfo.method, cardLast4: paymentInfo.cardLast4 },
      })
      clearCart()
      resetCheckout()
      navigate(`/order-confirmation/${order.id}`)
    } catch (err) {
      if (err.status === 409 && err.details?.insufficient) {
        setStockError(err.details.insufficient)
        await refreshProducts()
      } else {
        setServerError(err.message || 'Something went wrong placing your order.')
      }
      setPlacing(false)
    }
  }

  return (
    <div className="page">
      <CheckoutSteps current="review" />
      <h1>Review & Place Order</h1>

      {stockError && (
        <div className="alert alert-error">
          <strong>Some items are no longer available in the requested quantity:</strong>
          <ul>
            {stockError.map((item) => (
              <li key={item.productId}>
                {item.name}: requested {item.requested}, only {item.available} available. Please update your cart.
              </li>
            ))}
          </ul>
          <button className="btn btn-secondary" onClick={() => navigate('/cart')}>
            Go to Cart
          </button>
        </div>
      )}

      {serverError && <div className="alert alert-error">{serverError}</div>}

      <div className="review-layout">
        <div className="review-section">
          <h2>Shipping To</h2>
          <p>
            {shippingInfo.fullName}
            <br />
            {shippingInfo.address}
            <br />
            {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}
            <br />
            {shippingInfo.phone} &middot; {shippingInfo.email}
          </p>
        </div>
        <div className="review-section">
          <h2>Payment</h2>
          <p>
            {paymentInfo.method} ending in {paymentInfo.cardLast4}
          </p>
        </div>
        <div className="review-section">
          <h2>Items</h2>
          {cartDetails.map(({ product, quantity, lineTotal }) => (
            <div className="review-item" key={product.id}>
              <span className="review-item-image">{product.image}</span>
              <span className="review-item-name">
                {product.name} &times; {quantity}
              </span>
              <span>{formatCurrency(lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="cart-summary">
          <h2>Order Total</h2>
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
          <button className="btn btn-primary btn-block" disabled={placing} onClick={handlePlaceOrder}>
            {placing ? 'Processing Payment…' : 'Place Order'}
          </button>
          <button className="btn btn-secondary btn-block" disabled={placing} onClick={() => navigate('/checkout/payment')}>
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
