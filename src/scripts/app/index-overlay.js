/* ===== IndexOverlay =====
   The topic index: every registered topic grouped by the six thematic groups --
   the browse / entry surface for the full set, and the home for the total scope
   the group-forward locator no longer shows. Trigger: the 'Topic index' button
   (#idxopen) or IndexOverlay.open(). Selecting a topic switches via setTopic and
   closes. Reads TOPIC_GROUPS + groupedTopicIds(), so it reflects the live registry
   and scales to any topic count with no per-topic wiring. Theme-aware; offline-safe:
   no network, storage, or permission calls. */
(function () {
  'use strict';
  var overlayEl = null, isOpen = false, hideTimer = null;

  function thesisText(t) { return String(t == null ? '' : t).replace(/<[^>]+>/g, ''); }

  /* live filter: show only cards whose data-filter contains the query, hide empty
     groups, and toggle the no-match note. Cheap DOM toggling -- no re-render. */
  function applyFilter(q) {
    if (!overlayEl) return;
    q = (q || '').trim().toLowerCase();
    var groups = overlayEl.querySelectorAll('.ix-group'), anyGlobal = false;
    for (var i = 0; i < groups.length; i++) {
      var cards = groups[i].querySelectorAll('.ix-card'), anyG = false;
      for (var j = 0; j < cards.length; j++) {
        var match = !q || (cards[j].getAttribute('data-filter') || '').indexOf(q) > -1;
        cards[j].style.display = match ? '' : 'none';
        if (match) { anyG = true; anyGlobal = true; }
      }
      groups[i].style.display = anyG ? '' : 'none';
    }
    var nores = overlayEl.querySelector('.ix-nores');
    if (nores) nores.hidden = !(q && !anyGlobal);
  }

  /* the home banner: overall progress + resume + weakest, or a start-here CTA */
  function homeStrip() {
    if (typeof Progress === 'undefined' || typeof TopicRegistry === 'undefined') return '';
    var sum = Progress.summary(), all = Progress.all(), ids = TopicRegistry.ids();
    if (!ids.length) return '';
    if (!sum.touched) {
      var first = TopicRegistry.get(ids[0]);
      return '<div class="ix-home"><div class="ix-home-prog"><div class="ix-home-k">Start here</div>' +
        '<div class="ix-home-v">Pick any topic below, or jump into the first one and start drilling.</div></div>' +
        '<button class="ix-home-btn" type="button" data-topic="' + ids[0] + '"><span class="ix-home-btn-k">Start</span>' + (first ? first.identity.title : ids[0]) + ' &rarr;</button></div>';
    }
    var lastId = null, lastTs = 0;
    for (var id in all) { if (all[id] && all[id].ts > lastTs) { lastTs = all[id].ts; lastId = id; } }
    var visitId = (typeof LastVisit !== 'undefined' && LastVisit.topicId) ? LastVisit.topicId() : null;
    var useVisit = !!(visitId && TopicRegistry.get(visitId));
    var resumeId = useVisit ? visitId : lastId;
    var resumeHash = (useVisit && LastVisit.hash) ? LastVisit.hash() : null;
    var rt = (resumeId && TopicRegistry.get(resumeId)) ? TopicRegistry.get(resumeId) : null;
    var pct = sum.overallPct || 0;
    var weak = sum.weakest.slice(0, 3).map(function (w) {
      var t = TopicRegistry.get(w.id);
      return '<button class="ix-weak-b" type="button" data-topic="' + w.id + '">' + (t ? t.identity.title : w.id) + (w.shk ? '<span class="ix-weak-n">' + w.shk + '</span>' : '') + '</button>';
    }).join('');
    var concepts = [];
    sum.weakest.slice(0, 3).forEach(function (w) { var pr = Progress.get(w.id); if (pr && pr.revisit && pr.revisit.length) { for (var ci = 0; ci < pr.revisit.length && concepts.length < 5; ci++) concepts.push(pr.revisit[ci]); } });
    var conceptsHtml = concepts.length ? '<div class="ix-weak-concepts">' + concepts.map(function (c) { return '<span class="ix-wc">' + c + '</span>'; }).join('') + '</div>' : '';
    return '<div class="ix-home">' +
      '<div class="ix-home-prog"><div class="ix-home-k">Your progress</div>' +
      '<div class="ix-home-bar"><span style="width:' + pct + '%"></span></div>' +
      '<div class="ix-home-v">' + pct + '% of the curriculum &middot; ' + sum.totDone + ' probes drilled &middot; ' + sum.touched + ' of ' + sum.nTopics + ' topics started</div></div>' +
      (rt ? '<button class="ix-home-btn" type="button" ' + (resumeHash ? 'data-hash="' + resumeHash + '"' : 'data-topic="' + resumeId + '"') + '><span class="ix-home-btn-k">Resume</span>' + rt.identity.title + ' &rarr;</button>' : '') +
      (weak ? '<div class="ix-weak"><div class="ix-home-k">Revisit</div><div class="ix-weak-list">' + weak + '</div>' + conceptsHtml + '</div>' : '') +
      '</div>';
  }

  function groupColorFor(id) {
    var t = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.get(id) : null;
    if (!t || typeof TOPIC_GROUPS === 'undefined') return 'var(--acc)';
    var g = t.identity.group;
    for (var i = 0; i < TOPIC_GROUPS.length; i++) if (TOPIC_GROUPS[i].id === g) return TOPIC_GROUPS[i].color;
    return 'var(--acc)';
  }

  /* the Starred shelf: quick access to bookmarked topics, above the groups */
  function starredSection() {
    if (typeof Bookmarks === 'undefined' || typeof TopicRegistry === 'undefined') return '';
    var ids = Bookmarks.all().filter(function (id) { return !!TopicRegistry.get(id); });
    if (!ids.length) return '';
    var pills = ids.map(function (id) {
      var t = TopicRegistry.get(id);
      return '<button class="ix-star-pill" type="button" data-topic="' + id + '" style="box-shadow:inset 3px 0 0 ' + groupColorFor(id) + '"><span class="ix-star-ic">&#9733;</span>' + t.identity.title + '</button>';
    }).join('');
    return '<section class="ix-starred"><div class="ix-g-head"><span class="ix-g-dot" style="background:#f59e0b"></span>Starred <span class="ix-g-n">' + ids.length + '</span></div><div class="ix-star-row">' + pills + '</div></section>';
  }

  /* footer: a reset affordance, shown only when there is saved data to clear */
  function footerHtml() {
    var any = (typeof Store !== 'undefined' && Store.keys && Store.keys('').length > 0);
    /* Import is always available (restore a backup into a fresh browser); Export and
       Reset only appear once there is saved data. */
    var io = '<button class="ix-io" type="button" data-io="export"' + (any ? '' : ' disabled') + '>Export a backup</button>' +
      '<button class="ix-io" type="button" data-io="import-btn">Import a backup</button>' +
      '<input type="file" accept="application/json,.json" hidden data-io="import">';
    var reset = any ? '<button class="ix-reset" type="button">Reset all saved progress</button>' : '';
    return '<div class="ix-foot">' + io + reset + '</div>';
  }

  function weakCount() {
    if (typeof TopicRegistry === 'undefined' || typeof Progress === 'undefined' || !Progress.status) return 0;
    var ids = TopicRegistry.ids(), n = 0;
    for (var i = 0; i < ids.length; i++) if (Progress.status(ids[i]) === 'weak') n++;
    return n;
  }
  function weakDrillBar() {
    var n = weakCount();
    if (!n) return '';
    return '<button class="ix-cross ix-cross-weak" type="button" data-cross="weak"><span class="ix-cross-tx"><span class="ix-cross-k">Weak-spot review</span><span class="ix-cross-d">Drill probes from the ' + n + ' topic' + (n === 1 ? '' : 's') + ' you have been shaky on</span></span><span class="ix-cross-ar">&rarr;</span></button>';
  }
  function crossDrillBar() {
    if (typeof TopicRegistry === 'undefined' || !TopicRegistry.ids().length) return '';
    return '<button class="ix-cross" type="button" data-cross="1"><span class="ix-cross-tx"><span class="ix-cross-k">Cross-topic drill</span><span class="ix-cross-d">Random probes from every topic &mdash; the interview shuffle</span></span><span class="ix-cross-ar">&rarr;</span></button>';
  }
  function downloadBackup() {
    if (typeof Store === 'undefined' || !Store.dump) return;
    var payload = { app: 'deepdive-rehearsal', v: 1, exported: new Date().toISOString(), data: Store.dump() };
    var json = JSON.stringify(payload, null, 2);
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'deepdive-rehearsal-backup.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 120);
    } catch (e) { try { window.prompt('Copy your backup JSON:', json); } catch (e2) {} }
  }
  function importBackup(file) {
    if (!file || typeof Store === 'undefined' || !Store.restore) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed; try { parsed = JSON.parse(reader.result); } catch (e) { window.alert('That file is not valid JSON.'); return; }
      var data = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
      if (!data || typeof data !== 'object') { window.alert('That does not look like a backup.'); return; }
      if (window.confirm('Import this backup? It merges into your current data and reloads.')) { Store.restore(data); location.reload(); }
    };
    reader.readAsText(file);
  }

  function panelHtml() {
    var buckets = (typeof groupedTopicIds === 'function') ? groupedTopicIds() : [];
    var cur = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    var curId = cur ? cur.id : null;
    var n = 0; buckets.forEach(function (b) { n += b.ids.length; });

    var head = '<div class="ix-head"><div><div class="ix-title">Topic index</div>' +
      '<div class="ix-sub">' + n + ' topic' + (n === 1 ? '' : 's') + ' across ' +
      buckets.length + ' group' + (buckets.length === 1 ? '' : 's') + '</div></div>' +
      '<button class="ix-x" type="button" aria-label="Close index">&#215;</button></div>';

    var filter = '<div class="ix-filter-row"><input class="ix-filter" type="text" placeholder="Filter topics by name or idea..." aria-label="Filter topics"><span class="ix-nores" hidden>No topics match.</span></div>';

    var body = buckets.map(function (b) {
      var cards = b.ids.map(function (id) {
        var t = TopicRegistry.get(id), idn = t.identity, on = (id === curId);
        var th = thesisText(idn.thesis || '');
        var _st = (typeof Progress !== 'undefined') ? Progress.status(id) : 'untouched';
        var _pr = (typeof Progress !== 'undefined') ? Progress.get(id) : null;
        var _bdg = '';
        if (_st === 'in-progress' && _pr) _bdg = '<span class="ix-c-badge"><i style="background:var(--acc)"></i>' + _pr.done + '/' + _pr.tot + '</span>';
        else if (_st === 'weak') { var _wn = (_pr ? _pr.shk : 0) + ((typeof Progress !== 'undefined' && Progress.shakyMarks) ? Progress.shakyMarks(id) : 0); _bdg = '<span class="ix-c-badge"><i style="background:#dc2626"></i>' + _wn + ' weak</span>'; }
        else if (_st === 'solid') _bdg = '<span class="ix-c-badge"><i style="background:#0d9488"></i>done</span>';
        var filt = ((idn.title || '') + ' ' + (idn.locatorTail || '') + ' ' + th).toLowerCase().replace(/&[a-z#0-9]+;/g, ' ').replace(/"/g, '');
        var resetBtn = (_st !== 'untouched') ? '<button class="ix-c-reset" type="button" data-reset="' + id + '" title="Reset progress for this topic" aria-label="Reset progress for ' + idn.title + '">&#8635;</button>' : '';
        return '<div class="ix-cell"><button class="ix-card' + (on ? ' on' : '') + '" type="button" data-topic="' + id + '" data-filter="' + filt + '" style="box-shadow:inset 3px 0 0 ' + (b.group.color || 'transparent') + '"' +
          (on ? ' aria-current="true"' : '') + '>' + _bdg +
          '<span class="ix-c-name">' + idn.title + '</span>' +
          '<span class="ix-c-tail">' + idn.locatorTail + '</span>' +
          (th ? '<span class="ix-c-thesis">' + th + '</span>' : '') + '</button>' + resetBtn + '</div>';
      }).join('');
      return '<section class="ix-group"><div class="ix-g-head"><span class="ix-g-dot" style="background:' + (b.group.color || 'var(--acc)') + '"></span>' + b.group.label +
        ' <span class="ix-g-n">' + b.ids.length + '</span>' +
        '<button class="ix-g-cram" type="button" data-cross="group:' + b.group.id + '">Cram &rarr;</button></div>' +
        (b.group.desc ? '<div class="ix-g-desc">' + b.group.desc + '</div>' : '') +
        '<div class="ix-grid">' + cards + '</div></section>';
    }).join('');

    return '<div class="ix-panel">' + head + homeStrip() + crossDrillBar() + weakDrillBar() + filter + '<div class="ix-scroll">' + starredSection() +
      (buckets.length ? body : '<div class="ix-empty">No topics registered.</div>') + '</div>' + footerHtml() + '</div>';
  }

  var _ixReturn = null;
  function create() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = '_index-overlay';
    overlayEl.className = 'ix-ov';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Topic index');
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener('change', function (e) { var fi = e.target.closest ? e.target.closest('[data-io="import"]') : null; if (fi && fi.files && fi.files[0]) { importBackup(fi.files[0]); fi.value = ''; } });
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) { close(); return; }
      var closer = e.target.closest ? e.target.closest('.ix-x') : null;
      if (closer) { close(); return; }
      var resetBtn = e.target.closest ? e.target.closest('.ix-reset') : null;
      if (resetBtn) {
        if (window.confirm('Clear all saved progress and data? This cannot be undone.')) {
          if (typeof Store !== 'undefined' && Store.clearAll) Store.clearAll();
          overlayEl.innerHTML = panelHtml();
        }
        return;
      }
      var ioBtn = e.target.closest ? e.target.closest('[data-io="export"]') : null;
      if (ioBtn) { downloadBackup(); return; }
      var impBtn = e.target.closest ? e.target.closest('[data-io="import-btn"]') : null;
      if (impBtn) { var fi = overlayEl.querySelector('[data-io="import"]'); if (fi) fi.click(); return; }
      var crossBtn = e.target.closest ? e.target.closest('[data-cross]') : null;
      if (crossBtn) { var _m = crossBtn.getAttribute('data-cross'); close(); if (window.CrossDrill && CrossDrill.open) CrossDrill.open(_m); return; }
      var hashBtn = e.target.closest ? e.target.closest('[data-hash]') : null;
      if (hashBtn) { var _h = hashBtn.getAttribute('data-hash'); close(); try { location.hash = _h; } catch (e2) {} return; }
      var perReset = e.target.closest ? e.target.closest('[data-reset]') : null;
      if (perReset) {
        var rid = perReset.getAttribute('data-reset');
        var rt2 = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.get(rid) : null;
        var nm = rt2 ? rt2.identity.title.replace(/&[a-z#0-9]+;/g, ' ').trim() : 'this topic';
        if (window.confirm('Clear saved progress for ' + nm + '?')) {
          if (typeof Progress !== 'undefined' && Progress.clear) Progress.clear(rid);
          overlayEl.innerHTML = panelHtml();
        }
        return;
      }
      var card = e.target.closest ? e.target.closest('[data-topic]') : null;
      if (card) {
        var id = card.getAttribute('data-topic');
        close();
        if (id && typeof TopicRegistry !== 'undefined' && TopicRegistry.setTopic) TopicRegistry.setTopic(id);
      }
    });
    overlayEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var cards = Array.prototype.filter.call(overlayEl.querySelectorAll('.ix-card'), function (c) { return c.offsetParent !== null; });
        if (!cards.length) return;
        e.preventDefault();
        var idx = Array.prototype.indexOf.call(cards, document.activeElement);
        var fwd = (e.key === 'ArrowDown' || e.key === 'ArrowRight');
        var nx = idx === -1 ? (fwd ? cards[0] : cards[cards.length - 1]) : cards[fwd ? Math.min(idx + 1, cards.length - 1) : Math.max(idx - 1, 0)];
        nx.focus();
      } else if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(overlayEl.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'), function (el) { return !el.disabled && el.offsetParent !== null; });
        if (!f.length) { e.preventDefault(); return; }
        var first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (!overlayEl.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function open() {
    if (isOpen) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    _ixReturn = document.activeElement;
    create();
    overlayEl.innerHTML = panelHtml();
    isOpen = true;
    overlayEl.classList.add('open');
    requestAnimationFrame(function () { overlayEl.classList.add('vis'); });
    var filt = overlayEl.querySelector('.ix-filter');
    if (filt) {
      filt.addEventListener('input', function () { applyFilter(filt.value); });
      setTimeout(function () { try { filt.focus(); } catch (e) {} }, 60);
    }
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlayEl.classList.remove('vis');
    hideTimer = setTimeout(function () { if (overlayEl) overlayEl.classList.remove('open'); hideTimer = null; }, 220);
    if (_ixReturn && _ixReturn.focus) { try { _ixReturn.focus(); } catch (e) {} }
    _ixReturn = null;
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
  function wire() {
    var btn = document.getElementById('idxopen'); if (btn) btn.addEventListener('click', open);
    /* C1: a fresh landing (no deep-link) opens the home; a deep-link is honored as-is */
    if (!window.__bootHash) { setTimeout(open, 30); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.IndexOverlay = { open: open, close: close, isOpen: function () { return isOpen; }, exportBackup: downloadBackup };
})();
