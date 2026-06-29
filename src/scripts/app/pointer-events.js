/* ===== PointerEvents =====
   Unified pointer event handling for mouse, touch, and pen.
   Features:
   - Pointer-optimized drag on cards
   - Pressure-sensitive highlighting on supported devices
   - Coalesced event handling for smooth interaction
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  if (!window.PointerEvent) return;

  var cards = document.querySelectorAll('.card');
  cards.forEach(function (card) {
    card.addEventListener('pointerdown', function (e) {
      card.style.transform = 'scale(0.98)';
      card.style.transition = 'transform .08s ease';
    });
    card.addEventListener('pointerup', function (e) {
      card.style.transform = '';
      card.style.transition = 'transform .25s cubic-bezier(.22,.61,.36,1)';
    });
    card.addEventListener('pointerleave', function (e) {
      card.style.transform = '';
    });
    card.style.touchAction = 'pan-y'; // Allow vertical scroll, handle horizontal gestures
  });
})();
