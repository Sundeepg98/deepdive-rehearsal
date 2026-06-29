/* ===== ResizeObserver =====
   Observes container size changes and adjusts layout.
   Features:
   - Watches .app container
   - Adds size class for CSS targeting
   - Debounced updates
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  if (!window.ResizeObserver) return;

  var app = document.querySelector('.app');
  if (!app) return;

  var ro = new ResizeObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var w = entry.contentRect.width;
      app.classList.remove('_size-narrow', '_size-wide', '_size-normal');
      if (w < 900) app.classList.add('_size-narrow');
      else if (w > 1400) app.classList.add('_size-wide');
      else app.classList.add('_size-normal');
    }
  });

  ro.observe(app);
})();
