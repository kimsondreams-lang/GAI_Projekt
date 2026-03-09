(function () {
  var SITE_ID = (window.__ANALYTICS_SITE_ID__ || 'technova') + '';
  // Only use analytics endpoint if explicitly defined and reachable, or default to relative path
  // If running on static hosting without backend, this might 404, so we suppress errors
  var COLLECT_URL = (window.__ANALYTICS_COLLECT_URL__ || '/api/analytics/collect') + '';

  function safeStr(s, max) {
    return String(s || '').slice(0, max || 500);
  }

  function getPath() {
    try {
      var url = new URL(window.location.href);
      return safeStr(url.pathname + url.search, 800);
    } catch {
      return safeStr(window.location.pathname + window.location.search, 800);
    }
  }

  function getRef() {
    return safeStr(document.referrer || '', 1200);
  }

  function getSid() {
    try {
      var k = 'tn_sid';
      var v = sessionStorage.getItem(k);
      if (v) return v;
      v = Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
      sessionStorage.setItem(k, v);
      return v;
    } catch {
      return '';
    }
  }

  function getUtm() {
    try {
      var url = new URL(window.location.href);
      var source = url.searchParams.get('utm_source') || '';
      var medium = url.searchParams.get('utm_medium') || '';
      var campaign = url.searchParams.get('utm_campaign') || '';
      var term = url.searchParams.get('utm_term') || '';
      var content = url.searchParams.get('utm_content') || '';
      if (!(source || medium || campaign || term || content)) return null;
      return { source: source, medium: medium, campaign: campaign, term: term, content: content };
    } catch {
      return null;
    }
  }

  function send(payload) {
    payload = payload || {};
    payload.siteId = SITE_ID;
    payload.ts = Date.now();
    payload.sid = getSid();
    payload.path = getPath();
    payload.ref = getRef();
    payload.utm = getUtm() || undefined;

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(COLLECT_URL, blob);
        return;
      }
    } catch {}

    fetch(COLLECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  function pageview() {
    send({ type: 'pageview' });
  }

  function closestTrackTarget(el) {
    if (!el) return null;
    var a = el.closest && el.closest('a[href]');
    if (a) return a;
    var btn = el.closest && el.closest('button');
    if (btn) return btn;
    return null;
  }

  function clickHandler(e) {
    var t = closestTrackTarget(e.target);
    if (!t) return;
    var tag = (t.tagName || '').toLowerCase();
    var href = '';
    if (tag === 'a') href = t.getAttribute('href') || '';

    var el = {
      tag: tag,
      id: safeStr(t.id || '', 120),
      cls: safeStr(t.className || '', 300),
      text: safeStr((t.innerText || '').trim(), 200)
    };

    send({ type: 'click', href: href ? safeStr(href, 2000) : '', el: el });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    pageview();
  } else {
    document.addEventListener('DOMContentLoaded', pageview);
  }
  document.addEventListener('click', clickHandler, { capture: true, passive: true });
})();

