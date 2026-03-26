import { useState, useMemo } from 'react'
import ArticleCard from '../components/ArticleCard'

export default function SearchPage({ articles, onOpenArticle }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [query, articles])

  return (
    <main>
      <div className="search-hero">
        <h1 className="search-hero-title">
          🔍 <span className="gradient-text">知识搜索</span>
        </h1>
        <p className="search-hero-desc">在这里搜索你想了解的知识</p>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="输入关键词搜索..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="search-results">
        {query.trim() && results.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-text">没有找到包含 "{query}" 的内容</div>
          </div>
        )}
        <div className="articles-grid">
          {results.map(a => (
            <ArticleCard key={a.id} article={a} onClick={onOpenArticle} highlightText={query} />
          ))}
        </div>
      </div>

      <footer className="footer">
        <p>用 <span className="footer-heart">♥</span> 记录学习 · 光 · 学习空间 © 2026</p>
      </footer>
    </main>
  )
}
