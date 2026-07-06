/* ===== TouchSwipe =====
   Horizontal swipe on the stage navigates between views via the HashRouter,
   prev/next in seg-tab order. A subtle chevron hints the direction mid-gesture.

   Ignored when: an overlay is open, the gesture starts in an input or in a
   zoomable diagram (.chain / .dgm), during multi-touch (a pinch-zoom), or when
   the gesture is mostly vertical (a scroll). Touch devices only.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';
  if (!('ontouchstart' in window)) return;

  var ORDER = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
  var THRESHOLD = 50;        // min horizontal px to count as a swipe
  var V_TOL = 80;            // max vertical px (above this it's a scroll)
  var startX = 0, startY = 0, blocked = false, hintEl = null;

  function anyOverlayOpen() {
    if (document.querySelector('[role="dialog"][aria-modal="true"].open')) return true;
    if (document.querySelector('.mock-ov.open, .cram-ov.open, #_search-overlay[style*="flex"]')) return true;
    if (window.SearchOverlay && window.SearchOverlay.isOpen && window.SearchOverlay.isOpen()) return true;
    if (window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()) return true;
    return false;
  }

  /* true if the gesture began in an input or a zoomable diagram region */
  function startInBlockedRegion(e) {
    var path = (e.composedPath && e.composedPath()) || [e.target];
    for (var i = 0; i < path.length; i++) {
      var el = path[i];
      if (!el || el.nodeType !== 1) continue;
      var tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.matches && el.matches('.chain, .dgm')) return true;
    }
    return false;
  }

  function hint(dir) {
    if (!hintEl) {
      hintEl = document.createElement('div');
      hintEl.id = '_swipe-hint';
      hintEl.style.cssText = 'position:fixed;top:50%;transform:translateY(-50%);font-size:var(--font-size-display);line-height:1;color:var(--acc);opacity:0;transition:opacity .2s ease;pointer-events:none;z-index:90;padding:var(--space-8) var(--space-13);background:var(--card);border:1px solid var(--bd);border-radius:50%;box-shadow:0 4px 16px rgba(83,74,183,.18)';
      document.body.appendChild(hintEl);
    }
    hintEl.textContent = dir === 'prev' ? '\u2039' : '\u203a';
    hintEl.style.left = dir === 'prev' ? '16px' : 'auto';
    hintEl.style.right = dir === 'prev' ? 'auto' : '16px';
    hintEl.style.opacity = '0.65';
  }
  function hideHint() { if (hintEl) hintEl.style.opacity = '0'; }

  function go(dir) {
    if (!window.Router) return;
    var cur = window.Router.current().view, i = ORDER.indexOf(cur);
    if (i < 0) return;
    var j = dir === 'next' ? i + 1 : i - 1;
    if (j >= 0 && j < ORDER.length) window.Router.navigate(ORDER[j]);
  }

  var stage = document.querySelector('.stage') || document.body;

  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1 || anyOverlayOpen() || startInBlockedRegion(e)) { blocked = true; startX = 0; return; }
    blocked = false;
    startX = e.changedTouches[0].screenX;
    startY = e.changedTouches[0].screenY;
  }, { passive: true });

  stage.addEventListener('touchmove', function (e) {
    if (blocked || !startX || e.touches.length > 1) return;
    var dx = e.changedTouches[0].screenX - startX, dy = e.changedTouches[0].screenY - startY;
    if (Math.abs(dx) > 30 && Math.abs(dy) < V_TOL) hint(dx > 0 ? 'prev' : 'next');
    else hideHint();
  }, { passive: true });

  stage.addEventListener('touchend', function (e) {
    hideHint();
    if (blocked || !startX) { startX = 0; return; }
    var dx = e.changedTouches[0].screenX - startX, dy = e.changedTouches[0].screenY - startY;
    /* swipe right -> previous view, swipe left -> next view */
    if (Math.abs(dx) >= THRESHOLD && Math.abs(dy) < V_TOL) go(dx > 0 ? 'prev' : 'next');
    startX = 0;
    startY = 0;
  }, { passive: true });
})();
