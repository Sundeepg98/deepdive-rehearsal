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
    /* Topic axis (above the view router). A hyphenated topic slug can NEVER equal one
       of the 9 short view ids, so #<topic>/<view> is unambiguous and a bare #<view>
       is unchanged. topic === null means "current/default topic" -> single-topic URLs
       are byte-identical to before. */
    var topicId = null, rest = parts;
    if (typeof TopicRegistry !== 'undefined' && TopicRegistry.get(parts[0]) && !ROUTES[parts[0]]) {
      topicId = parts[0]; rest = parts.slice(1);
    }
    var viewId = (rest[0] || DEFAULT_ROUTE).toLowerCase().trim();
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE; // guard: unknown view -> default
    return {
      topic: topicId,
      view: viewId,
      sub: rest.slice(1).join('/') || null,
      route: ROUTES[viewId],
      raw: raw
    };
  }

  /* The current topic's hash prefix -- empty for the default (first-registered) topic,
     so the single-topic deliverable keeps today's bare #<view> URLs verbatim. */
  function topicPrefix() {
    if (typeof TopicRegistry === 'undefined') return '';
    var cur = TopicRegistry.current(), ids = TopicRegistry.ids();
    if (!cur || !ids.length || cur.id === ids[0]) return '';
    return cur.id + '/';
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
    var hash = '#' + topicPrefix() + viewId + (sub ? '/' + sub : '');
    if (window.location.hash !== hash) {
      try { window.history.pushState({ view: viewId, sub: sub || null }, '', hash); }
      catch (e) { window.location.hash = hash; }
    }
    emit(parseHash(hash));
  }

  /* ----- replace the current route (no history entry) ----- */
  function replace(viewId, sub) {
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    var hash = '#' + topicPrefix() + viewId + (sub ? '/' + sub : '');
    try { window.history.replaceState({ view: viewId, sub: sub || null }, '', hash); } catch (e) {}
    emit(parseHash(hash));
  }

  /* ----- reflect a topic switch in the hash, SILENTLY (no emit) -----
     The registry already drove the switch; re-emitting would loop back into
     applyRoute. The default/first topic stays bare so its URLs are unchanged. */
  function setTopic(id) {
    var cur = parseHash();
    var ids = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.ids() : [];
    var prefix = (ids.length && id === ids[0]) ? '' : id + '/';
    var hash = '#' + prefix + cur.view + (cur.sub ? '/' + cur.sub : '');
    try { window.history.replaceState({ topic: id, view: cur.view, sub: cur.sub }, '', hash); } catch (e) {}
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
    setTopic: setTopic,
    subscribe: subscribe,
    current: current,
    parse: parseHash,
    init: init
  };

})();
