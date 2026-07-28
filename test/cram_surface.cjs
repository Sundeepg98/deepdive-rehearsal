#!/usr/bin/env node
/*
 * CRAM-SURFACE INTEGRITY GATE.
 *
 * WHAT THIS PROTECTS. The cram sheet is the artifact a candidate reads five minutes before
 * their loop, with zero repair context. It is not authored -- `cram-derive.js` COMPOSES it by
 * LIFTING strings verbatim out of panes that were written to be read somewhere else. That
 * composition is where the defects come from: a string that is perfectly clear beside its own
 * question becomes unreadable once the question is dropped, and nothing in the repo measured
 * that. cram_scope_distinct proves each topic renders its OWN sheet; topic_contract proves the
 * slices are POPULATED. Neither reads a single word of what the sheet actually says.
 *
 * THE SWEEP THAT MOTIVATED IT (_audit/2026-07-20-content-catalog-sweep.md, Class H) estimated
 * "~14 topics" with a cram-surface defect -- but that sweep explicitly never rendered a sheet
 * (its own section 8: "The cram-sheet findings are reasoning about cram-derive.js, not
 * inspection of a generated sheet"). This check is the measurement. It disagrees with the
 * estimate, upward; see _audit/2026-07-28-cram-surface-baseline.md.
 *
 * ------------------------------------------------------------------------------------------
 * IT MIRRORS THE COMPOSER, SO IT MUST PROVE THE MIRROR IS NOT STALE.
 * The inventory below re-walks the same fields cram-derive walks. A mirror can silently drift
 * out of sync with the thing it mirrors -- at which point this check is auditing strings the
 * reader never sees while ignoring the ones they do, and it goes green for the wrong reason.
 * That is the exact failure mode this repo has already paid for twice (a gate comparing the
 * parser against the parser's own output; a length floor its own <style> tag satisfied). So
 * the mirror is pinned THREE ways, and any of them failing is a hard FAIL, never a warning:
 *
 *   1. SECTION SET -- the .cs-st headings deriveCram actually renders must equal EXPECTED_SECS.
 *      A renamed, added or dropped section trips this.
 *   2. BLOCK COUNTS -- per section, the number of .cs-* blocks rendered must equal the number
 *      the mirror predicts. A NEW lift site added inside an EXISTING section trips this; the
 *      section-set guard alone would not see it.
 *   3. STRING COVERAGE -- every string the mirror claims is lifted must actually appear in the
 *      rendered sheet text. A field that was re-pointed (wb.steps[].a -> .c) trips this.
 *
 * Known limit, stated rather than papered over: a lift site added inside an existing section
 * that ALSO renders no new block and whose text the mirror happens to already carry would slip
 * all three. No such shape exists in cram-derive today.
 *
 * ------------------------------------------------------------------------------------------
 * THE FLAG CLASSES. Each one is here because the corpus or the composer's own code proves it
 * can happen -- not because it sounded plausible. Tuning receipts are in the freeze report.
 *
 *   dangling  An answer lifted AWAY FROM ITS QUESTION that opens on a back-reference the
 *             question supplied. This is structural, not stylistic: wb.steps is {c, a} -- a
 *             CUE and an answer -- and cram-derive lifts `.a` alone (cram-derive.js:91). Same
 *             for open.cards[0].items[0..1].a. So "Only the ones before the pivot." (saga)
 *             loses "which steps even need a compensation?" and becomes unreadable. Detected
 *             as a bare pro-form subject ("It evicts.", "Both ordering and load") or an
 *             elliptical fragment answer ("Because...", "Only...", "No.", "You do not,").
 *   dup       The same sentence lifted into TWO sections. Panes are consumed independently so
 *             cross-pane restatement is BY DESIGN -- but the sheet puts those panes on one
 *             page, where it reads as a bug and burns the scarcest space in the app.
 *   when-conj An opts[].when that begins with the conjunction the composer already supplies.
 *             cram-derive.js:104 emits `<b>X</b> when ` + when  -> "...when when you need...";
 *             cram-derive.js:175 (scope) emits `<b>X</b> if ` + when -> "...if when...".
 *             Purely mechanical, zero judgement, zero false positives.
 *   ceiling   A Ceilings row whose value at the authored defaults is NaN / Infinity /
 *             undefined / null / blank. NOTE: a non-numeric STRING is NOT flagged -- the
 *             corpus legitimately ships verdict rows ("pull (on-read)", "n/a", "bounded",
 *             "~8,333"), and 101 of them would have been false failures.
 *   void-lift A lift site that would render the literal absence of a value (undefined/null/
 *             blank) into the sheet -- e.g. an opts[1] with no `when`, which cram-derive
 *             interpolates unguarded.
 *
 * ------------------------------------------------------------------------------------------
 * THE RATCHET (test/cram_surface_debt.json), copied from parity_debt.json's proven pattern.
 * The corpus fails this check today, and a gate that is born red cannot merge and teaches
 * people to override it. So known defects are allowlisted by key and the list may only SHRINK:
 *   * a defect NOT in the baseline            -> FAIL (new regression)
 *   * a baseline entry no longer observed     -> FAIL (stale: delete the line)
 * Fixing waves delete lines. When the file is empty the mechanism can be removed.
 * Refresh with:  node test/cram_surface.cjs --write-debt
 *
 * AND THE RATCHET IS WHY THE DETECTORS SELF-TEST ON EVERY RUN. Staleness protects a detector
 * only while its class still has baseline entries: at the EMPTY-baseline end state (Wave C
 * part 2's goal) a detector that silently stopped matching would leave this gate green
 * forever, having become the tenth check in this repo that cannot fail. So SELF_TEST below
 * runs every detector against fixed synthetic fixtures on every run, and ABORTS if any
 * detector fails to fire or fires on its own negative control. Pure strings, no browser, no
 * clock, no filesystem -- so it is deterministic on every platform.
 *
 * Usage:
 *   node test/cram_surface.cjs [path/to/build.html]
 *   node test/cram_surface.cjs --write-debt
 *   CHROME=/path/to/chrome node test/cram_surface.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv.slice(2).find((a) => !a.startsWith('--'))
  || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const DEBT_FILE = path.join(__dirname, 'cram_surface_debt.json');
const WRITE_DEBT = process.argv.includes('--write-debt');
const PLANT = process.argv.includes('--plant');           // watched-red: inject synthetic defects

/* The sections deriveCram renders, verbatim from its own _csSec calls, entity-decoded the way
 * a browser decodes them. Pinned so a composer change cannot pass unnoticed. */
const EXPECTED_SECS = [
  'The spine -- what you draw',
  'Decisions & switch conditions',
  'Ceilings -- the numbers',
  'Traps -> the fix',
  'Senior tells -- say these',
  'Harder angles -- curveball-ready',
  'If they say "quickly" -- the 30 seconds',
];

/* ============================ DETECTORS (pure, Node-side) ============================
 * Every detector takes an already-normalized plain-text string and returns a reason or ''.
 * Pure text in, verdict out: no DOM, no clock, no locale, no filesystem. That is what makes
 * the self-test below a real proof rather than a re-run of the same environment. */

/* A bare pro-form subject. The antecedent lived in the question, which the sheet drops.
 * `Its` is included (possessive pro-form: "Its counter is a hot key" -- whose?). */
const RE_PRONOUN = /^(it|its|it's|they|them|their|both|neither|either|that|this|these|those|he|she)\b/i;

/* An elliptical fragment: an answer whose grammatical head was the question.
 * "No" REQUIRES following punctuation or whitespace-then-word so that "No-op fallbacks..."
 * (observability wb.steps[8].a) is NOT flagged -- \b alone matches inside "No-op", which
 * would have manufactured a false failure. Same care for "Not" vs "Nothing". */
const RE_ELLIPTIC = new RegExp(
  '^(' +
  'yes[\\s.,!:;]' + '|' +
  'no[.,!:;]' + '|' +
  'no\\s+(?![a-z]*-)' + '|' +
  'only\\b' + '|' +
  'not\\b' + '|' +
  'because\\b' + '|' +
  'you\\s+(do|did|can|cannot|can\'t|don\'t|will|would|should)\\b' +
  ')', 'i');

function detectDangling(text) {
  const t = text.trim();
  if (!t) return '';
  if (RE_PRONOUN.test(t)) return 'opens on the pro-form "' + t.split(/\s+/)[0] + '" -- its antecedent was in the question, which the sheet drops';
  if (RE_ELLIPTIC.test(t)) return 'opens as an elliptical answer ("' + t.split(/\s+/).slice(0, 2).join(' ') + '...") -- it answers a question the sheet does not show';
  return '';
}

/* The composer supplies the conjunction; the body must not repeat it.
 * cram: `X</b> when ` + when     scope: `X</b> if ` + when
 * A `when` opening on EITHER conjunction breaks one of the two surfaces, so both are flagged. */
function detectWhenConj(whenText) {
  const m = /^(when|if)\b/i.exec(String(whenText).trim());
  if (!m) return '';
  const w = m[1].toLowerCase();
  return 'the option body already starts with "' + w + '", so the composer renders "'
    + (w === 'when' ? 'when when' : 'when if') + '..." on the cram sheet and "'
    + (w === 'when' ? 'if when' : 'if if') + '..." on the scope sheet';
}

/* A ceilings row value that is not a value. Deliberately NARROW -- see the header note on the
 * 101 legitimate string verdicts a "must be numeric" rule would have failed. */
function detectCeiling(v) {
  if (v === undefined) return 'row value is undefined at the authored defaults';
  if (v === null) return 'row value is null at the authored defaults';
  const s = String(v).trim();
  if (s === '') return 'row value is blank at the authored defaults';
  if (s === 'NaN') return 'row value is NaN at the authored defaults';
  if (s === 'Infinity' || s === '-Infinity') return 'row value is ' + s + ' at the authored defaults';
  if (typeof v === 'number' && !isFinite(v)) return 'row value is a non-finite number at the authored defaults';
  return '';
}

/* A lift site whose value is absent -- cram-derive interpolates most of these unguarded. */
function detectVoid(v) {
  if (v === undefined) return 'the composer interpolates this field unguarded, so the sheet renders the literal text "undefined"';
  if (v === null) return 'the composer interpolates this field unguarded, so the sheet renders the literal text "null"';
  if (String(v).trim() === '') return 'the field is blank, so the sheet renders an empty slot';
  return '';
}

/* Near-duplicate over content words. Jaccard on a token SET: pure set arithmetic, identical on
 * every platform (no locale collation, no float equality test -- only a >= comparison).
 *
 * THE THRESHOLD IS ANCHORED, NOT GUESSED. All 55 cross-section pairs at >= 0.45 were read by
 * hand. Below ~0.6 the pairs are the corpus's deliberate per-pane restatement (Class L: "by
 * design"), and flagging them would be this gate crying wolf. The sweep's own named duplicate
 * -- kafka-internals' two Opener items, "the same sentence with the payoff list reshuffled" --
 * measures 0.66. DUP_MIN sits just below it, so the threshold is set by the worked example the
 * sweep supplied, the same way topic_contract derives its floor from the hand-coded 8. */
const DUP_MIN = 0.65;
const DUP_MIN_WORDS = 8;

function contentWords(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}
function jaccard(a, b) {
  const A = new Set(a), Bs = new Set(b);
  let inter = 0;
  A.forEach((x) => { if (Bs.has(x)) inter++; });
  const uni = A.size + Bs.size - inter;
  return uni ? inter / uni : 0;
}

/* ============================ THE PER-RUN DETECTOR SELF-TEST ============================
 * Each detector must FIRE on a positive fixture and STAY SILENT on its negative control. The
 * negative controls are the real false positives found while tuning -- "No-op fallbacks"
 * (observability), a legitimate string verdict row (real-time-delivery), a definite noun
 * phrase opener (event-driven). If a detector is neutered, loosened or deleted, this aborts
 * the run -- including at the empty-baseline end state, where the ratchet protects nothing. */
const SELF_TEST = [
  ['dangling+pronoun', () => detectDangling('It evicts. LRU is not scan-resistant.'), true],
  ['dangling+both', () => detectDangling('Both ordering and load, in one choice.'), true],
  ['dangling+only', () => detectDangling('Only the ones before the pivot.'), true],
  ['dangling+because', () => detectDangling('Because a partition is assigned to exactly one consumer.'), true],
  ['dangling+no', () => detectDangling('No. Cascading is a 50,000-row write.'), true],
  ['dangling+youdonot', () => detectDangling('You do not, until you have failed over under a game day.'), true],
  ['dangling-NEG-noop', () => detectDangling('No-op fallbacks when uninitialized, a bounded-drop exporter.'), false],
  ['dangling-NEG-the', () => detectDangling('The transactional outbox: the event row is written in the same transaction.'), false],
  ['dangling-NEG-nothing', () => detectDangling('Nothing lingers partially armed once the time-box expires.'), false],
  ['dangling-NEG-draw', () => detectDangling('Draw two boxes. Definition -- one row per attribute.'), false],
  ['when-conj+when', () => detectWhenConj('when you need to know whether two writes are concurrent'), true],
  ['when-conj+When', () => detectWhenConj('When a config change must be reviewed'), true],
  ['when-conj+if', () => detectWhenConj('if the write rate exceeds the primary'), true],
  ['when-conj-NEG', () => detectWhenConj('the write rate exceeds a well-provisioned primary'), false],
  ['ceiling+NaN', () => detectCeiling(NaN), true],
  ['ceiling+undef', () => detectCeiling(undefined), true],
  ['ceiling+inf', () => detectCeiling(Infinity), true],
  ['ceiling+blank', () => detectCeiling('   '), true],
  ['ceiling-NEG-verdict', () => detectCeiling('pull (on-read)'), false],
  ['ceiling-NEG-approx', () => detectCeiling('~8,333'), false],
  ['ceiling-NEG-zero', () => detectCeiling(0), false],
  ['void+undef', () => detectVoid(undefined), true],
  ['void-NEG', () => detectVoid('sync only for the narrow slice'), false],
  /* THE THRESHOLD IS BRACKETED FROM BOTH SIDES, using the corpus verbatim.
   * POSITIVE = the sweep's own named duplicate (kafka-internals' two Opener items), which
   * measures 0.657. NEGATIVE = a Class-L "by design" cross-pane restatement (multi-region's
   * Red-Flag fix vs its Trade-off tell), which measures 0.525. So DUP_MIN may not drift up
   * past the case the sweep proved is real, nor down into the restatement the sweep proved is
   * intentional -- either move silences a fixture and aborts the run. The positive clears the
   * line by only 0.007; that is deliberate, since the anchor IS the line. */
  ['dup+ANCHOR-sweep-case', () => (jaccard(
    contentWords('Kafka is a distributed append-only commit log: a topic is N retained, ordered partitions, producers append and consumers read by offset, and records persist rather than being deleted on read - which is what buys replay, many independent consumers, and very high throughput.'),
    contentWords('Kafka is a distributed append-only commit log: a topic is N retained, ordered partitions; producers append, consumers read by offset, and records persist for replay - which gives high throughput, many independent consumers, and per-partition ordering.')
  ) >= DUP_MIN) ? 'fires' : '', true],
  ['dup-NEG-by-design-restatement', () => (jaccard(
    contentWords('Replicate asynchronously with an explicit, alarmed RPO for essentially everything, and reserve synchronous replication for the narrow slice of data that can tolerate no loss and can pay the per-write latency -- or use semi-sync (sync to one nearby region, async to the rest) for two-copy durability without waiting on the farthest region. Accept a small, measured data-loss window rather than taxing every write.'),
    contentWords('Async for essentially everything, with a well-understood, alarmed RPO; sync only for the narrow slice that can tolerate no loss and can pay the per-write latency -- or semi-sync (sync to one nearby region, async to the rest) for two-copy durability without waiting on the farthest region. Most multi-region systems are async because 100ms per write globally is rarely acceptable.')
  ) >= DUP_MIN) ? 'fires' : '', false],
];

function runSelfTest() {
  const bad = [];
  SELF_TEST.forEach(([name, fn, shouldFire]) => {
    let got;
    try { got = fn(); } catch (e) { bad.push(name + ' THREW: ' + e.message); return; }
    const fired = !!got;
    if (fired !== shouldFire) {
      bad.push(name + ': expected ' + (shouldFire ? 'FIRE' : 'SILENCE') + ', got ' + (fired ? 'FIRE (' + String(got).slice(0, 60) + ')' : 'SILENCE'));
    }
  });
  return bad;
}

/* ASCII fold. The corpus is strict ASCII at source, but the DOM decodes &mdash;/&rsquo; into
 * real code points, and this file's evidence strings land in a committed JSON that the house
 * convention keeps ASCII-only. Fold the typography, drop anything else non-ASCII. */
var FOLD = (function () {
  var C = String.fromCharCode;
  return [
    [C(0x2014) + C(0x2013), '--'],          /* em dash, en dash            */
    [C(0x2018) + C(0x2019) + C(0x201B), "'"],
    [C(0x201C) + C(0x201D), '"'],
    [C(0x2192), '->'], [C(0x2190), '<-'],
    [C(0x2026), '...'],
    [C(0x00A0) + C(0x2009) + C(0x202F) + C(0x200A), ' '],
    [C(0x00B7) + C(0x2022), '.'],
    [C(0x2264), '<='], [C(0x2265), '>='],
    [C(0x00D7), 'x'], [C(0x00F7), '/'],
    [C(0x2212), '-'],
    [C(0x2011), '-'],                        /* non-breaking hyphen         */
  ].map(function (p) { return [new RegExp('[' + p[0] + ']', 'g'), p[1]]; });
}());

function asciiFold(s) {
  var out = String(s);
  FOLD.forEach(function (p) { out = out.replace(p[0], p[1]); });
  return out.replace(/[^ -~]/g, '').replace(/\s+/g, ' ').trim();
}

(async () => {
  /* THE SELF-TEST RUNS FIRST, before a browser is even launched. A detector that cannot fire
   * makes every downstream number meaningless, so there is no point measuring with it. */
  const selfBad = runSelfTest();
  if (selfBad.length) {
    console.log('CRAM SURFACE: detector SELF-TEST failed -- the instrument is broken, so no measurement is trustworthy:');
    selfBad.forEach((b) => console.log('    - ' + b));
    console.log('\nCRAM SURFACE: FAIL  (' + selfBad.length + ' detector self-test failure(s); no corpus measurement was attempted)');
    process.exit(1);
  }

  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage();
  const perr = [];
  page.on('pageerror', (e) => perr.push('pageerror: ' + e.message));
  await B.gotoApp(page, HTML);

  const rep = await page.evaluate((opts) => {
    if (typeof TopicRegistry === 'undefined') return { fatal: 'TopicRegistry undefined' };
    if (typeof deriveCram !== 'function' || typeof deriveScope !== 'function') {
      return { fatal: 'deriveCram/deriveScope are not reachable -- this check mirrors them and cannot verify itself against them' };
    }

    /* WATCHED-RED PLANT. Injects synthetic defects of every class into topics that do NOT
     * already carry one, so the delta against the baseline is exactly the planted set. Pure
     * data mutation on the in-memory registry: no file is touched, no build is modified. */
    if (opts.plant) {
      const p1 = TopicRegistry.get('content-pipeline');
      if (p1 && p1.data.wb && p1.data.wb.steps && p1.data.wb.steps[0]) p1.data.wb.steps[0].a = 'They do. And that is the whole trick.';
      const p2 = TopicRegistry.get('authz');
      if (p2 && p2.data.trade && p2.data.trade.decisions[0] && p2.data.trade.decisions[0].opts[1]) {
        p2.data.trade.decisions[0].opts[1].when = 'when the tenant count crosses the index cutover';
      }
      const p3 = TopicRegistry.get('iac');
      if (p3 && p3.data.num) {
        const orig = p3.data.num.compute;
        p3.data.num.compute = function (v, f) { const r = orig.call(this, v, f); if (r && r[0]) r[0].v = NaN; return r; };
      }
      const p4 = TopicRegistry.get('signing');
      if (p4 && p4.data.trade && p4.data.trade.decisions[0] && p4.data.trade.decisions[0].opts[1]) {
        delete p4.data.trade.decisions[0].opts[1].when;
      }
      const p5 = TopicRegistry.get('eav');
      if (p5 && p5.data.rf && p5.data.rf.flags[0] && p5.data.wb && p5.data.wb.steps[0]) {
        p5.data.rf.flags[0].fix = p5.data.wb.steps[0].a;   // exact cross-section duplicate
      }
    }

    /* The num pane's formatters, mirrored from cram-derive.js:42-48 (which mirrors num/logic.js).
     * If these drift, the ceilings the sheet prints are not the ceilings measured here. */
    const fmtN = (x) => { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); };
    const fmtTB = (tb) => {
      if (!isFinite(tb)) tb = 0;
      if (tb >= 1000) return (tb / 1000).toFixed(tb >= 10000 ? 0 : 1) + ' PB';
      if (tb >= 10) return tb.toFixed(0) + ' TB';
      return tb.toFixed(2) + ' TB';
    };

    /* Text as a READER sees it. The browser's own parser, not a regex over angle brackets --
     * a regex strip turns the legitimate ceiling value "<1" into a phantom missing string
     * (measured: exactly one false miss in 6,168 during tuning). This parses the app's OWN
     * build output in a detached, never-attached element inside the test harness; nothing here
     * is user input and nothing here ships. */
    const scratch = document.createElement('div');
    const asText = (html) => { scratch.innerHTML = String(html); return (scratch.textContent || '').replace(/\s+/g, ' ').trim(); };

    const out = {};
    const ids = TopicRegistry.ids();

    ids.forEach((id) => {
      const t = TopicRegistry.get(id) || {};
      const d = t.data || {}, idn = t.identity || {};
      const lifts = [];
      const push = (sec, p, raw, kind) => lifts.push({ sec, path: p, kind: kind || 'text', text: asText(raw === undefined || raw === null ? '' : raw), absent: raw === undefined || raw === null, raw: raw === undefined ? '@@UNDEF@@' : raw === null ? '@@NULL@@' : String(raw) });

      const card = d.open && d.open.cards && d.open.cards[0];
      const items = (card && card.items) || [];
      const decs = (d.trade && d.trade.decisions) || [];

      /* --- the mirror. Field-for-field with cram-derive.js's deriveCram(). --- */
      /* 1. one-liner (cram-derive.js:84) */
      if (items[0] && items[0].a) push('one-liner', 'open.cards[0].items[0].a', items[0].a, 'detached-answer');
      else if (idn.thesis) push('one-liner', 'identity.thesis', idn.thesis, 'detached-answer');

      /* 2. spine (cram-derive.js:89-97) */
      let spineN = 0;
      if (d.wb && d.wb.steps && d.wb.steps.length) {
        d.wb.steps.forEach((s, i) => { push('spine', 'wb.steps[' + i + '].a', s.a, 'detached-answer'); spineN++; });
      } else if (idn.spine && idn.spine.length) {
        idn.spine.forEach((s, i) => { push('spine', 'identity.spine[' + i + ']', s, 'detached-answer'); spineN++; });
      }

      /* 3. decisions (cram-derive.js:102-106) */
      let decN = 0;
      decs.forEach((dc, i) => {
        const o = dc.opts || [];
        if (o.length >= 2) {
          push('decisions', 'trade.decisions[' + i + '].opts[0].n', o[0].n);
          push('decisions', 'trade.decisions[' + i + '].opts[1].n', o[1].n);
          push('decisions', 'trade.decisions[' + i + '].opts[1].when', o[1].when, 'when');
          decN++;
        } else if (o.length === 1) {
          push('decisions', 'trade.decisions[' + i + '].opts[0].n', o[0].n);
          push('decisions', 'trade.decisions[' + i + '].opts[0].when', o[0].when, 'when');
          decN++;
        }
      });

      /* 4. ceilings (cram-derive.js:65-73, 110-117) */
      let rows = null, numErr = null, numN = 0;
      if (d.num && typeof d.num.compute === 'function' && d.num.inputs && d.num.inputs.length) {
        const vals = {};
        d.num.inputs.forEach((inp) => { vals[inp.id] = inp.value; });
        try {
          const r = d.num.compute(vals, { n: fmtN, tb: fmtTB });
          rows = (r && r.length) ? r : null;
          if (!rows) numErr = 'compute() returned no rows at the authored defaults -- the Ceilings section silently vanishes';
        } catch (e) {
          numErr = 'compute() THREW at the authored defaults (' + String(e && e.message || e) + ') -- the Ceilings section silently vanishes';
        }
      } else {
        numErr = 'no compute()/inputs -- the Ceilings section is absent';
      }
      const ceilVals = [];
      if (rows) {
        rows.forEach((r, j) => {
          push('ceilings', 'num.compute()[' + j + '].k', r.k);
          push('ceilings', 'num.compute()[' + j + '].v', r.v, 'ceiling-value');
          if (r.u) push('ceilings', 'num.compute()[' + j + '].u', r.u);
          push('ceilings', 'num.compute()[' + j + '].n', r.n);
          ceilVals.push({ j: j, v: (r.v === undefined ? '@@UNDEF@@' : r.v === null ? '@@NULL@@' : String(r.v)), k: asText(r.k) });
          numN++;
        });
        if (d.num.tell) push('ceilings', 'num.tell', d.num.tell);
      }

      /* 5. traps (cram-derive.js:121-125) */
      let trapN = 0;
      ((d.rf && d.rf.flags) || []).forEach((f, k) => {
        if (!f.bad || !f.fix) return;
        push('traps', 'rf.flags[' + k + '].bad', f.bad);
        push('traps', 'rf.flags[' + k + '].fix', f.fix);
        trapN++;
      });

      /* 6. tells (cram-derive.js:130) */
      let tellN = 0;
      decs.forEach((dc, m) => { if (dc.tell) { push('tells', 'trade.decisions[' + m + '].tell', dc.tell); tellN++; } });

      /* 7. harder angles (cram-derive.js:139-144) */
      let haN = 0;
      ((d.bank && d.bank.curveballs) || []).forEach((c, n) => {
        const line = c && (c.task || c.cue);
        if (!c || !c.theme || !line) return;
        push('angles', 'bank.curveballs[' + n + '].theme', c.theme);
        push('angles', 'bank.curveballs[' + n + '].' + (c.task ? 'task' : 'cue'), line);
        haN++;
      });

      /* 8. the 30 seconds (cram-derive.js:148) */
      let thirtyN = 0;
      if (items[1] && items[1].a) { push('thirty', 'open.cards[0].items[1].a', items[1].a, 'detached-answer'); thirtyN = 1; }

      /* --- scope lifts: only the fields deriveScope adds beyond the above --- */
      const slifts = [];
      decs.forEach((dc, i) => {
        const o = dc.opts || [];
        if (o.length < 2) return;
        o.forEach((op, j) => {
          if (j === 1) return;                     // opts[1].when is already covered by the cram mirror
          slifts.push({ sec: 'forks', path: 'trade.decisions[' + i + '].opts[' + j + '].when', kind: 'when',
            text: asText(op.when === undefined || op.when === null ? '' : op.when), absent: op.when === undefined || op.when === null,
            raw: op.when === undefined ? '@@UNDEF@@' : op.when === null ? '@@NULL@@' : String(op.when) });
        });
      });

      /* --- render the REAL sheets, for the three mirror-fidelity guards --- */
      const cramHtml = deriveCram(t), scopeHtml = deriveScope(t);
      const cramText = asText(cramHtml), scopeText = asText(scopeHtml);

      const secs = [];
      const stRe = /class="cs-st">([\s\S]*?)<\/div>/g;
      let m2;
      while ((m2 = stRe.exec(cramHtml)) !== null) secs.push(asText(m2[1]));

      const countOf = (re) => (cramHtml.match(re) || []).length;
      const blocks = {
        dec: countOf(/class="cs-dec"/g),
        num: countOf(/class="cs-num"/g),
        trap: countOf(/class="cs-trap"/g),
        ha: countOf(/class="cs-ha"/g),
        thirty: countOf(/class="cs-30"/g),
        one: countOf(/class="cs-one"/g),
      };
      /* <li> is used by BOTH the spine <ol> and the tells <ul>, so split them by their lists. */
      const spineOl = /<ol class="cs-spine">([\s\S]*?)<\/ol>/.exec(cramHtml);
      const tellsUl = /<ul class="cs-tells">([\s\S]*?)<\/ul>/.exec(cramHtml);
      blocks.spine = spineOl ? (spineOl[1].match(/<li>/g) || []).length : 0;
      blocks.tell = tellsUl ? (tellsUl[1].match(/<li>/g) || []).length : 0;

      out[id] = {
        lifts, slifts, secs, blocks, numErr,
        predicted: { spine: spineN, dec: decN, num: numN, trap: trapN, tell: tellN, ha: haN, thirty: thirtyN },
        ceilVals,
        cramText, scopeText,
        emptyState: /Nothing authored yet/.test(cramHtml) || /Nothing authored yet/.test(scopeHtml),
      };
    });

    return { ids, out };
  }, { plant: PLANT });

  await browser.close();
  if (rep.fatal) { console.log('CRAM SURFACE: FAIL (' + rep.fatal + ')'); process.exit(1); }
  if (perr.length) { console.log('CRAM SURFACE: FAIL (page errors: ' + perr.join('; ') + ')'); process.exit(1); }

  /* ---------------- mirror-fidelity guards (hard failures, never warnings) ---------------- */
  const drift = [];
  rep.ids.forEach((id) => {
    const o = rep.out[id];

    // 1. SECTION SET
    const got = o.secs.map(asciiFold).join(' | ');
    const want = EXPECTED_SECS.join(' | ');
    if (got !== want) {
      drift.push(id + ': deriveCram rendered sections [' + got + '] but this check mirrors ['
        + want + '] -- the composer changed and the mirror is STALE');
    }

    // 2. BLOCK COUNTS
    const p = o.predicted, b = o.blocks;
    const pairs = [['spine', p.spine, b.spine], ['decisions', p.dec, b.dec], ['ceilings', p.num, b.num],
      ['traps', p.trap, b.trap], ['tells', p.tell, b.tell], ['angles', p.ha, b.ha], ['30s', p.thirty, b.thirty]];
    pairs.forEach(([nm, pred, act]) => {
      if (pred !== act) drift.push(id + ': ' + nm + ' -- the mirror predicts ' + pred + ' lifted block(s), deriveCram rendered ' + act + ' -- a lift site was added, removed or re-pointed');
    });

    // 3. STRING COVERAGE
    o.lifts.forEach((L) => {
      if (L.absent || !L.text) return;
      if (o.cramText.indexOf(L.text) === -1) {
        drift.push(id + ': ' + L.path + ' is mirrored as lifted but its text is NOT in the rendered cram sheet -- the mirror points at a field the composer no longer uses');
      }
    });
    o.slifts.forEach((L) => {
      if (L.absent || !L.text) return;
      if (o.scopeText.indexOf(L.text) === -1) {
        drift.push(id + ': ' + L.path + ' is mirrored as lifted but its text is NOT in the rendered scope sheet');
      }
    });

    if (o.emptyState) drift.push(id + ': renders the "Nothing authored yet" empty state -- there is no sheet here to audit');
  });

  /* ---------------- the flag classes ---------------- */
  const defects = [];
  /* Both fields are ASCII-folded: `why` quotes the offending text back (an opener, a row key),
   * so a curly quote in the corpus would otherwise land in the committed baseline JSON, which
   * the house convention keeps ASCII-only. */
  const add = (id, cls, p, why, ev) => defects.push({ id, cls, path: p,
    why: asciiFold(String(why || '')), ev: asciiFold(String(ev || '')).slice(0, 160) });

  rep.ids.forEach((id) => {
    const o = rep.out[id];

    /* dangling -- ONLY on answers the sheet detaches from their question. Applying it to every
     * lifted string would flag Red-Flag quotes ("The leader serves the reads...") that are
     * quoted deliberately and read fine, so the class is scoped to where the defect is
     * structurally created. */
    o.lifts.forEach((L) => {
      if (L.kind !== 'detached-answer' || L.absent) return;
      const why = detectDangling(L.text);
      if (why) add(id, 'dangling', L.path, why, L.text.slice(0, 120));
    });

    /* when-conj + void-lift, over both surfaces */
    o.lifts.concat(o.slifts).forEach((L) => {
      if (L.kind === 'when') {
        if (L.absent || String(L.text).trim() === '') {
          const w = detectVoid(L.absent ? undefined : L.text);
          if (w) add(id, 'void-lift', L.path, w, '');
        } else {
          const w = detectWhenConj(L.text);
          if (w) add(id, 'when-conj', L.path, w, L.text.slice(0, 120));
        }
      } else if (L.absent && L.kind !== 'ceiling-value') {
        /* ceiling values are covered by detectCeiling, which says something more precise about
         * them -- without this guard an absent row value reports twice under two classes. */
        const w = detectVoid(undefined);
        if (w) add(id, 'void-lift', L.path, w, '');
      }
    });

    /* ceilings */
    if (o.numErr) add(id, 'ceiling', 'num.compute()', o.numErr, '');
    o.ceilVals.forEach((c) => {
      const v = c.v === '@@UNDEF@@' ? undefined : c.v === '@@NULL@@' ? null : c.v;
      const why = detectCeiling(v);
      if (why) add(id, 'ceiling', 'num.compute()[' + c.j + '].v', why, c.k);
    });

    /* duplicates across sections */
    const cand = o.lifts.filter((L) => !L.absent && contentWords(L.text).length >= DUP_MIN_WORDS);
    for (let i = 0; i < cand.length; i++) {
      for (let j = i + 1; j < cand.length; j++) {
        if (cand[i].sec === cand[j].sec) continue;
        const s = jaccard(contentWords(cand[i].text), contentWords(cand[j].text));
        if (s < DUP_MIN) continue;
        const two = [cand[i].path, cand[j].path].sort();
        add(id, 'dup', two[0] + ' + ' + two[1],
          'the same sentence reaches two sections of one sheet (' + cand[i].sec + ' and ' + cand[j].sec
          + ', similarity ' + s.toFixed(2) + ') -- on the sheet those panes are adjacent, not independent',
          cand[i].text.slice(0, 120));
      }
    }
  });

  const key = (d) => d.id + '::' + d.cls + '::' + d.path;
  defects.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

  /* ---------------- the ratchet ---------------- */
  if (WRITE_DEBT) {
    if (drift.length) {
      console.log('CRAM SURFACE: refusing to write a baseline while the mirror is STALE:');
      drift.slice(0, 10).forEach((d) => console.log('    - ' + d));
      console.log('\nCRAM SURFACE: FAIL  (mirror drift; baseline NOT written)');
      process.exit(1);
    }
    const outObj = {};
    defects.forEach((d) => { outObj[key(d)] = d.ev || d.why; });
    fs.writeFileSync(DEBT_FILE, JSON.stringify(outObj, null, 2) + '\n', 'ascii');
    console.log('wrote ' + Object.keys(outObj).length + ' baseline entries to ' + DEBT_FILE);
    process.exit(0);
  }

  const DEBT = fs.existsSync(DEBT_FILE) ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8')) : {};
  const live = new Set(defects.map(key));
  const isNew = defects.filter((d) => !(key(d) in DEBT));
  const stale = Object.keys(DEBT).filter((k) => !live.has(k));

  /* ---------------- report ---------------- */
  const pad = (s, w) => String(s).padEnd(w);
  const padL = (s, w) => String(s).padStart(w);
  const CLASSES = ['dangling', 'dup', 'when-conj', 'ceiling', 'void-lift'];
  const byClass = {}, topicsWith = {};
  CLASSES.forEach((c) => { byClass[c] = 0; topicsWith[c] = new Set(); });
  defects.forEach((d) => { byClass[d.cls]++; topicsWith[d.cls].add(d.id); });

  console.log('');
  console.log('  ' + pad('flag class', 12) + padL('defects', 9) + padL('topics', 8) + '   allowlisted');
  console.log('  ' + '-'.repeat(52));
  CLASSES.forEach((c) => {
    const allow = Object.keys(DEBT).filter((k) => k.split('::')[1] === c).length;
    console.log('  ' + pad(c, 12) + padL(byClass[c], 9) + padL(topicsWith[c].size, 8) + '   ' + padL(allow, 6));
  });
  console.log('  ' + '-'.repeat(52));
  const allTopics = new Set(defects.map((d) => d.id));
  console.log('  ' + pad('TOTAL', 12) + padL(defects.length, 9) + padL(allTopics.size + '/' + rep.ids.length, 8)
    + '   ' + padL(Object.keys(DEBT).length, 6));
  console.log('');

  const fatal = drift.length || isNew.length || stale.length;
  if (!fatal) {
    console.log('CRAM SURFACE: PASS  (' + rep.ids.length + ' topics, ' + defects.length
      + ' known cram-surface defect(s) allowlisted in cram_surface_debt.json across '
      + allTopics.size + ' topics; mirror verified against deriveCram on all ' + rep.ids.length + ')');
    process.exit(0);
  }

  console.log('CRAM SURFACE: FAIL');
  if (drift.length) {
    console.log('\n  ' + drift.length + ' MIRROR-DRIFT failure(s) -- this check no longer measures what the sheet shows:');
    drift.slice(0, 12).forEach((d) => console.log('    - ' + d));
    if (drift.length > 12) console.log('    ... and ' + (drift.length - 12) + ' more');
  }
  if (isNew.length) {
    console.log('\n  ' + isNew.length + ' NEW cram-surface defect(s) (not allowlisted in cram_surface_debt.json):');
    isNew.slice(0, 20).forEach((d) => console.log('    - ' + d.id + ' [' + d.cls + '] ' + d.path + '\n        ' + d.why + (d.ev ? '\n        text: "' + d.ev.slice(0, 110) + '"' : '')));
    if (isNew.length > 20) console.log('    ... and ' + (isNew.length - 20) + ' more');
  }
  if (stale.length) {
    console.log('\n  ' + stale.length + ' STALE baseline entr(ies) -- fixed, so delete from cram_surface_debt.json:');
    stale.slice(0, 20).forEach((k) => console.log('    - ' + k));
    if (stale.length > 20) console.log('    ... and ' + (stale.length - 20) + ' more');
  }

  /* The LAST line is what THE GATE prints in its summary row (check_all.py:last_line). */
  console.log('\nCRAM SURFACE: FAIL  (' + drift.length + ' mirror-drift, ' + isNew.length
    + ' new defect(s), ' + stale.length + ' stale baseline entr(ies); ' + defects.length
    + ' live defects across ' + allTopics.size + '/' + rep.ids.length + ' topics)');
  process.exit(1);
})();
