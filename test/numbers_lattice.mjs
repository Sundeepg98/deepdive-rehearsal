/* THE NUMBERS PANE MUST ACTUALLY COMPUTE SOMETHING.
 *
 * Every topic's Numbers pane is PARAMETRIC: `inputs` declares the assumptions, and
 * `compute(vals, fmt)` turns them into the rows the pane renders. The defaults are supposed to
 * DEMONSTRATE the topic's thesis -- move an assumption, watch the consequence move. Nothing
 * checked that they do, and ~a fifth of the corpus quietly does not: rows whose figure never
 * changes whatever you type, `over` flags that cannot fire, assumptions that feed no arithmetic
 * at all. The pane still renders, still looks authoritative, and teaches nothing.
 *
 * THE PROVEN INSTANCE (2026-07-20, _audit/2026-07-20-p0-floor.md #8). lambda-organization's
 * "Lambda vs always-on" row sized a container from Little's Law AVERAGE concurrency and billed it
 * 730h -- which hardcodes 100% utilization. The ratio reduces to `2.1228 + 25.474/(durMs*gb)`, so
 * it is never below ~2.12: `over: ratio > 1` was ALWAYS TRUE and the "Lambda wins" branch was
 * unreachable at every legal input. It was found by RUNNING the function across its input range,
 * not by reading it. This check is that method, productionized over all 46 topics.
 *
 * WHAT MAKES IT A REAL INSTRUMENT AND NOT A FALSE-POSITIVE MACHINE.
 *
 *  1. A CONSTANT `over` IS USUALLY CORRECT. 180 of the corpus's 292 `over:` sites are the literal
 *     `false` (or `true`) -- that row simply has no threshold, which is a legitimate design. Only
 *     an `over:` written as an EXPRESSION is claiming to be a threshold, and only those can be
 *     dead. So every verdict here is gated on a STATIC read of the row's source: literal =>
 *     never reported, expression + constant across the lattice => reported. Without that gate this
 *     check would open with 180 fabricated findings and be deleted within the day. The same gate
 *     applies to `v` (32 rows are legitimately literal figures).
 *
 *  2. THE APP SWALLOWS NaN, so you cannot find one by looking at the output. `_fmtN` is
 *     `if (!isFinite(x)) x = 0` (src/scripts/app/num/logic.js:168) -- a row that computes NaN
 *     renders as a confident "0", not as an error. Scanning rendered strings for "NaN" therefore
 *     MISSES every row that goes through fmt.n, which is most of them. So fmt is INSTRUMENTED:
 *     the harness passes a wrapper that records every non-finite value handed to it, and also
 *     scans the returned strings (for the rows that format their own numbers with .toFixed, where
 *     "NaN%" does reach the screen) and the raw values. Three prongs, because one is not enough.
 *
 *  3. `min` IS NOT ENFORCED ANYWHERE. The pane renders `<input type="number" min=...>` with NO
 *     max attribute (0 of 46 topics declare one), and `_nval` reads it as
 *     `isFinite(v) && v > 0 ? v : 0` (logic.js:175). So (a) the reachable domain is [0, inf), not
 *     [min, max]; (b) ZERO is reachable for EVERY input regardless of its declared min -- clearing
 *     the field is enough. Dividing by an assumption whose min is 1 is therefore a live defect, so
 *     zero is probed. It is probed SEPARATELY (class `nonfinite_zero`) and kept OUT of the
 *     variation lattice, because a value the author never declared must not be allowed to make a
 *     dead flag look alive.
 *
 * THE CLASSES (the brief's four, plus the two the corpus forced):
 *   const_row:<i>          row i's `v` is an expression, yet is byte-identical at every point.
 *   dead_flag_never:<i>    row i's `over` is an expression that is never true.
 *   dead_flag_always:<i>   ...or always true. Either way it is not a threshold, it is a constant.
 *   *_positive:<i>         the same two verdicts, restricted to the points where every assumption
 *                          is strictly positive. A guard like `x > 0 ? ... : 0` makes a dead flag
 *                          look alive on the strength of one degenerate corner; see the long note
 *                          at the class-1/2 site for the measurement that forced this.
 *   input_inert:<id>       moving this assumption changes NOTHING in the rendered pane.
 *   input_decorative:<id>  ...changes only prose (key/unit/note) -- it feeds no arithmetic.
 *   nonfinite:<i>          NaN/Infinity at a declared bound or at the canonical defaults.
 *   nonfinite_zero:<i>     ...only at the reachable-but-undeclared zero. Real, lower severity.
 *   compute_throws         the pane throws; nothing renders.
 *
 * THE LATTICE (deterministic; no Math.random anywhere in this file). Two ladders, because the
 * two questions have different costs -- see the note above ladderFor for the false positives that
 * shaped them.
 *   FACTORIAL ladder (~9-14 points/input): min, 1, min+step, the min..default midpoint,
 *   default/100, /10, /2, default, x2, x10, x100, x1000, plus 50/90/99/100 for a percentage.
 *   Raised to the input count (topics carry 4-6, distributed 37/5/4), so it is kept small. 37 of
 *   46 topics are EXHAUSTIVE at it; the rest are capped at CAP points sampled as
 *   `(j * 7919) mod total`, a permutation of the index space (7919 is prime and every radix is far
 *   smaller, so it cannot share a factor with the product) -- gap-free and reproducible, unlike a
 *   plain stride, which can alias a digit to a constant. All-min, all-default and all-top are
 *   always included. `--full` lifts the cap for a genuinely exhaustive run.
 *   SWEEP ladder (~40-60 points/input): the factorial ladder plus 25 linear steps across the near
 *   field and 25 geometric steps out to 1000x. Walked ONE INPUT AT A TIME from the defaults, so
 *   its cost is summed rather than multiplied and the density is nearly free. This is what decides
 *   input_inert / input_decorative -- exactly the question those classes ask -- and it is also what
 *   keeps the constancy verdicts honest, since more points can only ever turn "constant" into
 *   "varies". Total: ~568,000 evaluations across the corpus, ~21s.
 *
 * THE RATCHET. This lands on a corpus that already has defects, so it ships with
 * test/numbers_lattice_debt.json: a finding NOT in the baseline FAILS (a new one was introduced),
 * and a baseline entry no longer detected FAILS as STALE (delete it -- the list may only shrink).
 * Same discipline as parity_debt.json. Refresh with `node test/numbers_lattice.mjs --write-debt`.
 *
 * SELF-TEST, EVERY RUN. Eleven synthetic panes go through the same analyze() as the corpus and the
 * run ABORTS if the detected set is not exactly the expected set. Nine carry one planted defect
 * each (one per class); one is the REAL pre-fix lambda-organization compute, which the first
 * version of this check ran green on; and one is deliberately CLEAN. Neuter any detector and its
 * fixture stops being flagged; make any detector over-eager and the clean fixture starts being
 * flagged. A check that cannot fail is not a check, and this one is re-armed on every invocation
 * rather than at review time.
 *
 * Pure node, no browser, no network. Reads the compiled slices under src/topics/_generated/
 * (written by the same build `build_integrity` runs) plus the 8 hand-coded src/topics/<id>/num.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const TOPICS = path.join(ROOT, 'src', 'topics');
const GENERATED = path.join(TOPICS, '_generated');
const MD_DIR = path.join(ROOT, 'src', 'topics-md');   // the INDEPENDENT coverage reference
const DEBT_FILE = path.join(HERE, 'numbers_lattice_debt.json');

const WRITE_DEBT = process.argv.includes('--write-debt');
const FULL = process.argv.includes('--full');
const VERBOSE = process.argv.includes('--verbose');

const CAP = FULL ? 5000000 : 20000;     // max product points evaluated per topic
const STRIDE_K = 7919;                  // prime; coprime to any product of radices <= 7

/* ------------------------------------------------------------------------------------------
 * fmt -- copied VERBATIM from the pane (src/scripts/app/num/logic.js:168-174), because the
 * swallowing behaviour is the thing being worked around and a "cleaner" reimplementation would
 * change what compute() sees. The wrapper records non-finite arguments before delegating.
 * ---------------------------------------------------------------------------------------- */
function fmtN(x) { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); }
function fmtTB(tb) {
  if (!isFinite(tb)) tb = 0;
  if (tb >= 1000) return (tb / 1000).toFixed(tb >= 10000 ? 0 : 1) + ' PB';
  if (tb >= 10) return tb.toFixed(0) + ' TB';
  return tb.toFixed(2) + ' TB';
}
function instrumentedFmt(sink) {
  return {
    n: function (x) { if (typeof x !== 'number' || !isFinite(x)) sink.hit = true; return fmtN(x); },
    tb: function (x) { if (typeof x !== 'number' || !isFinite(x)) sink.hit = true; return fmtTB(x); },
  };
}

/* ------------------------------------------------------------------------------------------
 * SOURCE SCANNER. Walks JS tracking string / template / comment state, so that an apostrophe
 * inside a line comment cannot open a bogus string -- `// Little's Law` is real, it is in
 * lambda-organization's compute, and a naive scanner silently mis-parses every row after it.
 * ---------------------------------------------------------------------------------------- */
function skipAtomic(src, i, limit) {
  // returns the index just past a comment or string starting at i, or -1 if none starts here
  const c = src[i];
  if (c === '/' && src[i + 1] === '/') { while (i <= limit && src[i] !== '\n') i++; return i; }
  if (c === '/' && src[i + 1] === '*') { i += 2; while (i <= limit && !(src[i] === '*' && src[i + 1] === '/')) i++; return i + 2; }
  if (c === "'" || c === '"' || c === '`') {
    const q = c; i++;
    while (i <= limit && src[i] !== q) { if (src[i] === '\\') i++; i++; }
    return i + 1;
  }
  return -1;
}

function matchBracket(src, start) {
  let depth = 0, i = start;
  const n = src.length;
  while (i < n) {
    const j = skipAtomic(src, i, n - 1);
    if (j >= 0) { i = j; continue; }
    const c = src[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function splitTopLevel(src, from, to) {
  const out = [];
  let depth = 0, i = from, seg = from;
  while (i <= to) {
    const j = skipAtomic(src, i, to);
    if (j >= 0) { i = j; continue; }
    const c = src[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ',' && depth === 0) { out.push([seg, i - 1]); seg = i + 1; }
    i++;
  }
  if (seg <= to) out.push([seg, to]);
  return out;
}

/* Per-ROW static classification. Granularity matters: backpressure inserts a pre-built row
 * variable (`fillRow`) into its array, and failing the whole topic over one such row would
 * discard five perfectly classifiable ones. An unclassifiable row is excluded from the two
 * source-gated classes and SAID SO in the coverage line -- never silently treated as clean. */
function classifyRows(fnSrc) {
  const re = /\breturn\s*\[/g;
  const starts = [];
  let m;
  while ((m = re.exec(fnSrc))) starts.push(m.index + m[0].length - 1);
  if (starts.length !== 1) return { ok: false, why: 'compute has ' + starts.length + ' return-array sites (expected 1)' };
  const close = matchBracket(fnSrc, starts[0]);
  if (close < 0) return { ok: false, why: 'unbalanced return array' };
  const rows = [];
  for (const [a, b] of splitTopLevel(fnSrc, starts[0] + 1, close - 1)) {
    let s = a;
    while (s <= b && /\s/.test(fnSrc[s])) s++;
    if (fnSrc[s] !== '{') { rows.push({ opaque: true }); continue; }
    const rc = matchBracket(fnSrc, s);
    if (rc < 0) { rows.push({ opaque: true }); continue; }
    const row = {};
    for (const [pa, pb] of splitTopLevel(fnSrc, s + 1, rc - 1)) {
      const seg = fnSrc.slice(pa, pb + 1);
      const km = /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/.exec(seg);
      if (!km) continue;
      row[km[1] || km[2] || km[3]] = seg.slice(km[0].length).trim();
    }
    rows.push(row);
  }
  return { ok: true, rows };
}

const NUMERIC_LITERAL = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
function isLiteralExpr(expr) {
  if (expr === undefined) return true;                 // absent key: constant by construction
  const e = expr.trim();
  if (e === 'true' || e === 'false' || e === 'null' || e === 'undefined') return true;
  if (NUMERIC_LITERAL.test(e)) return true;
  if (e[0] === "'" || e[0] === '"') {                  // one whole string literal, not a concat
    const q = e[0];
    let i = 1;
    while (i < e.length && e[i] !== q) { if (e[i] === '\\') i++; i++; }
    return i === e.length - 1;
  }
  return false;
}

/* ------------------------------------------------------------------------------------------
 * LOADING. Each slice is `var <PREFIX>_NUM = {...}` -- a plain script, so it evaluates in a bare
 * vm context with NO DOM globals present. A compute() that reaches for document/window therefore
 * throws here rather than being quietly tolerated, which is the purity guard the brief asks for.
 * ---------------------------------------------------------------------------------------- */
function loadSlice(file) {
  const ctx = Object.create(null);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { timeout: 10000 });
  const key = Object.keys(ctx).find((k) => /_NUM$/.test(k));
  return key ? ctx[key] : null;
}

function discover() {
  const out = [];
  for (const d of fs.readdirSync(TOPICS, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name === '_generated') continue;
    const f = path.join(TOPICS, d.name, 'num.js');
    if (fs.existsSync(f)) out.push({ id: d.name, file: f, origin: 'hand-coded' });
  }
  if (fs.existsSync(GENERATED)) {
    for (const d of fs.readdirSync(GENERATED, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const f = path.join(GENERATED, d.name, 'num.js');
      if (fs.existsSync(f)) out.push({ id: d.name, file: f, origin: 'compiled' });
    }
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/* ------------------------------------------------------------------------------------------
 * THE LATTICE
 * ---------------------------------------------------------------------------------------- */
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/* EVERY FALSE POSITIVE THIS CHECK HAS PRODUCED CAME FROM A LADDER THAT DID NOT LOOK HARD ENOUGH,
 * and all of them claimed a row "never moves" when it moves somewhere the ladder skipped. The
 * three that survived to a hand review, each refuted by a denser independent sweep:
 *   distributed-locks "Serialized throughput"  -- moves at a 1s critical section; the ladder's
 *                     smallest positive point was 2.5s, and fmt.n (Math.round) renders every
 *                     throughput below 0.5 as the same "~0".
 *   caching "Cost of losing 1 point"           -- its `over` fires at a hit ratio of 99.5%; the
 *                     ladder went 90 -> 180, straight over the top of a bounded percentage.
 *   real-time-delivery "Write amplification"   -- flips at a FRACTIONAL follower count.
 * So the geometry is deliberately asymmetric. The FACTORIAL ladder below stays small (it is
 * raised to the power of the input count), and the SWEEP ladder -- which is summed, not
 * multiplied, and is therefore nearly free -- is dense. Density can only ever turn a "constant"
 * verdict into "varies", so spending it here makes the check strictly more conservative: it
 * under-reports rather than inventing work. A percentage is recognised from the authoring
 * convention for its unit ("(%)" or "% of"), because a geometric ladder is simply the wrong
 * shape for a quantity whose interesting behaviour is packed against 100. */
const PERCENT_ANCHORS = [1, 10, 25, 50, 75, 90, 95, 99, 99.9, 100];
const PERCENT_CEIL = 100;               // a percentage's semantic ceiling; see below
const isPercent = (input) => /\(%\)|%\s+of\b/.test(String(input.label || ''));
/* A percentage is also capped, not just anchored. Left to the generic geometric ladder, saga's
 * "Per-step failure (%)" was driven to 1000%, where `Math.pow(1 - 10, steps)` overflows to
 * Infinity and the pane reports NaN -- a true statement about a 1000% failure rate and a useless
 * thing to put on anyone's work-list. An overshoot to 150% was tried and is no better: it makes
 * slos compute a 150% availability target across 3,000 hard dependencies, `Math.pow(1.5, 3000)`,
 * and report "Infinity%". Neither is a scenario anyone will fix, so the ceiling is the semantic
 * one. The genuinely reachable robustness case -- a user clearing the field -- is not lost; it is
 * what the separate `nonfinite_zero` probe exists for. */
const ceilFor = (input) => (isPercent(input) ? PERCENT_CEIL : Infinity);

function ladderFor(input) {
  const d = Number(input.value);
  const rawMin = Number(input.min);
  const m = Number.isFinite(rawMin) ? rawMin : 0;
  const base = Number.isFinite(d) ? d : m;
  const step = Number(input.step);
  const cand = [m, base, base / 100, base / 10, base * 2, base * 10, base * 100, base * 1000, 1];
  if (Number.isFinite(step) && step > 0) cand.push(m + step);
  if (base > m) cand.push(m + (base - m) / 2, base / 2);
  if (isPercent(input)) cand.push(50, 90, 99, 100);
  const ceil = ceilFor(input);
  let pts = cand.filter((x) => Number.isFinite(x) && x >= m && x <= ceil).map(round6);
  pts = [...new Set(pts)].sort((a, b) => a - b);
  if (pts.length < 3) {                       // default == min, or a default of 0: widen it
    for (const extra of [m + 1, m + 10, m + 100]) if (!pts.includes(extra)) pts.push(round6(extra));
    pts = [...new Set(pts)].sort((a, b) => a - b);
  }
  return pts;
}

/* The one-at-a-time ladder: ~60 points, linear across the near field and geometric out to 1000x,
 * plus the percentage anchors. Cost is linear in the input count, so this is where the coverage
 * is bought. */
function sweepFor(input) {
  const d = Number(input.value);
  const rawMin = Number(input.min);
  const m = Number.isFinite(rawMin) ? rawMin : 0;
  const base = Number.isFinite(d) && d !== 0 ? d : Math.max(m, 1);
  const pts = new Set(ladderFor(input));
  const hi = Math.max(base * 3, m + 100);
  for (let i = 0; i <= 24; i++) pts.add(round6(m + (hi - m) * (i / 24)));
  const lo = Math.max(m, Math.abs(base) / 1000, 1e-3);
  const top = Math.max(Math.abs(base) * 1000, lo * 1e6);
  if (top > lo) for (let i = 0; i <= 24; i++) pts.add(round6(lo * Math.pow(top / lo, i / 24)));
  if (isPercent(input)) for (const p of PERCENT_ANCHORS) pts.add(p);
  const ceil = ceilFor(input);
  return [...pts].filter((x) => Number.isFinite(x) && x >= m && x <= ceil).sort((a, b) => a - b);
}

function decodeIndex(idx, radices) {
  const out = new Array(radices.length);
  for (let i = radices.length - 1; i >= 0; i--) { out[i] = idx % radices[i]; idx = Math.floor(idx / radices[i]); }
  return out;
}

/* ------------------------------------------------------------------------------------------
 * EVALUATION
 * ---------------------------------------------------------------------------------------- */
function rowSignature(r) {
  return JSON.stringify([String(r && r.k), String(r && r.v), String(r && r.u), String(r && r.n), !!(r && r.over)]);
}

const NONFINITE_TEXT = /\b(?:NaN|Infinity)\b/;
function rowIsNonFinite(r) {
  if (!r || typeof r !== 'object') return true;
  if (typeof r.v === 'number' && !isFinite(r.v)) return true;
  if (r.v === undefined || r.v === null) return true;
  for (const key of ['k', 'v', 'u', 'n']) {
    const s = r[key];
    if (typeof s === 'string' && NONFINITE_TEXT.test(s)) return true;
  }
  return false;
}

/* One evaluation. Returns null if compute threw. */
function evalAt(compute, vals) {
  const sink = { hit: false };
  let rows;
  try { rows = compute(vals, instrumentedFmt(sink)); } catch (e) { return { threw: String(e && e.message || e) }; }
  if (!Array.isArray(rows)) return { threw: 'compute did not return an array' };
  const bad = new Set();
  for (let i = 0; i < rows.length; i++) if (rowIsNonFinite(rows[i])) bad.add(i);
  // fmt was handed a non-finite value somewhere in this evaluation; attribute it to the rows
  // whose text could not have come from a finite input is impossible, so attribute to ALL rows
  // only when no row already self-reports. Precise attribution comes from the per-row scan.
  return { rows, sink: sink.hit, bad };
}

function analyze(topic) {
  const { id, mod, source } = topic;
  const findings = new Map();          // findingId -> human label
  const notes = [];

  if (!mod || typeof mod.compute !== 'function') return { skip: 'no compute() in the num slice' };
  const inputs = Array.isArray(mod.inputs) ? mod.inputs : [];
  if (!inputs.length) return { skip: 'the pane declares no inputs -- nothing to drive' };

  const defaults = {};
  for (const f of inputs) defaults[f.id] = Number(f.value);

  const probe = evalAt(mod.compute, defaults);
  if (probe.threw) {
    findings.set('compute_throws', 'at the canonical defaults: ' + probe.threw);
    return { findings, notes, rowCount: 0, points: 1, exhaustive: true };
  }
  const rowCount = probe.rows.length;
  const labels = probe.rows.map((r, i) => String((r && r.k) !== undefined ? r.k : 'row ' + i));

  const cls = classifyRows(mod.compute.toString());
  let staticRows = null;
  if (!cls.ok) notes.push('source unclassifiable (' + cls.why + ') -- const_row/dead_flag not judged');
  else if (cls.rows.length !== rowCount) notes.push('static rows ' + cls.rows.length + ' != runtime rows ' + rowCount + ' -- const_row/dead_flag not judged');
  else staticRows = cls.rows;

  const opaque = staticRows ? staticRows.map((r, i) => (r.opaque ? i : -1)).filter((i) => i >= 0) : [];
  if (opaque.length) notes.push('rows [' + opaque.join(',') + '] are not object literals -- excluded from const_row/dead_flag');

  const ladders = inputs.map(ladderFor);
  const sweeps = inputs.map(sweepFor);
  const radices = ladders.map((l) => l.length);
  const total = radices.reduce((a, b) => a * b, 1);

  // --- the point set (declared range only) ------------------------------------------------
  const seen = new Set();
  const points = [];
  const pushPoint = (choice) => {
    const key = choice.join(',');
    if (seen.has(key)) return;
    seen.add(key);
    const v = {};
    for (let i = 0; i < inputs.length; i++) v[inputs[i].id] = ladders[i][choice[i]];
    points.push(v);
  };
  const exhaustive = total <= CAP;
  if (exhaustive) {
    for (let i = 0; i < total; i++) pushPoint(decodeIndex(i, radices));
  } else {
    pushPoint(radices.map(() => 0));                                    // all-min
    pushPoint(radices.map((r) => r - 1));                               // all-top
    pushPoint(ladders.map((l, i) => Math.max(0, l.indexOf(round6(Number(inputs[i].value))))));
    for (let j = 0; j < CAP; j++) pushPoint(decodeIndex((j * STRIDE_K) % total, radices));
  }

  // --- one-at-a-time sweep: the exact question input_inert / input_decorative ask -----------
  const oat = [];   // [inputIndex, vals]
  for (let i = 0; i < inputs.length; i++) {
    for (const p of sweeps[i]) {
      const v = Object.assign({}, defaults);
      v[inputs[i].id] = p;
      oat.push([i, v]);
    }
  }

  // --- evaluate ----------------------------------------------------------------------------
  const vSets = Array.from({ length: rowCount }, () => new Set());
  const overSets = Array.from({ length: rowCount }, () => new Set());
  // ...and the same two, restricted to points where EVERY assumption is strictly positive. See
  // ZERO COLLAPSES THE MODEL, below, for why this second pass is not optional.
  const vSetsPos = Array.from({ length: rowCount }, () => new Set());
  const overSetsPos = Array.from({ length: rowCount }, () => new Set());
  const nonFinite = new Set();
  let threwAt = null, posPoints = 0;

  const consume = (vals, collect) => {
    const r = evalAt(mod.compute, vals);
    if (r.threw) { if (!threwAt) threwAt = r.threw; return null; }
    const positive = inputs.every((f) => vals[f.id] > 0);
    if (collect && positive) posPoints++;
    for (let i = 0; i < r.rows.length && i < rowCount; i++) {
      if (collect) {
        vSets[i].add(String(r.rows[i] && r.rows[i].v)); overSets[i].add(!!(r.rows[i] && r.rows[i].over));
        if (positive) { vSetsPos[i].add(String(r.rows[i] && r.rows[i].v)); overSetsPos[i].add(!!(r.rows[i] && r.rows[i].over)); }
      }
    }
    return r.rows;
  };

  for (const p of points) consume(p, true);
  // The default vector is already IN `points` (the ladder always carries the default, and the
  // capped path pushes its index explicitly), so this evaluation is for the OAT comparison
  // baseline only -- collecting from it again would double-count one point in `posPoints`, which
  // is quoted verbatim in the finding text.
  const baseRows = consume(defaults, false);
  const baseSig = baseRows ? baseRows.map(rowSignature) : null;

  // OAT: collect into the same sets (they are declared-range points too) and judge inputs
  const movedAll = inputs.map(() => false);
  const movedValueOrFlag = inputs.map(() => false);
  const oatPoints = inputs.map(() => 0);
  for (const [i, vals] of oat) {
    const rows = consume(vals, true);
    if (!rows || !baseSig) continue;
    oatPoints[i]++;
    for (let r = 0; r < rowCount; r++) {
      const sig = rowSignature(rows[r]);
      if (sig !== baseSig[r]) {
        movedAll[i] = true;
        const a = rows[r], b = baseRows[r];
        if (String(a && a.v) !== String(b && b.v) || !!(a && a.over) !== !!(b && b.over)) movedValueOrFlag[i] = true;
      }
    }
  }

  if (threwAt) findings.set('compute_throws', 'inside the declared lattice: ' + threwAt);

  /* --- class 1 + 2: gated on the STATIC source read -----------------------------------------
   *
   * ZERO COLLAPSES THE MODEL, AND ONE DEGENERATE POINT WAS ENOUGH TO HIDE THE DEFECT THIS CHECK
   * WAS BUILT FOR. Run against lambda-organization's real pre-fix source (37cdd8c^), the whole-
   * lattice test reported its ratio flag ALIVE and the check went green on the exact defect the
   * p0-floor audit had already proven dead. Measured: of 10,584 product points, `over: ratio > 1`
   * was false at 1,764 -- and EVERY ONE of them had rps = 0, where fargateMo becomes 0 and the
   * `fargateMo > 0 ? ... : 0` guard hands back a ratio of 0. At zero traffic the pane is not
   * teaching anything; it is showing the guard. So a row is judged twice: over the whole declared
   * lattice (the hard verdict) and over the points where every assumption is strictly positive.
   * A row that is constant only in the second pass gets the `_positive` class -- still a defect,
   * because the pane demonstrates nothing across its entire meaningful range, but named so the
   * fix wave knows the flag does technically move at a zeroed input. Zero is the right place to
   * cut: it is where guards fire and models degenerate, so the carve-out is structural, not a
   * tuned threshold. The `_positive` verdict is withheld when too few positive points exist to
   * support it, rather than asserted on thin evidence.
   */
  const POS_FLOOR = 8;
  if (staticRows) {
    for (let i = 0; i < rowCount; i++) {
      const sr = staticRows[i];
      if (!sr || sr.opaque) continue;
      if (!isLiteralExpr(sr.v)) {
        if (vSets[i].size === 1) findings.set('const_row:' + i, labels[i] + ' -- computed, but identical at every point');
        else if (posPoints >= POS_FLOOR && vSetsPos[i].size === 1) {
          findings.set('const_row_positive:' + i, labels[i] + ' -- identical across all ' + posPoints + ' sampled points with every assumption > 0');
        }
      }
      if (!isLiteralExpr(sr.over)) {
        if (overSets[i].size === 1) {
          const always = overSets[i].has(true);
          findings.set('dead_flag_' + (always ? 'always' : 'never') + ':' + i,
            labels[i] + ' -- `over` is an expression that is ' + (always ? 'always true' : 'never true'));
        } else if (posPoints >= POS_FLOOR && overSetsPos[i].size === 1) {
          const always = overSetsPos[i].has(true);
          findings.set('dead_flag_' + (always ? 'always' : 'never') + '_positive:' + i,
            labels[i] + ' -- `over` is ' + (always ? 'always true' : 'never true') + ' across all ' + posPoints
            + ' sampled points with every assumption > 0');
        }
      }
    }
  }

  // --- class 4: inputs ---------------------------------------------------------------------
  for (let i = 0; i < inputs.length; i++) {
    if (sweeps[i].length < 2 || oatPoints[i] < 2) { notes.push('input ' + inputs[i].id + ' could not be moved -- not judged'); continue; }
    if (!movedAll[i]) findings.set('input_inert:' + inputs[i].id, String(inputs[i].label) + ' -- moving it changes nothing in the pane');
    else if (!movedValueOrFlag[i]) findings.set('input_decorative:' + inputs[i].id, String(inputs[i].label) + ' -- changes only prose; feeds no figure and no flag');
  }

  /* --- class 3: non-finite ------------------------------------------------------------------
   * SCOPED TO THE BOUNDS AND THE DEFAULTS, which is what the brief asks for and, it turned out,
   * the only scope that stays useful. Sweeping NaN across the whole dense lattice reported saga
   * -- correctly, in the narrow sense: `Math.pow(1 - pfail, steps)` really is NaN when the
   * failure rate exceeds 100% AND the step count is fractional, because a negative base to a
   * fractional exponent is NaN. Both are typeable and neither is a scenario; a pane cannot be
   * held to a 150%-failure-rate saga of 6.083 steps. Corner-hunting a continuous lattice for
   * arithmetic edge cases manufactures work faster than anyone can triage it, so this asks the
   * bounded question instead: at the floor, at the ceiling of the ladder, at the canonical
   * defaults, and one input at a time at each -- does the pane produce a number?
   */
  const boundsProbes = [defaults,
    Object.fromEntries(inputs.map((f, i) => [f.id, ladders[i][0]])),
    Object.fromEntries(inputs.map((f, i) => [f.id, ladders[i][ladders[i].length - 1]]))];
  for (let i = 0; i < inputs.length; i++) {
    boundsProbes.push(Object.assign({}, defaults, { [inputs[i].id]: ladders[i][0] }));
    boundsProbes.push(Object.assign({}, defaults, { [inputs[i].id]: ladders[i][ladders[i].length - 1] }));
  }
  for (const p of boundsProbes) {
    const r = evalAt(mod.compute, p);
    if (r.threw) continue;                                  // already reported via threwAt
    for (const i of r.bad) nonFinite.add(i);
    // fmt was handed a non-finite value and returned "0" for it. Which ROW called it is not
    // recoverable (compute builds them all before returning), so this is reported at topic level
    // -- and reported even when another row self-reports, because they are different rows.
    if (r.sink) nonFinite.add(-1);
  }

  for (const i of [...nonFinite].sort((a, b) => a - b)) {
    if (i < 0) findings.set('nonfinite:swallowed', 'at a declared bound, fmt was handed NaN/Infinity and rendered it as "0" -- a confident wrong number');
    else findings.set('nonfinite:' + i, labels[i] + ' -- NaN/Infinity at a declared bound or the defaults');
  }

  // zero is reachable for EVERY input (clear the field -> _nval returns 0) whatever `min` says.
  // Kept out of the lattice above so it can never make a dead flag look alive.
  const zeroBad = new Set();
  const zeroProbes = [Object.fromEntries(inputs.map((f) => [f.id, 0]))];
  for (const f of inputs) zeroProbes.push(Object.assign({}, defaults, { [f.id]: 0 }));
  for (const z of zeroProbes) {
    const r = evalAt(mod.compute, z);
    if (r.threw) { findings.set('compute_throws:zero', 'with an emptied field: ' + r.threw); continue; }
    for (const i of r.bad) zeroBad.add(i);
    if (r.sink) zeroBad.add(-1);
  }
  for (const i of [...zeroBad].sort((a, b) => a - b)) {
    if (nonFinite.has(i)) continue;                                  // already reported, stronger
    if (i < 0) findings.set('nonfinite_zero:swallowed', 'an emptied field makes fmt swallow NaN/Infinity into a "0"');
    else findings.set('nonfinite_zero:' + i, (labels[i] || 'row ' + i) + ' -- NaN/Infinity when a field is emptied');
  }

  return { findings, notes, rowCount, points: seen.size + oat.length, exhaustive, source, inputs: inputs.length };
}

/* ------------------------------------------------------------------------------------------
 * SELF-TEST. Seven synthetic panes through the SAME analyze(). Six carry exactly one planted
 * defect; the seventh is deliberately CLEAN and is the arm that catches an over-eager detector
 * (without it, `return true` for every predicate would pass all six). Runs on every invocation.
 * ---------------------------------------------------------------------------------------- */
const FIXTURES = [
  { name: 'const_row', expect: ['const_row:1'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 1 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var t = vals.a * vals.b;
        return [ { k: 'live', v: fmt.n(t), u: 'x', n: 'moves', over: t > 20 },
                 { k: 'stuck', v: fmt.n(7 * 1), u: 'x', n: 'never moves', over: t > 20 } ]; } };` },
  { name: 'dead_flag_never', expect: ['dead_flag_never:0'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 1 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var t = vals.a * vals.b;
        return [ { k: 'never', v: fmt.n(t), u: 'x', n: 'flag cannot fire', over: t < 0 },
                 { k: 'ok', v: fmt.n(vals.b), u: 'x', n: 'fine', over: vals.b > 5 } ]; } };` },
  { name: 'dead_flag_always', expect: ['dead_flag_always:0'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 1 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var t = vals.a * vals.b;
        return [ { k: 'always', v: fmt.n(t), u: 'x', n: 'flag always on', over: t >= 0 },
                 { k: 'ok', v: fmt.n(vals.b), u: 'x', n: 'fine', over: vals.b > 5 } ]; } };` },
  // The two `_positive` arms. Each is alive across the WHOLE declared lattice and dead across
  // every point where the assumptions are positive -- the shape lambda-organization shipped, and
  // the shape that walked straight through the first version of this check.
  { name: 'dead_flag_positive', expect: ['dead_flag_always_positive:0'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 0 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var r = vals.a > 0 ? 5 + vals.b : 0;
        return [ { k: 'guarded', v: fmt.n(r), u: 'x', n: 'the guard is the only thing that flips it', over: r > 1 },
                 { k: 'ok', v: fmt.n(vals.b * 2), u: 'x', n: 'fine', over: vals.b > 5 } ]; } };` },
  { name: 'const_row_positive', expect: ['const_row_positive:0'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 0 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var pinned = vals.a > 0 ? 42 : 0;
        return [ { k: 'pinned', v: fmt.n(pinned), u: 'x', n: 'moves only at a zeroed input', over: false },
                 { k: 'ok', v: fmt.n(vals.a + vals.b), u: 'x', n: 'fine', over: vals.b > 5 } ]; } };` },
  { name: 'input_inert', expect: ['input_inert:b'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 1 }, { id: 'b', label: 'Unused', value: 4, min: 1 }],
      compute: function (vals, fmt) {
        return [ { k: 'only a', v: fmt.n(vals.a * 2), u: 'x', n: 'b never appears', over: vals.a > 5 } ]; } };` },
  { name: 'input_decorative', expect: ['input_decorative:b'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 1 }, { id: 'b', label: 'Prose only', value: 4, min: 1 }],
      compute: function (vals, fmt) {
        return [ { k: 'only a', v: fmt.n(vals.a * 2), u: 'x', n: 'across ' + fmt.n(vals.b) + ' things', over: vals.a > 5 } ]; } };` },
  { name: 'nonfinite', expect: ['nonfinite:0'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 0 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var r = vals.b / vals.a;
        return [ { k: 'div', v: r.toFixed(2), u: 'x', n: 'divides by a, whose min is 0', over: r > 1 } ]; } };` },
  // min 1, so the DECLARED range is safe and only the emptied field breaks it -- the arm that
  // keeps the reachable-zero probe honest and distinguishes it from the declared-range class.
  { name: 'nonfinite_zero', expect: ['nonfinite_zero:0'],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 1 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var r = vals.b / vals.a;
        return [ { k: 'div', v: r.toFixed(2), u: 'x', n: 'divides by a, whose min is 1', over: r > 1 } ]; } };` },
  /* THE HISTORICAL ARM -- lambda-organization's Numbers compute EXACTLY as it shipped, from
   * 37cdd8c^ (only the note prose is trimmed; every line of arithmetic is verbatim). This is the
   * defect the p0-floor audit proved dead by hand on 2026-07-20: the container is sized from
   * Little's Law AVERAGE concurrency and billed 730h, which hardcodes 100% utilization, so
   * `ratio` reduces to 2.1228 + 25.474/(durMs*gb) and never falls below ~2.12.
   * THE FIRST VERSION OF THIS CHECK RAN GREEN ON IT. That is why the fixture is here rather than
   * in a report: a real, shipped, independently-proven defect is the only fixture that can attest
   * this check would have caught the thing it was built to catch, and it is re-armed every run.
   * Row 4 is `over: ratio > 1`; the whole-lattice pass calls it alive on the strength of rps = 0
   * alone, and only the strictly-positive pass names it. */
  { name: 'historical_lambda_prefix', expect: ['dead_flag_always_positive:4'],
    src: `var F_NUM = { inputs: [
        { id: 'rps', label: 'Steady request rate (req/s)', value: 200, min: 0, step: 10 },
        { id: 'durMs', label: 'Avg duration (ms)', value: 120, min: 1, step: 10 },
        { id: 'memMb', label: 'Memory (MB)', value: 1024, min: 128, step: 128 },
        { id: 'accountLimit', label: 'Account concurrency limit', value: 1000, min: 0, step: 100 },
        { id: 'fns', label: 'Functions in the estate', value: 108, min: 0, step: 10 }],
      compute: function (vals, fmt) {
        var rps = vals.rps, durMs = vals.durMs, memMb = vals.memMb;
        var limit = vals.accountLimit, fns = vals.fns;
        var gb = memMb / 1024;
        var conc = rps * (durMs / 1000);
        var poolPct = limit > 0 ? (conc / limit) * 100 : 0;
        var invPerMo = rps * 2592000;
        var gbSec = invPerMo * (durMs / 1000) * gb;
        var lambdaMo = (invPerMo / 1e6) * 0.20 + gbSec * 0.0000166667;
        var vcpu = conc * (memMb / 1769);
        var fargateMo = 730 * (vcpu * 0.04048 + conc * gb * 0.004445);
        var ratio = fargateMo > 0 ? lambdaMo / fargateMo : 0;
        var estate = conc * fns;
        return [
          { k: 'Concurrency needed', v: fmt.n(Math.ceil(conc)), u: 'concurrent', n: 'rate x duration', over: false },
          { k: 'Share of the shared pool', v: poolPct.toFixed(1) + '%', u: 'of ' + fmt.n(limit), n: 'draw on the pool', over: poolPct > 50 },
          { k: 'Lambda cost / month', v: '$' + fmt.n(Math.round(lambdaMo)), u: '/mo', n: 'over ' + fmt.n(Math.round(invPerMo / 1e6)) + 'M invocations', over: false },
          { k: 'Always-on equivalent', v: '$' + fmt.n(Math.round(fargateMo)), u: '/mo', n: 'the same steady compute as Fargate', over: false },
          { k: 'Lambda vs always-on', v: ratio.toFixed(1) + 'x', u: 'the container', n: ratio > 1 ? 'STEADY enough that Lambda pays a premium' : 'Lambda wins', over: ratio > 1 },
          { k: 'If all ' + fmt.n(fns) + ' did this', v: fmt.n(Math.ceil(estate)), u: 'concurrent', n: 'aggregate draw against a ' + fmt.n(limit) + ' pool', over: estate > limit }
        ]; } };` },
  // THE NEGATIVE CONTROL. Every division is guarded, every figure moves, and the one constant row
  // is a source literal. If any detector becomes over-eager this is what goes red -- without it,
  // a predicate stubbed to `true` would satisfy all six planted fixtures above.
  { name: 'clean', expect: [],
    src: `var F_NUM = { inputs: [{ id: 'a', label: 'A', value: 10, min: 1 }, { id: 'b', label: 'B', value: 4, min: 1 }],
      compute: function (vals, fmt) { var t = vals.a * vals.b, s = vals.b > 0 ? vals.a / vals.b : 0;
        return [ { k: 'product', v: fmt.n(t), u: 'x', n: 'moves with both', over: t > 100 },
                 { k: 'ratio', v: s.toFixed(2), u: 'x', n: 'also moves', over: s > 3 },
                 { k: 'fixed', v: 'always this', u: 'x', n: 'literal by design', over: false } ]; } };` },
];

function selfTest() {
  const fails = [];
  for (const f of FIXTURES) {
    const ctx = Object.create(null);
    vm.runInNewContext(f.src, ctx);
    const res = analyze({ id: 'selftest/' + f.name, mod: ctx.F_NUM, source: 'selftest' });
    const got = res.skip ? ['SKIP:' + res.skip] : [...res.findings.keys()].sort();
    const want = [...f.expect].sort();
    if (got.join('|') !== want.join('|')) fails.push('  ' + f.name + ': expected [' + want.join(', ') + '] got [' + got.join(', ') + ']');
  }
  return fails;
}

/* ------------------------------------------------------------------------------------------
 * ASCII. The gate prints a check's last line to a cp1252 console, and a row key can carry a
 * multiplication sign or an en dash. Everything written or printed goes through this.
 * ---------------------------------------------------------------------------------------- */
function toAscii(s) {
  // Newline and tab are STRUCTURE, not content: this runs over whole JSON documents as well as
  // over single log lines, and escaping the separators produced a debt file that was one long
  // invalid line. Everything outside printable ASCII becomes a \uXXXX escape, which JSON reads
  // back as the original character while keeping the file itself byte-ASCII.
  return String(s).replace(/[^\x09\x0A\x20-\x7E]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

function main() {
  const stFails = selfTest();
  if (stFails.length) {
    console.log('SELF-TEST FAILED -- the detectors are not measuring what they claim:');
    stFails.forEach((l) => console.log(l));
    console.log('NUMBERS LATTICE: FAIL (self-test: ' + stFails.length + ' of ' + FIXTURES.length
      + ' planted fixtures mis-detected; the corpus was not judged)');
    process.exit(1);
  }

  const targets = discover();
  if (!targets.length) {
    console.log('NUMBERS LATTICE: FAIL (no num slices found -- run `npm run build` to write src/topics/_generated/)');
    process.exit(1);
  }

  /* COVERAGE IS ASSERTED AGAINST AN INDEPENDENT REFERENCE, because the interesting failure is not
   * an empty run -- it is a SHORT one that still reads like a full one. src/topics/_generated/ is
   * gitignored build output; the 8 hand-coded slices are committed. So with the generated tree
   * absent this check happily drove 8 topics and reported "8/8 topics driven", which is a true
   * sentence and a completely misleading one. On an empty baseline it would have printed PASS
   * while covering 8 of 46. The reference is the authored markdown -- files this check does not
   * write, parse, or otherwise depend on -- and a shortfall is a HARNESS fault, not a defect. */
  const authored = fs.existsSync(MD_DIR)
    ? fs.readdirSync(MD_DIR).filter((f) => f.endsWith('.md')).length : 0;
  const compiled = targets.filter((t) => t.origin === 'compiled').length;
  if (compiled < authored) {
    console.log('NUMBERS LATTICE: FAIL (' + compiled + ' compiled num slices for ' + authored
      + ' authored topics in src/topics-md/ -- ' + (authored - compiled) + ' missing. This is a '
      + 'COVERAGE SHORTFALL, not a clean corpus: run `npm run build` to write src/topics/_generated/.)');
    process.exit(1);
  }

  const detected = {};
  const skipped = [];
  const noteLines = [];
  let evaluations = 0, exhaustiveN = 0, judged = 0;

  for (const t of targets) {
    let mod = null, loadErr = null;
    try { mod = loadSlice(t.file); } catch (e) { loadErr = String(e && e.message || e); }
    if (loadErr) { skipped.push([t.id, 'slice did not evaluate: ' + loadErr]); continue; }
    if (!mod) { skipped.push([t.id, 'slice declares no *_NUM global']); continue; }

    const res = analyze({ id: t.id, mod, source: t.origin });
    if (res.skip) { skipped.push([t.id, res.skip]); continue; }
    judged++;
    evaluations += res.points;
    if (res.exhaustive) exhaustiveN++;
    for (const n of res.notes) noteLines.push(t.id + ': ' + n);
    if (res.findings.size) {
      const obj = {};
      for (const k of [...res.findings.keys()].sort()) obj[k] = res.findings.get(k);
      detected[t.id] = obj;
    }
  }

  if (WRITE_DEBT) {
    const ordered = {};
    for (const id of Object.keys(detected).sort()) ordered[id] = detected[id];
    fs.writeFileSync(DEBT_FILE, toAscii(JSON.stringify(ordered, null, 2)) + '\n');
    const n = Object.values(ordered).reduce((a, o) => a + Object.keys(o).length, 0);
    console.log('wrote ' + path.relative(ROOT, DEBT_FILE) + ': ' + n + ' finding(s) across ' + Object.keys(ordered).length + ' topic(s)');
    process.exit(0);
  }

  const baseline = fs.existsSync(DEBT_FILE) ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8')) : {};
  const isNew = [], stale = [];
  for (const id of Object.keys(detected)) {
    for (const k of Object.keys(detected[id])) if (!(baseline[id] && baseline[id][k])) isNew.push([id, k, detected[id][k]]);
  }
  for (const id of Object.keys(baseline)) {
    for (const k of Object.keys(baseline[id])) if (!(detected[id] && detected[id][k])) stale.push([id, k]);
  }

  const totalFindings = Object.values(detected).reduce((a, o) => a + Object.keys(o).length, 0);
  const summary = judged + '/' + targets.length + ' topics driven across '
    + evaluations.toLocaleString('en-US') + ' evaluations (' + exhaustiveN + ' exhaustive), '
    + totalFindings + ' defect(s) in ' + Object.keys(detected).length + ' topic(s), all allowlisted';

  /* Honesty surfaces print UNCONDITIONALLY (cold-verify F4): the freeze report promises the
     partial-coverage note "on every run", and a coverage caveat gated behind VERBOSE is a
     caveat nobody reads. */
  if (skipped.length) {
    console.log('\nSKIPPED (' + skipped.length + ') -- not driven, and not counted as clean:');
    skipped.forEach(([id, why]) => console.log('  - ' + toAscii(id) + ': ' + toAscii(why)));
  }
  if (noteLines.length) {
    console.log('\nPARTIAL COVERAGE (' + noteLines.length + '):');
    noteLines.forEach((l) => console.log('  - ' + toAscii(l)));
  }
  if (VERBOSE) {
    console.log('\nDETECTED (' + totalFindings + '):');
    for (const id of Object.keys(detected).sort()) {
      console.log('  ' + toAscii(id));
      for (const k of Object.keys(detected[id])) console.log('      ' + k + '  ' + toAscii(detected[id][k]));
    }
  }

  if (!isNew.length && !stale.length) {
    console.log('NUMBERS LATTICE: PASS  (' + summary + ')');
    process.exit(0);
  }

  console.log('NUMBERS LATTICE: FAIL');
  if (isNew.length) {
    console.log('\n  ' + isNew.length + ' NEW defect(s) (not in numbers_lattice_debt.json). A Numbers pane stopped teaching:');
    isNew.slice(0, 25).forEach(([id, k, why]) => console.log('    - ' + toAscii(id) + '  ' + k + '  ' + toAscii(why)));
    if (isNew.length > 25) console.log('    ... and ' + (isNew.length - 25) + ' more');
  }
  if (stale.length) {
    console.log('\n  ' + stale.length + ' STALE entr(ies) -- fixed, so delete them from numbers_lattice_debt.json:');
    stale.slice(0, 25).forEach(([id, k]) => console.log('    - ' + toAscii(id) + '  ' + k));
    if (stale.length > 25) console.log('    ... and ' + (stale.length - 25) + ' more');
  }
  console.log('\nNUMBERS LATTICE: FAIL  (' + isNew.length + ' new, ' + stale.length + ' stale; '
    + judged + '/' + targets.length + ' topics driven across ' + evaluations.toLocaleString('en-US') + ' evaluations)');
  process.exit(1);
}

main();
