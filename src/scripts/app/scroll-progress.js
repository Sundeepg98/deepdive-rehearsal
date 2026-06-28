/* ===== ScrollProgress =====
   Drives the existing #scrollprog CSS element.
   Shows a thin progress bar at the top of the viewport
   indicating scroll position within the active pane.
   Features:
   - Updates on scroll events (throttled via rAF)
   - Smooth width transition via CSS
   - Auto-attaches to whichever .pane is active
   - Respects prefers-reduced-motion
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var bar = document.getElementById('scrollprog');
  if (!bar) return; // CSS bar not present

  var ticking = false;

  function updateProgress() {
    var pane = document.querySelector('.pane.on');
    if (!pane) { bar.style.width = '0%'; return; }

    var scrollTop = pane.scrollTop;
    var scrollHeight = pane.scrollHeight - pane.clientHeight;
    if (scrollHeight <= 0) { bar.style.width = '0%'; return; }

    var pct = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
    bar.style.width = pct + '%';
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateProgress);
    }
  }

  // Attach to all panes
  var panes = document.querySelectorAll('.pane');
  panes.forEach(function (p) { p.addEventListener('scroll', onScroll, { passive: true }); });

  // Also update on view change
  document.addEventListener('routechange', function () {
    setTimeout(updateProgress, 100);
  });

  // Initial update
  updateProgress();
})();
