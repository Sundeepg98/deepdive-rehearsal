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
    open:  { id: 'open',  title: '30-Second' },
    viz:   { id: 'viz',   title: 'Visualize' },
    home:  { id: 'home',  title: 'Home' }
  };
  /* DEFAULT_ROUTE MUST STAY 'walk'. It is the fallback for an UNKNOWN view id -- and a bare
     `#<topic>` deep link parses as topic + NO view, so it takes this fallback too. Setting it to
     'home' would silently land EVERY bare `#saga` deep link on the home instead of on saga.
     Only the BARE-ROOT case changes, and that is done in init(), not here. */
  var DEFAULT_ROUTE = 'walk';
  /* Views with NO topic axis. The home is the curriculum, not a topic -- so it must never take a
     topic prefix, and a topic switch must never rewrite the hash while you are on it. */
  var TOPICLESS = { home: 1 };
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

  /* The current topic's hash prefix -- empty for the topic a BARE hash decodes to, so the
     single-topic deliverable keeps today's bare #<view> URLs verbatim.

     THE ENCODER MUST AGREE WITH THE DECODER. parseHash() resolves a bare `#<view>` to
     `topic: null`, which the app resolves to the registry's BOOT topic -- the FIRST-REGISTERED
     one (content-pipeline). This function used to compare against `ids()[0]`, the first
     DISPLAYED one (event-driven, sorted by topicOrderIndex). Two different topics. So on
     event-driven the app emitted a bare `#walk`, and a FRESH LOAD of `#walk` landed on
     content-pipeline. copy-link.js copies location.href verbatim, so the hash IS the share
     contract: copy-link, bookmark and reload all silently pointed at the wrong topic -- for the
     exact topic the cold-start CTA sends every first-time user to. Measured, then fixed here.
     Now: on the boot topic -> bare `#drill` (and `#drill` decodes back to it). On any other ->
     `#<topic>/drill`. Every URL round-trips. */
  function bootTopicId() {
    if (typeof TopicRegistry === 'undefined' || !TopicRegistry.bootId) return null;
    return TopicRegistry.bootId();
  }
  function topicPrefix() {
    if (typeof TopicRegistry === 'undefined') return '';
    var cur = TopicRegistry.current(), boot = bootTopicId();
    if (!cur || !boot || cur.id === boot) return '';
    return cur.id + '/';
  }

  /* ----- notify subscribers + fire a DOM event ----- */
  function emit(route) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](route); } catch (e) {}
    }
    try { window.dispatchEvent(new CustomEvent('routechange', { detail: route })); } catch (e) {}
  }

  /* A topic-less view takes NO topic prefix. Without this, Router.navigate('home') produced
     `#content-pipeline/home` -- a home nailed to a topic. (Measured.) */
  function hashFor(viewId, sub) {
    return '#' + (TOPICLESS[viewId] ? '' : topicPrefix()) + viewId + (sub ? '/' + sub : '');
  }

  /* ----- navigate to a view (adds a history entry) ----- */
  function navigate(viewId, sub) {
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    var hash = hashFor(viewId, sub);
    if (window.location.hash !== hash) {
      try { window.history.pushState({ view: viewId, sub: sub || null }, '', hash); }
      catch (e) { window.location.hash = hash; }
    }
    emit(parseHash(hash));
  }

  /* ----- replace the current route (no history entry) ----- */
  function replace(viewId, sub) {
    if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;
    var hash = hashFor(viewId, sub);
    try { window.history.replaceState({ view: viewId, sub: sub || null }, '', hash); } catch (e) {}
    emit(parseHash(hash));
  }

  /* ----- reflect a topic switch in the hash, SILENTLY (no emit) -----
     The registry already drove the switch; re-emitting would loop back into
     applyRoute. The default/first topic stays bare so its URLs are unchanged. */
  function setTopic(id) {
    var cur = parseHash();
    /* A TOPIC SWITCH MUST NOT REWRITE A TOPIC-LESS ROUTE. On the home, a setTopic() (the room
       cards, the resume CTA, a cross-drill) turned the hash into `#saga/home` via replaceState --
       DESTROYING the home's own history entry, so Back no longer worked. The home has no topic;
       leave its hash alone and let the caller navigate. (Measured.) */
    if (TOPICLESS[cur.view]) return;
    var boot = bootTopicId();
    var prefix = (boot && id === boot) ? '' : id + '/';   /* same contract as topicPrefix() */
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

  /* WHERE A BARE ARRIVAL LANDS. The home, unless the user has explicitly opted out ("Skip the home
     -- resume straight into my last topic", a checkbox on the home itself, persisted as
     home.landing). This is the ONLY route change: every existing #<view> and #<topic>/<view> link
     is byte-identical, and a deep link is never redirected.

     The opt-out VALIDATES the stored topic before honouring it. If a content release renames or
     drops that topic, we fall back to the HOME -- not to #walk. That matters: #walk resolves to the
     boot topic, so the app would dump the user on a topic they never chose AND then let
     LastVisit.record() overwrite their real resume pointer with it. The home has no topic, so
     there is nothing for record() to write -- the guard stops being a coincidence and becomes a
     rule. (See last-visit.js.) */
  function bootLanding() {
    try {
      if (typeof Store === 'undefined' || Store.get('home.landing', '') !== 'resume') return '#home';
      if (typeof LastVisit === 'undefined' || !LastVisit.topicId) return '#home';
      var id = LastVisit.topicId();
      if (!id || typeof TopicRegistry === 'undefined' || !TopicRegistry.get(id)) return '#home';
      return LastVisit.hash() || '#home';
    } catch (e) { return '#home'; }
  }

  /* ----- bind listeners and emit the initial (possibly deep-linked) route ----- */
  function init() {
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);
    if (!window.location.hash) {
      var landing = bootLanding();
      try { window.history.replaceState({ view: parseHash(landing).view }, '', landing); } catch (e) {}
    }

    /* BACK-STOP FOR A DIRECT ENTRY. The line above installs the landing route with replaceState --
       the app never PUSHES its boot entry, it occupies the tab's current one. On a direct entry
       (the offline file opened by itself, or the URL typed into a fresh tab) that is the tab's ONLY
       in-document entry, so one browser Back does not move within the app: it unloads the document
       to the blank page that preceded it (about:blank). Measured pre-fix at 1280x800 AND 360x740:
       one Back -> a fully blank screen (innerText 0, single-colour viewport), recoverable only by
       Forward/reload. It is the literal first Back of every direct session. (Visual sweep A1, P1.)

       Fix: seat exactly ONE in-app #home guard entry BELOW the boot entry, so the first Back lands
       on the app home instead of a blank document, while a SECOND Back still leaves the app. The
       guard is one entry, seated once, never re-pushed -- so the Back button is never trapped.

       Gated on an EMPTY document.referrer -- the true signal for "entered directly, the previous
       document is blank/foreign". history.length is NOT usable: a fresh tab (and a Playwright
       context) seats an about:blank below us, so length is 2-3 on the very entry that blanks -- the
       audited repro measured length 3, so a `length===1` gate would never fire on the real defect.
       A non-empty referrer means the user came from a real page and Back should return there, so no
       guard is seated in that case.

       The boot route stays the TOP entry, so deep links, copy-link and the URL bar are byte-for-byte
       unchanged; only an invisible #home entry is inserted beneath the boot entry.

       SEAT IT AT MOST ONCE PER TAB SESSION. document.referrer is empty on a direct entry AND on every
       RELOAD of one, so gating on the referrer alone re-fires this block on each reload -- and each
       re-fire pushes ANOTHER #home guard, so history.length climbs +1 per reload without bound and
       every reload adds one Back the user must press to leave (measured pre-fix: #home 3,4,5,6,7,8;
       a topic 5,6,7,8,9,10). The guard is one entry, and it SURVIVES the reload (a reload never drops
       back entries), so it must be seated once and never again this session. A sessionStorage flag is
       exactly that lifetime: it persists across a reload but is fresh in a new tab/window, so a direct
       entry still seats one guard and a reload seats none. The flag is written only AFTER the history
       entries are actually in place, so a throw on the history call leaves it unset and the next load
       simply retries -- the guard is never skipped without one already existing. Storage access is
       wrapped: if sessionStorage is unavailable the seat still happens (degrading to the pre-fix
       per-init behaviour, never to a crash and never to the blank dead-end). */
    if (!document.referrer) {
      var guardSeated = false;
      try { guardSeated = sessionStorage.getItem('ddr-guard-seated') === '1'; } catch (e) {}
      if (!guardSeated) {
        try {
          var bootHash = window.location.hash || '#home';
          window.history.replaceState({ view: 'home', guard: true }, '', '#home');
          window.history.pushState({ view: parseHash(bootHash).view }, '', bootHash);
          try { sessionStorage.setItem('ddr-guard-seated', '1'); } catch (e) {}
        } catch (e) {}
      }
    }

    emit(parseHash());

    /* The route fragment (e.g. #walk) matches a pane element's id, so the
       browser's on-load "scroll to fragment" step scrolls the page down to that
       pane -- which on mobile hides the header/nav/Mock-run. Suppress smooth
       scrolling briefly so that scroll (and our undo) is instant rather than an
       animated bounce, pin the page to the top, then restore smooth scrolling
       for normal navigation. The URL fragment is kept intact for deep-linking. */
    if ('scrollRestoration' in window.history) { try { window.history.scrollRestoration = 'manual'; } catch (e) {} }
    var docEl = document.documentElement;
    var prevBehav = docEl.style.scrollBehavior;
    docEl.style.scrollBehavior = 'auto';
    var pinTop = function () { if ((window.pageYOffset || docEl.scrollTop || 0) > 0) window.scrollTo(0, 0); };
    pinTop();
    requestAnimationFrame(pinTop);
    requestAnimationFrame(function () { requestAnimationFrame(pinTop); });
    setTimeout(pinTop, 0);
    setTimeout(pinTop, 120);
    setTimeout(function () { pinTop(); docEl.style.scrollBehavior = prevBehav; }, 400);
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
