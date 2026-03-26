// ============================================
// 个人网站 - 核心逻辑
// ============================================

// 全局状态
const state = {
  articles: [],
  currentFilter: '全部',
  currentPage: 'home',
};

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadArticles();
  initNavigation();
  initParticles();
  initScrollEffects();
  renderHomePage();
  renderNotesPage();
  renderSearchPage();
});

// ============================================
// 数据加载
// ============================================
async function loadArticles() {
  try {
    const response = await fetch('data/articles.json');
    state.articles = await response.json();
  } catch (e) {
    console.warn('无法加载文章数据，使用空数组', e);
    state.articles = [];
  }
}

// ============================================
// 导航与路由
// ============================================
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const menuToggle = document.getElementById('menuToggle');
  const navLinksContainer = document.getElementById('navLinks');

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      navigateTo(page);
      navLinksContainer.classList.remove('open');
    });
  });

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      navLinksContainer.classList.toggle('open');
    });
  }

  // 品牌点击回首页
  const brand = document.querySelector('.nav-brand');
  if (brand) {
    brand.addEventListener('click', () => navigateTo('home'));
  }
}

function navigateTo(page) {
  state.currentPage = page;

  // 更新页面显示
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // 更新导航高亮
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // 滚动到页面顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 如进入搜索页，聚焦搜索框
  if (page === 'search') {
    setTimeout(() => {
      const input = document.getElementById('searchInput');
      if (input) input.focus();
    }, 400);
  }
}

// ============================================
// 滚动效果
// ============================================
function initScrollEffects() {
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ============================================
// 首页渲染
// ============================================
function renderHomePage() {
  // 更新统计数据
  const articleCount = state.articles.length;
  const tagSet = new Set();
  state.articles.forEach(a => a.tags.forEach(t => tagSet.add(t)));

  const countEl = document.getElementById('statArticles');
  const tagCountEl = document.getElementById('statTags');
  if (countEl) countEl.textContent = articleCount;
  if (tagCountEl) tagCountEl.textContent = tagSet.size;

  // 渲染最近学习
  const recentGrid = document.getElementById('recentArticles');
  if (recentGrid) {
    const recent = [...state.articles].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ).slice(0, 3);
    recentGrid.innerHTML = recent.map(a => createArticleCard(a)).join('');
    bindCardEvents(recentGrid);
  }
}

// ============================================
// 学习笔记页
// ============================================
function renderNotesPage() {
  renderFilterBar();
  renderArticles();
}

function renderFilterBar() {
  const filterBar = document.getElementById('filterBar');
  if (!filterBar) return;

  const allTags = new Set();
  state.articles.forEach(a => a.tags.forEach(t => allTags.add(t)));

  const tags = ['全部', ...allTags];
  filterBar.innerHTML = tags.map(tag => `
    <button class="filter-tag ${tag === state.currentFilter ? 'active' : ''}" 
            data-tag="${tag}">${tag}</button>
  `).join('');

  filterBar.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentFilter = btn.dataset.tag;
      renderFilterBar();
      renderArticles();
    });
  });
}

function renderArticles() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  const filtered = state.currentFilter === '全部'
    ? state.articles
    : state.articles.filter(a => a.tags.includes(state.currentFilter));

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-icon">📝</div>
        <div class="empty-text">还没有这个分类的笔记</div>
        <div class="empty-hint">试试其他标签吧</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(a => createArticleCard(a)).join('');
  bindCardEvents(grid);
}

// ============================================
// 文章卡片
// ============================================
function createArticleCard(article) {
  return `
    <div class="article-card" data-id="${article.id}">
      <div class="article-date">
        <span>📅</span> ${article.date}
      </div>
      <h3 class="article-title">${article.title}</h3>
      <p class="article-summary">${article.summary}</p>
      <div class="article-tags">
        ${article.tags.map(t => `<span class="article-tag">${t}</span>`).join('')}
      </div>
    </div>
  `;
}

function bindCardEvents(container) {
  container.querySelectorAll('.article-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const article = state.articles.find(a => a.id === id);
      if (article) openModal(article);
    });
  });
}

// ============================================
// 文章详情弹窗
// ============================================
function openModal(article) {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;

  document.getElementById('modalDate').textContent = article.date;
  document.getElementById('modalTitle').textContent = article.title;
  document.getElementById('modalTags').innerHTML = 
    article.tags.map(t => `<span class="article-tag">${t}</span>`).join('');
  document.getElementById('modalBody').innerHTML = parseContent(article.content);

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // 关闭事件
  const closeBtn = overlay.querySelector('.modal-close');
  const closeHandler = () => closeModal();
  closeBtn.onclick = closeHandler;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };
  
  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function parseContent(content) {
  // 简易 Markdown 解析
  return content
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      
      if (block.startsWith('## ')) {
        return `<h2>${block.slice(3)}</h2>`;
      }
      
      // 处理列表
      if (block.includes('\n')) {
        const lines = block.split('\n');
        const isList = lines.every(l => /^[\d]+\.\s|^-\s/.test(l.trim()));
        if (isList) {
          const isOrdered = /^\d+\./.test(lines[0].trim());
          const tag = isOrdered ? 'ol' : 'ul';
          const items = lines.map(l => 
            `<li>${l.replace(/^[\d]+\.\s|^-\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`
          ).join('');
          return `<${tag}>${items}</${tag}>`;
        }
      }
      
      // 行内格式
      block = block.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return `<p>${block}</p>`;
    })
    .join('');
}

// ============================================
// 搜索页
// ============================================
function renderSearchPage() {
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const hotTagsList = document.getElementById('hotTagsList');

  if (!searchInput) return;

  // 渲染热门标签
  if (hotTagsList) {
    const tagCounts = {};
    state.articles.forEach(a => a.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }));
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    hotTagsList.innerHTML = sortedTags.map(([tag]) => `
      <button class="hot-tag" data-tag="${tag}">${tag}</button>
    `).join('');

    hotTagsList.querySelectorAll('.hot-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        searchInput.value = btn.dataset.tag;
        searchInput.dispatchEvent(new Event('input'));
      });
    });
  }

  // 搜索逻辑
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();
    
    // 清除按钮
    searchClear.classList.toggle('visible', query.length > 0);

    debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 200);
  });

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.remove('visible');
      performSearch('');
      searchInput.focus();
    });
  }
}

function performSearch(query) {
  const resultsContainer = document.getElementById('searchResults');
  const resultsCount = document.getElementById('searchResultsCount');
  if (!resultsContainer) return;

  if (!query) {
    resultsContainer.innerHTML = '';
    resultsCount.classList.remove('visible');
    return;
  }

  const lowerQuery = query.toLowerCase();
  const results = state.articles.filter(a =>
    a.title.toLowerCase().includes(lowerQuery) ||
    a.summary.toLowerCase().includes(lowerQuery) ||
    a.content.toLowerCase().includes(lowerQuery) ||
    a.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );

  resultsCount.textContent = `找到 ${results.length} 条结果`;
  resultsCount.classList.add('visible');

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">没有找到匹配的内容</div>
        <div class="empty-hint">试试其他关键词吧</div>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = results.map(a => {
    const highlightedTitle = highlightText(a.title, query);
    const highlightedSummary = highlightText(a.summary, query);
    
    return `
      <div class="search-result-item" data-id="${a.id}">
        <h3 class="search-result-title">${highlightedTitle}</h3>
        <p class="search-result-summary">${highlightedSummary}</p>
        <div class="article-tags">
          ${a.tags.map(t => {
            const isMatch = t.toLowerCase().includes(lowerQuery);
            return `<span class="article-tag" style="${isMatch ? 'background: rgba(0,206,201,0.2); color: var(--accent-light);' : ''}">${t}</span>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  // 点击搜索结果打开弹窗
  resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const article = state.articles.find(a => a.id === id);
      if (article) openModal(article);
    });
  });
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// 粒子动画
// ============================================
function initParticles() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationId;
  let particles = [];

  function resize() {
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  resize();
  window.addEventListener('resize', resize);

  // 创建粒子
  const count = Math.min(80, Math.floor(canvas.offsetWidth / 15));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    particles.forEach((p, i) => {
      // 移动
      p.x += p.vx;
      p.y += p.vy;

      // 边界反弹
      if (p.x < 0 || p.x > canvas.offsetWidth) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.offsetHeight) p.vy *= -1;

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(162, 155, 254, ${p.opacity})`;
      ctx.fill();

      // 绘制连线
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(108, 92, 231, ${0.1 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });

    animationId = requestAnimationFrame(animate);
  }

  // 仅在首页可见时运行
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate();
      } else {
        cancelAnimationFrame(animationId);
      }
    });
  });

  observer.observe(canvas);
}
