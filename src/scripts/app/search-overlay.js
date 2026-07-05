/* ===== SearchOverlay =====
   Global search across the 9 surfaces. Trigger: Cmd+K / Ctrl+K (or the API).
   - Matches view titles, keywords and descriptions
   - Keyboard nav (ArrowUp/ArrowDown, Enter), Escape or click-out to close
   - Selecting a result routes to that view via the HashRouter
   - Theme-aware (uses the app's CSS custom properties), so it works in
     light and dark mode

   Offline-safe: no network, storage, or permission calls.

   Usage:  SearchOverlay.open();  SearchOverlay.close(); */
(function () {
  'use strict';

  var overlayEl = null, inputEl = null, resultsEl = null;
  var isOpen = false, selectedIndex = -1, allResults = [], TOPIC_INDEX = [], hideTimer = null;

  /* search index: one entry per surface */
  var MODULES = [
    { id: 'walk',  label: 'Walkthrough',   keywords: 'mechanics structure flow interview', desc: 'Step-by-step interview flow' },
    { id: 'drill', label: 'Probe Drill',   keywords: 'graded scoring rubric practice',      desc: 'Graded practice with scoring rubric' },
    { id: 'wb',    label: 'Whiteboard',    keywords: 'design reconstruct architecture system', desc: 'Reconstruct the design from scratch' },
    { id: 'sys',   label: 'System Map',    keywords: 'map diagram components services',      desc: 'Visual system architecture map' },
    { id: 'trade', label: 'Trade-offs',    keywords: 'tradeoff comparison decision pros cons', desc: 'Compare design alternatives' },
    { id: 'model', label: 'Model Answers', keywords: 'answer example sample solution',       desc: 'Reference model answers' },
    { id: 'num',   label: 'Numbers',       keywords: 'metrics math estimation calculation',  desc: 'Back-of-envelope calculations' },
    { id: 'rf',    label: 'Red Flags',     keywords: 'red flag warning mistake error',       desc: 'Common mistakes to avoid' },
    { id: 'open',  label: '30-Second',     keywords: 'opener elevator pitch summary',        desc: '30-second elevator pitch' }
  ];

  function decodeEnt(str) {
    if (!str) return '';
    return String(str).replace(/&amp;/g, '&').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013').replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018').replace(/&ldquo;/g, '\u201c').replace(/&rdquo;/g, '\u201d').replace(/&middot;/g, '\u00b7').replace(/&rarr;/g, '\u2192').replace(/&#39;/g, "'");
  }

  function groupLabelFor(gid) {
    if (typeof TOPIC_GROUPS === 'undefined' || !gid) return '';
    for (var i = 0; i < TOPIC_GROUPS.length; i++) { if (TOPIC_GROUPS[i].id === gid) return TOPIC_GROUPS[i].label; }
    return '';
  }

  /* One search entry per registered topic: its identity plus every drill-card signal
     and question folded into a lowercased haystack, so a concept typed into search
     (e.g. 'idempotency', 'noisy neighbor') surfaces the topic that covers it. Rebuilt
     on open, so it always reflects the live registry. */
  function buildTopicIndex() {
    if (typeof TopicRegistry === 'undefined' || !TopicRegistry.ids) return [];
    var STRIP = /&[a-z#0-9]+;/g;
    return TopicRegistry.ids().map(function (id) {
      var t = TopicRegistry.get(id), idn = (t && t.identity) || {};
      var cards = (t && t.data && t.data.drill && Array.isArray(t.data.drill.cards)) ? t.data.drill.cards : [];
      var parts = [idn.title || '', groupLabelFor(idn.group), idn.locatorTail || '', idn.thesis || ''];
      var frags = [];
      if (idn.thesis) frags.push(decodeEnt(idn.thesis));
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].signal) { parts.push(cards[i].signal); frags.push(decodeEnt(cards[i].signal)); }
        if (cards[i].q) { parts.push(cards[i].q); frags.push(decodeEnt(cards[i].q)); }
      }
      var gl = decodeEnt(groupLabelFor(idn.group)), dl = decodeEnt(idn.locatorTail || '');
      return {
        kind: 'topic', id: id, label: decodeEnt(idn.title || id), group: gl, desc: dl,
        titleLc: (idn.title || '').toLowerCase().replace(STRIP, ' '),
        thesisLc: (idn.thesis || '').toLowerCase().replace(STRIP, ' '),
        groupLc: gl.toLowerCase(), descLc: dl.toLowerCase(),
        frags: frags,
        haystack: parts.join(' ').toLowerCase().replace(STRIP, ' ')
      };
    });
  }

  function ensureTopicIndex() {
    var n = (typeof TopicRegistry !== 'undefined' && TopicRegistry.ids) ? TopicRegistry.ids().length : 0;
    if (!TOPIC_INDEX.length || TOPIC_INDEX.length !== n) TOPIC_INDEX = buildTopicIndex();
    return TOPIC_INDEX;
  }

  function createElements() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = '_search-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Search surfaces');
    overlayEl.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease;display:none;align-items:flex-start;justify-content:center;padding-top:15vh';

    var box = document.createElement('div');
    box.style.cssText = 'width:560px;max-width:90vw;background:var(--card);border:1px solid var(--bd);border-radius:16px;box-shadow:0 24px 80px -16px rgba(0,0,0,.35);overflow:hidden;transform:scale(.96) translateY(10px);transition:transform .3s cubic-bezier(.22,.61,.36,1)';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--bd)';

    var icon = document.createElement('span');
    icon.textContent = '\u2318';
    icon.style.cssText = 'font-size:16px;color:var(--mut);opacity:.7';

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Search topics, concepts, views...';
    inputEl.setAttribute('aria-label', 'Search');
    inputEl.style.cssText = 'flex:1;border:0;outline:0;font-size:15px;background:transparent;color:var(--ink);font-family:inherit';
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onInputKey);

    var shortcut = document.createElement('kbd');
    shortcut.textContent = 'ESC';
    shortcut.style.cssText = 'font-size:10px;font-family:var(--mono,monospace);background:var(--bg);border:1px solid var(--bd);border-radius:4px;padding:2px 6px;color:var(--mut)';

    header.appendChild(icon);
    header.appendChild(inputEl);
    header.appendChild(shortcut);

    resultsEl = document.createElement('div');
    resultsEl.style.cssText = 'max-height:320px;overflow-y:auto;padding:6px';

    box.appendChild(header);
    box.appendChild(resultsEl);
    overlayEl.appendChild(box);
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) close(); });
    _modal = window.__overlayModal(overlayEl, close, function () { return isOpen; });
  }

  function tokenize(str) { return str.split(/\s+/).filter(function (x) { return x.length > 0; }); }
  /* Token-based match: every whitespace-separated word must appear in the field
     (in any order), so "invalidation cache" or "cache ... strategy" both hit. */
  function onInput() {
    var raw = inputEl.value.trim().toLowerCase();
    if (raw.length < 1) { renderResults([], ''); return; }
    var tokens = tokenize(raw);
    var allIn = function (field) { for (var i = 0; i < tokens.length; i++) { if (field.indexOf(tokens[i]) === -1) return false; } return true; };
    var topicHits = [];
    TOPIC_INDEX.forEach(function (t) {
      if (!allIn(t.haystack)) return;
      var score = 1;
      if (allIn(t.titleLc)) score = 3;
      else if (allIn(t.titleLc + ' ' + t.thesisLc + ' ' + t.groupLc + ' ' + t.descLc)) score = 2;
      var snippet = '', bestN = 0;
      for (var i = 0; i < t.frags.length; i++) {
        var flc = t.frags[i].toLowerCase(), n = 0;
        for (var k = 0; k < tokens.length; k++) if (flc.indexOf(tokens[k]) > -1) n++;
        if (n > bestN) { bestN = n; snippet = t.frags[i]; }
      }
      topicHits.push({ score: score, data: { kind: 'topic', id: t.id, label: t.label, group: t.group, desc: t.desc, snippet: snippet } });
    });
    topicHits.sort(function (a, b) { return b.score - a.score; });
    var viewHits = MODULES.filter(function (m) {
      return allIn((m.label + ' ' + m.keywords + ' ' + m.desc).toLowerCase());
    }).map(function (m) { return { data: { kind: 'view', id: m.id, label: m.label, desc: m.desc } }; });
    renderResults(topicHits.concat(viewHits), raw);
  }

  /* append text to a container, wrapping each occurrence of q in a highlight span (no innerHTML) */
  function highlightInto(container, text, q) {
    var tokens = q ? tokenize(q) : [];
    if (!tokens.length) { container.appendChild(document.createTextNode(text)); return; }
    var lc = text.toLowerCase(), ranges = [];
    tokens.forEach(function (tok) { var from = 0, idx = lc.indexOf(tok, from); while (idx > -1) { ranges.push([idx, idx + tok.length]); from = idx + tok.length; idx = lc.indexOf(tok, from); } });
    if (!ranges.length) { container.appendChild(document.createTextNode(text)); return; }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [ranges[0]];
    for (var i = 1; i < ranges.length; i++) { var last = merged[merged.length - 1]; if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]); else merged.push(ranges[i]); }
    var pos = 0;
    merged.forEach(function (r) {
      if (r[0] > pos) container.appendChild(document.createTextNode(text.slice(pos, r[0])));
      var mk = document.createElement('span');
      mk.style.cssText = 'background:var(--accbg);color:var(--acc);border-radius:3px;padding:0 1px;font-weight:700';
      mk.textContent = text.slice(r[0], r[1]);
      container.appendChild(mk); pos = r[1];
    });
    if (pos < text.length) container.appendChild(document.createTextNode(text.slice(pos)));
  }
  /* trim a long snippet to a ~104-char window centred on the match */
  function clampSnippet(text, q) {
    var MAX = 104;
    if (text.length <= MAX) return text;
    var tokens = q ? tokenize(q) : [], lc = text.toLowerCase(), idx = -1;
    for (var k = 0; k < tokens.length; k++) { var pp = lc.indexOf(tokens[k]); if (pp > -1 && (idx < 0 || pp < idx)) idx = pp; }
    if (idx < 0) return text.slice(0, MAX) + '\u2026';
    var start = Math.max(0, idx - 32), end = Math.min(text.length, start + MAX);
    return (start > 0 ? '\u2026' : '') + text.slice(start, end) + (end < text.length ? '\u2026' : '');
  }
  function sectionHeader(text) {
    var h = document.createElement('div');
    h.style.cssText = 'font-size:9px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--mut2);padding:8px 14px 4px';
    h.textContent = text;
    return h;
  }
  function makeResultItem(d, i, q) {
    var item = document.createElement('button');
    item.type = 'button';
    item.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;padding:10px 14px;border:0;border-radius:10px;background:' + (i === 0 ? 'var(--accbg)' : 'transparent') + ';cursor:pointer;transition:background .15s ease;margin-bottom:2px;color:var(--ink)';
    var top = document.createElement('span');
    top.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%';
    var title = document.createElement('span');
    title.style.cssText = 'font-size:13.5px;font-weight:650;color:var(--ink);flex:1';
    highlightInto(title, d.label, q);
    var tag = document.createElement('span');
    tag.textContent = (d.kind === 'topic') ? 'TOPIC' : 'VIEW';
    tag.style.cssText = 'font-size:8.5px;font-weight:800;letter-spacing:.5px;padding:2px 6px;border-radius:5px;font-family:var(--mono,monospace);' + ((d.kind === 'topic') ? 'color:var(--acc);background:var(--accbg)' : 'color:var(--mut);background:var(--bg);border:1px solid var(--bd)');
    top.appendChild(title); top.appendChild(tag);
    var sub = document.createElement('span');
    sub.style.cssText = 'font-size:11px;color:var(--mut);margin-top:3px';
    sub.textContent = (d.kind === 'topic') ? ((d.group ? d.group + ' \u00b7 ' : '') + d.desc) : d.desc;
    item.appendChild(top); item.appendChild(sub);
    if (d.kind === 'topic' && d.snippet) {
      var snip = document.createElement('span');
      snip.style.cssText = 'display:block;font-size:10.5px;color:var(--mut2);margin-top:4px;line-height:1.42';
      highlightInto(snip, clampSnippet(d.snippet, q), q);
      item.appendChild(snip);
    }
    item.addEventListener('mouseenter', function () { selectIndex(i); });
    item.addEventListener('click', function () { navigateTo(d); });
    return item;
  }
  function renderSuggestions() {
    var groups = (typeof groupedTopicIds === 'function') ? groupedTopicIds() : [];
    if (!groups.length) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:24px;text-align:center;color:var(--mut);font-size:13px';
      empty.textContent = 'Type to search topics, concepts, and the nine views...';
      resultsEl.appendChild(empty);
      return;
    }
    resultsEl.appendChild(sectionHeader('Jump to a group'));
    groups.forEach(function (bkt) {
      var id = bkt.ids[0], t = TopicRegistry.get(id), idn = (t && t.identity) || {};
      var item = document.createElement('button');
      item.type = 'button';
      item.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;padding:9px 14px;border:0;border-radius:10px;background:transparent;cursor:pointer;transition:background .15s ease;margin-bottom:2px;color:var(--ink)';
      var g = document.createElement('span');
      g.style.cssText = 'font-size:12.5px;font-weight:700;color:var(--ink)';
      g.textContent = decodeEnt(bkt.group.label);
      var sub = document.createElement('span');
      sub.style.cssText = 'font-size:10.5px;color:var(--mut);margin-top:2px';
      sub.textContent = decodeEnt(idn.title || id) + ' \u00b7 ' + bkt.ids.length + ' topic' + (bkt.ids.length === 1 ? '' : 's');
      item.appendChild(g); item.appendChild(sub);
      item.addEventListener('mouseenter', function () { item.style.background = 'var(--accbg)'; });
      item.addEventListener('mouseleave', function () { item.style.background = 'transparent'; });
      item.addEventListener('click', function () { navigateTo({ kind: 'topic', id: id }); });
      resultsEl.appendChild(item);
    });
  }
  function renderResults(results, q) {
    q = q || '';
    allResults = results;
    selectedIndex = results.length > 0 ? 0 : -1;
    resultsEl.innerHTML = '';
    if (results.length === 0) {
      if (inputEl.value.trim()) {
        var none = document.createElement('div');
        none.style.cssText = 'padding:24px;text-align:center;color:var(--mut);font-size:13px';
        none.textContent = 'No results found';
        resultsEl.appendChild(none);
      } else { renderSuggestions(); }
      return;
    }
    var lastKind = null;
    results.forEach(function (r, i) {
      var d = r.data;
      if (d.kind !== lastKind) {
        lastKind = d.kind;
        var cnt = 0; for (var j = 0; j < results.length; j++) if (results[j].data.kind === d.kind) cnt++;
        resultsEl.appendChild(sectionHeader((d.kind === 'topic' ? 'Topics' : 'Views') + ' \u00b7 ' + cnt));
      }
      resultsEl.appendChild(makeResultItem(d, i, q));
    });
  }

  function selectIndex(i) {
    selectedIndex = i;
    var items = resultsEl.querySelectorAll('button');
    for (var k = 0; k < items.length; k++) {
      items[k].style.background = (k === i) ? 'var(--accbg)' : 'transparent';
    }
  }

  function onInputKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectIndex(Math.min(selectedIndex + 1, allResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectIndex(Math.max(selectedIndex - 1, 0)); }
    else if (e.key === 'Enter' && selectedIndex >= 0) { e.preventDefault(); if (allResults[selectedIndex]) navigateTo(allResults[selectedIndex].data); }
  }

  function navigateTo(d) {
    close();
    if (d && d.kind === 'topic') {
      if (typeof TopicRegistry !== 'undefined' && TopicRegistry.setTopic) TopicRegistry.setTopic(d.id);
    } else if (d && window.Router) {
      window.Router.navigate(d.id);
    }
  }

  function open() {
    if (isOpen) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    createElements();
    _modal.capture();   /* remember trigger for focus-restore */
    ensureTopicIndex();
    isOpen = true;
    overlayEl.style.display = 'flex';
    requestAnimationFrame(function () {
      overlayEl.style.opacity = '1';
      overlayEl.firstElementChild.style.transform = 'scale(1) translateY(0)';
    });
    inputEl.value = '';
    inputEl.focus();
    renderResults([]);
  }

  var _modal = null;
  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlayEl.style.opacity = '0';
    overlayEl.firstElementChild.style.transform = 'scale(.96) translateY(10px)';
    hideTimer = setTimeout(function () { overlayEl.style.display = 'none'; hideTimer = null; }, 250);
    _modal.restore();
  }

  document.addEventListener('keydown', function (e) {
    /* Cmd/Ctrl+K opens from anywhere; Escape + Tab-trap while open are handled by
       __overlayModal (overlay-focus.js) once the overlay element exists. */
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
  });

  (function () { var sb = document.getElementById('searchopen'); if (sb) sb.addEventListener('click', function () { open(); }); })();
  window.SearchOverlay = { open: open, close: close, isOpen: function () { return isOpen; } };
})();
