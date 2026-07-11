import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCheckout } from '../context/CheckoutContext'
import CheckoutSteps from '../components/CheckoutSteps'

export default function CheckoutShippingPage() {
  const { cartDetails } = useCart()
  const { shippingInfo, setShippingInfo } = useCheckout()
  const navigate = useNavigate()
  const [form, setForm] = useState(shippingInfo)
  const [errors, setErrors] = useState({})

  if (cartDetails.length === 0) {
    return <Navigate to="/cart" replace />
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function validate() {
    const nextErrors = {}
    ;['fullName', 'email', 'address', 'city', 'state', 'zip', 'phone'].forEach((field) => {
      if (!form[field]?.trim()) nextErrors[field] = 'Required'
    })
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email'
    }
    if (form.zip && !/^\d{5}(-\d{4})?$/.test(form.zip)) {
      nextErrors.zip = 'Enter a valid ZIP code'
    }
    return nextErrors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setShippingInfo(form)
    navigate('/checkout/payment')
  }

  return (
    <div className="page">
      <CheckoutSteps current="shipping" />
      <h1>Shipping & Billing Information</h1>
      <form className="checkout-form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <label htmlFor="fullName">Full Name</label>
          <input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} />
          {errors.fullName && <span className="field-error">{errors.fullName}</span>}
        </div>
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-row">
          <label htmlFor="address">Street Address</label>
          <input id="address" name="address" value={form.address} onChange={handleChange} />
          {errors.address && <span className="field-error">{errors.address}</span>}
        </div>
        <div className="form-row form-row-split">
          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" value={form.city} onChange={handleChange} />
            {errors.city && <span className="field-error">{errors.city}</span>}
          </div>
          <div>
            <label htmlFor="state">State</label>
            <input id="state" name="state" value={form.state} onChange={handleChange} />
            {errors.state && <span className="field-error">{errors.state}</span>}
          </div>
          <div>
            <label htmlFor="zip">ZIP Code</label>
            <input id="zip" name="zip" value={form.zip} onChange={handleChange} />
            {errors.zip && <span className="field-error">{errors.zip}</span>}
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" value={form.phone} onChange={handleChange} />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>
        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/cart')}>
            Back to Cart
          </button>
          <button type="submit" className="btn btn-primary">
            Continue to Payment
          </button>
        </div>
      </form>
    </div>
  )
}
