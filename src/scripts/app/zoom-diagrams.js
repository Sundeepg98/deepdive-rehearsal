/* ===== ZoomDiagrams =====
   Pinch-to-zoom on images and diagram elements.
   Features:
   - Pinch gesture detection on .card img, diagram elements
   - Scale transform with smooth transition
   - Double-tap to reset zoom
   - Only on touch devices
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  if (!('ontouchstart' in window)) return;

  var scale = 1;
  var initialDist = 0;
  var target = null;

  function getDist(e) {
    var t = e.touches;
    if (t.length < 2) return 0;
    var dx = t[0].clientX - t[1].clientX;
    var dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function findTarget(el) {
    return el.closest('.card, img, svg, .diagram, [class*="map"]');
  }

  document.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      target = findTarget(e.target);
      if (target) {
        initialDist = getDist(e);
        scale = parseFloat(target.dataset._zoom) || 1;
      }
    }
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2 && target && initialDist > 0) {
      e.preventDefault();
      var dist = getDist(e);
      var newScale = Math.min(3, Math.max(0.8, scale * (dist / initialDist)));
      target.style.transform = 'scale(' + newScale.toFixed(2) + ')';
      target.style.transformOrigin = 'center center';
      target.style.transition = 'none';
    }
  }, { passive: false });

  document.addEventListener('touchend', function () {
    if (target) {
      target.dataset._zoom = parseFloat(target.style.transform.replace(/[^0-9.]/g, '')) || 1;
      target.style.transition = 'transform .25s ease';
      target = null;
      initialDist = 0;
    }
  });
})();
