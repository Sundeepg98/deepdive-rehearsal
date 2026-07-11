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
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

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
  // A pivot chip is a short UI label ("-> Tenant authorization (3)"). If it carries a newline
  // or runs long, the parser glued the answer paragraph into it (parse_md.mjs:225).
  CHIP_MAX: 120,
};

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
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  const page = await browser.newPage();
  const perr = [];
  page.on('pageerror', (e) => perr.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(HTML));
  await page.waitForTimeout(300);

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
    var floor = {};
    FIELDS.forEach(function (f) {
      var vals = present8.map(function (id) { return counts[id][f]; });
      floor[f] = Math.ceil(Math.min.apply(null, vals) * cfg.PARITY);
    });

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
        if (/\n/.test(p.chip || '') || (p.chip || '').length > cfg.CHIP_MAX) {
          problems.push(id + ': sys.pivots[' + i + '].chip swallowed its answer paragraph (' + (p.chip || '').length + ' chars) -- parse_md.mjs:225');
        }
        if (!full(p.a)) problems.push(id + ': sys.pivots[' + i + '] has no answer');
      });
      ((data.sys && data.sys.stages) || []).forEach(function (s, i) {
        if (!full(s.n) || !full(s.d)) problems.push(id + ': sys.stages[' + i + '] missing n/d');
      });
    });

    return { count: ids.length, problems: problems, shortfalls: shortfalls, floor: floor, counts: counts, fields: FIELDS, ref: present8 };
  }, CFG);

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
  const by = {};
  rep.shortfalls.forEach((s) => { (by[s.field] = by[s.field] || []).push(s); });
  if (Object.keys(by).length) {
    console.log('\nPARITY vs the ' + rep.ref.length + ' hand-coded topics (floor = weakest reference topic x ' + CFG.PARITY + '):\n');
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
  process.exit(1);
})();
