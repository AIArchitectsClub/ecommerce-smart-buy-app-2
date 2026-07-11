import { useMemo, useState } from 'react'
import { useCatalog } from '../context/CatalogContext'
import CategoryFilter from '../components/CategoryFilter'
import ProductCard from '../components/ProductCard'

export default function ProductsPage() {
  const { products, categories, loading, error } = useCatalog()
  const [selectedCategory, setSelectedCategory] = useState(null)

  const filtered = useMemo(
    () => (selectedCategory ? products.filter((p) => p.categoryId === selectedCategory) : products),
    [products, selectedCategory],
  )

  return (
    <div className="page">
      <h1>Shop by Category</h1>
      {error && <div className="alert alert-error">Failed to load products: {error}</div>}
      {loading ? (
        <p>Loading products…</p>
      ) : (
        <>
          <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
          <div className="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
