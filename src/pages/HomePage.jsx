import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticleCanvas from '../components/ParticleCanvas'
import ArticleCard from '../components/ArticleCard'
import CountUp from '../components/CountUp'

export default function HomePage({ articles, onOpenArticle }) {
  const navigate = useNavigate()
  const recent = articles.slice(0, 3)
  
  const tagCount = useMemo(() => {
    const s = new Set()
    articles.forEach(a => a.tags.forEach(t => s.add(t)))
    return s.size
  }, [articles])

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <ParticleCanvas />
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">光</span> 的节点字典
          </h1>
          <p className="hero-subtitle">Engineering · Computation · AI Agents</p>
          <div className="hero-tags">
            <span className="hero-tag">参数化建模</span>
            <span className="hero-tag">力学理论</span>
            <span className="hero-tag">AI 智能协同</span>
            <span className="hero-tag">工作流引擎</span>
          </div>
          <button className="hero-cta" onClick={() => navigate('/notes')}>
            进入数据库 <span>→</span>
          </button>
        </div>
        <div className="scroll-indicator">
          <span>向下滚动</span><span>↓</span>
        </div>
      </section>

      {/* 统计 */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number"><CountUp end={articles.length} /></div>
            <div className="stat-label">篇学习笔记</div>
          </div>
          <div className="stat-item">
            <div className="stat-number"><CountUp end={tagCount} /></div>
            <div className="stat-label">个知识领域</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">∞</div>
            <div className="stat-label">探索的热情</div>
          </div>
        </div>
      </section>

      {/* 最近学习 */}
      <section className="section-container">
        <div className="section-header">
          <h2 className="section-title">最近学习</h2>
          <span className="section-link" onClick={() => navigate('/notes')}>查看全部 →</span>
        </div>
        <div className="articles-grid">
          {recent.map(a => (
            <ArticleCard key={a.id} article={a} onClick={onOpenArticle} />
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>用 <span className="footer-heart">♥</span> 记录学习 · 光 · 学习空间 © 2026</p>
      </footer>
    </main>
  )
}
