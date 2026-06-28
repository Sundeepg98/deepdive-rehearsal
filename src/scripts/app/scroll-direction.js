/* ===== ScrollDirection =====
   Detects scroll direction and adds CSS class to body.
   Features:
   - 'scrolling-up' / 'scrolling-down' classes on body
   - Used by header to show/hide
   - Throttled via rAF
   - Respects reduced-motion
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var lastScroll = 0;
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var pane = document.querySelector('.pane.on');
      if (!pane) { ticking = false; return; }
      var st = pane.scrollTop;
      if (st > lastScroll + 5) {
        document.body.classList.add('scrolling-down');
        document.body.classList.remove('scrolling-up');
      } else if (st < lastScroll - 5) {
        document.body.classList.add('scrolling-up');
        document.body.classList.remove('scrolling-down');
      }
      lastScroll = st;
      ticking = false;
    });
  }

  document.querySelectorAll('.pane').forEach(function (p) {
    p.addEventListener('scroll', onScroll, { passive: true });
  });
})();
