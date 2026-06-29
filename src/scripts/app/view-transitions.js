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
      try {
        var vt = document.startViewTransition(apply);
        /* A transition interrupted by a rapid subsequent navigation rejects its
           .ready/.finished promise with "Transition was skipped"; swallow these
           benign rejections so they never surface as unhandled console errors. */
        if (vt) ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) {
          if (vt[k] && typeof vt[k].catch === 'function') vt[k].catch(function () {});
        });
        return;
      } catch (e) {}
    }
    apply();
  }

  window.ViewTransitions = { run: run };

})();
