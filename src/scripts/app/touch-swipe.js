/* ===== TouchSwipe =====
   Swipe left/right on mobile to navigate between views.
   Features:
   - Horizontal swipe detection on the stage area
   - Threshold: 50px horizontal, <100px vertical (to avoid scroll conflicts)
   - Visual feedback: subtle arrow hint during swipe
   - Only activates on touch devices (checks touch support)
   - Respects view transition lock
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  // Only enable on touch-capable devices
  if (!('ontouchstart' in window)) return;

  var ORDER = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
  var THRESHOLD = 50;
  var VERTICAL_TOLERANCE = 100;

  var startX = 0;
  var startY = 0;
  var hintEl = null;

  function createHint() {
    if (hintEl) return;
    hintEl = document.createElement('div');
    hintEl.id = '_swipe-hint';
    hintEl.style.cssText = 'position:fixed;top:50%;transform:translateY(-50%);font-size:28px;color:var(--acc);opacity:0;transition:opacity .2s ease;pointer-events:none;z-index:100;padding:12px 16px;background:rgba(255,255,255,.85);border-radius:50%;box-shadow:0 4px 16px rgba(83,74,183,.15);backdrop-filter:blur(4px)';
    document.body.appendChild(hintEl);
  }

  function showHint(direction) {
    if (!hintEl) createHint();
    hintEl.textContent = direction === 'left' ? '\u2039' : '\u203A';
    hintEl.style.left = direction === 'left' ? '20px' : 'auto';
    hintEl.style.right = direction === 'left' ? 'auto' : '20px';
    hintEl.style.opacity = '0.6';
  }

  function hideHint() {
    if (hintEl) hintEl.style.opacity = '0';
  }

  function navigate(direction) {
    if (!window.Router) return;
    var current = window.Router.current().view;
    var idx = ORDER.indexOf(current);
    if (idx < 0) return;

    var nextIdx = direction === 'left' ? idx + 1 : idx - 1;
    if (nextIdx >= 0 && nextIdx < ORDER.length) {
      window.Router.navigate(ORDER[nextIdx]);
    }
  }

  var stage = document.querySelector('.stage') || document.body;

  stage.addEventListener('touchstart', function (e) {
    startX = e.changedTouches[0].screenX;
    startY = e.changedTouches[0].screenY;
  }, { passive: true });

  stage.addEventListener('touchmove', function (e) {
    if (!startX) return;
    var dx = e.changedTouches[0].screenX - startX;
    var dy = e.changedTouches[0].screenY - startY;
    if (Math.abs(dx) > 30 && Math.abs(dy) < VERTICAL_TOLERANCE) {
      showHint(dx > 0 ? 'right' : 'left');
    }
  }, { passive: true });

  stage.addEventListener('touchend', function (e) {
    if (!startX) return;
    var dx = e.changedTouches[0].screenX - startX;
    var dy = e.changedTouches[0].screenY - startY;
    hideHint();

    if (Math.abs(dx) >= THRESHOLD && Math.abs(dy) < VERTICAL_TOLERANCE) {
      navigate(dx > 0 ? 'right' : 'left');
    }
    startX = 0;
    startY = 0;
  }, { passive: true });
})();
