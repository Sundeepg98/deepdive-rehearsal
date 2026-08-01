/* ===== HomeView =====  the #home route: the screen the app opens on.
 *
 * WHY IT EXISTS. The app used to open a first-time user on a MODAL and a returning user on a topic
 * they never chose. The returning user's own resume pointer (nav.last) was read by nothing at boot
 * -- and was then OVERWRITTEN, ~500ms in, with the topic they had just been dumped on. Meanwhile
 * the app already computed, correctly, on every single boot, the only thing a person opening a
 * rehearsal trainer actually wants to know -- what should I do today? -- and showed it to nobody.
 *
 * WHAT appeal/home-instrument CHANGED, and it is two things.
 *
 * 1. THE HOME JOINED THE APPLICATION. It used to be shown by HIDING `.app` -- one declaration in
 *    styles.css, and that declaration was the whole of the operator's "it does not read as an
 *    application" verdict, because the TOPIC routes already ship a three-column shell, measured
 *    fixed phone chrome and a docked verdict bar. Now the frame stays up and the route swaps
 *    tenants inside it, so this module renders FIVE mounts: the rail (#homerail), the work column
 *    (#home), the library in the companion (#homelib), the phone's tab bar (#hometabs) and the
 *    status census (#homestatus).
 *
 * 2. THE HERO IS THE QUESTION. It used to hero a topic NAME, which is what a table of contents
 *    does. A rehearsal trainer should drop you back into the interrogation, so the hero is the
 *    probe you were being asked -- in curly quotes, at display size, on the DISPLAY measure -- and
 *    the line under it is second person carrying a REASON and a RECENCY, not a cursor.
 *
 * WHAT IT ANSWERS, IN ORDER. Not "where was I mid-drill" but "what should I do today?":
 *     1. the question you stopped on   + why you stopped, and how long ago
 *     2. ONE primary action            resume -- autofocused, so Enter is a zero-click daily loop
 *     3. ALTITUDE                      am I ready AT A LEVEL -- what no single percentage can say
 *     4. still shaky                   what am I bad at, with age and the concepts
 *     5. rooms, telemetry, library
 *
 * IT WRITES NO PROGRESS. It reads Progress / TopicRegistry / TOPIC_GROUPS / LastVisit / Bookmarks
 * / Altitude and renders. The only things it persists are the user's own landing preference and
 * the weekly goal they nudge by hand.
 *
 * It renders through Panels -- the same renderers and the SAME delegated handler as the topic
 * switcher -- so there is exactly one place that knows what a topic card is and what clicking one
 * means. Offline-safe. */
(function () {
  'use strict';

  var el = null, rail = null, lib = null, tabs = null, status = null, bound = false;

  function landingPref() {
    try { return (typeof Store !== 'undefined' && Store.get('home.landing', '') === 'resume'); } catch (e) { return false; }
  }

  /* the view the resume pointer names, so Resume lands in the drill they were in, not on walk.
     ONE implementation, in the module that owns the pointer (last-visit.js). */
  function lastView() {
    return (typeof LastVisit !== 'undefined' && LastVisit.resumeView) ? LastVisit.resumeView() : 'walk';
  }
  function lastViewTitle() {
    var v = lastView();
    return (window.Router && Router.ROUTES[v]) ? Router.ROUTES[v].title : '';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
  /* Strip the authored markup out of a probe question. The hero sets it in the display face at
     display size inside quotation marks; a stray <code> or <b> in the middle of a quoted sentence
     reads as an artefact of the system rather than as something a person said. */
  function plain(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html == null ? '' : html);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /* AGE, and the honest limit on it. progress.<id>.ts is a per-TOPIC last-write stamp -- it is
     what Panels.dueReview() already ages against -- and there is NO per-card timestamp anywhere
     in the store. So this can truthfully say "you last worked this topic three days ago"; it
     cannot say "you marked THIS PROBE shaky three days ago", and no copy here claims that.
     Per-probe recency is a storage change with a migration, and it is a later wave. */
  function ageOf(id) {
    try {
      var pr = Progress.get(id);
      if (!pr || !pr.ts) return null;
      var days = Math.floor((Date.now() - pr.ts) / 86400000);
      if (days <= 0) return 'today';
      if (days === 1) return 'yesterday';
      if (days < 14) return days + 'd';
      return Math.floor(days / 7) + 'w';
    } catch (e) { return null; }
  }
  /* the chip form: bounded, tabular, never wider than the count beside it */
  function ageShort(id) {
    var a = ageOf(id);
    if (!a) return '';
    if (a === 'today') return '0d';
    if (a === 'yesterday') return '1d';
    return a;
  }

  /* the resume CURSOR, through the SAME clamp the pane restores with, so nothing rendered here
     can promise a probe that Resume will not actually land on */
  function cursor(id, view) {
    try {
      if (typeof posRestore !== 'function' || typeof posGet !== 'function' || !posGet(id)) return null;
      var t = TopicRegistry.get(id);
      if (view === 'drill' && t && t.data && t.data.bank && t.data.bank.cards && t.data.bank.cards.length) {
        var nb = t.data.bank.cards.length;
        return { kind: 'drill', i: posRestore('drill', nb, id), n: nb };
      }
      if (view === 'walk' && t && t.data && t.data.walk && t.data.walk.steps && t.data.walk.steps.length) {
        var ns = t.data.walk.steps.length;
        return { kind: 'walk', i: posRestore('walk', ns, id), n: ns };
      }
      return null;
    } catch (e) { return null; }
  }

  /* THE HERO IS ALWAYS A QUESTION SOMEONE ACTUALLY ASKED, on every resume path.
     The first cut read the probe only when the resume cursor was a DRILL cursor and otherwise
     fell back to the topic's thesis. That fallback was not an edge -- LastVisit.resumeView()
     defaults to 'walk', which is the app's own default pane -- so the majority path put a
     declarative topic summary in curly quotes under "Where you stopped" and presented it as
     something an interviewer said. Nobody said it: 0 of 46 theses is a question, their median is
     435 characters, and at the worst case the panel grew to 103% of a 1280x800 viewport and
     pushed the signature off-screen entirely.
     The topic's own bank is the honest source, and every topic has one (test/topic_contract.cjs
     requires >= 18 cards). So: the probe the drill cursor sits on if there is one -- whichever
     pane the resume pointer names -- else the first probe not yet graded, else the first. Only a
     topic with no bank at all falls through, and that path drops the quotes and the framing
     rather than quoting prose nobody spoke. */
  function heroQuestion(t, cur) {
    var cards = (t && t.data && t.data.bank && t.data.bank.cards) || [];
    if (!cards.length) return null;
    var i = -1;
    if (cur && cur.kind === 'drill') i = cur.i;
    if (i < 0) {
      /* a stored drill position counts even when the resume pointer names another pane */
      try {
        if (typeof posGet === 'function' && typeof posRestore === 'function' && posGet(t.id)) {
          i = posRestore('drill', cards.length, t.id);
        }
      } catch (e) { i = -1; }
    }
    if (i < 0) i = firstUngraded(t, cards);
    var card = cards[i] || cards[0];
    return (card && card.q) ? plain(card.q) : null;
  }

  /* the first probe with no grade on the record -- the one the drill would put in front of you */
  function firstUngraded(t, cards) {
    try {
      if (typeof CardId === 'undefined') return 0;
      var pr = (Progress.get ? Progress.get(t.id) : null) || {};
      var map = pr.cards || {};
      var keys = CardId.forCards(cards);
      for (var i = 0; i < cards.length; i++) if (!CardId.level(map, keys[i])) return i;
    } catch (e) {}
    return 0;
  }

  /* THE HERO WEARS ITS DESTINATION'S ROOM. --rm, not --acc: on this route there is no current
     topic (index.html hard-codes a group for first paint and applyIdentity deliberately does not
     run at boot), so the inherited accent is a boot constant. --rm is the app's own per-element
     room binding, so the hero is painted by the topic it will actually open. */
  function roomStyle(topic) {
    var g = (topic && topic.identity && topic.identity.group) || '';
    return ' style="--rm:' + (g ? 'var(--room-' + g + ')' : 'var(--acc)') + '"';
  }

  /* ---- THE RAIL: where to go ---------------------------------------------------------------
     The sidebar's home tenant. On the phone this same element is the fixed top bar and keeps only
     its identity row -- the destinations move to the tab bar rather than stacking fourteen rows
     above the fold. */
  function railHtml() {
    var groups = (typeof groupedTopicIds === 'function') ? groupedTopicIds() : [];
    var rooms = groups.map(function (b) {
      return '<button class="hm-rrow" type="button" data-room="' + b.group.id + '"' +
        ' style="--rm:var(--room-' + b.group.id + ')">' +
        '<span class="hm-rdot"></span><span class="hm-rt">' + b.group.label + '</span>' +
        '<span class="hm-rn">' + b.ids.length + '</span></button>';
    }).join('');
    var g = (Panels.weeklyGoal) ? Panels.weeklyGoal() : null;
    var weak = (Panels.weakCount) ? Panels.weakCount() : 0;

    /* THE SKIP LINK is first in the rail because the rail is first in the DOM: ~20 controls
       precede the work column, which is the whole use case. Visible on focus, never otherwise.
       role="banner" is DECLARED, not inherited: <header> only maps to banner when it is not a
       descendant of another landmark, and this row lives inside aside.sidebar -- so the implicit
       mapping would be dropped and the home would have no banner at all. */
    return '<a class="hm-skiplink" href="#home">Skip to your rehearsal record</a>' +
      '<div class="hm-top" role="banner">' +
      '<span class="hm-brand"><span class="hm-mk" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="hm-wm">Deep rehearsal</span></span>' +
      '<span class="hm-acts">' +
      '<button class="hm-act" type="button" data-act="search" aria-keyshortcuts="/ Control+K Meta+K">Search <kbd aria-hidden="true">/</kbd></button>' +
      '<button class="hm-act" type="button" data-act="keys" aria-keyshortcuts="?">Shortcuts <kbd aria-hidden="true">?</kbd></button>' +
      '<button class="hm-act" type="button" data-act="theme">Theme</button>' +
      '</span></div>' +
      (rooms ? '<nav class="hm-rsec" aria-label="Rooms"><span class="hm-lbl">Rooms</span>' + rooms + '</nav>' : '') +
      '<nav class="hm-rsec" aria-label="Practice"><span class="hm-lbl">Practice</span>' +
      '<button class="hm-rrow" type="button" data-cross="1"><span class="hm-rdot"></span>' +
      '<span class="hm-rt">Cross-topic drill</span><span class="hm-rn"></span></button>' +
      (weak ? '<button class="hm-rrow" type="button" data-cross="weak"><span class="hm-rdot"></span>' +
        '<span class="hm-rt">Weak-spot review</span><span class="hm-rn">' + weak + '</span></button>' : '') +
      '<button class="hm-rrow" type="button" data-act="index" aria-keyshortcuts="\\"><span class="hm-rdot"></span>' +
      '<span class="hm-rt">Topic index</span><span class="hm-rn"><kbd>\\</kbd></span></button>' +
      '</nav>' +
      (g ? '<div class="hm-goal"><span class="hm-lbl">This week</span>' +
        '<div class="hm-goalbar" role="img" aria-label="' + g.done + ' of ' + g.target +
        ' topics drilled this week"><i style="width:' + g.pct + '%"></i></div>' +
        '<span class="hm-rn"><b>' + g.done + '</b> of ' + g.target + ' topics</span></div>' : '');
  }

  /* ---- the phone's tab bar. Navigation WITHIN the home -- never a second router. ------------ */
  function tabsHtml() {
    return [['top', 'Today'], ['alt', 'Altitude'], ['lib', 'Library'], ['idx', 'Index']]
      .map(function (x, i) {
        return '<button class="hm-tab" type="button" data-tab="' + x[0] + '"' +
          (i === 0 ? ' aria-current="true"' : '') +
          '><span class="hm-tab-t">' + x[1] + '</span></button>';
      }).join('');
  }

  /* ---- the status census -------------------------------------------------------------------
     The one-line state that used to be .hm-state, moved into furniture so it is present without
     spending a slot in the decision stack. Home route only in this wave. */
  function statusHtml(model) {
    if (!model) return '';
    var t = model.totals, graded = t.solid + t.shaky + t.missed;
    return '<span class="hm-st-i"><span class="hm-lbl">Record</span></span>' +
      '<span class="hm-st-i"><b>' + graded + '</b> of ' + t.n + ' probes graded</span>' +
      '<span class="hm-st-sep"></span>' +
      '<span class="hm-st-i"><b>' + t.solid + '</b> solid &middot; <b>' + t.shaky +
      '</b> shaky &middot; <b>' + t.missed + '</b> missed</span>' +
      '<span class="hm-st-sep"></span>' +
      '<span class="hm-st-i"><b>' + t.started + '</b> of ' + model.nTopics + ' topics started</span>' +
      '<span class="hm-st-sp"></span>' +
      '<span class="hm-st-i hm-st-dim">Offline &middot; nothing leaves this file</span>';
  }

  /* ---- CONTINUE: the question, then why you stopped, then the one action ------------------- */
  function continueHtml() {
    /* COLD. There is no probe to hero yet, so the cold branch keeps the value-prop lead and the
       de-jargoned Start CTA exactly as test/cold_open.cjs contracts for them. */
    if (!Panels.engaged()) {
      var ids = TopicRegistry.ids();
      var first = TopicRegistry.get(ids[0]);
      return '<section class="hm-continue hm-panel" aria-labelledby="hm-ask-h">' +
        '<div class="hm-ask"><h1 class="hm-lbl" id="hm-ask-h">Start here</h1>' +
        '<p class="hm-q">&ldquo;Walk me through how you would design this.&rdquo;</p>' +
        '<p class="hm-since">That is the sentence the round opens on. You answer out loud, they ' +
        'push back, and you grade yourself on what you actually said.</p></div>' +
        '<div class="hm-do">' +
        '<button class="hm-cta" type="button" data-topic="' + ids[0] + '" data-autofocus="1"' + roomStyle(first) + '>' +
        '<span><span class="hm-cta-k">Start</span>' +
        '<span class="hm-cta-t">' + (first ? first.identity.title : ids[0]) + '</span>' +
        '<span class="hm-cta-d">Drill the interviewer\'s follow-ups, rebuild the design from memory, then run a timed mock.</span></span>' +
        '<span class="hm-cta-ar" aria-hidden="true">&rarr;</span></button></div></section>';
    }

    var r = Panels.resumeTarget();
    if (!r) return '';
    var t = r.topic, cur = cursor(r.id, lastView());
    var pr = (Progress.get ? Progress.get(r.id) : null) || {};

    /* THE HERO: the probe you were being asked, not the topic's name. */
    var q = heroQuestion(t, cur);

    /* THE LINE: second person, carrying REASON, RECENCY and REMAINDER. Every field is already in
       the record -- this is a copy change, not a feature. Recency is topic-scoped and the wording
       says exactly that (see ageOf).
       `tot` falls back to the BANK length. Reading it as `pr.tot || 0` made the remainder 0 on a
       topic with no record at all, so the two halves of this sentence contradicted each other in
       adjacent clauses: "you have not graded a probe in it yet" followed by "Every probe here is
       graded." The bank knows the denominator whether or not the record does. */
    var bank = (t.data && t.data.bank && t.data.bank.cards) || [];
    var flagged = pr.shk || 0;
    var tot = pr.tot || bank.length;
    var left = Math.max(0, tot - (pr.done || 0));
    var age = ageOf(r.id);
    var when = !age ? '' : (age === 'today' ? ' earlier today'
      : (age === 'yesterday' ? ' yesterday' : ' ' + age + ' ago'));
    /* ONE TRUTH ABOUT POSITION, and it lives here. The cursor used to be restated under the CTA
       as "probe 11 of 21" while this line said "9 probes left here" -- both honest, against
       different fields, and irreconcilable by a reader. The position and the remainder now sit in
       one sentence with the second denominator NAMED ("still ungraded"), so they read as two
       facts about one topic instead of two claims about the same number. The unit follows the
       pane: walkthrough STEPS are steps, because "probe" is what the census and the gauge are
       denominated in and spending it on a different countable is how an instrument loses its
       units. */
    var where = '';
    if (cur) {
      where = ' at ' + (cur.kind === 'drill' ? 'probe' : 'step') +
        ' <b>' + (cur.i + 1) + '</b> of ' + cur.n;
    }
    var why;
    if (flagged > 0) {
      why = 'You marked <b>' + flagged + '</b> probe' + (flagged === 1 ? '' : 's') +
        ' shaky in this topic' + when + ', and stopped' + where + '.';
    } else if (pr.done > 0) {
      why = 'You worked this topic' + when + ', and stopped' + where + '.';
    } else {
      why = 'You opened this topic' + when + ' and have not graded a probe in it yet.';
    }
    /* the remainder does not repeat the denominator the position just stated */
    var rest = left > 0
      ? (where ? ' <b>' + left + '</b> still ungraded.'
               : ' <b>' + left + '</b> of its ' + tot + ' probes still ungraded.')
      : ' Every probe here is graded.';

    /* THE CTA SUB-LINE NAMES THE DESTINATION AND NOTHING ELSE.
       It used to append "probe 11 of 21", which argued with the sentence 20px above it ("9 probes
       left here") -- both true, against different fields, and irreconcilable by a reader. The
       remainder is the lead's job; this line's job is where Enter lands. It also hardcoded the
       word "probe" for every pane, so the walk path read "Walkthrough, probe 5 of 9" -- spending
       the census and the gauge's own denominator on a different countable. Walk steps are steps. */
    var vt = lastViewTitle();
    return '<section class="hm-continue hm-panel" aria-labelledby="hm-ask-h">' +
      '<div class="hm-ask">' +
      '<h1 class="hm-lbl" id="hm-ask-h">Where you stopped &middot; ' + esc(t.identity.title) + '</h1>' +
      (q ? '<p class="hm-q">&ldquo;' + esc(q) + '&rdquo;</p>' : '') +
      '<p class="hm-since">' + why + rest + '</p></div>' +
      '<div class="hm-do">' +
      '<button class="hm-cta" type="button" ' +
      (r.hash ? 'data-hash="' + r.hash + '"' : 'data-topic="' + r.id + '"') +
      ' data-autofocus="1"' + roomStyle(t) + '>' +
      '<span><span class="hm-cta-k">Resume</span>' +
      '<span class="hm-cta-t">' + esc(t.identity.title) + '</span>' +
      '<span class="hm-cta-d">' + (vt ? esc(vt) : 'pick up where you left off') + '</span></span>' +
      '<span class="hm-cta-ar" aria-hidden="true">&rarr;</span></button></div>' +
      '</section>';
  }

  /* ---- THE ALTITUDE GAUGE -- the signature -------------------------------------------------
     Three rails, one per interview tier, high band on top. A segment is one topic at one tier and
     its FILL is that topic's Solid share there. Fill and outline carry the grade; hue never does,
     because hue already means WHICH ROOM. Untouched topics keep an empty outline so the honest
     denominator is never hidden. */
  function gaugeHtml(model) {
    if (!model || !model.tiers) return '';
    var rails = model.order.map(function (tier) {
      var a = model.tiers[tier];
      if (!a.n) return '';
      var segs = Altitude.rail(model, tier).map(function (s) {
        var cls = 'hm-seg' + (s.done ? ' open' : '') +
          (s.missed ? ' keel keel-m' : (s.shaky ? ' keel' : ''));
        var lab = s.title + ' -- ' + (s.done
          ? s.solid + ' solid of ' + s.n + ' ' + tier + ' probes'
          : 'not started at ' + tier);
        return '<span class="' + cls + '" style="--lv:' + Altitude.level(s.share) +
          '" title="' + esc(lab) + '"></span>';
      }).join('');
      var pct = Math.round(a.solid / a.n * 100);
      return '<div class="hm-gr' + (tier === model.thin ? ' thin' : '') + '">' +
        '<span class="hm-gr-l">' + tier + '</span>' +
        '<span class="hm-gr-t" role="img" aria-label="' + tier + ': ' + a.solid +
        ' probes solid out of ' + a.n + ', across ' + a.topics + ' of ' + model.nTopics +
        ' topics">' + segs + '</span>' +
        '<span class="hm-gr-n"><b>' + a.solid + '</b> / ' + a.n + ' &middot; ' + pct + '%</span></div>';
    }).join('');

    /* THE VERDICT ONLY ACCUSES ON EVIDENCE, and "evidence" means one rail is STRICTLY thinnest.
       Altitude.compute() returns thin=null on any tie, which covers the three cases where the
       accusation would be unearned: nothing graded (all rails 0%), a record where the rails are
       genuinely level, and a perfect record (all rails 100%) where the sentence would name a tier
       the user has fully banked. The accusation IS the signature; unearned it is noise. */
    var graded = model.totals.solid + model.totals.shaky + model.totals.missed;
    var verdict;
    if (graded === 0) {
      verdict = 'Nothing graded yet. Each rail is one interview tier and each mark is one probe ' +
        '&mdash; they fill as you grade yourself, and the shortest rail is the level you are ' +
        'least ready for.';
    } else if (!model.thin) {
      var lvl = Math.round(model.tiers[model.order[0]].solid / model.tiers[model.order[0]].n * 100);
      verdict = lvl >= 100
        ? '<b>Every rail is full.</b> Solid on all ' + model.totals.n + ' probes across all three ' +
          'tiers &mdash; there is no thin rail left to name.'
        : '<b>The rails are level.</b> All three tiers sit at ' + lvl + '% solid, so no one level ' +
          'is behind the others yet &mdash; keep drilling and the shape will separate.';
    } else {
      var ta = model.tiers[model.thin];
      verdict = '<b>' + model.thin + ' is the thin rail.</b> ' + ta.solid + ' solid of ' + ta.n +
        ' probes, across ' + ta.topics + ' of ' + model.nTopics + ' topics &mdash; the level you ' +
        'are interviewing for is the one you have rehearsed least.';
    }

    return '<section class="hm-alt hm-panel" aria-labelledby="hm-alt-h">' +
      '<div class="hm-phead"><h2 class="hm-lbl" id="hm-alt-h">Altitude &mdash; solid probes by interview tier</h2>' +
      '<span class="hm-sp"></span>' +
      '<span class="hm-lbl hm-fig"><b>' + model.totals.solid + '</b> solid of ' + model.totals.n + '</span></div>' +
      '<div class="hm-pbody"><div class="hm-gauge">' + rails + '</div>' +
      '<p class="hm-verdict">' + verdict + '</p>' +
      '<div class="hm-key" aria-hidden="true">' +
      '<span class="hm-k full"><i></i><span class="hm-lbl">All solid</span></span>' +
      '<span class="hm-k part"><i></i><span class="hm-lbl">Part solid</span></span>' +
      '<span class="hm-k flag"><i></i><span class="hm-lbl">Flagged</span></span>' +
      '<span class="hm-k none"><i></i><span class="hm-lbl">Untouched</span></span>' +
      '</div></div></section>';
  }

  /* ---- STILL SHAKY + the trend ------------------------------------------------------------- */
  function duoHtml() {
    if (!Panels.engaged()) return '';
    var w = Panels.weakChipsAged(6, ageShort);
    var tele = Panels.telemetryHtml();
    if (!w.chips && !tele) return '';
    return '<div class="hm-duo">' +
      (w.chips ? '<section class="hm-panel" aria-labelledby="hm-shaky-h">' +
        '<div class="hm-phead"><h2 class="hm-lbl" id="hm-shaky-h">Still shaky</h2>' +
        '<span class="hm-sp"></span>' +
        '<span class="hm-lbl hm-fig"><b>' + w.n + '</b> flagged</span></div>' +
        '<div class="hm-pbody"><div class="hm-chips">' + w.chips + '</div>' + w.concepts +
        '<p class="hm-note">The age is how long since you last worked that topic. These are the ' +
        'probes you graded Missed or Shaky &mdash; re-drill them until the signal comes ' +
        'automatically.</p></div></section>' : '') +
      /* .hm-tele keeps its class and therefore its stack slot: the telemetry is still a member
         of the home column, it just shares a row with Still shaky now instead of owning one. */
      (tele ? '<section class="hm-panel hm-tele" aria-labelledby="hm-week-h">' +
        '<div class="hm-phead"><h2 class="hm-lbl" id="hm-week-h">Recent sessions</h2></div>' +
        '<div class="hm-pbody">' + tele + '</div></section>' : '') +
      '</div>';
  }

  function skipHtml() {
    /* the "lobby, taxed on every launch" objection, turned into a choice the user owns. Default
       off. Honoured in router.js bootLanding(), which VALIDATES the stored topic. */
    return '<div class="hm-skip">' +
      '<input type="checkbox" id="hm-skip-cb"' + (landingPref() ? ' checked' : '') + '>' +
      '<label for="hm-skip-cb">Skip the home &mdash; resume straight into my last topic</label></div>';
  }

  /* COLD-OPEN VALUE PROP (audit #13). Shown to COLD users only: a returning, engaged user already
     knows what the app is, and the home's discipline is one decision, not a pitch. */
  function leadHtml() {
    if (Panels.engaged()) return '';
    var n = (typeof TopicRegistry !== 'undefined' && TopicRegistry.ids) ? TopicRegistry.ids().length : 0;
    return '<div class="hm-lead">A <b>system-design interview</b> trainer &mdash; ' + n +
      ' topics, each taken apart the way an interviewer actually scores it.</div>';
  }

  function html(model) {
    return '<div class="ix-panel">' +
      leadHtml() +
      continueHtml() +
      gaugeHtml(model) +
      duoHtml() +
      Panels.roomsHtml() +
      /* THE BOARD'S TWO CROSS-DRILL ACTS, restored below 920px. The rail is the only home-surface
         producer of data-cross="1" / data-cross="weak", and on the phone the rail collapses to a
         52px identity bar with its .hm-rsec hidden -- so both went dark, which is a regression
         against master, where Panels.actionsHtml() rendered in the column at every width. Three
         of the four six-week regimes are cross-topic; they do not belong behind an overlay. */
      '<section class="hm-sec hm-practicem">' + Panels.actionsHtml() + '</section>' +
      /* THE LIBRARY'S PHONE TWIN IS COLLAPSED, not expanded. Fully open it was 62-70% of the
         home's scroll height -- the exact figure the library rule was written to kill -- so the
         shelf was back inside the decision's vertical budget on every width below 1280. <details>
         is the app's own answer to this (.mcomp mirrors the companion's coaching the same way);
         the first cut cited that pattern and then dropped its load-bearing half. */
      '<details class="hm-sec hm-libm"><summary class="hm-libm-s">' +
      '<span class="hm-h">All topics</span><span class="hm-libm-n">' + TopicRegistry.ids().length +
      ' across six rooms</span><span class="hm-libm-c" aria-hidden="true">&#9662;</span></summary>' +
      Panels.libraryHtml() + '</details>' +
      skipHtml() +
      Panels.footerHtml(false) +
      '</div>';
  }

  function render() {
    el = document.getElementById('home');
    rail = document.getElementById('homerail');
    lib = document.getElementById('homelib');
    tabs = document.getElementById('hometabs');
    status = document.getElementById('homestatus');
    if (!el || typeof Progress === 'undefined' || typeof TopicRegistry === 'undefined') return;
    if (!TopicRegistry.ids().length) return;

    var model = (typeof Altitude !== 'undefined') ? Altitude.compute() : null;

    el.innerHTML = html(model);
    if (rail) rail.innerHTML = railHtml();
    if (tabs) tabs.innerHTML = tabsHtml();
    if (lib) {
      lib.innerHTML = '<h2 class="hm-lbl hm-lib-t">Library &mdash; ' + TopicRegistry.ids().length +
        ' topics, six rooms</h2>' + Panels.libraryHtml();
    }
    if (status) status.innerHTML = statusHtml(model);

    /* The sidebar is one element with two tenants, so its ACCESSIBLE NAME has to follow the
       tenant. Left alone it announced "Topic controls" on a route that holds the rooms, the
       practice acts and the weekly goal, and no topic chrome at all. */
    var side = document.querySelector('.sidebar');
    if (side) side.setAttribute('aria-label', 'Home controls');

    if (!bound) { bind(); bound = true; }

    /* AUTOFOCUS THE ONE PRIMARY ACTION. This is what makes Enter the entire daily loop, and what
       makes the home operable from the keyboard the instant it paints. */
    var cta = el.querySelector('[data-autofocus]');
    if (cta) setTimeout(function () { try { cta.focus({ preventScroll: true }); } catch (e) {} }, 0);
  }

  function bind() {
    /* Panels.bind is delegated. Binding all three mounts that carry topic/room controls gives the
       rail and the library the SAME handler the work column has, so there is still exactly one
       definition of what clicking a topic card means. */
    [el, rail, lib].forEach(function (host) {
      if (!host) return;
      Panels.bind(host, {
        rerender: render,
        onPick: function (kind) {
          if (typeof LastVisit !== 'undefined' && LastVisit.navigateAfterPick) LastVisit.navigateAfterPick(kind);
        },
        onRoom: scrollToRoom,
      });
    });

    document.addEventListener('click', function (e) {
      if (!HomeView.isOpen()) return;
      var a = e.target.closest ? e.target.closest('[data-act]') : null;
      if (a) {
        var act = a.getAttribute('data-act');
        if (act === 'search' && window.SearchOverlay) SearchOverlay.open();
        else if (act === 'index' && window.IndexOverlay) IndexOverlay.open();
        else if (act === 'keys' && typeof openKeys === 'function') openKeys();
        else if (act === 'theme') { var th = document.getElementById('themetog'); if (th) th.click(); }
        return;
      }
      var tb = e.target.closest ? e.target.closest('[data-tab]') : null;
      if (tb) onTab(tb);
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'hm-skip-cb') {
        try { if (typeof Store !== 'undefined') Store.set('home.landing', e.target.checked ? 'resume' : 'home'); } catch (er) {}
      }
    });
  }

  /* The phone's tab bar moves the ONE document scroll to a block. It is navigation within the
     home, not a second router, so it never touches location. */
  function onTab(btn) {
    var key = btn.getAttribute('data-tab');
    if (key === 'idx') { if (window.IndexOverlay) IndexOverlay.open(); return; }
    if (tabs) {
      var all = tabs.querySelectorAll('.hm-tab');
      for (var i = 0; i < all.length; i++) all[i].removeAttribute('aria-current');
    }
    btn.setAttribute('aria-current', 'true');
    var sel = { top: '.hm-continue', alt: '.hm-alt', lib: '.hm-libm' }[key];
    var node = sel && el ? el.querySelector(sel) : null;
    if (!node) return;
    var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* A room is a place in the library, not a new view -- scroll to it and land focus on its first
     card, so the keyboard user is exactly where the mouse user is looking. */
  function scrollToRoom(gid) {
    var host = (lib && lib.querySelector('.ix-group[data-group="' + gid + '"]')) ||
      (el && el.querySelector('.ix-group[data-group="' + gid + '"]'));
    if (!host) return;
    var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    host.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var first = host.querySelector('.ix-card');
    if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, reduce ? 0 : 260);
  }

  /* the six rooms by number: 1-6. Safe -- the 1/2/3 grade keys are scoped to `current === 'drill'`
     in shell.js, and on the home no pane is current. */
  function openRoomByIndex(n) {
    if (!rail) return false;
    var rooms = rail.querySelectorAll('[data-room]');
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
