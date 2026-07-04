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
  var isOpen = false, selectedIndex = -1, allResults = [], TOPIC_INDEX = [];

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
    return TopicRegistry.ids().map(function (id) {
      var t = TopicRegistry.get(id), idn = (t && t.identity) || {};
      var parts = [idn.title || '', groupLabelFor(idn.group), idn.locatorTail || '', idn.thesis || ''];
      var cards = (t && t.data && t.data.drill && Array.isArray(t.data.drill.cards)) ? t.data.drill.cards : [];
      for (var i = 0; i < cards.length; i++) { if (cards[i].signal) parts.push(cards[i].signal); if (cards[i].q) parts.push(cards[i].q); }
      return {
        kind: 'topic', id: id, label: decodeEnt(idn.title || id),
        group: decodeEnt(groupLabelFor(idn.group)), desc: decodeEnt(idn.locatorTail || ''),
        haystack: parts.join(' ').toLowerCase().replace(/&[a-z#0-9]+;/g, ' ')
      };
    });
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
  }

  function onInput() {
    var q = inputEl.value.trim().toLowerCase();
    if (q.length < 1) { renderResults([]); return; }
    var topicHits = TOPIC_INDEX.filter(function (t) { return t.haystack.indexOf(q) > -1; })
      .map(function (t) { return { data: t }; });
    var viewHits = MODULES.filter(function (m) {
      return m.label.toLowerCase().indexOf(q) > -1 ||
             m.keywords.toLowerCase().indexOf(q) > -1 ||
             m.desc.toLowerCase().indexOf(q) > -1;
    }).map(function (m) { return { data: { kind: 'view', id: m.id, label: m.label, desc: m.desc } }; });
    renderResults(topicHits.concat(viewHits));
  }

  function renderResults(results) {
    allResults = results;
    selectedIndex = results.length > 0 ? 0 : -1;
    resultsEl.innerHTML = '';

    if (results.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:24px;text-align:center;color:var(--mut);font-size:13px';
      empty.textContent = inputEl.value.trim() ? 'No results found' : 'Type to search topics, concepts, and the nine views...';
      resultsEl.appendChild(empty);
      return;
    }

    results.forEach(function (r, i) {
      var d = r.data;
      var item = document.createElement('button');
      item.type = 'button';
      item.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;padding:10px 14px;border:0;border-radius:10px;background:' + (i === 0 ? 'var(--accbg)' : 'transparent') + ';cursor:pointer;transition:background .15s ease;margin-bottom:2px;color:var(--ink)';
      var top = document.createElement('span');
      top.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%';
      var title = document.createElement('span');
      title.style.cssText = 'font-size:13.5px;font-weight:650;color:var(--ink);flex:1';
      title.textContent = d.label;
      var tag = document.createElement('span');
      tag.textContent = (d.kind === 'topic') ? 'TOPIC' : 'VIEW';
      tag.style.cssText = 'font-size:8.5px;font-weight:800;letter-spacing:.5px;padding:2px 6px;border-radius:5px;font-family:var(--mono,monospace);' + ((d.kind === 'topic') ? 'color:var(--acc);background:var(--accbg)' : 'color:var(--mut);background:var(--bg);border:1px solid var(--bd)');
      top.appendChild(title); top.appendChild(tag);
      var sub = document.createElement('span');
      sub.style.cssText = 'font-size:11px;color:var(--mut);margin-top:3px';
      sub.textContent = (d.kind === 'topic') ? ((d.group ? d.group + ' \u00b7 ' : '') + d.desc) : d.desc;
      item.appendChild(top);
      item.appendChild(sub);
      item.addEventListener('mouseenter', function () { selectIndex(i); });
      item.addEventListener('click', function () { navigateTo(d); });
      resultsEl.appendChild(item);
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
    else if (e.key === 'Escape') { close(); }
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
    createElements();
    TOPIC_INDEX = buildTopicIndex();
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

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlayEl.style.opacity = '0';
    overlayEl.firstElementChild.style.transform = 'scale(.96) translateY(10px)';
    setTimeout(function () { overlayEl.style.display = 'none'; }, 250);
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && isOpen) { close(); }
  });

  window.SearchOverlay = { open: open, close: close, isOpen: function () { return isOpen; } };
})();
