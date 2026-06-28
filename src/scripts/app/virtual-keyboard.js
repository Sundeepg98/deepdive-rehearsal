/* ===== VirtualKeyboard =====
   Detects virtual keyboard appearance on mobile.
   Adjusts layout to keep content visible.
   Uses visualViewport API with fallback.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  if (!window.visualViewport) return;

  function onResize() {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    var offset = window.innerHeight - h;
    if (offset > 150) {
      document.documentElement.style.setProperty('--keyboard-offset', offset + 'px');
      document.body.classList.add('_keyboard-open');
    } else {
      document.documentElement.style.removeProperty('--keyboard-offset');
      document.body.classList.remove('_keyboard-open');
    }
  }

  window.visualViewport.addEventListener('resize', onResize);
  window.visualViewport.addEventListener('scroll', onResize);
})();
