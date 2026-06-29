/* ===== ScrollProgress =====
   Drives the thin #scrollprog bar at the top of the viewport to reflect read
   progress within the active surface. Modularizes what used to be an inline
   script; it creates #scrollprog if it is missing (the bar's look comes from
   the #scrollprog rule in styles.css).

   Robust to layout: it measures whichever of [active pane, .stage, the
   document] is actually the scroll container, and updates on scroll (any
   element, rAF-throttled), resize, and route change.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var bar = document.getElementById('scrollprog');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scrollprog';
    document.body.appendChild(bar);
  }

  var ticking = false;

  /* pick the element with the most vertical overflow */
  function scroller() {
    var candidates = [
      document.querySelector('.pane.on'),
      document.querySelector('.stage'),
      document.scrollingElement || document.documentElement
    ];
    var best = null, bestOverflow = 2;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el) continue;
      var overflow = el.scrollHeight - el.clientHeight;
      if (overflow > bestOverflow) { best = el; bestOverflow = overflow; }
    }
    return best;
  }

  function update() {
    ticking = false;
    var el = scroller();
    if (!el) { bar.style.width = '0%'; return; }
    var max = el.scrollHeight - el.clientHeight;
    if (max <= 0) { bar.style.width = '0%'; return; }
    var pct = Math.min(100, Math.max(0, (el.scrollTop / max) * 100));
    bar.style.width = pct + '%';
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  /* capture-phase catches scroll on whichever element is the container */
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);
  document.addEventListener('routechange', function () { setTimeout(update, 120); });

  setTimeout(update, 200);
})();
