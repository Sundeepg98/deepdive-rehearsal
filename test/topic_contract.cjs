#!/usr/bin/env node
/*
 * Topic-contract gate -- HARDENED. Drop-in replacement for test/topic_contract.cjs.
 *
 * WHY THIS REWRITE. The previous gate asserted SHAPE, not POPULATION:
 *
 *     cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(...); });   // :52
 *
 * `!data[v]` is a truthiness test. `{}` is truthy. `{stages: []}` is truthy. So a topic whose
 * system map, tier notes and pivot answers were ALL silently discarded by the compiler still
 * "conforms". Result: the gate reported "46 topics: all slices conform" while 379 authored
 * items were dropped on every build and the 38 compiled topics sat at ~28% of the depth of the
 * 8 hand-coded ones -- because drill.cards was the ONLY collection anyone counted, and it is
 * the ONLY one at parity (97%). Everything unmeasured collapsed. Goodhart's law, in a gate.
 *
 * WHAT CHANGED.
 *   1. POPULATION, not truthiness. Every render-critical collection is COUNTED.
 *   2. THE 8 ARE THE SPEC -- literally. Floors are derived from the hand-coded 8 AT RUNTIME,
 *      so the bar can never silently drift below the reference, and nobody has to maintain a
 *      table of magic numbers that rots.
 *   3. CORRUPTION probes, not just emptiness -- a pivot chip that swallowed its answer
 *      paragraph is populated AND wrong; only a shape-aware assertion catches it.
 *   4. A RATCHET. Landing full parity in one commit is not realistic, so shortfalls are
 *      allowlisted per (topic, field) in PARITY_DEBT and the allowlist may only SHRINK.
 *      A new shortfall fails immediately; a fixed one must be removed or the gate fails
 *      ("stale debt") -- so the number can only go down.
 *
 * Usage (unchanged):
 *   node test/topic_contract.cjs [path/to/build.html]
 *   CHROME=/path/to/chrome node test/topic_contract.cjs
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
// argv[2] is the build to measure -- but a FLAG is not a path. `--write-debt` was being taken as
// the deliverable and Playwright dutifully navigated to file:///.../--write-debt.
const HTML = process.argv.slice(2).find((a) => !a.startsWith('--'))
  || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

// The 8 hand-coded topics. They never touch the compiler; their JS data modules ARE the
// definition of a full-depth topic. Everything else is measured against them.
const REFERENCE_8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];

const CFG = {
  REFERENCE_8,
  VIEWS: ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'bank'],
  IDENTITY_FIELDS: ['index', 'group', 'title', 'h1', 'locatorTail', 'thesis'],
  CORE_TIERS: ['SDE2', 'SDE3', 'Staff'],
  ALLOWED_TIERS: ['SDE2', 'SDE3', 'Staff', 'EXTEND'],
  MIN_PER_CORE: 3,
  // Fraction of the 8's WORST topic a compiled topic must reach, per collection.
  // 1.0 = full parity with the weakest hand-coded topic. Raise toward 1.0 as debt is paid.
  PARITY: 1.0,
};

// A pivot chip is a short UI label ("-> at-least-once + idempotent"). Two things can go wrong,
// and they are DIFFERENT things -- conflating them cost this gate its credibility once already:
//
//   CORRUPTION -- the parser glued the answer paragraph onto the chip. That has an EXACT
//   signature: the chip contains a NEWLINE. It is not a matter of degree, so it is not tested by
//   a length threshold. The old probe used `length > 120` as a proxy for it; once the parser was
//   fixed that proxy went on firing -- on four chips whose authors had simply written a long
//   label. A gate that reports a fixed bug is a gate people learn to override.
//
//   INVISIBILITY -- the chip renders past .piv{overflow:hidden} and its tail is cropped. That is
//   a LAYOUT fact, so it is measured in the LAYOUT, not guessed from a character count. (For the
//   record: the 8 run 8-39 chars, the compiled 38 average 88 and peak at 131. Exactly one of
//   those was actually being cropped -- a char count would have flagged four and missed the
//   question beside it being starved to 46px.)
//
// Both are now tested for what they are.

// ---------------------------------------------------------------------------------------
// PARITY DEBT -- the ratchet. Each entry is a (topic, field) pair known to be below the
// floor, with the count observed when it was allowlisted. Rules enforced below:
//   * a shortfall NOT in this list  -> FAIL (new regression)
//   * an entry whose topic now MEETS the floor -> FAIL (stale: delete the line)
//   * an entry that got WORSE than its recorded count -> FAIL (backslide)
// So the list can only shrink. Delete lines as the compiler fix lands; when it is empty,
// remove the mechanism entirely.
// Generate/refresh with:  node test/topic_contract.cjs --write-debt
// ---------------------------------------------------------------------------------------
const DEBT_FILE = path.join(__dirname, 'parity_debt.json');
const PARITY_DEBT = fs.existsSync(DEBT_FILE) ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8')) : {};
const WRITE_DEBT = process.argv.includes('--write-debt');

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage();
  const perr = [];
  page.on('pageerror', (e) => perr.push('pageerror: ' + e.message));
  await B.gotoApp(page, HTML);   /* was: goto + 300ms */

  const rep = await page.evaluate((cfg) => {
    if (typeof TopicRegistry === 'undefined') return { fatal: 'TopicRegistry undefined' };
    var groupIds = (typeof TOPIC_GROUPS !== 'undefined') ? TOPIC_GROUPS.map(function (g) { return g.id; }) : [];
    var problems = [], shortfalls = [];
    var ids = TopicRegistry.ids();

    var len = function (x) { return Array.isArray(x) ? x.length : (x && typeof x === 'object') ? Object.keys(x).length : 0; };
    var full = function (s) { return !!(s && String(s).trim()); };
    var sum = function (a, f) { return (a || []).reduce(function (n, x) { return n + f(x); }, 0); };
    var cnt = function (a, f) { return (a || []).filter(f).length; };

    // -------------------------------------------------------------------------------
    // POPULATION PROBES. Every collection the app renders with .map or .forEach.
    // This is the list the old gate did not have: it checked `if (!data[v])` and stopped.
    // -------------------------------------------------------------------------------
    var POP = {
      'drill.cards':       function (d, i) { return len(d.drill && d.drill.cards); },
      'drill.follows':     function (d, i) { return sum(d.drill && d.drill.cards, function (c) { return len(c.f); }); },
      'drill.senior':      function (d, i) { return cnt(d.drill && d.drill.cards, function (c) { return full(c.senior); }); },
      'drill.speak':       function (d, i) { return cnt(d.drill && d.drill.speak, full); },
      'drill.tierNotes':   function (d, i) { return len(d.drill && d.drill.tierNotes); },
      'sys.stages':        function (d, i) { return len(d.sys && d.sys.stages); },
      'sys.pivots':        function (d, i) { return len(d.sys && d.sys.pivots); },
      'sys.pivotAnswers':  function (d, i) { return cnt(d.sys && d.sys.pivots, function (p) { return full(p.a); }); },
      'model.answers':     function (d, i) { return len(d.model && d.model.answers); },
      'model.beats':       function (d, i) { return sum(d.model && d.model.answers, function (a) { return len(a.beats); }); },
      'walk.steps':        function (d, i) { return len(d.walk && d.walk.steps); },
      'wb.steps':          function (d, i) { return len(d.wb && d.wb.steps); },
      'trade.decisions':   function (d, i) { return len(d.trade && d.trade.decisions); },
      'rf.flags':          function (d, i) { return len(d.rf && d.rf.flags); },
      'num.inputs':        function (d, i) { return len(d.num && d.num.inputs); },
      'open.cards':        function (d, i) { return len(d.open && d.open.cards); },
      'bank.mockBeats':    function (d, i) { return len(d.bank && d.bank.mockBeats); },
      'bank.curveballs':   function (d, i) { return len(d.bank && d.bank.curveballs); },
      'identity.cmpNotes': function (d, i) { return len(i.cmpNotes); },
    };
    var FIELDS = Object.keys(POP);

    var measure = function (id) {
      var t = TopicRegistry.get(id) || {};
      var d = t.data || {}, i = t.identity || {};
      var m = {};
      FIELDS.forEach(function (f) { m[f] = POP[f](d, i); });
      return m;
    };

    var counts = {};
    ids.forEach(function (id) { counts[id] = measure(id); });

    // -------------------------------------------------------------------------------
    // THE 8 ARE THE SPEC: the floor for each field is the WEAKEST hand-coded topic,
    // scaled by PARITY. Derived at runtime -- it cannot drift out of sync with the
    // reference, and there are no magic numbers to maintain.
    // -------------------------------------------------------------------------------
    var present8 = cfg.REFERENCE_8.filter(function (id) { return counts[id]; });
    var floor = {}, mean8 = {};
    FIELDS.forEach(function (f) {
      var vals = present8.map(function (id) { return counts[id][f]; });
      // HARD FLOOR = the WEAKEST hand-coded topic. Deliberately the most conservative bar that
      // can still be defended: the 8 PROVE it is reachable, so nothing below it is arguable.
      floor[f] = Math.ceil(Math.min.apply(null, vals) * cfg.PARITY);
      // PARITY BASELINE = the MEAN of the 8. This is the DEPTH METRIC (not the pass/fail line):
      // it answers "how deep is a compiled topic, as a fraction of a real one?" -- the number the
      // old gate could not produce at all, because it counted drill.cards and nothing else.
      mean8[f] = vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length || 1);
    });

    // The headline: each topic's depth as a % of the average hand-coded topic, averaged over
    // every collection. A topic scoring 100 is as deep as a typical one of the 8.
    var parityPct = function (id) {
      var acc = 0, n = 0;
      FIELDS.forEach(function (f) {
        if (!mean8[f]) return;                       // field the reference itself never populates
        acc += Math.min(1, counts[id][f] / mean8[f]); // cap at 1: overshooting one field cannot
        n++;                                          // paper over a zero in another
      });
      return n ? Math.round((acc / n) * 100) : 0;
    };

    // Guard against the reference itself rotting: a hand-coded topic that lost its content
    // would silently LOWER the bar for all 46. Every reference topic must be non-empty.
    present8.forEach(function (id) {
      FIELDS.forEach(function (f) {
        if (counts[id][f] === 0) problems.push('REFERENCE topic ' + id + ' has 0 ' + f + ' -- the spec itself is degraded; the floor is now meaningless');
      });
    });
    if (present8.length !== cfg.REFERENCE_8.length) problems.push('reference set incomplete: expected ' + cfg.REFERENCE_8.length + ' hand-coded topics, found ' + present8.length);

    ids.forEach(function (id) {
      var t = TopicRegistry.get(id), idn = (t && t.identity) || {}, data = (t && t.data) || {};

      cfg.IDENTITY_FIELDS.forEach(function (f) {
        if (idn[f] === undefined || idn[f] === null || idn[f] === '') problems.push(id + ': missing identity.' + f);
      });
      if (idn.group && groupIds.length && groupIds.indexOf(idn.group) === -1) problems.push(id + ': group "' + idn.group + '" is not a TOPIC_GROUPS id');

      // Slice presence (kept -- a missing slice is still a hard error) ...
      cfg.VIEWS.forEach(function (v) {
        if (!data[v]) { problems.push(id + ': missing "' + v + '" slice'); return; }
        // ... but presence is NOT conformance. An EMPTY slice renders a blank pane and used
        // to pass. Every slice must carry at least one of its own collections.
        var owned = FIELDS.filter(function (f) { return f.indexOf(v + '.') === 0; });
        if (owned.length && owned.every(function (f) { return counts[id][f] === 0; })) {
          problems.push(id + ': "' + v + '" slice is EMPTY (present but zero-population -- renders a blank pane)');
        }
      });

      // Per-field population floor, measured against the 8.
      FIELDS.forEach(function (f) {
        var got = counts[id][f], need = floor[f];
        if (got < need) shortfalls.push({ id: id, field: f, got: got, need: need });
      });

      // Tier rules (unchanged).
      var cards = (data.drill && Array.isArray(data.drill.cards)) ? data.drill.cards : null;
      if (!cards) { problems.push(id + ': drill.cards is not an array'); return; }
      var tc = {};
      cards.forEach(function (c) { tc[c.tier] = (tc[c.tier] || 0) + 1; });
      cfg.CORE_TIERS.forEach(function (tr) {
        if (!tc[tr]) problems.push(id + ': no "' + tr + '" cards');
        else if (tc[tr] < cfg.MIN_PER_CORE) problems.push(id + ': only ' + tc[tr] + ' "' + tr + '" cards (< ' + cfg.MIN_PER_CORE + ')');
      });
      Object.keys(tc).forEach(function (tr) { if (cfg.ALLOWED_TIERS.indexOf(tr) === -1) problems.push(id + ': unexpected tier "' + tr + '"'); });
      cards.forEach(function (c, i) {
        if (!full(c.signal)) problems.push(id + ': card ' + i + ' missing signal');
        if (!full(c.q)) problems.push(id + ': card ' + i + ' missing q');
        if (!full(c.a)) problems.push(id + ': card ' + i + ' missing a');          // NEW: was never checked
      });

      // -----------------------------------------------------------------------------
      // CORRUPTION probes. Populated-but-wrong. Counting alone would not catch these.
      // -----------------------------------------------------------------------------
      ((data.sys && data.sys.pivots) || []).forEach(function (p, i) {
        // CORRUPTION, exactly: a leaf field that contains a newline swallowed the line beneath it.
        if (/\n/.test(p.chip || '')) {
          problems.push(id + ': sys.pivots[' + i + '].chip contains a newline -- it swallowed its answer paragraph');
        }
        if (!full(p.a)) problems.push(id + ': sys.pivots[' + i + '] has no answer');
      });
      ((data.sys && data.sys.stages) || []).forEach(function (s, i) {
        if (!full(s.n) || !full(s.d)) problems.push(id + ': sys.stages[' + i + '] missing n/d');
      });
    });

    var parity = {};
    ids.forEach(function (id) { parity[id] = parityPct(id); });

    return { count: ids.length, problems: problems, shortfalls: shortfalls, floor: floor, mean8: mean8,
      counts: counts, fields: FIELDS, ref: present8, parity: parity, ids: ids };
  }, CFG);

  // ---------------------------------------------------------------------------------------
  // RENDERED-CONTENT PROBE. Everything above reads DATA. Data that reaches the module and is
  // then cropped by the layout is still content the reader never sees -- the compiler's sin,
  // committed one layer down. So the pivot chip is measured where it actually lives: in the
  // laid-out Shadow DOM, against the container that hides its overflow.
  // ---------------------------------------------------------------------------------------
  const clipped = await page.evaluate(() => {
    const host = document.createElement('deep-system-map');
    document.body.appendChild(host);
    host.style.display = 'block';
    host.style.width = '760px';                 // the app's content column
    const bad = [];
    TopicRegistry.ids().forEach(function (id) {
      const t = TopicRegistry.get(id);
      if (!t.data.sys) return;
      host.renderTopic(t.data.sys);
      const chips = host.shadowRoot.querySelectorAll('.piv .chip');
      for (let i = 0; i < chips.length; i++) {
        const c = chips[i], box = c.closest('.piv');
        const over = Math.round(c.getBoundingClientRect().right - box.getBoundingClientRect().right);
        if (over > 1) bad.push({ id: id, i: i, over: over, len: c.textContent.length });
      }
    });
    host.remove();
    return bad;
  });
  clipped.forEach((c) => rep.problems.push(
    c.id + ': sys.pivots[' + c.i + '].chip renders ' + c.over + 'px past .piv{overflow:hidden} -- '
    + (c.len - 0) + ' chars, the tail is invisible to the reader'));

  await browser.close();
  if (rep.fatal) { console.log('TOPIC CONTRACT: FAIL (' + rep.fatal + ')'); process.exit(1); }
  if (perr.length) { console.log('TOPIC CONTRACT: FAIL (page errors: ' + perr.join('; ') + ')'); process.exit(1); }

  // ---- the ratchet ---------------------------------------------------------------
  const key = (s) => s.id + '::' + s.field;
  if (WRITE_DEBT) {
    const out = {};
    rep.shortfalls.forEach((s) => { out[key(s)] = s.got; });
    fs.writeFileSync(DEBT_FILE, JSON.stringify(out, null, 2) + '\n');
    console.log('wrote ' + Object.keys(out).length + ' debt entries to ' + DEBT_FILE);
    process.exit(0);
  }

  const isNew = [], backslid = [];
  rep.shortfalls.forEach((s) => {
    const k = key(s);
    if (!(k in PARITY_DEBT)) isNew.push(s);
    else if (s.got < PARITY_DEBT[k]) backslid.push({ ...s, was: PARITY_DEBT[k] });
  });
  const live = new Set(rep.shortfalls.map(key));
  const stale = Object.keys(PARITY_DEBT).filter((k) => !live.has(k));

  // ---- report --------------------------------------------------------------------
  const pad = (s, w) => String(s).padEnd(w);
  const padL = (s, w) => String(s).padStart(w);
  const by = {};
  rep.shortfalls.forEach((s) => { (by[s.field] = by[s.field] || []).push(s); });

  // THE DEPTH METRIC. The old gate counted drill.cards -- the one collection at parity -- and
  // called all 46 topics conformant. This is what it could not see: per collection, the average
  // COMPILED topic against the average HAND-CODED one.
  const ref = new Set(rep.ref);
  const compiled = rep.ids.filter((id) => !ref.has(id));
  if (compiled.length) {
    const avg = (ids, f) => ids.reduce((a, id) => a + rep.counts[id][f], 0) / (ids.length || 1);
    console.log('\nDEPTH: the ' + compiled.length + ' COMPILED topics vs the ' + rep.ref.length + ' HAND-CODED ones (the spec).\n');
    console.log('  ' + pad('collection', 20) + padL('the 8', 8) + padL('the 38', 9) + padL('parity', 9) + '   floor');
    console.log('  ' + '-'.repeat(60));
    rep.fields.forEach((f) => {
      const m8 = rep.mean8[f], m38 = avg(compiled, f);
      const pct = m8 ? Math.round((m38 / m8) * 100) : 0;
      const flag = m38 === 0 ? '  EMPTY' : (pct < 50 ? '  <<' : '');
      console.log('  ' + pad(f, 20) + padL(m8.toFixed(1), 8) + padL(m38.toFixed(1), 9)
        + padL(pct + '%', 9) + '   ' + padL(rep.floor[f], 5) + flag);
    });
    const overall = Math.round(compiled.reduce((a, id) => a + rep.parity[id], 0) / compiled.length);
    const refAvg = Math.round(rep.ref.reduce((a, id) => a + rep.parity[id], 0) / (rep.ref.length || 1));
    console.log('  ' + '-'.repeat(60));
    console.log('  ' + pad('OVERALL DEPTH', 20) + padL(refAvg + '%', 8) + padL(overall + '%', 9)
      + '   (each topic vs the mean of the 8, per-field capped at 100%)');
    console.log('');
  }

  if (Object.keys(by).length) {
    console.log('SHORTFALLS vs the floor (= the WEAKEST hand-coded topic x ' + CFG.PARITY + '):\n');
    console.log('  ' + pad('field', 20) + pad('floor', 8) + pad('topics below', 14) + 'worst');
    console.log('  ' + '-'.repeat(52));
    rep.fields.forEach((f) => {
      const s = by[f];
      if (!s) return;
      const worst = Math.min(...s.map((x) => x.got));
      console.log('  ' + pad(f, 20) + pad(rep.floor[f], 8) + pad(s.length + '/' + rep.count, 14) + worst);
    });
    console.log('');
  }

  const fatal = rep.problems.length || isNew.length || backslid.length || stale.length;
  if (!fatal) {
    console.log('TOPIC CONTRACT: PASS  (' + rep.count + ' topics: population, parity, tiers, cards conform'
      + (Object.keys(PARITY_DEBT).length ? '; ' + Object.keys(PARITY_DEBT).length + ' allowlisted shortfalls' : '') + ')');
    process.exit(0);
  }

  console.log('TOPIC CONTRACT: FAIL');
  if (rep.problems.length) {
    console.log('\n  ' + rep.problems.length + ' contract violation(s):');
    rep.problems.slice(0, 20).forEach((p) => console.log('    - ' + p));
    if (rep.problems.length > 20) console.log('    ... and ' + (rep.problems.length - 20) + ' more');
  }
  if (isNew.length) {
    console.log('\n  ' + isNew.length + ' NEW parity shortfall(s) (not allowlisted in parity_debt.json):');
    isNew.slice(0, 20).forEach((s) => console.log('    - ' + s.id + ': ' + s.field + ' = ' + s.got + ' (floor ' + s.need + ', from the 8)'));
    if (isNew.length > 20) console.log('    ... and ' + (isNew.length - 20) + ' more');
  }
  if (backslid.length) {
    console.log('\n  ' + backslid.length + ' BACKSLIDE(s) (got worse than the allowlisted count):');
    backslid.slice(0, 10).forEach((s) => console.log('    - ' + s.id + ': ' + s.field + ' ' + s.was + ' -> ' + s.got));
  }
  if (stale.length) {
    console.log('\n  ' + stale.length + ' STALE debt entr(ies) -- now at parity, delete from parity_debt.json:');
    stale.slice(0, 10).forEach((k) => console.log('    - ' + k));
  }

  // The LAST line is what THE GATE prints in its summary row (check_all.py:last_line), so it must
  // be the verdict -- not whatever detail line the truncation happened to stop on.
  const refSet = new Set(rep.ref);
  const belowFloor = new Set(rep.shortfalls.map((s) => s.id)).size;
  const compiledN = rep.ids.filter((id) => !refSet.has(id)).length;
  const depth = compiledN
    ? Math.round(rep.ids.filter((id) => !refSet.has(id)).reduce((a, id) => a + rep.parity[id], 0) / compiledN)
    : 0;
  console.log('\nTOPIC CONTRACT: FAIL  (' + belowFloor + '/' + rep.count + ' topics below the floor set by the '
    + rep.ref.length + ' hand-coded topics; ' + rep.problems.length + ' contract violations; '
    + isNew.length + ' unallowlisted shortfalls; compiled-topic depth ' + depth + '% of the spec)');
  process.exit(1);
})();
