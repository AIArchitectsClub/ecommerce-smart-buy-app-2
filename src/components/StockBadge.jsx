export default function StockBadge({ stock }) {
  if (stock <= 0) return <span className="badge badge-out">Out of stock</span>
  if (stock <= 5) return <span className="badge badge-low">Only {stock} left</span>
  return <span className="badge badge-in">In stock</span>
}
