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
        var filt = ((idn.title || '') + ' ' + (idn.locatorTail || '') + ' ' + th).toLowerCase().replace(/&[a-z#0-9]+;/g, ' ').replace(/"/g, '');
        return '<button class="ix-card' + (on ? ' on' : '') + '" type="button" data-topic="' + id + '" data-filter="' + filt + '" style="box-shadow:inset 3px 0 0 ' + (b.group.color || 'transparent') + '"' +
          (on ? ' aria-current="true"' : '') + '>' +
          '<span class="ix-c-name">' + idn.title + '</span>' +
          '<span class="ix-c-tail">' + idn.locatorTail + '</span>' +
          (th ? '<span class="ix-c-thesis">' + th + '</span>' : '') + '</button>';
      }).join('');
      return '<section class="ix-group"><div class="ix-g-head"><span class="ix-g-dot" style="background:' + (b.group.color || 'var(--acc)') + '"></span>' + b.group.label +
        ' <span class="ix-g-n">' + b.ids.length + '</span></div>' +
        (b.group.desc ? '<div class="ix-g-desc">' + b.group.desc + '</div>' : '') +
        '<div class="ix-grid">' + cards + '</div></section>';
    }).join('');

    return '<div class="ix-panel">' + head + filter + '<div class="ix-scroll">' +
      (buckets.length ? body : '<div class="ix-empty">No topics registered.</div>') + '</div></div>';
  }

  function create() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = '_index-overlay';
    overlayEl.className = 'ix-ov';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Topic index');
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) { close(); return; }
      var closer = e.target.closest ? e.target.closest('.ix-x') : null;
      if (closer) { close(); return; }
      var card = e.target.closest ? e.target.closest('.ix-card') : null;
      if (card) {
        var id = card.getAttribute('data-topic');
        close();
        if (id && typeof TopicRegistry !== 'undefined' && TopicRegistry.setTopic) TopicRegistry.setTopic(id);
      }
    });
  }

  function open() {
    if (isOpen) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
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
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
  function wire() { var btn = document.getElementById('idxopen'); if (btn) btn.addEventListener('click', open); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.IndexOverlay = { open: open, close: close, isOpen: function () { return isOpen; } };
})();
