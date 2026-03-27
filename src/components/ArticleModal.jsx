import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ArticleModal({ article, onClose }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeVersion, setActiveVersion] = useState(null) // null = 当前最新

  // 组合全版本列表（最新 + 历史）
  const versions = useMemo(() => {
    const list = [
      {
        version: '最新',
        time: article.updated_at || article.date,
        description: '当前最新版本',
        title: article.title,
        content: article.content,
        isCurrent: true
      },
      ...(article.history || []).map(h => ({
        ...h, isCurrent: false
      }))
    ]
    list.sort((a, b) => new Date(b.time) - new Date(a.time))
    return list
  }, [article])

  const hasHistory = article.history && article.history.length > 0
  const viewing = activeVersion != null ? versions[activeVersion] : versions[0]

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" style={{ position: 'relative' }}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-main">
          <div className="modal-date-wrapper">
            <span className="modal-date">当前版本：{viewing.time}</span>
            {hasHistory && (
              <button
                className={`modal-history-btn ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(v => !v)}
              >
                历史轨迹
              </button>
            )}
          </div>

          <h2 className="modal-title">{viewing.title}</h2>

          <div className="modal-tags">
            {article.tags.map(tag => <span key={tag} className="article-tag">{tag}</span>)}
          </div>

          {/* 版本提示条 */}
          {activeVersion != null && !viewing.isCurrent && (
            <div className="modal-version-notice">
              正在查看历史版本：{viewing.version}（{viewing.time}）
              <button className="modal-restore-btn" onClick={() => setActiveVersion(null)}>
                返回最新版本
              </button>
            </div>
          )}

          <div className="modal-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {viewing.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* 侧边栏时间轴 */}
        {hasHistory && (
          <div className={`modal-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
            <h3 className="sidebar-title">修改历史</h3>
            <div className="timeline">
              {versions.map((v, idx) => (
                <div
                  key={idx}
                  className={`timeline-item ${(activeVersion ?? 0) === idx ? 'active' : ''}`}
                  onClick={() => setActiveVersion(idx)}
                >
                  <div className="tl-time">
                    {v.time} <span style={{ color: 'var(--primary-light)', fontSize: '0.75rem' }}>{v.version}</span>
                  </div>
                  <div className="tl-title">{v.title}</div>
                  <div className="tl-desc">{v.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
