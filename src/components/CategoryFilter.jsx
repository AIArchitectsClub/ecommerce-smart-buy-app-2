export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="category-filter">
      <button className={selected === null ? 'category-pill active' : 'category-pill'} onClick={() => onSelect(null)}>
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          className={selected === c.id ? 'category-pill active' : 'category-pill'}
          onClick={() => onSelect(c.id)}
        >
          {c.icon} {c.name}
        </button>
      ))}
    </div>
  )
}
