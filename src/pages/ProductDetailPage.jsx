import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../lib/pricing'
import StockBadge from '../components/StockBadge'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { getProduct, categories, loading } = useCatalog()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

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
          {added && <p className="confirmation-banner">Added to cart!</p>}
        </div>
      </div>
    </div>
  )
}
