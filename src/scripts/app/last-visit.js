/* ===== scripts/app/last-visit.js -- true cross-session Resume =====
   Persists the last topic+view the user actually studied. Navigation uses
   pushState/replaceState (not hash edits), so we listen to routechange (view
   changes) + deeptopicchange (topic switches). Two guards keep the boot from
   clobbering a real last visit: a short settle window (the router emits its
   initial route before C1 opens the home ~30ms later) and an on-home check.
   The topic id comes from the registry (reliable even for the bare-#view default
   topic); the view comes from the router. Falls back to last-drilled in the home. */
(function () {
  var KEY = 'nav.last', ready = false;
  function ids() { return (typeof TopicRegistry !== 'undefined') ? TopicRegistry.ids() : []; }

  /* A TOPIC-LESS ROUTE IS NOT A VISIT.
     The old guard asked "is the index modal open?" -- which is true only for the user who has
     NOTHING to protect (it fired once per browser, for a brand-new user). For everyone else the
     modal was shut, so ~500ms after boot this fired on a topic THE USER NEVER CHOSE (the app dumps
     you on the first-registered topic) and overwrote their real resume pointer with it. Seeded
     `saga/drill`, boot, wait 1500ms -> `content-pipeline/walk`. The pointer destroyed itself.

     Now it asks the only question that matters: is this route a topic at all? The home has no
     topic, so at boot there is nothing to write, and the clobber is not merely unlikely -- it is
     structurally impossible. A deep link to #saga/drill still records: that IS a genuine visit.
     Both halves are required: without the #home landing, boot would still write the boot topic. */
  function record() {
    if (!ready) return;
    var rc = (typeof Router !== 'undefined' && Router.current) ? Router.current() : null;
    if (!rc || !rc.view || rc.view === 'home') return;
    var cur = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    if (!cur || !cur.id || ids().indexOf(cur.id) === -1) return;
    try { Store.set(KEY, { id: cur.id, view: rc.view }); } catch (e) {}
  }
  window.addEventListener('routechange', record);
  window.addEventListener('deeptopicchange', record);
  function arm() { setTimeout(function () { ready = true; record(); }, 500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
  function stored() { var v = Store.get(KEY, null); return (v && v.id) ? v : null; }

  /* ===== WHERE A TOPIC PICK MADE FROM A TOPIC-LESS ROUTE HAS TO LAND =====
     The mirror image of record() above, and it exists for the same reason: THE HOME HAS NO TOPIC.
     Router.setTopic is a deliberate no-op on a topic-less route (it must not rewrite the home's hash
     and destroy its own history entry -- see router.js), so a topic picked from #home switches the
     registry and moves NOBODY. The user stays on the home, whose hero still advertises the topic
     they just left, and no error is emitted. The caller has to navigate or the pick is silently
     lost. Measured on all three engines before this existed: Search and the Topic index both did it.

     One implementation, here, because the rule needs BOTH halves this module already owns -- the
     resume pointer, and the "a topic-less route is not a topic" test -- and because it was three
     separate call sites that let two of them be forgotten. HomeView, SearchOverlay and IndexOverlay
     all route through it. */
  function resumeView() {
    try {
      var v = Store.get(KEY, null);
      if (v && v.view && window.Router && Router.ROUTES[v.view] && v.view !== 'home') return v.view;
    } catch (e) {}
    return 'walk';
  }
  /* Returns true if it navigated. Call it BEFORE TopicRegistry.setTopic, the order Panels.bind
     already fires onPick in: the navigate pushes one entry with the outgoing topic's prefix, and
     setTopic's silent replaceState then re-prefixes it -- so the switch costs no second entry.
     Calling it after would work too, but only by accident of the encoder, and only when setTopic
     really switched: it early-returns on `id === cur`, which is exactly the pick a returning user
     makes most (the topic they left). Before, always. */
  function navigateAfterPick(kind) {
    /* A 'hash' pick assigns location.hash, which routes away by itself -- navigating as well would
       push a junk entry and break Back. 'topic' and 'cross' both need us. */
    if (kind === 'hash' || !window.Router) return false;
    var rc = Router.current ? Router.current() : null;
    if (!rc || rc.view !== 'home') return false;   /* a topic route moves itself, via setTopic */
    Router.navigate(resumeView());
    return true;
  }

  window.LastVisit = {
    topicId: function () { var v = stored(); return v ? v.id : null; },
    hash: function () { var v = stored(); return v ? ('#' + v.id + (v.view ? '/' + v.view : '')) : null; },
    resumeView: resumeView,
    navigateAfterPick: navigateAfterPick
  };
})();
