/* ===== MediaQueryListener =====
   Responds to media query changes with CSS class toggles.
   Features:
   - Adds .dark-mode class when prefers-color-scheme: dark
   - Adds .reduced-motion class when prefers-reduced-motion
   - Adds .contrast-high class when prefers-contrast: high
   - Live updates without reload
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  function setup(mq, className) {
    function apply() {
      document.body.classList.toggle(className, mq.matches);
    }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
  }

  setup(window.matchMedia('(prefers-color-scheme: dark)'), '_prefers-dark');
  setup(window.matchMedia('(prefers-reduced-motion: reduce)'), '_reduced-motion');
  setup(window.matchMedia('(prefers-contrast: high)'), '_high-contrast');
})();
