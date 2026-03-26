export default function TagFilter({ tags, currentTag, onTagChange }) {
  const allTags = ['all', ...tags]
  return (
    <div className="filter-bar">
      {allTags.map(tag => (
        <button
          key={tag}
          className={`filter-tag ${currentTag === tag ? 'active' : ''}`}
          onClick={() => onTagChange(tag)}
        >
          {tag === 'all' ? '全部内容' : tag}
        </button>
      ))}
    </div>
  )
}
