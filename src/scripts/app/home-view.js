/* ===== HomeView =====  the #home route: the screen the app opens on.
 *
 * WHY IT EXISTS. The app used to open a first-time user on a MODAL and a returning user on a topic
 * they never chose. The returning user's own resume pointer (nav.last) was read by nothing at boot
 * -- and was then OVERWRITTEN, ~500ms in, with the topic they had just been dumped on. Meanwhile
 * the app already computed, correctly, on every single boot, the only thing a person opening a
 * rehearsal trainer actually wants to know -- what should I do today? -- and showed it to nobody:
 * the dashboard lived inside a 46-topic modal that fired ONCE PER BROWSER, EVER, disarmed by the
 * app's own first-paint write. The one person who ever saw it was the one for whom it could say
 * nothing but "Start here".
 *
 * WHAT IT ANSWERS, IN ORDER. Not "where was I mid-drill" (that is one keystroke away, and it is
 * the wrong question nine days before an onsite) but "what should I do today?":
 *     1. one line of state          how far in am I
 *     2. ONE primary action         resume -- autofocused, so Enter is a zero-click daily loop
 *     3. still shaky                what am I actually bad at            <- the real second decision
 *     4. choose a room              what IS in here (six rooms, not 46 tiles)
 *     5. cross-topic / weak drill
 *     6. ...then the telemetry      goal, streak, trend, refresh -- BELOW the decision, not above
 *     7. starred + the full library with the whole viewport and one document scroll
 *
 * IT WRITES NO PROGRESS. It reads Progress / TopicRegistry / TOPIC_GROUPS / LastVisit / Bookmarks
 * and renders. The only things it persists are the user's own landing preference and the weekly
 * goal they nudge by hand.
 *
 * It renders through Panels -- the same renderers and the SAME delegated handler as the topic
 * switcher -- so there is exactly one place that knows what a topic card is and what clicking one
 * means. Offline-safe. */
(function () {
  'use strict';

  var el = null, bound = false;

  function landingPref() {
    try { return (typeof Store !== 'undefined' && Store.get('home.landing', '') === 'resume'); } catch (e) { return false; }
  }

  /* the view the resume pointer names, so Resume lands in the drill they were in, not on walk */
  function lastView() {
    try {
      var v = (typeof Store !== 'undefined') ? Store.get('nav.last', null) : null;
      if (v && v.view && window.Router && Router.ROUTES[v.view] && v.view !== 'home') return v.view;
    } catch (e) {}
    return 'walk';
  }
  function lastViewTitle() {
    var v = lastView();
    return (window.Router && Router.ROUTES[v]) ? Router.ROUTES[v].title : '';
  }

  /* The compact header. On this route the sidebar is hidden -- it is TOPIC chrome (topic nav, the
     nine tabs, this-topic tools) and the home has no topic -- so Search / Shortcuts / Theme / the
     topic index would simply be GONE without this. Theme delegates to the real #themetog so there
     is still exactly one theme toggle in the app. */
  function headerHtml() {
    return '<header class="hm-top">' +
      '<span class="hm-brand">Deep rehearsal</span>' +
      '<div class="hm-acts">' +
      '<button class="hm-act" type="button" data-act="search">Search <kbd>/</kbd></button>' +
      '<button class="hm-act" type="button" data-act="index">Topic index <kbd>\\</kbd></button>' +
      '<button class="hm-act" type="button" data-act="keys">Shortcuts <kbd>?</kbd></button>' +
      '<button class="hm-act" type="button" data-act="theme">Theme</button>' +
      '</div></header>';
  }

  /* One line of state. Not a decision -- context for the one below it. */
  function stateHtml() {
    var sum = Progress.summary();
    var pct = sum.overallPct || 0;
    var streak = Panels.studyStreak();
    return '<div class="hm-state">' +
      '<div class="ix-home-bar"><span style="width:' + pct + '%"></span></div>' +
      '<div class="ix-home-v">' + pct + '% of the curriculum &middot; ' + sum.totDone + ' probes drilled &middot; ' +
      sum.startedTopics + ' of ' + sum.nTopics + ' topics started' +
      (sum.wbRecalled ? ' &middot; ' + sum.wbRecalled + ' with the design recalled' : '') + '</div>' +
      (streak >= 2 ? '<span class="ix-streak"><b>' + streak + '</b> day streak</span>' : '') +
      '</div>';
  }

  /* EXACTLY ONE PRIMARY ACTION, autofocused on paint -- so Enter resumes and the daily loop costs
     zero clicks. Cold: start (and its URL now round-trips, per router.js). */
  function ctaHtml() {
    if (!Panels.engaged()) {
      var ids = TopicRegistry.ids();
      var first = TopicRegistry.get(ids[0]);
      return '<button class="hm-cta" type="button" data-topic="' + ids[0] + '" data-autofocus="1">' +
        '<span><span class="hm-cta-k">Start</span>' +
        '<span class="hm-cta-t">' + (first ? first.identity.title : ids[0]) + '</span>' +
        '<span class="hm-cta-d">Drill the probes, recall the design, then run a timed mock.</span></span>' +
        '<span class="hm-cta-ar">&rarr;</span></button>';
    }
    var r = Panels.resumeTarget();
    if (!r) return '';
    var vt = lastViewTitle();
    return '<button class="hm-cta" type="button" ' + (r.hash ? 'data-hash="' + r.hash + '"' : 'data-topic="' + r.id + '"') + ' data-autofocus="1">' +
      '<span><span class="hm-cta-k">Resume</span>' +
      '<span class="hm-cta-t">' + r.topic.identity.title + '</span>' +
      '<span class="hm-cta-d">' + (vt ? vt + ' &middot; ' : '') + 'pick up where you left off</span></span>' +
      '<span class="hm-cta-ar">&rarr;</span></button>';
  }

  /* THE SECOND DECISION, and the one a returning user actually wants: not "where was I" but
     "what am I bad at". The app has always known this; it just never said it out loud. */
  function shakyHtml() {
    if (!Panels.engaged()) return '';
    var w = Panels.weakChips(3);
    if (!w.chips) return '';
    return '<section class="hm-sec"><h2 class="hm-h">Still shaky</h2>' +
      '<div class="ix-weak"><div class="ix-weak-list">' + w.chips + '</div>' + w.concepts + '</div></section>';
  }

  function skipHtml() {
    /* B's strongest objection -- "a lobby, taxed on every launch, forever" -- turned into a choice
       the user owns. Default off. Honoured in router.js bootLanding(), which VALIDATES the stored
       topic and falls back to the home (never to a topic nobody chose) if it has gone away. */
    return '<div class="hm-skip">' +
      '<input type="checkbox" id="hm-skip-cb"' + (landingPref() ? ' checked' : '') + '>' +
      '<label for="hm-skip-cb">Skip the home &mdash; resume straight into my last topic</label></div>';
  }

  function html() {
    var tele = Panels.telemetryHtml();
    return headerHtml() + '<div class="ix-panel">' +
      stateHtml() +
      ctaHtml() +
      shakyHtml() +
      Panels.roomsHtml() +
      '<section class="hm-sec">' + Panels.actionsHtml() + '</section>' +
      (tele ? '<section class="hm-tele">' + tele + '</section>' : '') +
      '<section class="hm-sec"><h2 class="hm-h">All topics</h2>' + Panels.libraryHtml() + '</section>' +
      skipHtml() +
      Panels.footerHtml(false) +
      '</div>';
  }

  function render() {
    el = document.getElementById('home');
    if (!el || typeof Progress === 'undefined' || typeof TopicRegistry === 'undefined') return;
    if (!TopicRegistry.ids().length) return;
    el.innerHTML = html();
    if (!bound) { bind(); bound = true; }
    /* AUTOFOCUS THE ONE PRIMARY ACTION. This is what makes Enter the entire daily loop, and what
       makes the home operable from the keyboard the instant it paints. */
    var cta = el.querySelector('[data-autofocus]');
    if (cta) setTimeout(function () { try { cta.focus({ preventScroll: true }); } catch (e) {} }, 0);
  }

  function bind() {
    Panels.bind(el, {
      rerender: render,
      /* See Panels.bind's contract. A 'hash' pick assigns location.hash, which routes away from
         #home by itself -- navigating as well would push a junk entry and break Back. A 'topic'
         (or 'cross') pick goes through TopicRegistry.setTopic, whose Router.setTopic is a NO-OP on
         a topic-less route, so the home MUST navigate itself or nothing happens at all. */
      onPick: function (kind) { if (kind !== 'hash' && window.Router) Router.navigate(lastView()); },
      /* A room is a place in the library, not a new view -- scroll to it and land the focus on its
         first card, so the keyboard user is exactly where the mouse user is looking. */
      onRoom: function (gid) {
        var sec = el.querySelector('.ix-group[data-group="' + gid + '"]');
        if (!sec) return;
        var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
        sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        var first = sec.querySelector('.ix-card');
        if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, reduce ? 0 : 260);
      },
    });

    el.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'search' && window.SearchOverlay) SearchOverlay.open();
      else if (act === 'index' && window.IndexOverlay) IndexOverlay.open();
      else if (act === 'keys' && typeof openKeys === 'function') openKeys();
      else if (act === 'theme') { var t = document.getElementById('themetog'); if (t) t.click(); }
    });

    el.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'hm-skip-cb') {
        try { if (typeof Store !== 'undefined') Store.set('home.landing', e.target.checked ? 'resume' : 'home'); } catch (er) {}
      }
    });
  }

  /* the six rooms by number: 1-6. Safe -- the 1/2/3 grade keys are scoped to `current === 'drill'`
     in shell.js, and on the home no pane is current. */
  function openRoomByIndex(n) {
    if (!el) return false;
    var rooms = el.querySelectorAll('.hm-room');
    if (n < 1 || n > rooms.length) return false;
    rooms[n - 1].click();
    return true;
  }

  window.HomeView = {
    render: render,
    openRoomByIndex: openRoomByIndex,
    isOpen: function () { return document.documentElement.dataset.view === 'home'; },
  };
})();
