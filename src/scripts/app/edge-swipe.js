/* ===== EdgeSwipe =====
   Swipe from screen edge to go back/forward in history.
   Features:
   - Left-edge swipe = go back
   - Right-edge swipe = go forward
   - 30px edge zone detection
   - Respects browser history
   Usage: Auto-initializes on touch devices.
*/
(function () {
  'use strict';
  if (!('ontouchstart' in window)) return;

  var EDGE_ZONE = 30;
  var startX = 0;

  document.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    var endX = e.changedTouches[0].clientX;
    var dx = endX - startX;
    if (Math.abs(dx) < 60) return;

    if (startX < EDGE_ZONE && dx > 0) {
      // Left edge → right swipe = back
      history.back();
    } else if (startX > window.innerWidth - EDGE_ZONE && dx < 0) {
      // Right edge → left swipe = forward
      history.forward();
    }
  }, { passive: true });
})();
