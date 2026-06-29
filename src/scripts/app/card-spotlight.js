/* ===== CardSpotlight =====
   Feeds --mouse-x / --mouse-y to the hovered .card so the cursor spotlight
   (.card::after, defined in the base sheet) tracks the pointer.

   Perf-gated to match the CSS: it attaches NOTHING on touch/coarse-pointer
   devices or when the user prefers reduced motion -- so mobile and
   motion-sensitive users pay zero cost. A single delegated mousemove listener
   covers every card in every shadow root via composedPath(); the cheap target
   lookup runs per event (composedPath() is only valid during dispatch), while
   the layout read + style write are rAF-throttled. No continuous animations.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';
  try {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  } catch (e) { return; }

  var pending = false, card = null, mx = 0, my = 0;

  function flush() {
    pending = false;
    if (!card) return;
    var r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    card.style.setProperty('--mouse-x', ((mx - r.left) / r.width * 100).toFixed(1) + '%');
    card.style.setProperty('--mouse-y', ((my - r.top) / r.height * 100).toFixed(1) + '%');
  }

  document.addEventListener('mousemove', function (e) {
    /* resolve the card NOW -- composedPath() is empty once dispatch finishes */
    var path = (e.composedPath && e.composedPath()) || [e.target];
    var hit = null;
    for (var i = 0; i < path.length; i++) {
      var el = path[i];
      if (el && el.nodeType === 1 && el.classList && el.classList.contains('card')) { hit = el; break; }
    }
    if (!hit) return;
    card = hit; mx = e.clientX; my = e.clientY;
    if (!pending) { pending = true; requestAnimationFrame(flush); }
  }, { passive: true });
})();
