import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getCategories, getProducts } from '../lib/api'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshProducts = useCallback(async () => {
    const rows = await getProducts()
    setProducts(rows)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getCategories(), getProducts()])
      .then(([categoryRows, productRows]) => {
        if (cancelled) return
        setCategories(categoryRows)
        setProducts(productRows)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load catalog')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getProduct = useCallback((id) => products.find((p) => p.id === id) || null, [products])

  // Client-side pre-check only — the server re-validates atomically at checkout time.
  const checkStock = useCallback(
    (items) => {
      const insufficient = []
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId)
        if (!product || product.stock < item.quantity) {
          insufficient.push({
            productId: item.productId,
            name: product?.name || item.productId,
            requested: item.quantity,
            available: product?.stock ?? 0,
          })
        }
      }
      return insufficient.length ? { ok: false, insufficient } : { ok: true }
    },
    [products],
  )

  const value = useMemo(
    () => ({ products, categories, loading, error, getProduct, checkStock, refreshProducts }),
    [products, categories, loading, error, getProduct, checkStock, refreshProducts],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
