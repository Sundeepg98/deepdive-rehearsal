/* ===== HashRouter =====
   Hash-based SPA routing with deep-linking, back/forward support,
   and route guards. Emits routechange events for the ViewManager.
   Zero dependencies — works in all browsers.

   Route format:   #view              → simple view switch
                   #view/sub-state    → view + sub-state (e.g., #drill/probe-3)
   Invalid routes fall back to #walk. */

(function () {
  'use strict';

  /* ----- route configuration ----- */
  var ROUTES = {
    walk:    { id: 'walk',    title: 'Walkthrough',     label: 'Walkthrough',    segment: 0 },
    drill:   { id: 'drill',   title: 'Probe Drill',     label: 'Probe Drill',    segment: 1 },
    wb:      { id: 'wb',      title: 'Whiteboard',      label: 'Whiteboard',     segment: 2 },
    sys:     { id: 'sys',     title: 'System Map',      label: 'System Map',     segment: 3 },
    trade:   { id: 'trade',   title: 'Trade-offs',      label: 'Trade-offs',     segment: 4 },
    model:   { id: 'model',   title: 'Model Answers',   label: 'Model Answers',  segment: 5 },
    num:     { id: 'num',     title: 'Numbers',         label: 'Numbers',        segment: 6 },
    rf:      { id: 'rf',      title: 'Red Flags',       label: 'Red Flags',      segment: 7 },
    open:    { id: 'open',    title: '30-Second',       label: '30-Second',      segment: 8 }
  };
  var DEFAULT_ROUTE = 'walk';
  var listeners = [];

  /* ----- parse hash into route object ----- */
  function parseHash(hash) {
    var raw = (hash || window.location.hash || '#' + DEFAULT_ROUTE).replace(/^#/, '');
    var parts = raw.split('/');
    var viewId = (parts[0] || DEFAULT_ROUTE).toLowerCase().trim();
    // Guard: unknown view → default
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    return {
      view: viewId,
      sub: parts.slice(1).join('/') || null,
      route: ROUTES[viewId],
      raw: raw
    };
  }

  /* ----- emit routechange event ----- */
  function emit(route) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](route); } catch (e) { console.error('Router listener error:', e); }
    }
    // Dispatch custom event for any DOM listeners
    try {
      window.dispatchEvent(new CustomEvent('routechange', { detail: route }));
    } catch (e) {}
  }

  /* ----- navigate to a route ----- */
  function navigate(viewId, sub) {
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    var hash = '#' + viewId + (sub ? '/' + sub : '');
    // Only push history if different from current
    if (window.location.hash !== hash) {
      window.history.pushState({ view: viewId, sub: sub }, '', hash);
    }
    emit(parseHash(hash));
  }

  /* ----- replace current route (no history entry) ----- */
  function replace(viewId, sub) {
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    var hash = '#' + viewId + (sub ? '/' + sub : '');
    window.history.replaceState({ view: viewId, sub: sub }, '', hash);
    emit(parseHash(hash));
  }

  /* ----- handle hashchange ----- */
  function onHashChange() {
    emit(parseHash());
  }

  /* ----- handle popstate (back/forward) ----- */
  function onPopState(e) {
    emit(parseHash());
  }

  /* ----- subscribe to route changes ----- */
  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      var idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  /* ----- get current route ----- */
  function current() {
    return parseHash();
  }

  /* ----- init: bind listeners, emit initial route ----- */
  function init() {
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);
    // Handle initial load
    if (!window.location.hash) {
      window.history.replaceState({ view: DEFAULT_ROUTE }, '', '#' + DEFAULT_ROUTE);
    }
    emit(parseHash());
  }

  /* ----- public API ----- */
  window.Router = {
    ROUTES: ROUTES,
    navigate: navigate,
    replace: replace,
    subscribe: subscribe,
    current: current,
    parse: parseHash,
    init: init
  };

})();
