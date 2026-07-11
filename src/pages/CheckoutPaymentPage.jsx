import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCheckout } from '../context/CheckoutContext'
import CheckoutSteps from '../components/CheckoutSteps'

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export default function CheckoutPaymentPage() {
  const { cartDetails } = useCart()
  const { shippingInfo, setPaymentInfo } = useCheckout()
  const navigate = useNavigate()
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [errors, setErrors] = useState({})

  if (cartDetails.length === 0) {
    return <Navigate to="/cart" replace />
  }
  if (!shippingInfo?.fullName) {
    return <Navigate to="/checkout/shipping" replace />
  }

  function validate() {
    const nextErrors = {}
    if (!cardName.trim()) nextErrors.cardName = 'Required'
    const digits = cardNumber.replace(/\D/g, '')
    if (digits.length !== 16) nextErrors.cardNumber = 'Enter a 16-digit card number'
    if (!/^\d{2}\/\d{2}$/.test(expiry)) nextErrors.expiry = 'Use MM/YY'
    if (!/^\d{3,4}$/.test(cvv)) nextErrors.cvv = 'Enter a valid CVV'
    return nextErrors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    const digits = cardNumber.replace(/\D/g, '')
    setPaymentInfo({
      cardName,
      cardLast4: digits.slice(-4),
      expiry,
      method: 'Dummy Card',
    })
    navigate('/checkout/review')
  }

  return (
    <div className="page">
      <CheckoutSteps current="payment" />
      <h1>Payment</h1>
      <p className="notice">
        This is a demo store. No real payment is processed — enter any 16-digit number.
      </p>
      <form className="checkout-form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <label htmlFor="cardName">Name on Card</label>
          <input id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} />
          {errors.cardName && <span className="field-error">{errors.cardName}</span>}
        </div>
        <div className="form-row">
          <label htmlFor="cardNumber">Card Number</label>
          <input
            id="cardNumber"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
          />
          {errors.cardNumber && <span className="field-error">{errors.cardNumber}</span>}
        </div>
        <div className="form-row form-row-split">
          <div>
            <label htmlFor="expiry">Expiry (MM/YY)</label>
            <input
              id="expiry"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              inputMode="numeric"
            />
            {errors.expiry && <span className="field-error">{errors.expiry}</span>}
          </div>
          <div>
            <label htmlFor="cvv">CVV</label>
            <input
              id="cvv"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              inputMode="numeric"
            />
            {errors.cvv && <span className="field-error">{errors.cvv}</span>}
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/checkout/shipping')}>
            Back
          </button>
          <button type="submit" className="btn btn-primary">
            Review Order
          </button>
        </div>
      </form>
    </div>
  )
}
