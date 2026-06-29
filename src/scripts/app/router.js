/* ===== HashRouter =====
   Hash-based SPA routing with deep-linking and back/forward support.
   Emits routechange events for the view layer (see view-manager.js).
   Zero dependencies, offline-safe -- works from file:// in any browser.

   Route format:   #view              -> simple view switch
                   #view/sub-state    -> view + sub-state (e.g. #drill/probe-3)
   Invalid routes fall back to #walk. */

(function () {
  'use strict';

  /* ----- route configuration: the 9 surfaces, in tab order ----- */
  var ROUTES = {
    walk:  { id: 'walk',  title: 'Walkthrough' },
    drill: { id: 'drill', title: 'Probe Drill' },
    wb:    { id: 'wb',    title: 'Whiteboard' },
    sys:   { id: 'sys',   title: 'System Map' },
    trade: { id: 'trade', title: 'Trade-offs' },
    model: { id: 'model', title: 'Model Answers' },
    num:   { id: 'num',   title: 'Numbers' },
    rf:    { id: 'rf',    title: 'Red Flags' },
    open:  { id: 'open',  title: '30-Second' }
  };
  var DEFAULT_ROUTE = 'walk';
  var listeners = [];

  /* ----- parse a hash string into a route object ----- */
  function parseHash(hash) {
    var raw = (hash || window.location.hash || '#' + DEFAULT_ROUTE).replace(/^#/, '');
    var parts = raw.split('/');
    var viewId = (parts[0] || DEFAULT_ROUTE).toLowerCase().trim();
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE; // guard: unknown view -> default
    return {
      view: viewId,
      sub: parts.slice(1).join('/') || null,
      route: ROUTES[viewId],
      raw: raw
    };
  }

  /* ----- notify subscribers + fire a DOM event ----- */
  function emit(route) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](route); } catch (e) {}
    }
    try { window.dispatchEvent(new CustomEvent('routechange', { detail: route })); } catch (e) {}
  }

  /* ----- navigate to a view (adds a history entry) ----- */
  function navigate(viewId, sub) {
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    var hash = '#' + viewId + (sub ? '/' + sub : '');
    if (window.location.hash !== hash) {
      try { window.history.pushState({ view: viewId, sub: sub || null }, '', hash); }
      catch (e) { window.location.hash = hash; }
    }
    emit(parseHash(hash));
  }

  /* ----- replace the current route (no history entry) ----- */
  function replace(viewId, sub) {
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    var hash = '#' + viewId + (sub ? '/' + sub : '');
    try { window.history.replaceState({ view: viewId, sub: sub || null }, '', hash); } catch (e) {}
    emit(parseHash(hash));
  }

  function onHashChange() { emit(parseHash()); }
  function onPopState() { emit(parseHash()); }

  /* ----- subscribe to route changes; returns an unsubscribe fn ----- */
  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      var idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  function current() { return parseHash(); }

  /* ----- bind listeners and emit the initial (possibly deep-linked) route ----- */
  function init() {
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);
    if (!window.location.hash) {
      try { window.history.replaceState({ view: DEFAULT_ROUTE }, '', '#' + DEFAULT_ROUTE); } catch (e) {}
    }
    emit(parseHash());
  }

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
