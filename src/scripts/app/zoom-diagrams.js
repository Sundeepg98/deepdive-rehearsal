/* ===== ZoomDiagrams =====
   Pinch-to-zoom the genuine diagram regions only: the System Map stage-flow
   (.chain in #sys) and the Whiteboard assembled diagram (.dgm in #wb). Scoped
   via composedPath() so it engages ONLY on those shadow-DOM diagram elements,
   never the whole page. Double-tap a zoomed diagram to reset.

   - Touch devices only (no-op on mouse-only).
   - Scale 1x..2.6x, transform-origin follows the pinch midpoint.
   - The host .card has no overflow clip, so a zoomed diagram lifts above its
     siblings (z-index) and stays fully visible; reset clears it.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';
  if (!('ontouchstart' in window)) return;

  var SEL = '.chain, .dgm';   // the two real diagrams (System Map, Whiteboard)
  var MAX = 2.6, MIN = 1;
  var target = null, startDist = 0, startScale = 1, lastTapAt = 0;

  function spread(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* walk the composed path (incl. shadow DOM) for a diagram element */
  function zoomEl(e) {
    var path = (e.composedPath && e.composedPath()) || [e.target];
    for (var i = 0; i < path.length; i++) {
      var el = path[i];
      if (el && el.nodeType === 1 && el.matches && el.matches(SEL)) return el;
    }
    return null;
  }

  function setOrigin(el, t) {
    var r = el.getBoundingClientRect();
    var cx = (t[0].clientX + t[1].clientX) / 2, cy = (t[0].clientY + t[1].clientY) / 2;
    var ox = r.width ? Math.min(100, Math.max(0, (cx - r.left) / r.width * 100)) : 50;
    var oy = r.height ? Math.min(100, Math.max(0, (cy - r.top) / r.height * 100)) : 50;
    el.style.transformOrigin = ox + '% ' + oy + '%';
  }

  function apply(el, s) {
    if (s > 1) { el.style.transform = 'scale(' + s.toFixed(3) + ')'; el.style.position = 'relative'; el.style.zIndex = '50'; }
    else { el.style.transform = ''; el.style.zIndex = ''; }
    el.dataset._zoom = s;
  }

  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 2) return;
    var el = zoomEl(e);
    if (!el) return;
    target = el;
    startDist = spread(e.touches);
    startScale = parseFloat(el.dataset._zoom) || 1;
    el.style.transition = 'none';
    setOrigin(el, e.touches);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!target || e.touches.length !== 2 || !startDist) return;
    e.preventDefault();   // suppress native page pinch while zooming a diagram
    apply(target, Math.min(MAX, Math.max(MIN, startScale * spread(e.touches) / startDist)));
  }, { passive: false });

  function endPinch() {
    if (!target) return;
    target.style.transition = 'transform var(--duration-moderate) var(--ease-base)';
    if ((parseFloat(target.dataset._zoom) || 1) <= 1) apply(target, 1);
    target = null;
    startDist = 0;
  }
  document.addEventListener('touchend', endPinch, { passive: true });
  document.addEventListener('touchcancel', endPinch, { passive: true });

  /* double-tap a zoomed diagram to reset it */
  document.addEventListener('touchend', function (e) {
    if (e.touches.length) return;
    var now = Date.now();
    if (now - lastTapAt < 300) {
      var el = zoomEl(e);
      if (el && (parseFloat(el.dataset._zoom) || 1) > 1) { el.style.transition = 'transform var(--duration-moderate) var(--ease-base)'; apply(el, 1); }
    }
    lastTapAt = now;
  }, { passive: true });
})();
