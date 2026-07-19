/* ===== ScrollToTop =====
   A floating "back to top" button for the long views. In this layout the work
   surface scrolls the WINDOW (the panes are not inner scroll containers -- there
   is no overflow-y on .stage/.pane), so it watches window scroll, fades in past
   ~400px, and scrolls the window back to the top. It resets and re-evaluates on
   each routechange (the router dispatches routechange on window). Reduced-motion
   users get an instant jump instead of a smooth scroll.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var THRESHOLD = 400, btn = null, shown = false, lastY = 0;

  /* PERF (perf/chunk-proto): the scroll position is CACHED from the scroll event
     instead of read on demand. Reading pageYOffset forces a style+layout flush when
     the DOM is dirty -- and the on-demand reads here ran at exactly those moments
     (boot, every routechange; ~172ms of the 4x boot, ~19ms per entry). During a real
     scroll the browser has just laid out, so the one read in the handler is cheap; on
     boot/route the cache serves. onRoute() force-hides before its re-check, so a
     momentarily stale cache can only keep the button hidden, never show it wrongly. */
  function scrollTop() { return lastY; }
  function onScroll() {
    lastY = window.pageYOffset ||
      (document.scrollingElement || document.documentElement).scrollTop || 0;
    update();
  }

  function reduceMotion() {
    try { return window.matchMedia('(prefers-reduced-motion:reduce)').matches; }
    catch (e) { return false; }
  }

  function build() {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'scrolltop';
    btn.className = 'scrolltop';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.textContent = '\u2191';
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    });
    document.body.appendChild(btn);
  }

  function update() {
    if (!btn) return;
    var should = scrollTop() > THRESHOLD;
    if (should === shown) return;
    shown = should;
    btn.classList.toggle('show', should);
  }

  function onRoute() {
    shown = false;
    if (btn) btn.classList.remove('show');
    setTimeout(update, 120);
  }

  build();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  /* router dispatches on window; also listen on document for robustness */
  window.addEventListener('routechange', onRoute);
  document.addEventListener('routechange', onRoute);
  update();
})();
