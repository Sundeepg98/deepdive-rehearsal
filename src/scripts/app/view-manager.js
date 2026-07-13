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
  var pending = null;
  var lastView = null;

  /* THE ANNOUNCER. One visually-hidden polite region, shared by every caller.
     It is the app's ONLY channel for "something changed that you cannot see", so it has to
     be right; two things were wrong with building it lazily.

     1. CREATED EAGERLY, NOT ON FIRST CALL. A live region must already be in the
        accessibility tree BEFORE its content changes, or the change is not an update to a
        known region -- it is just a new subtree appearing, and NVDA/JAWS commonly miss it.
        Creating the node and populating it in the same breath is precisely the bug the
        index-overlay undo toast still has. The 30ms defer below papered over it; building
        the region at load removes the race instead of narrowing it. */
  function ensureRegion() {
    if (liveRegion) return liveRegion;
    if (!document.body) return null;
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = 'position:absolute;left:-10000px;width:var(--space-1);height:var(--space-1);overflow:hidden';
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  /*  2. ONE PENDING MESSAGE, NOT A BACKLOG. The clear-then-defer trick (which is what makes
        a repeated identical message re-announce) used a bare setTimeout, so a burst of calls
        queued a burst of messages and the reader fell behind reality -- it would still be
        reading the score from three cards ago. Cancelling the pending one means the region
        always settles on the LATEST state, which is what a cumulative readout ("4 solid, 1
        revisit, 17 left") should say. 30ms is far below human grading cadence, so this can
        only ever collapse a pathological burst, never a real one. */
  function announce(msg) {
    var region = ensureRegion();
    if (!region) return;
    region.textContent = '';
    if (pending) clearTimeout(pending);
    pending = setTimeout(function () { pending = null; region.textContent = msg; }, 30);
  }

  if (document.body) ensureRegion();
  else document.addEventListener('DOMContentLoaded', ensureRegion);

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
