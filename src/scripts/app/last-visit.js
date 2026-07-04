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
  function onHome() { return (typeof IndexOverlay !== 'undefined' && IndexOverlay.isOpen) ? IndexOverlay.isOpen() : false; }
  function record() {
    if (!ready || onHome()) return;
    var cur = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    if (!cur || !cur.id || ids().indexOf(cur.id) === -1) return;
    var rc = (typeof Router !== 'undefined' && Router.current) ? Router.current() : null;
    try { Store.set(KEY, { id: cur.id, view: (rc && rc.view) ? rc.view : '' }); } catch (e) {}
  }
  window.addEventListener('routechange', record);
  window.addEventListener('deeptopicchange', record);
  function arm() { setTimeout(function () { ready = true; record(); }, 500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
  function stored() { var v = Store.get(KEY, null); return (v && v.id) ? v : null; }
  window.LastVisit = {
    topicId: function () { var v = stored(); return v ? v.id : null; },
    hash: function () { var v = stored(); return v ? ('#' + v.id + (v.view ? '/' + v.view : '')) : null; }
  };
})();
