/* ============ CRAM + SCOPE DERIVATION (per topic) ============
   THE BUG THIS FIXES: <deep-cram> and <deep-scope> baked topic 1's (Content
   Pipeline's) body into their shadow roots as a literal template string and never
   subscribed to `deeptopicchange`. applyIdentity() DID rename .cram-title per
   topic -- so all 46 topics served a byte-identical Content Pipeline body under 46
   different headers. On the night-before-the-interview artifact, that is worse
   than useless.

   WHY IT IS DERIVED, NOT LOOKED UP: there is no authored per-topic cram/scope body
   to look up. The sections a topic may declare (TOPIC_MARKDOWN_FORMAT.md) are
   Thesis/Sub/Spine/Walk/Drill/Whiteboard/System/Trade-offs/Model Answers/Numbers/
   Red Flags/Opener/Bank/Companion Notes -- there is no `## Cram` and no `## Scope`
   -- and topic-schema.mjs carries only `cramTitle`, a STRING (the header). The
   cram sheet is a SUMMARY artifact, so it is composed from the topic's own slices,
   which is what it always was conceptually.

   TWO INVARIANTS:
     1. No invented prose. Every topic-specific string below is lifted verbatim
        from that topic's own authored data. The only fixed text is the
        topic-agnostic interview coaching carried over from the original overlay
        (section titles, "the first signal", "the tell").
     2. Never another topic's content. A section whose source slice is missing is
        OMITTED, and a topic with no usable slices renders an explicit empty state.
        Empty beats WRONG.

   Sources, per cram section:
     one-liner   <- open.cards[0].items[0].a  ("one breath")   | fallback identity.thesis
     spine       <- wb.steps[].a              (what you draw)  | fallback identity.spine
     decisions   <- trade.decisions[].opts    (the switch condition)
     ceilings    <- num.compute(canonical inputs)              (the authored arithmetic)
     traps       <- rf.flags[].bad -> .fix
     tells       <- trade.decisions[].tell
     angles      <- bank.curveballs[].theme + .task
     30 seconds  <- open.cards[0].items[1].a  ("thirty seconds")

   Output reuses ONLY the existing .cs-* vocabulary (CS_SHEET, content-sheet.js),
   so it needs ZERO new CSS and cannot fall foul of the shadow boundary.
   Offline-safe: pure string building -- no DOM APIs, no network/storage. 7-bit ASCII. */

/* The num pane's formatters (num/logic.js _fmtN/_fmtTB), as free functions so a
   topic's authored compute() can be evaluated outside the pane. Keep in sync. */
function _cramFmtN(x) { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); }
function _cramFmtTB(tb) {
  if (!isFinite(tb)) tb = 0;
  if (tb >= 1000) return (tb / 1000).toFixed(tb >= 10000 ? 0 : 1) + ' PB';
  if (tb >= 10) return tb.toFixed(0) + ' TB';
  return tb.toFixed(2) + ' TB';
}

/* A section renders only if it has a body -- an absent slice yields no heading. */
function _csSec(title, body) {
  return body ? '<div class="cs-sec"><div class="cs-st">' + title + '</div>' + body + '</div>' : '';
}

/* The explicit empty state. This is the "empty beats wrong" guarantee made visible:
   a topic with no usable slices says so, rather than borrowing topic 1's sheet. */
function _csEmpty(what) {
  return '<div class="cs-one"><span class="cs-one-l">Nothing authored yet</span>' +
    'This topic carries no content the ' + what + ' can be built from. It is deliberately empty &mdash; ' +
    'showing you <b>another topic&rsquo;s</b> ' + what + ' would be worse than showing you nothing.</div>';
}

/* Evaluate the topic's authored compute() at its canonical (authored default)
   inputs -> the same rows the Numbers pane shows on first paint. */
function _cramNumRows(num) {
  if (!num || typeof num.compute !== 'function' || !num.inputs || !num.inputs.length) return null;
  var vals = {};
  for (var i = 0; i < num.inputs.length; i++) vals[num.inputs[i].id] = num.inputs[i].value;
  try {
    var rows = num.compute(vals, { n: _cramFmtN, tb: _cramFmtTB });
    return (rows && rows.length) ? rows : null;
  } catch (e) { return null; }
}

/* ---- the cram sheet ---- */
function deriveCram(topic) {
  if (!topic || !topic.data) return _csEmpty('cram sheet');
  var d = topic.data, idn = topic.identity || {}, out = '';
  var card = d.open && d.open.cards && d.open.cards[0];
  var items = (card && card.items) || [];
  var decs = (d.trade && d.trade.decisions) || [];

  /* 1. the one-liner -- the "one breath" answer; else the companion thesis */
  var one = (items[0] && items[0].a) || idn.thesis || '';
  if (one) out += '<div class="cs-one"><span class="cs-one-l">The one-liner</span>' + one + '</div>';

  /* 2. the spine -- the whiteboard answers ARE what you draw */
  var spine = '';
  if (d.wb && d.wb.steps && d.wb.steps.length) {
    spine = '<ol class="cs-spine">';
    for (var s = 0; s < d.wb.steps.length; s++) spine += '<li>' + d.wb.steps[s].a + '</li>';
    spine += '</ol>';
  } else if (idn.spine && idn.spine.length) {
    spine = '<ol class="cs-spine">';
    for (var s2 = 0; s2 < idn.spine.length; s2++) spine += '<li>' + idn.spine[s2] + '</li>';
    spine += '</ol>';
  }
  out += _csSec('The spine &mdash; what you draw', spine);

  /* 3. decisions -- the default, and the condition that switches it */
  var dec = '';
  for (var i = 0; i < decs.length; i++) {
    var o = decs[i].opts || [];
    if (o.length >= 2) dec += '<div class="cs-dec"><b>' + o[0].n + '</b><span class="cs-arr">&rarr;</span><b>' + o[1].n + '</b> when ' + o[1].when + '</div>';
    else if (o.length === 1) dec += '<div class="cs-dec"><b>' + o[0].n + '</b><span class="cs-arr">&rarr;</span>' + o[0].when + '</div>';
  }
  out += _csSec('Decisions &amp; switch conditions', dec);

  /* 4. ceilings -- the topic's own arithmetic at its canonical inputs */
  var rows = _cramNumRows(d.num), nums = '';
  if (rows) {
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      nums += '<div class="cs-num"><b>' + r.k + ': ' + r.v + (r.u ? ' ' + r.u : '') + '</b> &mdash; ' + r.n + '</div>';
    }
    if (d.num.tell) nums += '<div class="cs-dim">' + d.num.tell + '</div>';
  }
  out += _csSec('Ceilings &mdash; the numbers', nums);

  /* 5. traps -> the fix */
  var flags = (d.rf && d.rf.flags) || [], traps = '';
  for (var k = 0; k < flags.length; k++) {
    if (!flags[k].bad || !flags[k].fix) continue;
    traps += '<div class="cs-trap"><span class="cs-bad">' + flags[k].bad + '</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">' + flags[k].fix + '</span></div>';
  }
  out += _csSec('Traps &rarr; the fix', traps);

  /* 6. senior tells -- each decision's tell */
  var tells = '';
  for (var m = 0; m < decs.length; m++) if (decs[m].tell) tells += '<li>' + decs[m].tell + '</li>';
  out += _csSec('Senior tells &mdash; say these', tells ? '<ul class="cs-tells">' + tells + '</ul>' : '');

  /* 7. harder angles -- the curveball themes and what each one asks of you.
     `task` (the "here is what to do with it" line) is the better cram line, but only the
     8 hand-coded topics author one; all 38 compiled topics carry theme + cue and no task.
     The cue IS the curveball question, so it is the honest fallback -- without it this
     section silently vanished on all 38, which is how a too-strict filter quietly becomes
     the same class of bug as the one being fixed. */
  var cbs = (d.bank && d.bank.curveballs) || [], ha = '';
  for (var n = 0; n < cbs.length; n++) {
    var c = cbs[n], line = c && (c.task || c.cue);
    if (!c || !c.theme || !line) continue;
    ha += '<div class="cs-ha"><b class="cs-ha-l">' + c.theme + '</b> &mdash; ' + line + '</div>';
  }
  out += _csSec('Harder angles &mdash; curveball-ready', ha);

  /* 8. the 30 seconds -- the authored "thirty seconds" answer, verbatim */
  var thirty = (items[1] && items[1].a) || '';
  out += _csSec('If they say &ldquo;quickly&rdquo; &mdash; the 30 seconds', thirty ? '<div class="cs-30">' + thirty + '</div>' : '');

  return out || _csEmpty('cram sheet');
}

/* ---- scope it first ---- */
function deriveScope(topic) {
  if (!topic || !topic.data) return _csEmpty('scope questions');
  var d = topic.data, out = '';
  var decs = (d.trade && d.trade.decisions) || [];
  var inputs = (d.num && d.num.inputs) || [];

  out += '<div class="cs-one"><span class="cs-one-l">The first signal</span>Before you draw anything, scope it. ' +
    'The first thing the interviewer reads is whether you solution blindly or pin down the problem. Ask the questions ' +
    'whose answers would <b>change your design</b> &mdash; not cosmetic ones. Here are the ones that fork <i>this</i> ' +
    'architecture, and what each answer flips.</div>';

  /* the forks -- each authored decision, restated as the question you ask, with
     what each answer flips (the option's own "pick when" condition) */
  var forks = '';
  for (var i = 0; i < decs.length; i++) {
    var o = decs[i].opts || [];
    if (o.length < 2) continue;
    var names = [], flips = '';
    for (var j = 0; j < o.length; j++) {
      names.push(o[j].n);
      flips += '<b>' + o[j].n + '</b> if ' + o[j].when + ' ';
    }
    forks += '<div class="cs-ha"><span class="cs-ha-l">' + names.join(' or ') + '?</span> &mdash; ' + flips + '</div>';
  }
  out += _csSec('The forks &mdash; what each answer flips', forks);

  /* scale -- the quantities whose answers set the ceilings: literally the inputs
     the Numbers pane plugs in, plus that pane's authored tell */
  var scale = '';
  if (inputs.length) {
    var labs = [];
    for (var k = 0; k < inputs.length; k++) labs.push(inputs[k].label);
    scale += '<div class="cs-ha"><span class="cs-ha-l">' + labs.join(' &middot; ') + '?</span> &mdash; ' +
      'these set the ceilings; they are exactly what the <b>Numbers</b> tab plugs in.</div>';
    if (d.num && d.num.tell) scale += '<div class="cs-dim">' + d.num.tell + '</div>';
  }
  out += _csSec('Scale &mdash; the numbers that set the ceilings', scale);

  out += _csSec('Bound it &mdash; what you are NOT doing',
    '<div class="cs-dim">Say what is out of scope &mdash; auth, the client UI, billing. Naming non-goals stops you ' +
    'sprawling and shows you scope on purpose.</div>');

  /* the ear test -- the cosmetic question is generic; the forking one is THIS
     topic's own first scoping quantity */
  if (inputs.length) {
    out += _csSec('Cosmetic vs forking &mdash; hear the difference',
      '<div class="cs-trap"><div class="cs-bad">&lsquo;What language should I use?&rsquo;</div>' +
      '<div class="cs-arr2">vs</div><div class="cs-fix">&lsquo;' + inputs[0].label + '?&rsquo;</div></div>');
  }

  out += '<div class="cs-sec"><div class="cs-one"><span class="cs-one-l">The tell</span>Juniors ask nothing and start ' +
    'drawing, or ask cosmetic questions. Seniors ask the 3&ndash;4 whose answers <b>fork the architecture</b>, then ' +
    '<b>state their assumptions out loud</b> and design against them. Asking for a number and then actually <i>using</i> ' +
    'it at the whiteboard is the signal.</div></div>';

  return out;
}
