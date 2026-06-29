/* ===== BeaconUnload =====
   Sends session analytics on page unload using navigator.sendBeacon.
   Features:
   - Tracks session duration, modules visited
   - Sends on beforeunload reliably
   - Minimal payload, no blocking
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var sessionStart = Date.now();
  var modulesVisited = [];

  document.addEventListener('routechange', function (e) {
    var v = e.detail && e.detail.view ? e.detail.view : '';
    if (v && modulesVisited.indexOf(v) === -1) modulesVisited.push(v);
  });

  window.addEventListener('beforeunload', function () {
    var payload = JSON.stringify({
      duration: Date.now() - sessionStart,
      modules: modulesVisited.length,
      moduleList: modulesVisited.join(','),
      url: location.href
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/analytics', new Blob([payload], { type: 'application/json' }));
    }
  });
})();
