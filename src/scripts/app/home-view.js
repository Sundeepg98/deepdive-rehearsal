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

  var el = null, rail = null, lib = null, tabs = null, status = null, bound = false, tabObs = null;

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
  /* A POSITION IS ASSERTED ONLY WHEN THE RECORD STORES ONE, for that pane.
     `posRestore` returns 0 for an ABSENT field -- that is correct for a pane restoring itself
     (start at the top) and wrong for a sentence claiming where you stopped. Gating on
     `posGet(id)` being truthy meant ANY stored position, including a walkthrough scroll offset,
     satisfied the test: a record holding only `{drill:10}` printed "you stopped at step 1 of 9"
     about a walkthrough it had no evidence the user ever opened. The field itself is now the
     gate, so an absent field yields no claim rather than a fabricated one. */
  function cursor(id, view) {
    try {
      if (typeof posRestore !== 'function' || typeof posGet !== 'function') return null;
      var p = posGet(id);
      if (!p || typeof p[view] !== 'number') return null;
      var t = TopicRegistry.get(id);
      if (view === 'drill' && t && t.data && t.data.bank && t.data.bank.cards && t.data.bank.cards.length) {
        var nb = t.data.bank.cards.length;
        return { kind: 'drill', i: posRestore('drill', nb, id), n: nb, unit: 'probe' };
      }
      if (view === 'walk' && t && t.data && t.data.walk && t.data.walk.steps && t.data.walk.steps.length) {
        var ns = t.data.walk.steps.length;
        return { kind: 'walk', i: posRestore('walk', ns, id), n: ns, unit: 'step' };
      }
      return null;
    } catch (e) { return null; }
  }

  /* THE HERO IS A QUESTION SOMEONE ACTUALLY ASKED, AND IT MATCHES THE PANE ENTER OPENS.
     Round 1's hero fell back to the topic THESIS -- a declarative summary nobody spoke, 0 of 46
     ending in a question mark. Round 2 fixed the source and broke the claim: it read the DRILL
     cursor on every path, so a walk resume quoted probe 11 of 21 under the heading "Where you
     stopped" while the sentence below it named step 5 of 9 and the button opened the walkthrough.
     Two positions, in two different collections, in one block.
     Both halves matter, so both are answered:
       - the SOURCE is always the topic's own bank (every topic has one; topic_contract requires
         >= 18 cards), so the hero is always a real interview sentence;
       - the CLAIM follows the record. Only a stored DRILL cursor earns "Where you stopped" and
         the probe it sits on. Any other resume pane heroes the probe the drill would serve NEXT
         -- the first ungraded one -- under a heading that says so.
     That also makes firstUngraded() reachable, which it was not: posRestore returns 0 for an
     absent field and never a negative, so the middle rung of the old chain could never run. */
  function heroFor(t, cur) {
    var cards = (t && t.data && t.data.bank && t.data.bank.cards) || [];
    if (!cards.length) return null;
    if (cur && cur.kind === 'drill') {
      var at = cards[cur.i] || cards[0];
      if (at && at.q) return { q: plain(at.q), mode: 'stopped' };
    }
    var nx = cards[firstUngraded(t, cards)] || cards[0];
    return (nx && nx.q) ? { q: plain(nx.q), mode: 'next' } : null;
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

    /* THE HERO: the probe you were being asked, or the one you are about to be. */
    var hero = heroFor(t, cur);

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
    if (cur) where = ' at ' + cur.unit + ' <b>' + (cur.i + 1) + '</b> of ' + cur.n;
    var why;
    if (flagged > 0) {
      why = 'You marked <b>' + flagged + '</b> probe' + (flagged === 1 ? '' : 's') +
        ' shaky in this topic' + when + ', and stopped' + where + '.';
    } else if (pr.done > 0) {
      why = 'You worked this topic' + when + ', and stopped' + where + '.';
    } else {
      why = 'You opened this topic' + when + ' and have not graded a probe in it yet.';
    }
    /* THE REMAINDER KEEPS ITS DENOMINATOR UNLESS THE POSITION JUST STATED THE SAME ONE.
       Dropping "of its 21 probes" is only safe when the position was denominated in probes too.
       On a walk resume the number just stated counts STEPS, so a bare "9 still ungraded" sits
       four words from a 9 that counts something else, and the reader's parse -- "9 of the 9 steps
       are ungraded" -- is both false and un-gradeable. Walk steps run 9-10 and banks run 21-24,
       so that collision lands on 41 of 46 topics at a mid-progress record. */
    var sameUnit = !!cur && cur.unit === 'probe';
    var rest = left > 0
      ? (sameUnit ? ' <b>' + left + '</b> still ungraded.'
                  : ' <b>' + left + '</b> of its ' + tot + ' probes still ungraded.')
      : ' Every probe here is graded.';

    /* THE CTA SUB-LINE NAMES THE DESTINATION AND NOTHING ELSE.
       It used to append "probe 11 of 21", which argued with the sentence 20px above it ("9 probes
       left here") -- both true, against different fields, and irreconcilable by a reader. The
       remainder is the lead's job; this line's job is where Enter lands. It also hardcoded the
       word "probe" for every pane, so the walk path read "Walkthrough, probe 5 of 9" -- spending
       the census and the gauge's own denominator on a different countable. Walk steps are steps. */
    var vt = lastViewTitle();
    /* THE HEADING STRUCTURE HEROES WHAT THE PIXELS HERO.
       Round 2 minted the home's first h1 and pointed it at the eyebrow -- the 9px line carrying
       the TOPIC NAME. So the pixels stopped being a table of contents and the document's outline
       started being one: navigate by headings and the answer to "what is this page about" was a
       topic name, while the question the direction calls the hero appeared in no heading list at
       all. The QUESTION is the h1. The eyebrow is the label it looks like. If a topic somehow has
       no bank, the eyebrow carries the h1 instead, so the page always has exactly one. */
    var eyebrow = (hero && hero.mode === 'next' ? 'Up next &middot; ' : 'Where you stopped &middot; ')
      + esc(t.identity.title);
    return '<section class="hm-continue hm-panel" aria-labelledby="hm-ask-h">' +
      '<div class="hm-ask">' +
      (hero
        ? '<p class="hm-lbl hm-eyebrow">' + eyebrow + '</p>' +
          '<h1 class="hm-q" id="hm-ask-h">&ldquo;' + esc(hero.q) + '&rdquo;</h1>'
        : '<h1 class="hm-lbl hm-eyebrow" id="hm-ask-h">' + eyebrow + '</h1>') +
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
  /* ===== THE VERDICT: one record class, one sentence, nothing inferred ======================
     THE STANDING RULE, and this function is where the home is most tempted to break it: the home
     may not print a claim it cannot derive. Every sentence below states only what the rails
     directly beneath it visibly show, and every number in it is read from the same numerals the
     reader can see on the rails.

       class            condition                              what it may say
       ---------------- ------------------------------------- ------------------------------------
       cold             nothing graded anywhere                what the instrument IS; no verdict
       full             every probe in the bank is solid       "Every rail is full" -- the only
                                                               sentence that may claim all three,
                                                               and only on totals.solid === n
       level            all three rails at ONE rendered pct    "The rails are level" + that pct
       thin (one)       exactly one rail lowest                "<T> is the thin rail" + its own
                                                               solid/n and topics
       thin (several)   two rails share the lowest pct         names BOTH, with each rail's own
                                                               figures -- never one rail's number
                                                               asserted of the others

     The two earlier versions each collapsed two of these classes into one and then read a
     percentage from a tier that was not in the class. That is exactly the shape the class rule
     forbids, so the classes are enumerated rather than inferred, and the battery in
     test/home_claims.cjs drives every one of them. */
  function verdictFor(model) {
    var t = model.totals;

    if (model.graded === 0) {
      return 'Nothing graded yet. Each rail is one interview tier and each mark is one probe ' +
        '&mdash; they fill as you grade yourself, and the shortest rail is the level you are ' +
        'least ready for.';
    }
    if (model.full) {
      /* the ladder's own figure, not the bank's -- the bank carries an EXTEND tier that is not a
         rail, so "all N probes across all three tiers" must count the three tiers */
      return '<b>Every rail is full.</b> Solid on all ' + model.ladder.n + ' probes across all ' +
        'three tiers &mdash; there is no thin rail left to name.';
    }
    if (model.level) {
      return '<b>The rails are level.</b> All three tiers sit at ' + model.minPct + '% solid, so ' +
        'no one level is behind the others yet &mdash; keep drilling and the shape will separate.';
    }
    /* one or more tiers share the lowest rendered percentage, under a higher one */
    var set = model.thinSet.slice();
    var figs = set.map(function (tier) {
      var a = model.tiers[tier];
      return tier + ' ' + a.solid + ' of ' + a.n;
    });
    if (set.length === 1) {
      var a1 = model.tiers[set[0]];
      return '<b>' + set[0] + ' is the thin rail.</b> ' + a1.solid + ' solid of ' + a1.n +
        ' probes, across ' + a1.topics + ' of ' + model.nTopics + ' topics &mdash; the level you ' +
        'are interviewing for is the one you have rehearsed least.';
    }
    /* set.length is 2 here in every reachable record -- three equal rails are `level` and return
       above -- but the wording is written so it stays true if a fourth tier ever exists. */
    var joined = set.slice(0, -1).join(', ') + ' and ' + set[set.length - 1];
    return '<b>' + joined + ' are the thin rails.</b> ' +
      (set.length === 2 ? 'Both' : 'All ' + set.length) + ' sit at ' + model.minPct +
      '% solid &mdash; ' + figs.join(', ') + ' &mdash; under a rail that is further along. Those ' +
      'are the levels you have rehearsed least.';
  }

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

    var verdict = verdictFor(model);

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

    watchTabs();

    /* AUTOFOCUS STAYS; ITS RING WAITS FOR A REAL KEY. (Design call, round 3 item 11.)
       Z1's hard floor is "1 keystroke, 0 clicks, autofocused, landing on the exact cursor -- any
       direction that costs this loop is a regression regardless of what it buys", so removing the
       autofocus was not available: Enter would land on <body> and the daily loop would cost a
       click. But Chromium matches :focus-visible on a load-time PROGRAMMATIC focus, so with zero
       user interaction the resume button wore the highest-contrast edge on the screen (measured
       14.72:1 against the panel) -- and the coherence ruling says one signature, the gauge. The
       ring got louder because of a good fix: removing the phantom wrapper stopped clipping it.
       So: focus without the ring at first paint, and restore the ring the instant the user
       touches a key. A keyboard user's first Tab, arrow or Enter re-arms it before they could
       need it; a mouse user never sees it; the screen at rest has one loud object and it is the
       instrument. Nothing about focus ORDER or the keystroke changes -- only the paint. */
    var cta = el.querySelector('[data-autofocus]');
    if (cta) {
      setTimeout(function () {
        try {
          el.classList.add('hm-quiet-focus');
          cta.focus({ preventScroll: true });
        } catch (e) {}
      }, 0);
    }
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

    /* the first real keystroke re-arms the focus ring for the rest of the session */
    document.addEventListener('keydown', function () {
      if (el) el.classList.remove('hm-quiet-focus');
    }, { capture: true });

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
    markTab(key);
    var sel = { top: '.hm-continue', alt: '.hm-alt', lib: '.hm-libm' }[key];
    var node = sel && el ? el.querySelector(sel) : null;
    if (!node) return;
    /* the tab named LIBRARY has to DELIVER the library. Closing the drawer (which is what took
       the phone home from 8151px to 2756px) left this tab marking itself current and parking a
       collapsed summary mid-screen -- the destination named, not delivered. */
    if (node.tagName === 'DETAILS' && !node.open) node.open = true;
    var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* A room is a place in the library, not a new view -- scroll to it and land focus on its first
     card, so the keyboard user is exactly where the mouse user is looking. */
  /* RESOLVE IN THE VISIBLE MOUNT. The library is rendered into TWO places -- the companion
     (#homelib) and the in-column twin -- and exactly one is displayed at any width. This looked
     up the companion FIRST and fell back with `||`, but #homelib is rendered unconditionally, so
     the query always returned a node and the fallback could never fire. Below 1280 the companion
     is display:none, so every room control on the home called scrollIntoView() and focus() inside
     a hidden subtree: both no-ops. Six styled, focusable buttons -- and the 1-6 room hotkeys --
     did nothing at every width the receipts did not cover, which is a regression against master
     and the same false-affordance class this wave charged its own phone hamburger with.
     `offsetParent` is null for anything in a display:none subtree, so it is the cheap test for
     "actually rendered". The in-column twin is a CLOSED <details>, so it is opened first --
     otherwise the scroll lands on a collapsed summary and the focus still fails. */
  function scrollToRoom(gid) {
    var sel = '.ix-group[data-group="' + gid + '"]';
    var host = null;
    var mounts = [lib, el];
    for (var m = 0; m < mounts.length; m++) {
      var node = mounts[m] && mounts[m].querySelector(sel);
      if (!node) continue;
      var drawer = node.closest ? node.closest('details') : null;
      if (drawer && !drawer.open && drawer.offsetParent) drawer.open = true;
      if (node.offsetParent) { host = node; break; }
    }
    if (!host) return;
    var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    host.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var first = host.querySelector('.ix-card');
    if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, reduce ? 0 : 260);
  }

  /* THE TAB BAR TELLS THE TRUTH ABOUT WHERE YOU ARE.
     aria-current was set on TAP only, so scrolling with a thumb -- which is how phones are used --
     left the bar reading "Today" for the whole length of the page, including while the library
     filled the screen. It is also announced, so a screen-reader user was told they were on Today
     while reading something else. An IntersectionObserver marks whichever target owns the
     viewport; a tap still wins immediately because onTab sets it directly and the observer will
     agree the moment the scroll settles. */
  function watchTabs() {
    if (tabObs) { tabObs.disconnect(); tabObs = null; }
    if (!el || !tabs || typeof IntersectionObserver === 'undefined') return;
    var map = [['top', '.hm-continue'], ['alt', '.hm-alt'], ['lib', '.hm-libm']];
    var nodes = [];
    map.forEach(function (m) { var n = el.querySelector(m[1]); if (n) nodes.push({ key: m[0], node: n }); });
    if (!nodes.length) return;
    var seen = {};
    tabObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        for (var i = 0; i < nodes.length; i++) if (nodes[i].node === en.target) seen[nodes[i].key] = en.isIntersecting;
      });
      /* the FIRST target that is on screen, in column order -- so a block scrolled past hands
         the mark forward rather than several claiming it at once */
      var live = null;
      for (var j = 0; j < nodes.length; j++) if (seen[nodes[j].key]) { live = nodes[j].key; break; }
      if (!live) return;
      markTab(live);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    nodes.forEach(function (n) { tabObs.observe(n.node); });
  }

  function markTab(key) {
    if (!tabs) return;
    var all = tabs.querySelectorAll('.hm-tab');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-tab') === key) all[i].setAttribute('aria-current', 'true');
      else all[i].removeAttribute('aria-current');
    }
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
