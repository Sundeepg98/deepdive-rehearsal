/* ===== MagneticButton =====
   Buttons subtly attract toward the cursor on hover.
   Creates a "magnetic pull" effect within a radius around the button.
   Features:
   - 80px attraction radius
   - 0.3 max translation (subtle, not distracting)
   - Smooth release on mouse leave
   - Respects prefers-reduced-motion
   - Only on desktop (no touch)
   Usage: Auto-initializes. Targets buttons with .magnetic class.
*/
(function () {
  'use strict';

  if ('ontouchstart' in window) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var RADIUS = 80;
  var STRENGTH = 0.3;

  function magnetic(el, e) {
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < RADIUS) {
      var pull = 1 - dist / RADIUS;
      var tx = dx * pull * STRENGTH;
      var ty = dy * pull * STRENGTH;
      el.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px)';
    } else {
      el.style.transform = '';
    }
  }

  function attach(el) {
    if (el.dataset._magnetic) return;
    el.dataset._magnetic = '1';
    el.style.transition = 'transform .15s ease-out';

    var onMove = function (e) { magnetic(el, e); };
    var onLeave = function () { el.style.transform = ''; };

    // Global mousemove for smooth tracking
    document.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  }

  // Attach to CTA buttons and major interactive elements
  function scan() {
    document.querySelectorAll('button, .cta, .btn, a[href]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(scan, 500); });
  } else {
    setTimeout(scan, 500);
  }
})();
