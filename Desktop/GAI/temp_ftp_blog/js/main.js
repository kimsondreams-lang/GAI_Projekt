;(function(){
  const BASE_URL = '/';

  window.articlesAPI = window.articlesAPI || { articles: [] };
  var filterState = { category: 'all', topic: 'all' };
  var featuredState = { ids: [] };
  
  // --- Dynamic Loader Implementation ---
  async function loadArticles() {
      try {
          // 1. Fetch list of files in data/articles directory (requires a manifest or index API if no directory listing)
          // Since we are on static hosting without directory listing, we rely on a known index file "articles-manifest.json"
          // OR we try to fetch sequentially if names are predictable.
          // BETTER APPROACH: The user said "data/articles/*.json". 
          // We will fetch a generated "manifest.json" which the GAI agent should maintain, OR
          // we scan the DOM for a data-attribute, OR we just try to fetch a known list.
          
          // Let's assume we need to fetch all JSONs.
          // We will create a helper to fetch 'data/articles/index.json' which contains the list of filenames
          // If that doesn't exist, we fallback to 'data/articles-data.js' (legacy).
          
          let articles = [];
          
          try {
              const response = await fetch(BASE_URL + 'data/articles/index.json');
              if (response.ok) {
                  const manifest = await response.json();
                  // Use manifest data directly for the listing to save dozens of network requests
                  articles = Array.isArray(manifest) ? manifest : [];
              } else {
                  throw new Error("No index");
              }
          } catch (e) {
              console.warn("Dynamic load failed, falling back to legacy window.articlesAPI", e);
              if (window.articlesAPI && window.articlesAPI.articles) {
                  articles = window.articlesAPI.articles;
              }
          }
          
          window.articlesAPI.articles = articles;
          initModal();
          init();
          
      } catch (e) {
          console.error("Critical Error loading articles:", e);
      }
  }

  function q(s){return document.querySelector(s)}
  function byDateDesc(a,b){
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      // Handle invalid dates by pushing them to the bottom
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB - dateA;
  }
  function esc(t){return String(t||'')}
  function canon(s){return String(s||'').trim().toLowerCase()}

  function card(a){
    var id=esc(a.id),img=esc(a.image),title=esc(a.title),subtitle=esc(a.subtitle||''),cat=esc(a.category||''),author=esc(a.author||''),date=esc(a.date||'');
    if (img && !img.startsWith('http')) { if (!img.startsWith('/') && !img.startsWith('images/')) img = 'images/articles/' + img; img = BASE_URL + img; }
    
    return '<article class="main-article-item glass-panel">'
      + '<div class="article-image-container">'
      + (img?('<img src="'+img+'" alt="'+title+'" class="card-img" loading="lazy" onerror="this.onerror=null;this.src=\'images/articles/placeholder.jpg\';">'):'')
      + (cat?('<span class="category-badge">'+esc(cat).toUpperCase()+'</span>'):'')
      + '</div>'
      + '<div class="article-body-content">'
      + '<h3 class="article-card-title"><a href="index.html?id='+encodeURIComponent(id)+'">'+title+'</a></h3>'
      + (subtitle?('<p class="article-card-excerpt">'+subtitle+'</p>'):'')
      + '<div class="article-card-footer">'
      + '<div class="article-card-meta">'
      + '<span class="author-name">'+author+'</span>'
      + '<span class="pub-date">'+date+'</span>'
      + '</div>'
      + '<a class="read-more-link" href="index.html?id='+encodeURIComponent(id)+'">Read Article →</a>'
      + '</div>'
      + '</div>'
      + '</article>'
  }

  function pickTopic(a){
    if(!a) return '';
    if(a.topic) return String(a.topic);
    var tags = Array.isArray(a.tags) ? a.tags : [];
    return tags.length ? String(tags[0]) : '';
  }

  function normalizeImageSrc(img){
    var s = String(img || '').trim();
    if(!s) return '';
    if (s.startsWith('http')) return s; if (s.startsWith('/') || s.startsWith('images/')) return BASE_URL + s;
    return BASE_URL + 'images/articles/' + s;
  }

  function featuredHeroCard(a){
    if(!a) return '';
    var id=esc(a.id),title=esc(a.title),cat=esc(a.category||''),topic=esc(pickTopic(a)||''),date=esc(a.date||'');
    var img=normalizeImageSrc(a.image);
    var style = img ? (' style="background-image:url('+esc(img)+')";') : '';
    var href = 'index.html?id='+encodeURIComponent(id);
    return '<article class="featured-hero-card"'+style+'>'
      + '<a class="featured-link" href="'+href+'">'
      + '<div class="featured-overlay">'
      + '<div class="featured-top">'
      + '<div class="featured-kicker">'
      + (cat?('<span class="featured-pill glass-badge glass-badge--primary">'+cat+'</span>'):'')
      + (topic?('<span class="featured-pill secondary glass-badge glass-badge--secondary">'+topic+'</span>'):'')
      + '</div>'
      + (date?('<div class="featured-date glass-badge glass-badge--date">'+date+'</div>'):'')
      + '</div>'
      + '<h2 class="featured-title">'+title+'</h2>'
      + '</div></a>'
      + '</article>';
  }

  function featuredSideCard(a){
    if(!a) return '';
    var id=esc(a.id),title=esc(a.title),cat=esc(a.category||''),topic=esc(pickTopic(a)||''),date=esc(a.date||'');
    var img=normalizeImageSrc(a.image);
    var style = img ? (' style="background-image:url('+esc(img)+')";') : '';
    var href = 'index.html?id='+encodeURIComponent(id);
    return '<article class="featured-side-card"'+style+'>'
      + '<a class="featured-link" href="'+href+'">'
      + '<div class="featured-overlay">'
      + '<div class="featured-top">'
      + '<div class="featured-kicker">'
      + (cat?('<span class="featured-pill glass-badge glass-badge--primary">'+cat+'</span>'):'')
      + (topic?('<span class="featured-pill secondary glass-badge glass-badge--secondary">'+topic+'</span>'):'')
      + '</div>'
      + (date?('<div class="featured-date glass-badge glass-badge--date">'+date+'</div>'):'')
      + '</div>'
      + '<h3 class="featured-title small">'+title+'</h3>'
      + '</div></a>'
      + '</article>';
  }

  function renderFeatured(list){
    var hero=q('#featured-hero');
    var side=q('#featured-side');
    var section=q('#featured-section');
    if(!hero||!side||!section) return;
    if(!list||!list.length){ section.style.display='none'; return; }
    var sorted=list.slice().sort(byDateDesc);
    hero.innerHTML = featuredHeroCard(sorted[0]);
    side.innerHTML = sorted.slice(1,3).map(featuredSideCard).join('');
    featuredState.ids = sorted.slice(0,3).map(function(x){ return String(x && x.id || '').trim(); }).filter(Boolean);
    section.style.display = '';
  }
  
  function secondary(a){
    var id=esc(a.id),img=esc(a.image),title=esc(a.title);
    if (img && !img.startsWith('http')) { if (!img.startsWith('/') && !img.startsWith('images/')) img = 'images/articles/' + img; img = BASE_URL + img; }
    return '<div class="secondary-article">'
      + '<div class="article-image">'+(img?('<img src="'+img+'" alt="'+title+'" loading="lazy" onerror="this.src=\'images/articles/placeholder.jpg\'">'):'')+'</div>'
      + '<div class="article-content">'
      + '<h4 class="article-title"><a href="index.html?id='+encodeURIComponent(id)+'">'+title+'</a></h4>'
      + '</div>'
      + '</div>'
  }
  
  var mainState = { sorted: [], shown: 0, batch: 10, observer: null, isLoading: false };

  function setupLazyObserver(){
    var target=q('#main-load-more-trigger');
    if(!target) return;
    if(mainState.observer && mainState.observer.disconnect) mainState.observer.disconnect();
    if(typeof IntersectionObserver === 'undefined') return;
    mainState.observer = new IntersectionObserver(function(entries){
      var any = entries && entries.some(function(e){ return e.isIntersecting; });
      if(any && !mainState.isLoading) appendMore();
    }, { root: null, rootMargin: '800px 0px', threshold: 0.01 });
    mainState.observer.observe(target);
  }

  function appendMore(){
    if(mainState.isLoading) return;
    var c=q('#main-articles');
    var target=q('#main-load-more-trigger');
    if(!c||!target) return;
    
    var total = mainState.sorted.length;
    if(mainState.shown >= total) {
      if(mainState.observer && mainState.observer.disconnect) mainState.observer.disconnect();
      target.remove();
      return;
    }

    mainState.isLoading = true;
    try {
      var nextEnd = Math.min(total, mainState.shown + mainState.batch);
      var chunk = mainState.sorted.slice(mainState.shown, nextEnd).map(card).join('');
      target.insertAdjacentHTML('beforebegin', chunk);
      mainState.shown = nextEnd;
      
      if(mainState.shown >= total) {
        if(mainState.observer && mainState.observer.disconnect) mainState.observer.disconnect();
        target.remove();
      }
    } finally {
      // Small delay to prevent rapid re-triggering during layout shifts
      setTimeout(function() { mainState.isLoading = false; }, 100);
    }
  }

  function resetMain(list){
    var c=q('#main-articles'); if(!c) return;
    var arr = Array.isArray(list) ? list : [];
    if (!arr.length) {
      c.innerHTML = '<div class="no-articles">No articles found.</div>';
      if(mainState.observer && mainState.observer.disconnect) mainState.observer.disconnect();
      return;
    }
    mainState.sorted = arr.slice().sort(byDateDesc);
    mainState.shown = Math.min(mainState.batch, mainState.sorted.length);
    c.innerHTML = mainState.sorted.slice(0, mainState.shown).map(card).join('') + '<div id="main-load-more-trigger" class="load-more-trigger"></div>';
    setupLazyObserver();
    try {
      if (c.getBoundingClientRect().height < window.innerHeight * 1.1) appendMore();
    } catch {}
  }

  function renderTop(list){
    var c=q('#top-stories'); if(!c) return;
    var seen={};
    var picks=list.slice().sort(byDateDesc).filter(function(a){
      var id=String(a.id||''); if(!id||seen[id]) return false; seen[id]=true; return true;
    }).slice(0,7);
    c.innerHTML=picks.map(secondary).join('')
  }
  
  function renderDetail(a){
    var c=q('#main-articles'); if(!c||!a) return;
    
    // Hide sidebar on mobile/detail view if desired, or keep it.
    // For now, we replace the main list with the detail view.
    
    var title=esc(a.title),subtitle=esc(a.subtitle||''),img=esc(a.image),cat=esc(a.category||''),author=esc(a.author||''),date=esc(a.date||'');
    if (img && !img.startsWith('http')) { if (!img.startsWith('/') && !img.startsWith('images/')) img = 'images/articles/' + img; img = BASE_URL + img; }
    
    var tags=Array.isArray(a.tags)?a.tags:[];
    var body=a.content||'';
    
    // Gallery logic (simplified)
    var gal=Array.isArray(a.gallery)?a.gallery:[];
    var galleryHtml=gal.length?('<div class="article-gallery">'+gal.map(function(g){ 
        var s=esc(g.src); 
        if (s && !s.startsWith('http')) { if (!s.startsWith('/') && !s.startsWith('images/')) s = 'images/articles/' + s; s = BASE_URL + s; }
        var alt=esc(g.alt||title),cap=esc(g.caption||''); 
        return '<div class="article-image-wrapper"><img class="article-image" src="'+s+'" alt="'+alt+'">'+(cap?'<p class="image-caption">'+cap+'</p>':'')+'</div>'; 
    }).join('')+'</div>'):'';
    
    var html=''
      + '<article class="article-detail glass-panel p-xl">'
      + '<button onclick="window.location.href=\'index.html\'" class="back-btn">← Back to Articles</button>'
      + '<header class="article-header">'
      + '<div class="article-meta">'
      + (cat?('<span class="category-tag">'+cat+'</span>'):'')
      + (author?('<span class="author">'+author+'</span>'):'')
      + (date?('<span class="date">'+date+'</span>'):'')
      + '</div>'
      + '<h1 class="article-title">'+title+'</h1>'
      + (subtitle?('<p class="article-subtitle">'+subtitle+'</p>'):'')
      + '</header>'
      + (img?('<div class="article-image-wrapper"><img class="article-main-image" src="'+img+'" alt="'+title+'"></div>'):'')
      + '<div class="article-body">'+body+'</div>'
      + galleryHtml
      + '<div class="article-footer">'
      + (tags.length?('<div class="article-tags"><span class="tags-label">Tags:</span> '+tags.map(function(t){return '<span class="article-tag">'+esc(t)+'</span>'}).join(' ')+'</div>'):'')
      + '</div>'
      + '</article>';
    c.innerHTML=html;
    window.scrollTo(0,0);
  }
  
  function applyFilters(){
    var all=window.articlesAPI.articles||[];
    var out=all.filter(function(a){
      var okCat = !filterState.category || filterState.category==='all' ? true : canon(a.category)===canon(filterState.category);
      // Removed topic filter complexity for stability
      return okCat;
    });
    if (featuredState.ids && featuredState.ids.length) {
      var set = {};
      featuredState.ids.forEach(function(id){ set[String(id)] = true; });
      out = out.filter(function(a){ return !set[String(a && a.id || '')]; });
    }
    resetMain(out)
  }
  
  function filterByCategory(cat){
    filterState.category = cat||'all';
    applyFilters()
  }

  function getCategories(){
    var all=window.articlesAPI.articles||[];
    var map={};
    all.forEach(function(a){ var c=a.category; if(c){ var k=canon(c); if(!map[k]) map[k]=String(c) } });
    return Object.keys(map).sort().map(function(k){ return { key:k, label:map[k] } })
  }
  
  function renderHeaderCategories(){
    var c=q('#tag-list'); if(!c) return;
    var cats=getCategories();
    var currentCat = filterState.category || 'all';

    c.innerHTML=['<a href="#" data-category="all" class="'+(currentCat==='all'?'active':'')+'">ALL</a>'].concat(
      cats.map(function(t){
        var isAct = canon(t.key) === canon(currentCat);
        return '<a href="#" data-category="'+esc(t.key)+'" class="'+(isAct?'active':'')+'">'+esc(t.label)+'</a>'
      })
    ).join(' ');

    c.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var cat = a.getAttribute('data-category');
        
        // Update URL
        var url = new URL(window.location);
        url.searchParams.delete('id'); // Exit detail view
        if(cat === 'all') url.searchParams.delete('category');
        else url.searchParams.set('category', cat);
        window.history.pushState({}, '', url);

        c.querySelectorAll('a').forEach(function(x){x.classList.remove('active')});
        a.classList.add('active');
        filterByCategory(cat);
      })
    })
  }

  function initSearch() {
      const searchInput = q('.search-input');
      if (!searchInput) return;
      
      searchInput.addEventListener('input', (e) => {
          const term = e.target.value.toLowerCase();
          const all = window.articlesAPI.articles || [];
          const base = all.filter(a => !filterState.category || filterState.category==='all' ? true : canon(a.category)===canon(filterState.category));
          const withoutFeatured = (featuredState.ids && featuredState.ids.length)
              ? base.filter(a => !featuredState.ids.includes(String(a && a.id || '')))
              : base;
          
          if (term.length < 2) {
              applyFilters(); // Reset
              return;
          }
          
          const filtered = withoutFeatured.filter(a => 
              (a.title && a.title.toLowerCase().includes(term)) || 
              (a.subtitle && a.subtitle.toLowerCase().includes(term))
          );
          
          resetMain(filtered);
      });
  }
  
  async function init(){
    var params=new URLSearchParams(window.location.search); 
    var id=params.get('id');
    var catParam = params.get('category');
    
    if(catParam) filterState.category = catParam;

    var all=window.articlesAPI.articles||[];
    
    renderHeaderCategories();
    initSearch();

    if(id){
      var meta = all.find(function(x){return String(x.id)===String(id)});
      if (meta) {
          var featured=q('#featured-section'); if(featured) featured.style.display='none';
          // Fetch full article content for detail view
          try {
              const filename = meta.file || (meta.id + '.json');
              const res = await fetch(BASE_URL + `data/articles/${filename}`);
              if (res.ok) {
                  const fullArticle = await res.json();
                  renderDetail(fullArticle);
              } else {
                  renderDetail(meta); // Fallback to meta if fetch fails
              }
          } catch (e) {
              console.error("Failed to fetch full article:", e);
              renderDetail(meta);
          }
          renderTop(all);
      } else {
          // ID not found, show home
          renderFeatured(all);
          renderTop(all);
          applyFilters();
      }
    } else {
      renderFeatured(all);
      renderTop(all);
      applyFilters();
    }
  }

  function initModal(){
    var overlay=q('#site-modal');
    var close=q('#site-modal-close');
    var title=q('#site-modal-title');
    var body=q('#site-modal-body');
    var actions=q('#site-modal-actions');
    if(!overlay||!close||!title||!body||!actions) return;
    function open(t, html, acts){
      title.textContent = t||'';
      body.innerHTML = html||'';
      actions.innerHTML = acts||'';
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden','false');
      document.body.classList.add('modal-open');
    }
    function hide(){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden','true');
      document.body.classList.remove('modal-open');
    }
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) hide();
    });
    close.addEventListener('click', hide);
    window.addEventListener('keydown', function(e){
      if(e.key === 'Escape') hide();
    });

    document.querySelectorAll('.btn-subscribe').forEach(function(btn){
      btn.addEventListener('click', function(){
        open('Subscribe', '<p>Newsletter system will be added soon. For now, follow TechNova and check back for updates.</p><p class=\"modal-muted\">Tip: We can add a lightweight local admin panel in GAI OS, but the public signup endpoint needs a hosted collector.</p>', '<a class=\"modal-action\" href=\"mailto:support@technova.buzz?subject=Subscribe%20me\">Email us to subscribe</a>');
      });
    });
    document.querySelectorAll('.btn-tip').forEach(function(btn){
      btn.addEventListener('click', function(){
        open('Send us a Tip', '<p>Tip options will be added soon.</p><p class=\"modal-muted\">In the meantime you can contact us to arrange support.</p>', '<a class=\"modal-action\" href=\"mailto:support@technova.buzz?subject=Tip%20TechNova\">Contact support</a>');
      });
    });
  }

  // Start
  document.addEventListener('DOMContentLoaded', loadArticles);

})();
