/* ===== PageVisibility =====
   Pauses expensive animations/timers when tab is hidden.
   Saves CPU/battery. Resumes when tab becomes visible.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var hidden = false;

  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    document.body.classList.toggle('_tab-hidden', hidden);
    if (hidden) {
      // Pause expensive CSS animations
      document.documentElement.style.setProperty('--animation-play-state', 'paused');
    } else {
      document.documentElement.style.removeProperty('--animation-play-state');
    }
  });

  // Inject pause style
  var style = document.createElement('style');
  style.textContent = 'body._tab-hidden *, body._tab-hidden *::before, body._tab-hidden *::after { animation-play-state: paused !important }';
  document.head.appendChild(style);
})();
