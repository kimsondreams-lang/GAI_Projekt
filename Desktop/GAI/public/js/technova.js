;(function () {
  var BASE_URL = (function () {
    var p = String(window.location.pathname || '/');
    if (p.indexOf('/kimsondreams/') !== -1) return '/kimsondreams/';
    return '/';
  })();
  var DEFAULT_TAGS = ['Tech', 'Science', 'Photography', 'Review', 'AI', 'Deals'];

  function q(sel) {
    return document.querySelector(sel);
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function canon(s) {
    return String(s || '').trim().toLowerCase();
  }

  function normalizeImageSrc(img) {
    var s = String(img || '').trim();
    if (!s) return '';
    if (s.indexOf('http') === 0) return s;
    if (s.indexOf('/') === 0 || s.indexOf('images/') === 0) return BASE_URL + s.replace(/^\//, '');
    return BASE_URL + 'images/articles/' + s;
  }

  function parseDateSafe(s) {
    var d = new Date(String(s || ''));
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  function byDateDesc(a, b) {
    var da = parseDateSafe(a && a.date);
    var db = parseDateSafe(b && b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  }

  function pickTopic(a) {
    if (!a) return '';
    if (a.topic) return String(a.topic);
    var tags = Array.isArray(a.tags) ? a.tags : [];
    return tags.length ? String(tags[0]) : '';
  }

  function sidebarTypeForCategory(cat) {
    var c = canon(cat);
    if (!c) return 'NEWS';
    if (c.indexOf('review') !== -1) return 'REVIEWS';
    if (c.indexOf('mobile') !== -1) return 'REVIEWS';
    if (c.indexOf('accessor') !== -1) return 'REVIEWS';
    if (c.indexOf('apps') !== -1) return 'APPS';
    return 'NEWS';
  }

  function timeLabelForIndex(i) {
    var labels = ['12:30 PM', '11:00 AM', '10:20 AM', '09:45 AM', '08:10 AM', '07:40 AM', '07:10 AM'];
    return labels[i] || '';
  }

  async function fetchJson(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  var state = {
    articles: [],
    featuredIds: [],
    category: 'all',
    tag: '',
    search: ''
  };

  async function loadArticlesManifest() {
    var articles = [];

    try {
      var rootIndex = await fetchJson(BASE_URL + 'articles.json');
      if (Array.isArray(rootIndex) && rootIndex.length && typeof rootIndex[0] === 'object') {
        articles = rootIndex;
      }
    } catch (_) {}

    if (!articles.length) {
      var manifest = await fetchJson(BASE_URL + 'data/articles/index.json');
      if (Array.isArray(manifest) && manifest.length && typeof manifest[0] === 'object') {
        articles = manifest;
      } else if (Array.isArray(manifest) && manifest.length && typeof manifest[0] === 'string') {
        var resolved = [];
        for (var i = 0; i < Math.min(120, manifest.length); i++) {
          var fileName = manifest[i];
          try {
            var detail = await fetchJson(BASE_URL + 'data/articles/' + fileName);
            if (detail && typeof detail === 'object') resolved.push(detail);
          } catch (_) {}
        }
        articles = resolved;
      }
    }

    state.articles = Array.isArray(articles) ? articles : [];
  }

  function getCategories() {
    var counts = {};
    var labels = {};
    (state.articles || []).forEach(function (a) {
      var c = a && a.category;
      if (!c) return;
      var key = canon(c);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
      if (!labels[key]) labels[key] = String(c);
    });
    return Object.keys(counts)
      .map(function (k) {
        return { key: k, label: labels[k] || k, count: counts[k] };
      })
      .sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return String(a.label).localeCompare(String(b.label));
      });
  }

  function renderTags() {
    var container = q('#tag-list');
    if (!container) return;

    var current = state.category || 'all';
    var cats = getCategories();
    var html = ['<a href="#" data-category="all" class="' + (current === 'all' ? 'active' : '') + '">ALL</a>'];
    if (cats.length) {
      html = html.concat(
        cats.map(function (c) {
          var isActive = canon(c.key) === canon(current);
          return '<a href="#" data-category="' + esc(c.key) + '" class="' + (isActive ? 'active' : '') + '">' + esc(String(c.label).toUpperCase()) + '</a>';
        })
      );
      var existing = {};
      cats.forEach(function (c) {
        existing[canon(c.label)] = true;
        existing[canon(c.key)] = true;
      });
      DEFAULT_TAGS.forEach(function (label) {
        if (existing[canon(label)]) return;
        html.push('<a href="#" class="tag-placeholder" data-disabled-tag="1">' + esc(String(label).toUpperCase()) + '</a>');
      });
    } else {
      html = html.concat(
        DEFAULT_TAGS.map(function (label) {
          return '<a href="#" class="tag-placeholder" data-disabled-tag="1">' + esc(String(label).toUpperCase()) + '</a>';
        })
      );
    }

    container.innerHTML = html.join('');
    Array.prototype.forEach.call(container.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function (e) {
        if (a.hasAttribute('data-disabled-tag')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        var cat = a.getAttribute('data-category') || 'all';
        var url = new URL(window.location.href);
        url.searchParams.delete('id');
        if (cat === 'all') url.searchParams.delete('category');
        else url.searchParams.set('category', cat);
        window.history.pushState({}, '', url);
        state.category = cat;

        Array.prototype.forEach.call(container.querySelectorAll('a'), function (x) {
          x.classList.toggle('active', canon(x.getAttribute('data-category')) === canon(cat));
        });

        if (document.body.classList.contains('article-view')) return;
        renderFeed(filteredArticles());
      });
    });
  }

  function renderActiveFilters() {
    var row = q('.tags-row');
    if (!row) return;
    var existing = q('#active-filters');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'active-filters';
      existing.className = 'active-filters';
      row.appendChild(existing);
    }

    if (!state.tag) {
      existing.innerHTML = '';
      return;
    }

    var tagLabel = String(state.tag).toUpperCase();
    existing.innerHTML =
      '<span class="active-filter">' +
      '<span class="active-filter-label">TAG:</span>' +
      '<a href="#" class="active-filter-chip" data-clear-tag="1">' +
      esc(tagLabel) +
      '<span class="active-filter-x">×</span>' +
      '</a>' +
      '</span>';

    var clear = existing.querySelector('[data-clear-tag="1"]');
    if (clear) {
      clear.addEventListener('click', function (e) {
        e.preventDefault();
        setTagFilter('');
      });
    }
  }

  function setTagFilter(tag) {
    var next = canon(tag);
    state.tag = next;
    var url = new URL(window.location.href);
    url.searchParams.delete('id');
    if (!next) url.searchParams.delete('tag');
    else url.searchParams.set('tag', next);
    window.history.pushState({}, '', url);
    renderActiveFilters();
    if (document.body.classList.contains('article-view')) return;
    renderFeed(filteredArticles());
  }

  function renderHero(picks) {
    var hero = q('#featured-hero');
    var side = q('#featured-side');
    var section = q('#featured-section');
    if (!hero || !side || !section) return;
    if (!picks || !picks.length) {
      hero.innerHTML =
        '<article class="hero-shell-card">' +
        '<div class="hero-shell-overlay">' +
        '<div class="hero-meta">' +
        '<span class="hero-pill">Technology</span>' +
        '<span class="hero-date">Clean Slate</span>' +
        '</div>' +
        '<h2 class="hero-title">A premium TechNova shell is ready for the first flagship story.</h2>' +
        '<p class="hero-shell-copy">The layout stays magazine-ready even before the first publication. Once GAIOS creates a new article, this hero slot becomes the main headline automatically.</p>' +
        '</div>' +
        '</article>';
      side.innerHTML =
        '<article class="hero-mini hero-mini-placeholder">' +
        '<div class="hero-mini-link">' +
        '<div class="hero-mini-img hero-mini-surface"></div>' +
        '<div class="hero-mini-body">' +
        '<div class="hero-mini-cat">Review</div>' +
        '<div class="hero-mini-title">Secondary hero stories will appear here after the next publication batch.</div>' +
        '</div>' +
        '</div>' +
        '</article>' +
        '<article class="hero-mini hero-mini-placeholder">' +
        '<div class="hero-mini-link">' +
        '<div class="hero-mini-img hero-mini-surface"></div>' +
        '<div class="hero-mini-body">' +
        '<div class="hero-mini-cat">Science</div>' +
        '<div class="hero-mini-title">Use the clean-slate workflow to create new content and fill the TechNova grid from scratch.</div>' +
        '</div>' +
        '</div>' +
        '</article>';
      state.featuredIds = [];
      section.style.display = '';
      return;
    }

    var first = picks[0];
    var img = normalizeImageSrc(first.image) || (BASE_URL + 'images/articles/placeholder.jpg');
    var href = 'index.html?id=' + encodeURIComponent(String(first.id || ''));
    hero.innerHTML =
      '<article class="hero-card" style="background-image:url(\'' + esc(img) + '\')">' +
      '<a class="hero-link" href="' + esc(href) + '">' +
      '<div class="hero-overlay">' +
      '<div class="hero-meta">' +
      (first.category ? '<span class="hero-pill">' + esc(String(first.category)) + '</span>' : '') +
      (first.date ? '<span class="hero-date">' + esc(String(first.date)) + '</span>' : '') +
      '</div>' +
      '<h2 class="hero-title">' + esc(String(first.title || '')) + '</h2>' +
      '</div>' +
      '</a>' +
      '</article>';

    var right = picks.slice(1, 3);
    side.innerHTML = right
      .map(function (a) {
        var i = normalizeImageSrc(a.image) || (BASE_URL + 'images/articles/placeholder.jpg');
        var h = 'index.html?id=' + encodeURIComponent(String(a.id || ''));
        return (
          '<article class="hero-mini">' +
          '<a class="hero-mini-link" href="' + esc(h) + '">' +
          '<img class="hero-mini-img" src="' + esc(i) + '" alt="' + esc(String(a.title || '')) + '" loading="lazy">' +
          '<div class="hero-mini-body">' +
          (a.category ? '<div class="hero-mini-cat">' + esc(String(a.category)) + '</div>' : '') +
          '<div class="hero-mini-title">' + esc(String(a.title || '')) + '</div>' +
          '</div>' +
          '</a>' +
          '</article>'
        );
      })
      .join('');

    state.featuredIds = picks
      .map(function (x) {
        return String(x && x.id || '').trim();
      })
      .filter(Boolean);

    section.style.display = '';
  }

  function renderFeed(list) {
    var container = q('#main-articles');
    if (!container) return;
    if (!list || !list.length) {
      var hasPublishedArticles = Array.isArray(state.articles) && state.articles.length > 0;
      var kicker = hasPublishedArticles ? 'More stories' : 'Fresh start';
      var title = hasPublishedArticles ? 'Next editorial slots are ready.' : 'TECHNOVA is ready for brand-new stories.';
      var copy = hasPublishedArticles
        ? 'The lead story is already live in the hero slot. These next positions stay reserved for the upcoming review and feature drops.'
        : 'The blog is intentionally empty right now, so GAIOS can generate every article from a clean slate. When the next article is created, it will appear here automatically.';
      container.innerHTML =
        '<section class="empty-state' + (hasPublishedArticles ? ' empty-state-compact' : '') + '">' +
        '<div class="empty-state-kicker">' + esc(kicker) + '</div>' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + esc(copy) + '</p>' +
        '<div class="empty-feed-grid">' +
        '<article class="feed-card feed-card-placeholder">' +
        '<div class="feed-img-link"><div class="feed-img feed-surface"></div></div>' +
        '<div class="feed-body">' +
        '<div class="feed-meta"><span class="feed-cat">Technology</span><span></span></div>' +
        '<h3 class="feed-title">First flagship review slot</h3>' +
        '<p class="feed-excerpt">This placeholder keeps the editorial rhythm visible until the first premium article is published.</p>' +
        '<div class="feed-tags"><span class="feed-tags-label">Tags:</span><span class="feed-tag active">technologies</span><span class="feed-tag">smartwatch</span><span class="feed-tag">batteries</span></div>' +
        '<div class="feed-actions"><span class="feed-bottom-date">Next publication</span><span class="feed-btn">READ ARTICLE</span></div>' +
        '</div>' +
        '</article>' +
        '<article class="feed-card feed-card-placeholder">' +
        '<div class="feed-img-link"><div class="feed-img feed-surface"></div></div>' +
        '<div class="feed-body">' +
        '<div class="feed-meta"><span class="feed-cat">Review</span><span></span></div>' +
        '<h3 class="feed-title">Second feature preview slot</h3>' +
        '<p class="feed-excerpt">Use the clean-slate workflow to fill the feed with original TechNova stories, reviews and comparisons.</p>' +
        '<div class="feed-tags"><span class="feed-tags-label">Tags:</span><span class="feed-tag">ai</span><span class="feed-tag">review</span><span class="feed-tag">deals</span></div>' +
        '<div class="feed-actions"><span class="feed-bottom-date">Ready for GAIOS</span><span class="feed-btn">READ ARTICLE</span></div>' +
        '</div>' +
        '</article>' +
        '</div>' +
        '</section>';
      return;
    }

    var items = list.slice(0, 24);
    container.innerHTML = items
      .map(function (a) {
        var img = normalizeImageSrc(a.image) || (BASE_URL + 'images/articles/placeholder.jpg');
        var href = 'index.html?id=' + encodeURIComponent(String(a.id || ''));
        var tags = Array.isArray(a.tags) ? a.tags : [];
        var tagsLine = '';
        if (tags.length) {
          tagsLine =
            '<div class="feed-tags">' +
            '<span class="feed-tags-label">Tags:</span>' +
            tags
              .map(function (t) {
                var key = canon(t);
                var active = state.tag && canon(state.tag) === key;
                return (
                  '<a href="#" class="feed-tag ' + (active ? 'active' : '') + '" data-article-tag="' +
                  esc(key) +
                  '">' +
                  esc(String(t)) +
                  '</a>'
                );
              })
              .join('') +
            '</div>';
        }

        return (
          '<article class="feed-card">' +
          '<a class="feed-img-link" href="' + esc(href) + '">' +
          '<img class="feed-img" src="' + esc(img) + '" alt="' + esc(String(a.title || '')) + '" loading="lazy">' +
          '</a>' +
          '<div class="feed-body">' +
          '<div class="feed-meta">' +
          (a.category ? '<span class="feed-cat">' + esc(String(a.category)) + '</span>' : '<span></span>') +
          '<span></span>' +
          '</div>' +
          '<h3 class="feed-title"><a href="' + esc(href) + '">' + esc(String(a.title || '')) + '</a></h3>' +
          (a.subtitle ? '<p class="feed-excerpt">' + esc(String(a.subtitle)) + '</p>' : '') +
          tagsLine +
          '<div class="feed-actions">' +
          (a.date ? '<span class="feed-bottom-date">' + esc(String(a.date)) + '</span>' : '<span></span>') +
          '<a class="feed-btn" href="' + esc(href) + '">READ ARTICLE</a>' +
          '</div>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    Array.prototype.forEach.call(container.querySelectorAll('[data-article-tag]'), function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var next = el.getAttribute('data-article-tag') || '';
        if (canon(state.tag) === canon(next)) setTagFilter('');
        else setTagFilter(next);
      });
    });
  }


  function renderSidebar(list) {
    var latest = q('#latest-stories');
    var top = q('#top-stories');
    if (!latest || !top) return;
    var picks = (list || []).slice().sort(byDateDesc).slice(0, 7);
    if (!picks.length) {
      function placeholderItem(kind, headline, time) {
        return (
          '<div class="sidebar-item sidebar-item-placeholder">' +
          '<div class="sidebar-meta">' +
          '<span class="sidebar-time">' + esc(time) + '</span>' +
          '<span class="sidebar-sep">—</span>' +
          '<span class="sidebar-kind">' + esc(kind) + '</span>' +
          '</div>' +
          '<div class="sidebar-title">' + esc(headline) + '</div>' +
          '</div>'
        );
      }
      latest.innerHTML =
        '<div class="sidebar-empty-shell">' +
        '<div class="sidebar-empty-label">Ready</div>' +
        '<div class="sidebar-empty-headline">Latest stories will land here as soon as the first TechNova batch is published.</div>' +
        '<div class="sidebar-empty-copy">The shell stays active so the magazine rhythm remains visible even before content exists.</div>' +
        '</div>' +
        placeholderItem('Review', 'Fresh review slot prepared for the next headline.', 'Today') +
        placeholderItem('AI', 'GAIOS can fill this module from the clean slate workflow.', 'Now');
      top.innerHTML =
        placeholderItem('Technology', 'Primary ranked story placeholder.', 'Top 1') +
        placeholderItem('Science', 'Secondary ranked story placeholder.', 'Top 2') +
        placeholderItem('Photography', 'Third ranked story placeholder.', 'Top 3') +
        placeholderItem('Deals', 'Fourth ranked story placeholder.', 'Top 4');
      return;
    }

    function item(a, idx) {
      var href = 'index.html?id=' + encodeURIComponent(String(a.id || ''));
      var time = timeLabelForIndex(idx);
      var typ = sidebarTypeForCategory(a.category);
      return (
        '<div class="sidebar-item">' +
        '<div class="sidebar-meta">' +
        '<span class="sidebar-time">' + esc(time) + '</span>' +
        '<span class="sidebar-sep">—</span>' +
        '<span class="sidebar-kind">' + esc(typ) + '</span>' +
        '</div>' +
        '<a class="sidebar-headline" href="' + esc(href) + '">' + esc(String(a.title || '')) + '</a>' +
        '</div>'
      );
    }

    latest.innerHTML = picks.map(item).join('');
    top.innerHTML = picks.map(item).join('');
  }

  async function loadFullArticle(meta) {
    var filename = meta && (meta.file || (meta.id + '.json'));
    if (!filename) return meta;
    try {
      var full = await fetchJson(BASE_URL + 'data/articles/' + filename);
      return full && typeof full === 'object' ? full : meta;
    } catch (_) {
      return meta;
    }
  }

  function setArticleView(enabled) {
    if (enabled) document.body.classList.add('article-view');
    else document.body.classList.remove('article-view');
    document.body.classList.toggle('home-view', !enabled);
  }

  function renderArticle(article) {
    var container = q('#main-articles');
    if (!container || !article) return;

    var img = normalizeImageSrc(article.image) || '';
    var cat = article.category ? String(article.category) : '';
    var date = article.date ? String(article.date) : '';
    var title = article.title ? String(article.title) : '';
    var lead = article.subtitle ? String(article.subtitle) : '';
    var body = article.content || '';

    var gallery = Array.isArray(article.gallery) ? article.gallery : [];
    var galleryHtml = '';
    if (gallery.length) {
      galleryHtml =
        '<h2 class="article-section">Gallery</h2>' +
        '<div class="gallery-grid">' +
        gallery
          .slice(0, 9)
          .map(function (g) {
            var src = normalizeImageSrc(g && g.src) || '';
            var alt = (g && g.alt) ? String(g.alt) : title;
            return '<img class="gallery-thumb" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">';
          })
          .join('') +
        '</div>';
    }

    container.innerHTML =
      '<article class="article-card">' +
      '<a class="back-link" href="index.html">← Back</a>' +
      (img ? '<img class="article-hero" src="' + esc(img) + '" alt="' + esc(title) + '">' : '') +
      '<div class="article-body-wrap">' +
      '<div class="article-meta">' +
      (cat ? '<div class="article-cat">' + esc(cat) + '</div>' : '<div></div>') +
      (date ? '<div class="article-date">' + esc(date) + '</div>' : '') +
      '</div>' +
      '<h1 class="article-title">' + esc(title) + '</h1>' +
      (lead ? '<a class="article-lead" href="#main">' + esc(lead) + '</a>' : '') +
      '<div id="main" class="article-content">' + body + '</div>' +
      galleryHtml +
      '</div>' +
      '</article>';
  }

  function filteredArticles() {
    var all = state.articles || [];
    var base = all.slice();

    if (state.category && state.category !== 'all') {
      base = base.filter(function (a) {
        return canon(a && a.category) === canon(state.category);
      });
    }

    if (state.tag) {
      var t = canon(state.tag);
      base = base.filter(function (a) {
        var tags = (a && Array.isArray(a.tags) ? a.tags : []).map(canon);
        for (var i = 0; i < tags.length; i++) {
          if (tags[i] === t) return true;
        }
        return false;
      });
    }

    if (state.search && state.search.length >= 2) {
      var q = canon(state.search);
      base = base.filter(function (a) {
        var title = canon(a && a.title);
        var sub = canon(a && a.subtitle);
        return title.indexOf(q) !== -1 || sub.indexOf(q) !== -1;
      });
    }

    if (state.featuredIds && state.featuredIds.length) {
      base = base.filter(function (a) {
        return state.featuredIds.indexOf(String(a && a.id || '')) === -1;
      });
    }

    return base.sort(byDateDesc);
  }

  function renderHome() {
    setArticleView(false);
    var all = state.articles || [];
    var picks = all.slice().sort(byDateDesc).slice(0, 3);
    renderHero(picks);
    renderSidebar(all);
    renderFeed(filteredArticles());
  }

  async function route() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var cat = params.get('category');
    state.category = cat ? String(cat) : 'all';
    state.tag = params.get('tag') ? canon(params.get('tag')) : '';

    renderTags();
    renderActiveFilters();
    renderSidebar(state.articles || []);

    if (id) {
      setArticleView(true);
      var meta = (state.articles || []).find(function (x) {
        return String(x && x.id || '') === String(id);
      });
      if (!meta) {
        renderHome();
        return;
      }
      var full = await loadFullArticle(meta);
      renderArticle(full);
      var featured = q('#featured-section');
      if (featured) featured.style.display = 'none';
      return;
    }

    renderHome();
  }

  function initSearch() {
    var input = q('.search-input');
    if (!input) return;
    input.addEventListener('input', function (e) {
      var v = String((e && e.target && e.target.value) || '').toLowerCase();
      state.search = v;
      if (document.body.classList.contains('article-view')) return;
      renderFeed(filteredArticles());
    });
  }

  function initModal() {
    var overlay = q('#site-modal');
    var close = q('#site-modal-close');
    if (!overlay || !close) return;
    function hide() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hide();
    });
    close.addEventListener('click', hide);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
    });
  }

  async function boot() {
    try {
      await loadArticlesManifest();
    } catch (e) {
      state.articles = [];
    }
    initModal();
    initSearch();
    await route();
    window.addEventListener('popstate', function () {
      route();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
