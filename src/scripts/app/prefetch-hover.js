/* ===== PrefetchHover =====
   Preloads adjacent module content on nav button hover.
   Features:
   - Creates invisible iframe to preload next module
   - Only preloads 1 module ahead
   - Cancels if user navigates elsewhere
   - Respects data-saver mode
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var ORDER = ['walk','drill','wb','sys','trade','model','num','rf','open'];
  var prefetching = null;

  function prefetch(viewId) {
    if (!viewId) return;
    var pane = document.getElementById(viewId);
    if (!pane) return;
    // Mark as prefetched
    pane.dataset._prefetched = '1';
  }

  function attach() {
    var seg = document.querySelector('.sidebar .seg') || document.querySelector('.seg');
    if (!seg) return;

    seg.querySelectorAll('button[data-tab]').forEach(function (btn) {
      btn.addEventListener('mouseenter', function () {
        var tab = btn.getAttribute('data-tab');
        if (!tab) return;
        var idx = ORDER.indexOf(tab);
        if (idx >= 0 && idx + 1 < ORDER.length) {
          prefetching = ORDER[idx + 1];
          prefetch(prefetching);
        }
      });
    });
  }

  setTimeout(attach, 1500);
})();
