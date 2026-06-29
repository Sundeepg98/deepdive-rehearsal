/* ===== PageVisibility =====
   When the tab is backgrounded, pause continuous CSS animations (the mesh-gradient
   washes, and any other keyframe animations) to spare CPU and battery, and
   broadcast a hidden/visible signal that any timer can react to.

   How each moving part is handled:
   - CSS animations (mesh gradient, etc.): a `body.is-hidden` class flips
     animation-play-state to paused (rule lives in styles.css).
   - mock-run clock: it is rAF + performance.now(), so it already freezes while
     hidden (rAF stops firing) and self-corrects on return from the timestamp --
     no clock surgery needed. The signal below is provided for any consumer.
   - card spotlight: it is mousemove-driven with no continuous animation, so it is
     naturally idle while hidden.

   Uses only the Page Visibility API (allowed). Offline-safe: no network, storage,
   or permission calls. */
(function () {
  'use strict';

  function apply() {
    var hidden = !!document.hidden;
    document.body.classList.toggle('is-hidden', hidden);
    window.__appHidden = hidden;
    try {
      document.dispatchEvent(new CustomEvent(hidden ? 'app:hidden' : 'app:visible'));
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', apply);
  apply();
})();
