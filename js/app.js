/* ============================================
   应用状态管理
   ============================================ */
const state = {
  articles: [],        // 所有文章数据
  currentTag: 'all',   // 当前过滤的标签
  currentView: 'home', // 当前视图 (home, notes, search)
  particles: [],       // 粒子动画数组
  mouse: { x: null, y: null, radius: 100 },
  currentViewingArticle: null // 当前弹窗查阅的文章对象
};

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  initParticles();
  loadData();
  bindGlobalEvents();
});

// DOM 元素缓存
const D = {};

function initDOM() {
  D.views = document.querySelectorAll('.page');
  D.navLinks = document.querySelectorAll('.nav-link[data-view]');
  D.recentGrid = document.getElementById('recentGrid');
  D.notesGrid = document.getElementById('notesGrid');
  D.tagFilters = document.getElementById('tagFilters');
  
  // 弹窗
  D.modalOverlay = document.getElementById('modalOverlay');
  D.modalClose = document.querySelector('.modal-close');
  D.modalDate = document.getElementById('modalDate');
  D.modalTitle = document.getElementById('modalTitle');
  D.modalTags = document.getElementById('modalTags');
  D.modalBody = document.getElementById('modalBody');
  
  // 历史版本
  D.modalHistoryBtn = document.getElementById('modalHistoryBtn');
  D.modalSidebar = document.getElementById('modalSidebar');
  D.modalTimeline = document.getElementById('modalTimeline');
  D.modalVersionNotice = document.getElementById('modalVersionNotice');
  D.modalCurrentVersion = document.getElementById('modalCurrentVersion');
  D.modalCurrentTime = document.getElementById('modalCurrentTime');
  D.modalRestoreBtn = document.getElementById('modalRestoreBtn');

  // 搜索
  D.searchInput = document.getElementById('searchInput');
  D.searchResults = document.getElementById('searchResults');
}

// ============================================
// 数据加载与处理
// ============================================
async function loadData() {
  try {
    const res = await fetch('data/articles.json');
    if (!res.ok) throw new Error('数据加载失败');
    state.articles = await res.json();
    
    // 按最后更新时间降序排列
    state.articles.sort((a, b) => {
      const d1 = new Date(b.updated_at || b.date);
      const d2 = new Date(a.updated_at || a.date);
      return d1 - d2;
    });

    renderHome();
    renderNotes();
    renderTags();
  } catch (err) {
    console.error('加载文章数据失败:', err);
    if (D.recentGrid) D.recentGrid.innerHTML = '<div class="empty-state">数据加载失败，请检查网络或文件。</div>';
  }
}

// ============================================
// 视图切换与导航
// ============================================
function switchView(viewName) {
  if (state.currentView === viewName) return;
  
  D.views.forEach(v => v.classList.remove('active'));
  document.getElementById(`${viewName}View`).classList.add('active');
  
  D.navLinks.forEach(l => {
    l.classList.toggle('active', l.dataset.view === viewName);
  });
  
  state.currentView = viewName;
  window.scrollTo(0, 0);
  
  // 切回搜索页时聚焦
  if (viewName === 'search' && D.searchInput) {
    setTimeout(() => D.searchInput.focus(), 100);
  }
}

function bindGlobalEvents() {
  // 导航路由
  D.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  // 主页CTA按钮
  const ctaBtn = document.getElementById('startExploreBtn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => switchView('notes'));
  }

  // 搜索监听
  if (D.searchInput) {
    let debounceTimer;
    D.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performSearch(e.target.value.trim()), 300);
    });
  }
  
  // 弹窗关闭
  if (D.modalClose) D.modalClose.addEventListener('click', closeModal);
  if (D.modalOverlay) {
    D.modalOverlay.addEventListener('click', (e) => {
      if (e.target === D.modalOverlay) closeModal();
    });
  }

  // 历史版本面板切换
  if (D.modalHistoryBtn) {
    D.modalHistoryBtn.addEventListener('click', () => {
      D.modalHistoryBtn.classList.toggle('active');
      D.modalSidebar.classList.toggle('active');
    });
  }

  // 返回最新版本按钮
  if (D.modalRestoreBtn) {
    D.modalRestoreBtn.addEventListener('click', () => {
      const firstItem = D.modalTimeline.querySelector('.timeline-item');
      if (firstItem) firstItem.click();
    });
  }
}

// ============================================
// 渲染逻辑
// ============================================

function renderHome() {
  if (!D.recentGrid) return;
  // 首页展示最近3篇
  renderArticleCards(state.articles.slice(0, 3), D.recentGrid);
  
  // 更新统计号
  const totalArts = document.getElementById('totalArticles');
  if (totalArts) {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      totalArts.textContent = count;
      if (count >= state.articles.length) clearInterval(interval);
    }, 50);
  }
}

function renderNotes() {
  if (!D.notesGrid) return;
  const filtered = state.currentTag === 'all' 
    ? state.articles 
    : state.articles.filter(a => a.tags.includes(state.currentTag));
    
  if (filtered.length === 0) {
    D.notesGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center;">
        <div class="empty-icon">🍃</div>
        <div class="empty-text">该分类下暂无笔记</div>
      </div>
    `;
    return;
  }
  renderArticleCards(filtered, D.notesGrid);
}

function renderTags() {
  if (!D.tagFilters) return;
  
  // 全局提取tags
  const tagSet = new Set();
  state.articles.forEach(a => a.tags.forEach(t => tagSet.add(t)));
  const tags = ['all', ...Array.from(tagSet)];
  
  D.tagFilters.innerHTML = tags.map(tag => {
    const label = tag === 'all' ? '全部内容' : tag;
    return `<button class="filter-tag ${state.currentTag === tag ? 'active' : ''}" data-tag="${tag}">${label}</button>`;
  }).join('');
  
  // 绑定标签切换
  D.tagFilters.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.currentTag = e.target.dataset.tag;
      renderTags(); // 更新激活状态
      renderNotes(); // 更新列表
    });
  });
}

// 通用卡片渲染
function renderArticleCards(articles, container, highlightText = "") {
  if (!container) return;
  container.innerHTML = articles.map(article => {
    const showTitle = highlightText ? highlightMatch(article.title, highlightText) : article.title;
    const showSummary = highlightText ? highlightMatch(article.summary, highlightText) : article.summary;
    
    const displayDate = article.updated_at || article.date;
    const hasHistory = article.history && article.history.length > 0;
    
    return `
      <article class="article-card" onclick="openArticle(${article.id})">
        <div class="article-date-row">
          <span class="article-date">🕒 ${displayDate}</span>
          ${hasHistory ? '<span class="article-update-badge">拥有历史版本</span>' : ''}
        </div>
        <h3 class="article-title">${showTitle}</h3>
        <p class="article-summary">${showSummary}</p>
        <div class="article-footer">
          <div class="article-tags">
            ${article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
          </div>
          <span class="article-read-more">阅读详情 →</span>
        </div>
      </article>
    `;
  }).join('');
}

// ============================================
// 详情弹窗与历史版本渲染
// ============================================
window.openArticle = function(id) {
  const article = state.articles.find(a => a.id === id);
  if (!article) return;
  
  state.currentViewingArticle = article;
  
  // 重置 UI 状态
  D.modalVersionNotice.classList.add('hidden');
  D.modalSidebar.classList.remove('active');
  D.modalHistoryBtn.classList.remove('active');
  
  // 检查历史版本
  if (article.history && article.history.length > 0) {
    D.modalHistoryBtn.style.display = 'flex';
    renderTimeline(article);
  } else {
    D.modalHistoryBtn.style.display = 'none';
    D.modalSidebar.style.display = 'none';
  }

  // 渲染正文
  renderArticleContent(article.title, article.updated_at || article.date, article.tags, article.content);
  
  D.modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
};

function renderArticleContent(title, dateStr, tags, textContent) {
  D.modalTitle.textContent = title;
  D.modalDate.textContent = `当前版本：${dateStr}`;
  D.modalTags.innerHTML = tags.map(tag => `<span class="article-tag">${tag}</span>`).join('');
  
  // 简易 Markdown 解析 (标题, 加粗, 换行, 列表段)
  let html = textContent;
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  // 包裹列表
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  // 段落
  html = html.replace(/^(?!<[hu]|<li)(.+)$/gim, '<p>$1</p>');
  
  D.modalBody.innerHTML = html;
}

function renderTimeline(article) {
  D.modalSidebar.style.display = 'block';
  
  const versions = [
    {
      version: "Latest",
      time: article.updated_at || article.date,
      description: "当前最新版本",
      isCurrent: true,
      title: article.title,
      content: article.content
    },
    ...article.history.map(h => ({
      version: h.version,
      time: h.time,
      description: h.description,
      isCurrent: false,
      title: h.title,
      content: h.content
    }))
  ];
  
  // 倒序
  versions.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  D.modalTimeline.innerHTML = versions.map((v, idx) => `
    <div class="timeline-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
      <div class="tl-time">${v.time} &nbsp;<span style="color:var(--primary-light);font-size:0.75rem">${v.version}</span></div>
      <div class="tl-title">${v.title}</div>
      <div class="tl-desc">${v.description}</div>
    </div>
  `).join('');
  
  // 绑定点击切换版本
  D.modalTimeline.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      const ver = versions[idx];
      
      D.modalTimeline.querySelectorAll('.timeline-item').forEach(el => el.classList.remove('active'));
      this.classList.add('active');
      
      renderArticleContent(ver.title, ver.time, article.tags, ver.content);
      
      if (!ver.isCurrent) {
        D.modalVersionNotice.classList.remove('hidden');
        D.modalCurrentVersion.textContent = ver.version;
        D.modalCurrentTime.textContent = ver.time;
      } else {
        D.modalVersionNotice.classList.add('hidden');
      }
    });
  });
}

function closeModal() {
  D.modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
  state.currentViewingArticle = null;
  D.modalSidebar.classList.remove('active');
  D.modalHistoryBtn.classList.remove('active');
}

// ============================================
// 搜索逻辑
// ============================================
function performSearch(query) {
  if (!query) {
    if (D.searchResults) D.searchResults.innerHTML = '';
    return;
  }
  
  const q = query.toLowerCase();
  const results = state.articles.filter(a => 
    a.title.toLowerCase().includes(q) || 
    a.summary.toLowerCase().includes(q) ||
    a.content.toLowerCase().includes(q) ||
    a.tags.some(t => t.toLowerCase().includes(q))
  );
  
  if (results.length === 0) {
    D.searchResults.innerHTML = `
      <div class="empty-state" style="text-align: center;">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">没有找到包含 "${query}" 的内容</div>
      </div>
    `;
    return;
  }
  
  renderArticleCards(results, D.searchResults, query);
}

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// ============================================
// 粒子背景动画 (Canvas)
// ============================================
function initParticles() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener('mouseleave', () => {
    state.mouse.x = null;
    state.mouse.y = null;
  });

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.baseX = this.x;
      this.baseY = this.y;
      this.density = (Math.random() * 30) + 1;
      this.color = Math.random() > 0.5 ? 'rgba(108, 92, 231, 0.4)' : 'rgba(0, 206, 201, 0.4)';
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
    }
    
    update() {
      if (state.mouse.x != null) {
        let dx = state.mouse.x - this.x;
        let dy = state.mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let maxDistance = state.mouse.radius;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = forceDirectionX * force * this.density;
        let directionY = forceDirectionY * force * this.density;
        
        if (distance < maxDistance) {
          this.x -= directionX;
          this.y -= directionY;
        } else {
          if (this.x !== this.baseX) { this.x -= (this.x - this.baseX) / 10; }
          if (this.y !== this.baseY) { this.y -= (this.y - this.baseY) / 10; }
        }
      } else {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x > canvas.width || this.x < 0) this.vx = -this.vx;
        if (this.y > canvas.height || this.y < 0) this.vy = -this.vy;
      }
    }
    
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  function initNodes() {
    state.particles = [];
    let num = (canvas.width * canvas.height) / 8000;
    if (num > 100) num = 100;
    for (let i = 0; i < num; i++) state.particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < state.particles.length; i++) {
      state.particles[i].update();
      state.particles[i].draw();
      
      for (let j = i; j < state.particles.length; j++) {
        let dx = state.particles[i].x - state.particles[j].x;
        let dy = state.particles[i].y - state.particles[j].y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(108, 92, 231, ${0.2 - distance/500})`;
          ctx.lineWidth = 1;
          ctx.moveTo(state.particles[i].x, state.particles[i].y);
          ctx.lineTo(state.particles[j].x, state.particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }

  initNodes();
  animate();
}
