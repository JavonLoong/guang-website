export default function ArticleCard({ article, onClick, highlightText }) {
  const displayDate = article.updated_at || article.date
  const hasHistory = article.history && article.history.length > 0

  function highlight(text) {
    if (!highlightText) return text
    const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<span class="search-highlight">$1</span>')
  }

  return (
    <article className="article-card" onClick={() => onClick(article)}>
      <div className="article-date-row">
        <span className="article-date">🕒 {displayDate}</span>
        {hasHistory && <span className="article-update-badge">拥有历史版本</span>}
      </div>
      <h3 className="article-title" dangerouslySetInnerHTML={{ __html: highlight(article.title) }} />
      <p className="article-summary" dangerouslySetInnerHTML={{ __html: highlight(article.summary) }} />
      <div className="article-footer">
        <div className="article-tags">
          {article.tags.map(tag => <span key={tag} className="article-tag">{tag}</span>)}
        </div>
        <span className="article-read-more">阅读详情 →</span>
      </div>
    </article>
  )
}
