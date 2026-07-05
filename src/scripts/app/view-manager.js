/* ===== ViewManager =====
   The bridge between the HashRouter and the app's existing tab/pane system.

   It does NOT own pane switching -- that stays in switchTab() (see
   shell.js), which already drives the segmented control, the panes,
   the progress rail and the companion panel. ViewManager simply subscribes to
   route changes and asks switchTab() to apply them, then layers on the two
   things routing makes worthwhile: a per-view document.title (so deep links and
   bookmarks read correctly) and an ARIA live announcement (so the view change
   is conveyed to assistive tech).

   This is the "hook, not replace" seam: intent (a click, a key, search, the
   tour) -> Router.navigate() -> here -> switchTab(). Back/forward and direct
   deep links arrive via the router's hashchange/popstate the same way.

   Offline-safe: no network, storage, or permission calls. */

(function () {
  'use strict';

  var BASE_TITLE = 'Deep Rehearsal';
  var liveRegion = null;
  var lastView = null;

  /* a visually-hidden polite live region, created lazily */
  function announce(msg) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    /* clear then set so repeated identical messages are still announced */
    setTimeout(function () { liveRegion.textContent = msg; }, 30);
  }

  /* Re-apply the document title for the current view (used by the identity binder on a
     topic switch; the single-topic deliverable keeps today's title verbatim). */
  function refreshTitle() {
    var label = (lastView && window.Router && Router.ROUTES[lastView]) ? Router.ROUTES[lastView].title : (lastView || '');
    document.title = label + ' \u2014 ' + BASE_TITLE;
  }

  function applyRoute(route) {
    if (!route || !route.view) return;
    /* Topic axis: a deep link / back-forward to a DIFFERENT topic switches it BEFORE the
       view shows, so panes are on the right topic (no topic-1-then-flip flash). In the
       single-topic deliverable route.topic is null, so this is a no-op. */
    if (route.topic && typeof TopicRegistry !== 'undefined') {
      var curT = TopicRegistry.current();
      if (curT && route.topic !== curT.id) TopicRegistry.setTopic(route.topic);
    }
    var view = route.view;
    var label = route.route ? route.route.title : view;

    /* drive the existing controller (idempotent if already on this view) */
    if (typeof window.switchTab === 'function') window.switchTab(view);

    document.title = label + ' \u2014 ' + BASE_TITLE;

    if (view !== lastView) {
      announce(label);
      lastView = view;
    }
  }

  if (window.Router) window.Router.subscribe(applyRoute);

  window.ViewManager = {
    currentView: function () { return lastView; },
    announce: announce,
    refreshTitle: refreshTitle
  };

})();
