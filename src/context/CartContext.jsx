import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadCart, saveCart } from '../lib/storage'
import { useCatalog } from './CatalogContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => loadCart())
  const { getProduct } = useCatalog()

  useEffect(() => saveCart(cartItems), [cartItems])

  const addToCart = useCallback(
    (productId, quantity = 1) => {
      setCartItems((prev) => {
        const existing = prev.find((i) => i.productId === productId)
        const product = getProduct(productId)
        const maxQty = product?.stock ?? 0
        if (existing) {
          const nextQty = Math.min(existing.quantity + quantity, maxQty)
          return prev.map((i) => (i.productId === productId ? { ...i, quantity: nextQty } : i))
        }
        return [...prev, { productId, quantity: Math.min(quantity, maxQty) }]
      })
    },
    [getProduct],
  )

  const updateQuantity = useCallback((productId, quantity) => {
    setCartItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    })
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const clearCart = useCallback(() => setCartItems([]), [])

  const cartDetails = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = getProduct(item.productId)
          if (!product) return null
          return { ...item, product, lineTotal: product.price * item.quantity }
        })
        .filter(Boolean),
    [cartItems, getProduct],
  )

  const cartCount = useMemo(() => cartItems.reduce((sum, i) => sum + i.quantity, 0), [cartItems])
  const subtotal = useMemo(() => cartDetails.reduce((sum, i) => sum + i.lineTotal, 0), [cartDetails])

  const value = useMemo(
    () => ({
      cartItems,
      cartDetails,
      cartCount,
      subtotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [cartItems, cartDetails, cartCount, subtotal, addToCart, updateQuantity, removeFromCart, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
