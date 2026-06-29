/* ===== CacheModules =====
   Caches module HTML content using Cache API for offline reading.
   Features:
   - Opens a named cache on load
   - Stores each module's content on first view
   - Logs cache status to console
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  if (!window.caches) return;

  var CACHE_NAME = '_deepdive_modules';

  async function init() {
    try {
      var cache = await caches.open(CACHE_NAME);
      // Pre-cache the main HTML
      var req = new Request(location.href);
      var exists = await cache.match(req);
      if (!exists) await cache.put(req, new Response(document.documentElement.outerHTML));
    } catch (e) {}
  }

  // Cache each module on view
  document.addEventListener('routechange', function (e) {
    var view = e.detail && e.detail.view ? e.detail.view : '';
    if (!view) return;
    var pane = document.getElementById(view);
    if (!pane) return;
    try {
      caches.open(CACHE_NAME).then(function (cache) {
        var url = location.href.split('#')[0] + '#' + view;
        cache.put(new Request(url), new Response(pane.innerHTML));
      });
    } catch (e) {}
  });

  init();
})();
