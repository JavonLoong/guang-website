# OpenSpec 事实来源规范：光 · 学习空间

> **文档类型**：Source of Truth Specification  
> **版本**：v3.0 (React 重构版)  
> **最后更新**：2026-03-26

---

## 1. 产品定义

**「光」** 是一个基于 React + Vite 构建的个人学习笔记 SPA 网站，部署在 GitHub Pages 上。

### 核心体验
- 暗色赛博玻璃拟态 (Glassmorphism) 视觉体系
- Canvas 驱动的交互式粒子星空背景
- 学习笔记的按标签浏览与全文搜索
- 文章历史版本时间轴追溯

### 技术栈
| 层级 | 选型 |
|------|------|
| 框架 | React 19 |
| 构建 | Vite 6 |
| 路由 | React Router v7 |
| 样式 | CSS Modules + CSS Variables |
| Markdown 渲染 | react-markdown + remark-gfm |
| 代码高亮 | highlight.js |
| 部署 | GitHub Pages (gh-pages 分支) |

---

## 2. 数据结构

数据文件位于 `public/data/articles.json`，格式如下：

```json
{
  "id": number,
  "title": string,
  "updated_at": "YYYY-MM-DD HH:mm",
  "tags": [string],
  "summary": string,
  "content": "Markdown 格式正文",
  "history": [
    {
      "version": "vX.0",
      "time": "YYYY-MM-DD HH:mm",
      "description": string,
      "title": string,
      "content": "该版本的 Markdown 正文"
    }
  ]
}
```

---

## 3. 页面规范

### 3.1 导航栏 (Navbar)
- 固定在顶部，半透明玻璃拟态效果
- Logo「✨ 光」点击回首页
- 三个路由入口：首页 / 学习笔记 / 知识搜索
- 当前页高亮

### 3.2 首页 (HomePage)
- **Hero 区域**：Canvas 粒子背景 + 标题 + 标语 + 技能标签气泡 + CTA 按钮
- **统计区域**：笔记总数（数字滚动动画）/ 知识领域数 / ∞ 探索热情
- **最近学习**：展示最新 3 篇文章卡片

### 3.3 学习笔记页 (NotesPage)
- 标签过滤栏：从数据动态生成 + "全部内容" 默认项
- 文章卡片网格：显示日期、标题、摘要、标签、是否有历史版本

### 3.4 知识搜索页 (SearchPage)
- 居中大搜索框，支持防抖实时搜索
- 匹配结果以文章卡片形式展示，关键词高亮

### 3.5 文章详情弹窗 (ArticleModal)
- 全屏遮罩 + 居中内容面板
- 顶部：日期 + 标题 + 标签 + 「🕒 历史版本」按钮
- 正文：Markdown 渲染 + 代码高亮
- 侧边栏时间轴：点击切换版本，顶部提示正在查看旧版

---

## 4. 视觉规范

### 色彩体系
```css
--bg-primary: #0a0e17
--bg-card: rgba(15, 23, 42, 0.6)
--glass-border: rgba(108, 92, 231, 0.15)
--primary: #6c5ce7
--primary-light: #a29bfe
--accent: #00cec9
--text-primary: #e2e8f0
--text-secondary: #94a3b8
```

### 关键效果
- 卡片：`backdrop-filter: blur(20px)` + 微弱边框发光
- 悬停：卡片上浮 + 阴影扩散 + 边框高亮
- 粒子背景：鼠标引力连线交互，紫/青双色节点

---

## 5. 组件清单

| 组件 | 文件 | 职责 |
|------|------|------|
| App | `src/App.jsx` | 路由入口 |
| Navbar | `src/components/Navbar.jsx` | 顶部导航 |
| ParticleCanvas | `src/components/ParticleCanvas.jsx` | 粒子背景 |
| ArticleCard | `src/components/ArticleCard.jsx` | 文章卡片 |
| ArticleModal | `src/components/ArticleModal.jsx` | 详情弹窗+历史时间轴 |
| TagFilter | `src/components/TagFilter.jsx` | 标签过滤 |
| SearchBox | `src/components/SearchBox.jsx` | 搜索框 |
| CountUp | `src/components/CountUp.jsx` | 数字滚动动画 |
| HomePage | `src/pages/HomePage.jsx` | 首页 |
| NotesPage | `src/pages/NotesPage.jsx` | 笔记页 |
| SearchPage | `src/pages/SearchPage.jsx` | 搜索页 |
