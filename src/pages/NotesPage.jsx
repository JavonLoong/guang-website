import { useState, useMemo } from 'react'
import ArticleCard from '../components/ArticleCard'
import TagFilter from '../components/TagFilter'

export default function NotesPage({ articles, onOpenArticle }) {
  const [currentTag, setCurrentTag] = useState('all')

  const allTags = useMemo(() => {
    const s = new Set()
    articles.forEach(a => a.tags.forEach(t => s.add(t)))
    return Array.from(s)
  }, [articles])

  const filtered = currentTag === 'all'
    ? articles
    : articles.filter(a => a.tags.includes(currentTag))

  return (
    <main>
      <div className="notes-header">
        <h1 className="notes-title">📒 学习笔记</h1>
        <p className="notes-desc">记录每一次成长的足迹</p>
      </div>

      <div className="section-container">
        <TagFilter tags={allTags} currentTag={currentTag} onTagChange={setCurrentTag} />

        <div className="articles-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍃</div>
              <div className="empty-text">该分类下暂无笔记</div>
            </div>
          ) : (
            filtered.map(a => (
              <ArticleCard key={a.id} article={a} onClick={onOpenArticle} />
            ))
          )}
        </div>
      </div>

      <footer className="footer">
        <p>用 <span className="footer-heart">♥</span> 记录学习 · 光 · 学习空间 © 2026</p>
      </footer>
    </main>
  )
}
