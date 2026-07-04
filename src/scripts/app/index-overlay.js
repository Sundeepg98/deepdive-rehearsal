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
  var overlayEl = null, isOpen = false;

  function panelHtml() {
    var buckets = (typeof groupedTopicIds === 'function') ? groupedTopicIds() : [];
    var cur = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    var curId = cur ? cur.id : null;
    var n = 0; buckets.forEach(function (b) { n += b.ids.length; });

    var head = '<div class="ix-head"><div><div class="ix-title">Topic index</div>' +
      '<div class="ix-sub">' + n + ' topic' + (n === 1 ? '' : 's') + ' across ' +
      buckets.length + ' group' + (buckets.length === 1 ? '' : 's') + '</div></div>' +
      '<button class="ix-x" type="button" aria-label="Close index">&#215;</button></div>';

    var body = buckets.map(function (b) {
      var cards = b.ids.map(function (id) {
        var t = TopicRegistry.get(id), idn = t.identity, on = (id === curId);
        return '<button class="ix-card' + (on ? ' on' : '') + '" type="button" data-topic="' + id + '"' +
          (on ? ' aria-current="true"' : '') + '>' +
          '<span class="ix-c-name">' + idn.title + '</span>' +
          '<span class="ix-c-tail">' + idn.locatorTail + '</span></button>';
      }).join('');
      return '<section class="ix-group"><div class="ix-g-head">' + b.group.label +
        ' <span class="ix-g-n">' + b.ids.length + '</span></div><div class="ix-grid">' + cards + '</div></section>';
    }).join('');

    return '<div class="ix-panel">' + head + '<div class="ix-scroll">' +
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
    create();
    overlayEl.innerHTML = panelHtml();
    isOpen = true;
    overlayEl.classList.add('open');
    requestAnimationFrame(function () { overlayEl.classList.add('vis'); });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlayEl.classList.remove('vis');
    setTimeout(function () { if (overlayEl) overlayEl.classList.remove('open'); }, 220);
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
  function wire() { var btn = document.getElementById('idxopen'); if (btn) btn.addEventListener('click', open); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.IndexOverlay = { open: open, close: close, isOpen: function () { return isOpen; } };
})();
