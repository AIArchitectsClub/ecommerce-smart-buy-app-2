import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../lib/pricing'
import StockBadge from './StockBadge'

export default function ProductCard({ product }) {
  const { addToCart } = useCart()

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-image">
        {product.image}
      </Link>
      <div className="product-card-body">
        <Link to={`/products/${product.id}`} className="product-card-name">
          {product.name}
        </Link>
        <div className="product-card-price">{formatCurrency(product.price)}</div>
        <StockBadge stock={product.stock} />
        <button
          className="btn btn-primary btn-block"
          disabled={product.stock <= 0}
          onClick={() => addToCart(product.id, 1)}
        >
          {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
