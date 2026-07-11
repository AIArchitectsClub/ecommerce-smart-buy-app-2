import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { loadCustomerInfo, saveCustomerInfo } from '../lib/storage'

const CheckoutContext = createContext(null)

const EMPTY_SHIPPING = {
  fullName: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
}

export function CheckoutProvider({ children }) {
  const [shippingInfo, setShippingInfoState] = useState(() => loadCustomerInfo() || EMPTY_SHIPPING)
  const [paymentInfo, setPaymentInfo] = useState(null)

  const setShippingInfo = useCallback((info) => {
    setShippingInfoState(info)
    saveCustomerInfo(info)
  }, [])

  const resetCheckout = useCallback(() => {
    setPaymentInfo(null)
  }, [])

  const value = useMemo(
    () => ({ shippingInfo, setShippingInfo, paymentInfo, setPaymentInfo, resetCheckout }),
    [shippingInfo, setShippingInfo, paymentInfo, resetCheckout],
  )

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider')
  return ctx
}
