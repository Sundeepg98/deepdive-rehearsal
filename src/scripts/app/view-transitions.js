/* ===== ViewTransitions =====
   A thin progressive-enhancement wrapper around a view-swap callback.

   When the native View Transitions API is available (Chrome 111+) and the user
   has not requested reduced motion, the pane swap is run inside
   document.startViewTransition() for a smooth cross-fade. Everywhere else it
   simply runs the callback synchronously and the existing CSS pane animation
   (".pane.on { animation: panein }") plays exactly as before -- so the
   no-API fallback is byte-for-behavior identical to the pre-router app.

   Offline-safe: no network, storage, or permission calls. */

(function () {
  'use strict';

  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion:reduce)').matches; }
    catch (e) { return false; }
  }

  /* Run `apply` (the DOM mutation that swaps the active pane). Returns nothing. */
  function run(apply) {
    if (typeof apply !== 'function') return;
    if (document.startViewTransition && !prefersReducedMotion()) {
      try { document.startViewTransition(apply); return; } catch (e) {}
    }
    apply();
  }

  window.ViewTransitions = { run: run };

})();
