import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import NotesPage from './pages/NotesPage'
import SearchPage from './pages/SearchPage'
import ArticleModal from './components/ArticleModal'

export default function App() {
  const [articles, setArticles] = useState([])
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/articles.json')
      .then(res => res.json())
      .then(data => {
        data.sort((a, b) => new Date(b.updated_at || b.date) - new Date(a.updated_at || a.date))
        setArticles(data)
      })
      .catch(err => console.error('数据加载失败:', err))
  }, [])

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage articles={articles} onOpenArticle={setSelectedArticle} />} />
        <Route path="/notes" element={<NotesPage articles={articles} onOpenArticle={setSelectedArticle} />} />
        <Route path="/search" element={<SearchPage articles={articles} onOpenArticle={setSelectedArticle} />} />
      </Routes>
      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </>
  )
}
