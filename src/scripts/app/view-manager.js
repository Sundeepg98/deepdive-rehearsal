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
  /* ===== HAS A ROUTE BEEN APPLIED YET? =====
     THE BOOT WINDOW. shell.js registers its global keymap at PARSE time; Router.init() does not
     run until DOMContentLoaded, and only then does applyRoute() stamp documentElement.dataset.view.
     Between those two moments every key in that map is live while `dataset.view` is undefined --
     so `onHome` reads FALSE on a load that is landing on the home, and a keypress that arrives in
     the gap acts on the BOOT topic. Measured on the shipped build: `w` leaked in 6 of 6 attempts
     (it navigated to the drill of a topic the user never chose) and `n` in 2 of 6; `q` leaked too,
     at a rate nobody recorded; and `p` opened Session progress for the boot constant -- the very
     defect cycle 1 fixed for the ROUTED case, arriving through the door underneath it.

     THE FLAG IS HERE, NOT AT PARSE TIME. Stamping data-view early from location.hash would be a
     SECOND derivation of route truth, and this file is the single authority for the first: the
     keymap asks "has applyRoute applied a route yet", which is one bit that cannot disagree with
     anything. It is never cleared: the window is a boot condition, not a state.

     AND IT IS SET AT THE TOP, NOT AT THE END OF EACH BRANCH. It shipped as two assignments, one
     at the close of the home branch and one at the close of the function -- which made the bit
     mean "an application RAN TO COMPLETION" rather than "a route has arrived", and those differ
     on exactly one path: a throw. `HomeView.render()` is called from this function and nowhere
     else, Router.emit() wraps every subscriber in `try {} catch (e) {}` (router.js:87), and the
     home branch stamps `dataset.view = 'home'` BEFORE it renders. So one exception anywhere in
     render left the app on a home whose data-view said 'home' while routeApplied stayed false --
     and the gate above turns the WHOLE keymap off, permanently, for every key: no `d`, no `/`,
     no `?`, no `h`, silently, with the error swallowed by the router. A rendering bug would have
     taken the entire keyboard with it.
     The window this flag exists to close is "the map has no route to mean anything against", and
     that ends the moment a route ARRIVES with a view -- not when its side effects finish.
     applyRoute is synchronous and has no awaits, so nothing can interleave between this line and
     the end of the call; setting it here changes the bit on no path except the throwing one. */
  var routeApplied = false;

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
    /* A ROUTE HAS ARRIVED. See routeApplied above: this is the boot-window bit, and it is set
       here -- past the guard, before any side effect -- so that a throw inside a render cannot
       leave the global keymap switched off forever. */
    routeApplied = true;

    /* THE HOME IS NOT A TAB. This branch runs BEFORE switchTab, and never calls it.
       switchTab('home') would find getElementById('home') (the container is a real element), then:
         - set railEl.style.width = railPos['home'] + '%'  ->  the string "undefined%";
         - call markViewSeen('home'), writing `viewseen.<topic>` for a view that HAS no topic --
           poisoning both the per-topic seen-dots and the old boot gate that read those keys;
         - toggle .on OFF every pane, so leaving the home would land on a blank stage.
       The home owns its own visibility through html[data-view="home"] instead. */
    if (route.view === 'home') {
      document.documentElement.dataset.view = 'home';
      if (window.HomeView && HomeView.render) HomeView.render();
      document.title = 'Home \u2014 ' + BASE_TITLE;
      if (lastView !== 'home') { announce('Home'); lastView = 'home'; }
      try { window.scrollTo(0, 0); } catch (e) {}
      return;
    }
    if (document.documentElement.dataset.view === 'home') {
      delete document.documentElement.dataset.view;
      /* The sidebar is one element with two tenants and its accessible NAME follows the tenant --
         HomeView.render() sets "Home controls" on the way in, and leaving is the only place that
         can put the topic name back. A landmark whose name describes the other route is worse
         than an unnamed one, and this is the symmetric half of that rename. */
      var _sb = document.querySelector('.sidebar');
      if (_sb) _sb.setAttribute('aria-label', 'Topic controls');
    }

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
    refreshTitle: refreshTitle,
    /* THE BOOT-WINDOW GATE, read at the top of shell.js's keydown handler. See routeApplied above.
       It is a function rather than a property so a reader cannot latch a stale copy of the bit. */
    routed: function () { return routeApplied; }
  };

})();
