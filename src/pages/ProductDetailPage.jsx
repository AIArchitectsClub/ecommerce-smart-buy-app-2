import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../lib/pricing'
import StockBadge from '../components/StockBadge'
import { expressPay, getFeatures } from '../lib/api'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { getProduct, categories, loading, refreshProducts } = useCatalog()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [expressAvailable, setExpressAvailable] = useState(false)
  const [express, setExpress] = useState({ busy: false, message: null, error: null })

  useEffect(() => {
    getFeatures()
      .then((f) => setExpressAvailable(Boolean(f?.expressPay)))
      .catch(() => setExpressAvailable(false))
  }, [])

  const product = getProduct(id)

  if (loading) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page">
        <p>Product not found.</p>
        <Link to="/">Back to shop</Link>
      </div>
    )
  }

  const category = categories.find((c) => c.id === product.categoryId)

  function handleAddToCart() {
    addToCart(product.id, quantity)
    setAdded(true)
  }

  async function handleExpressPay() {
    setExpress({ busy: true, message: null, error: null })
    try {
      const order = await expressPay([{ productId: product.id, quantity }])
      setExpress({
        busy: false,
        message: `Express order placed: #${order.id.slice(0, 8)} for ${formatCurrency(order.total)}. Shipped to your last address.`,
        error: null,
      })
      refreshProducts().catch(() => {})
    } catch (err) {
      setExpress({
        busy: false,
        message: null,
        error: err.status === 401 ? 'Sign in to use Express Pay.' : err.message || 'Express Pay failed.',
      })
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        &larr; Back to shop
      </Link>
      <div className="product-detail">
        <div className="product-detail-image">{product.image}</div>
        <div className="product-detail-body">
          <span className="category-tag">{category?.icon} {category?.name}</span>
          <h1>{product.name}</h1>
          <p className="product-detail-description">{product.description}</p>
          <div className="product-detail-price">{formatCurrency(product.price)}</div>
          <StockBadge stock={product.stock} />

          {product.stock > 0 && (
            <div className="quantity-row">
              <label htmlFor="qty">Quantity</label>
              <select
                id="qty"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              >
                {Array.from({ length: Math.min(product.stock, 10) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="button-row">
            <button className="btn btn-primary" disabled={product.stock <= 0} onClick={handleAddToCart}>
              {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            {added && (
              <button className="btn btn-secondary" onClick={() => navigate('/cart')}>
                Go to Cart
              </button>
            )}
          </div>
          {expressAvailable && product.stock > 0 && (
            <div className="button-row">
              <button className="btn btn-secondary" disabled={express.busy} onClick={handleExpressPay}>
                {express.busy ? 'Placing order…' : 'Express Pay (1-click)'}
              </button>
            </div>
          )}
          {added && <p className="confirmation-banner">Added to cart!</p>}
          {express.message && <p className="confirmation-banner">{express.message}</p>}
          {express.error && <div className="alert alert-error">{express.error}</div>}
        </div>
      </div>
    </div>
  )
}
