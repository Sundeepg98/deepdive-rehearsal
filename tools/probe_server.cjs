/* ===== THE WARM PROBE SERVER =====================================================================
 *
 * WHY THIS EXISTS, measured rather than assumed.
 * Every probe an agent runs against the deliverable pays for a cold Chromium launch plus a parse of
 * an 11.7 MiB single-file document. Probe-heavy agents make 50-116 such calls, so the boot ritual,
 * not the measurement, is where their time goes -- the measurement itself is milliseconds.
 *
 * So: ONE Chromium, launched once, held. A probe becomes an HTTP round trip to localhost.
 *
 * MEASURED on this box (tools/PROBE_SERVER_RECEIPTS.txt has the full table and how to regenerate it):
 *
 *                                        quiet box      4 cold boots running at once
 *   /eval against the held world              9 ms                            28 ms
 *   /reload then measure (fresh world)     1274 ms                                -
 *   cold launch + parse + measure          2112 ms                          3630 ms
 *
 * The ratio understates the win on a quiet box on purpose: what a warm browser avoids is exactly
 * the cost that inflates under contention. Held-state probing is ~235x a cold boot unloaded and
 * ~130x a contended one; even the strict fresh-world path is ~1.7x, and that path still buys back
 * the launch, which is the part that degrades when a fleet is running.
 *
 * ===== THE CONTAMINATION DISCIPLINE (read this before using /eval) ===============================
 *
 * A warm browser is a SHARED MUTABLE WORLD. That is the entire speedup and also the entire hazard.
 * The moment two measurements share a page, the second one is measuring a world the first one
 * touched -- and this repo has already paid for exactly that class of mistake, twice, in checks
 * whose stillness guards were anti-correlated with the thing they tested (see the at-rest essay in
 * test/_boot.cjs). A fast probe that quietly measures a contaminated world is strictly worse than a
 * slow probe that measures a real one: it is wrong at speed.
 *
 * THE RULE:
 *   ASSERTIVE measurements -- geometry, contrast, fold membership, anything a verdict rests on --
 *   MUST run behind /reload, in a world nothing has touched.
 *   EVAL-AGAINST-HELD-STATE is the fast path for EXPLORATION ONLY, and it is OPT-IN.
 *
 * This is not advice in a comment. It is ENFORCED BY DEFAULT, three ways:
 *
 *   1. /eval defaults to mode "assert", which is REFUSED (HTTP 409) unless the world is pristine.
 *      To measure a dirty world you must ask for mode "explore" and say so on the record.
 *   2. The server watches the DOM with a MutationObserver and attributes mutations to the probe
 *      that caused them. An "assert" probe that MUTATES anything flips the world to dirty, so the
 *      NEXT assert probe is refused until someone reloads. The discipline survives an author who
 *      believed their expression was a pure read and was wrong.
 *   3. Anything that changes layout without resetting state -- /viewport above all -- dirties the
 *      world. Resizing a page the app has already booted into is not the same world as booting at
 *      that size, and treating it as one is how a responsive measurement lies. Pass a viewport to
 *      /reload instead: the context is created at that size and the app boots having never seen
 *      another.
 *
 * EVERY RESPONSE IS STAMPED so a verifier can audit what a measurement trusted, after the fact,
 * without taking anyone's word for it:
 *     world_id             which world (monotonic; a new one per reload)
 *     since_reload_ms      how stale that world was when the probe ran
 *     probes_since_reload  how many probes had already run against it
 *     pristine             whether anything had dirtied it
 *     mutations            DOM mutations attributed to THIS probe
 * A receipt that says probes_since_reload=0 is a measurement of a fresh world. One that says 47 is
 * a measurement of whatever the previous 46 probes left behind, and now it says so out loud.
 *
 * ===== WHAT "FRESH" MEANS HERE ===================================================================
 * /reload creates a NEW BROWSER CONTEXT by default, not merely a new navigation. A navigation
 * resets JS globals but keeps localStorage, sessionStorage, cookies and service workers -- and this
 * app persists theme, stars and notes, so a bare reload would hand the next measurement the
 * previous one's saved state. A fresh context is the only reset that matches what a cold boot
 * gives you, which is exactly the equivalence the receipts in tools/PROBE_SERVER_RECEIPTS.txt
 * assert. `{keep_context: true}` opts into the weaker, slightly faster reset and is documented as
 * weaker at the call site.
 *
 * ===== SETTLING ==================================================================================
 * /reload does not return when the load event fires. It returns when the app is READY (the same
 * predicate every gate check uses) and then genuinely AT REST -- nothing in flight. That predicate
 * is not reimplemented here; it is REQUIRED from test/_boot.cjs, so there is exactly one definition
 * of "still" in this repo and this tool cannot drift from the gate's. Infinite animations are
 * excluded deliberately (the boot spinner never finishes; waiting on it would hang rather than
 * settle) -- the same carve-out, for the same reason, as the gate's at-rest primitive.
 *
 * ===== TRUST MODEL ===============================================================================
 * /eval EXECUTES ARBITRARY JAVASCRIPT IN THE PAGE. That is not an oversight to be hardened away --
 * it is the entire function of the tool, exactly as it is for a debugger or the DevTools console.
 * There is no sanitising an expression evaluator into safety, so the boundary is placed where it
 * can actually hold: the server binds 127.0.0.1 ONLY, is single-client, and is meant to be started
 * by the agent that uses it and shut down after. Anything that can reach this port can already run
 * code on this box by easier means.
 *
 * What IS defended, because it costs one line each and the loopback bind does not cover it:
 *   - the Host header is checked, so a page in a browser on this box cannot reach the port by DNS
 *     rebinding through a hostname that resolves to 127.0.0.1;
 *   - the body is capped, so a stray large POST cannot exhaust memory.
 * Do NOT bind this to 0.0.0.0, put it behind a reverse proxy, or expose it to a network. If a
 * multi-user deployment is ever wanted, the endpoint needs an allowlist of named probes rather than
 * an expression, which is a different tool.
 *
 * Requests are SERIALISED -- one page, one probe at a time -- because two concurrent probes against
 * one page is the contamination hazard again, wearing a race condition.
 *
 * ===== THE IDLE TTL (on by default) =============================================================
 * This process holds a Chromium. A Chromium nobody is talking to is a Chromium nobody remembers,
 * and the agent that started it can die -- crash, be killed, be swept -- without ever reaching
 * /shutdown. What is left behind is not a tidy leak: it is a browser holding hundreds of megabytes
 * AND a listening port, and the next agent that calls ensureUp() finds that port answered and
 * silently adopts a stranger's world.
 *
 * So the server DIES ON ITS OWN after N minutes with no requests (default 20). The timer is reset
 * by every request, at arrival and again at completion, so a long /reload never counts as idle.
 * When it fires the browser is closed and the process exits, which is what makes the browser go
 * with it. Set --idle-ttl 0 (or --idle-exit-ms 0) to disable, e.g. for a long headed debug session.
 *
 * USAGE
 *   node tools/probe_server.cjs [--port 9377] [--html PATH] [--url URL] [--headed]
 *                              [--viewport 1280x800] [--idle-ttl MINUTES] [--idle-exit-ms N]
 *                              [--quiet]
 * See tools/PROBE_SERVER.md.
 */
'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');

/* THE SHARED PRIMITIVES. Required, never copied: launch args, the readiness predicate, the at-rest
   family and the timeout budgets all live in one place so this tool measures the same "ready" and
   the same "still" that the gate does. A copy would be a second definition free to drift. */
const B = require('../test/_boot.cjs');

const DEFAULT_HTML = path.resolve(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const DEFAULT_PORT = 9377;
const DEFAULT_VIEWPORT = { w: 1280, h: 800 };
/* ADDED BY THE COLD VERIFIER, per the adoption gate. An orphaned server must take its browser with
   it; 20 minutes is long enough that no working session notices and short enough that a dead
   agent's chromium does not outlive the wave. */
const DEFAULT_IDLE_TTL_MS = 20 * 60 * 1000;

/* ---------- argv ------------------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    let k, v;
    if (eq > 0) { k = a.slice(2, eq); v = a.slice(eq + 1); }
    else {
      k = a.slice(2);
      const nxt = argv[i + 1];
      if (nxt !== undefined && !nxt.startsWith('--')) { v = nxt; i++; } else { v = true; }
    }
    out[k.replace(/-/g, '_')] = v;
  }
  return out;
}

/* THE IDLE BUDGET, resolved in one place so the two spellings cannot disagree. --idle-exit-ms is
   the older, exact one and still wins when both are given; --idle-ttl is minutes because that is
   the unit the operator of a fleet thinks in. Either at 0 disables the timer. A flag with no value
   is an ERROR rather than a guessed default: a server that silently ran forever because a flag was
   mistyped is the exact failure this timer exists to prevent. */
function resolveIdleMs(a) {
  const bad = (k, v, unit) => { throw new Error('bad --' + k + ' "' + v + '" (' + unit + '; 0 disables)'); };
  if (a.idle_exit_ms !== undefined) {
    const n = Number(a.idle_exit_ms);
    if (a.idle_exit_ms === true || !isFinite(n) || n < 0) bad('idle-exit-ms', a.idle_exit_ms, 'milliseconds');
    return Math.round(n);
  }
  if (a.idle_ttl !== undefined) {
    const n = Number(a.idle_ttl);
    if (a.idle_ttl === true || !isFinite(n) || n < 0) bad('idle-ttl', a.idle_ttl, 'minutes');
    return Math.round(n * 60000);
  }
  return DEFAULT_IDLE_TTL_MS;
}

function parseViewport(s, fallback) {
  if (!s || s === true) return Object.assign({}, fallback);
  const m = /^(\d+)\s*[xX*,]\s*(\d+)$/.exec(String(s).trim());
  if (!m) throw new Error('bad viewport "' + s + '" (want WxH, e.g. 1280x800)');
  return { w: Number(m[1]), h: Number(m[2]) };
}

/* Context options in ONE place, exported, so the self-test's cold-boot path can build a byte-for-
   byte identical context. Parity that depends on two call sites staying in sync is parity that will
   quietly stop holding. */
function contextOpts(vp) {
  return { viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 };
}

/* ---------- the in-page probes ---------------------------------------------------------------- */

/* NOTHING IS IN FLIGHT, document-wide.
 *
 * The gate's REST_STATE walks an element's ANCESTOR chain, which is the right question for "is the
 * thing I am about to measure still?". After a reload the question is broader -- "is the WHOLE
 * world still?" -- so this asks document.getAnimations(), which per the Web Animations spec covers
 * every animation whose target's node document is this document, shadow trees included.
 *
 * The carve-outs are copied from the gate's primitive on purpose, not reinvented:
 *   - running / pending / paused all count as IN FLIGHT. Paused especially: a paused animation
 *     holds its element mid-flight indefinitely and is the one playState most obviously not at rest
 *     (the gate learned this from a 44px control parked at scale(.961) reading 42.3px).
 *   - iterations === Infinity is EXCLUDED. The boot spinner never finishes; waiting on it would
 *     hang rather than settle.
 * Returns names, never a bare count, so a settle timeout can say WHAT was still moving instead of
 * emitting the blank red this repo has historically mistaken for a flake. */
const DOC_REST = function () {
  var anims = [];
  try { anims = document.getAnimations(); } catch (e) { anims = []; }
  var moving = [];
  for (var i = 0; i < anims.length; i++) {
    var a = anims[i], st = a.playState;
    if (st !== 'running' && st !== 'pending' && st !== 'paused') continue;
    var iters = 1;
    try { iters = a.effect.getComputedTiming().iterations; } catch (e) { iters = 1; }
    if (iters === Infinity) continue;
    if (moving.length < 8) {
      var t = null;
      try { t = a.effect && a.effect.target; } catch (e) { t = null; }
      var who = t ? (t.id ? '#' + t.id : (t.tagName ? t.tagName.toLowerCase() : '?')) : '?';
      var what = a.animationName || (a.transitionProperty ? 'transition:' + a.transitionProperty : 'animation');
      moving.push(who + ' <- ' + what + ' [' + st + ']');
    } else { moving.push('...'); break; }
  }
  return { inflight: moving.length, moving: moving, total: anims.length };
};

/* THE MUTATION LEDGER. Installed AFTER the world has settled, so its baseline is the settled world
 * rather than the storm of boot mutations.
 *
 * ATTRIBUTION WINDOW, stated honestly: drain() is called immediately before and immediately after
 * each probe, so the count reported for a probe is "mutations observed while that probe ran". For a
 * synchronous expression -- the normal case -- that window is sub-millisecond and attribution is
 * exact.
 *
 * ===== WHY THERE IS NO NOISE FLOOR HERE, AND WHY THAT MATTERS ====================================
 * The first version measured an AMBIENT mutation rate once at reload and SUBTRACTED it before
 * declaring a world dirty. It was tested, it passed, and the self-test then caught it failing 2
 * runs in 3. MEASURED: this app emits exactly one straggler mutation in the frames just after the
 * settle, so ambient sampled as 0 or 1 depending on which frame the sample landed on. When it
 * sampled 1, `max(0, mutations - ambient)` turned a REAL one-mutation contamination into 0, the
 * world stayed "pristine", and the next assertive probe was cheerfully served against a page that
 * had already been written to.
 *
 * That is the same inverted-guard shape this repo has been bitten by twice before (see the at-rest
 * essay in test/_boot.cjs): the guard was WEAKEST exactly where contamination is most likely --
 * one mutation, which is what setting a textContent or toggling a class costs -- and it was
 * non-deterministic, so it would have shipped as "the discipline sometimes doesn't fire".
 *
 * The fix is not a better-tuned floor. Re-tuning a threshold never fixes an inverted guard. The
 * shape changes instead, in two ways:
 *   1. QUIESCE FIRST, then subtract nothing. The reload path does not sample the noise -- it WAITS
 *      for a frame in which nothing mutates (a condition, not a duration, and not a fudge factor).
 *      After that, ambient is 0 BY CONSTRUCTION and any mutation during a probe is the probe's.
 *   2. FAIL TOWARD REFUSING. If a page never goes quiet (a genuine DOM ticker), attribution is
 *      declared impossible and ANY mutation dirties the world. A false refusal is loud and costs
 *      one reload; a missed contamination is silent and wrong, and this tool exists to stop the
 *      second kind. */
const INSTALL_LEDGER = function () {
  if (window.__probeLedger && window.__probeLedger.obs) {
    try { window.__probeLedger.obs.disconnect(); } catch (e) { /* already gone */ }
  }
  var st = { n: 0, what: [] };
  /* RECORD WHAT CHANGED, not merely how many. A guard that can only say "something mutated" hands
     its user a blank red, and a blank red is how this repo has historically lost a real finding to
     "probably a flake". Naming the node and the attribute makes a contamination report actionable
     -- and it is what let the straggler that broke the first quiesce loop be identified at all. */
  var note = function (recs) {
    for (var i = 0; i < recs.length; i++) {
      st.n++;
      if (st.what.length >= 8) continue;
      var r = recs[i], t = r.target;
      var who = t ? (t.id ? '#' + t.id : (t.tagName ? t.tagName.toLowerCase() : (t.nodeName || '?'))) : '?';
      st.what.push(r.type + ' ' + who + (r.attributeName ? '[' + r.attributeName + ']' : ''));
    }
  };
  var obs = new MutationObserver(note);
  obs.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, characterData: true,
  });
  window.__probeLedger = {
    obs: obs,
    /* takeRecords() returns the records the callback has NOT yet been handed and clears the queue,
       so the callback will never see them -- they must be counted here or they vanish. */
    drain: function () {
      try { note(obs.takeRecords()); } catch (e) { /* observer gone */ }
      var out = { n: st.n, what: st.what };
      st.n = 0; st.what = [];
      return out;
    },
  };
  return true;
};

/* ===== HOW AN EXPRESSION GETS INTO THE PAGE ====================================================
 *
 * THE TRAP, and it cost the first version of this file a silent wrong answer on its very first
 * probe. `page.evaluate(str, arg)` does NOT call `str` as a function: Playwright decides between
 * "call this" and "evaluate this" from `typeof pageFunction === 'function'`, which is FALSE for
 * every string. So a wrapper of the shape `async (ARG) => {...}` is evaluated as an EXPRESSION, its
 * value is a function object, a function object is not serialisable, and the probe comes back
 * `undefined` -- which the first version dutifully reported as `null`. Every probe returned null and
 * every probe looked like it had succeeded. A probe server whose failure mode is a confident null
 * is a check that cannot fail, and this repo has already shipped nine of those.
 *
 * So the wrapper is a SELF-CALLING expression with the argument baked in as JSON, and it does four
 * jobs no bare expression can do for itself:
 *
 *  1. IT ALWAYS RETURNS AN ENVELOPE (`__probe: 1`). If the envelope does not come back, the caller
 *     is told the expression did not run -- instead of being handed a null it would have believed.
 *  2. IT NAMES WHAT CANNOT CROSS THE WIRE. A DOM node, a function or a symbol becomes a NAMED
 *     ERROR ("return el.getBoundingClientRect().toJSON() instead"), not an empty object. `{}` is
 *     what a naive serialiser gives you for an Element, and `{}` is indistinguishable from a real
 *     measurement of nothing.
 *  3. IT NORMALISES THROUGH JSON *IN THE PAGE*. CDP's returnByValue copies OWN ENUMERABLE
 *     properties, and a DOMRect keeps all of its numbers on the prototype as getters -- so a raw
 *     `getBoundingClientRect()` crosses the wire as `{}`. A JSON round trip in the page runs the
 *     object's own toJSON() first, so geometry arrives as geometry.
 *  4. IT PRESERVES NaN AND Infinity as "__NaN__" / "__Infinity__". JSON turns both into null, and a
 *     null width is the single most believable wrong answer a layout probe can give.
 *
 * It is also CSP-safe: the string goes through CDP Runtime.evaluate (the same door the DevTools
 * console uses), so it works against pages that forbid eval in page script, whereas the obvious
 * `new Function(...)` alternative would not.
 */
function wrapExpression(code, isBody, arg) {
  const argJson = arg === undefined ? 'null' : JSON.stringify(arg);
  const inner = isBody ? code : 'return (' + code + '\n);';
  return '(async (ARG) => {\n'
    + '  const __f = async (ARG) => {' + inner + '};\n'
    + '  const V = await __f(ARG);\n'
    + '  let kind = V === null ? "null" : (V === undefined ? "undefined" : typeof V);\n'
    + '  if (V && typeof V === "object" && typeof V.nodeType === "number") kind = "DOM node";\n'
    + '  if (V && typeof V === "object" && typeof V.length === "number" && typeof V.item === "function") kind = "DOM collection";\n'
    + '  if (kind === "DOM node" || kind === "DOM collection" || kind === "function" || kind === "symbol") {\n'
    + '    return { __probe: 1, ok: false, kind: kind, v: String(V && V.tagName ? "<" + V.tagName.toLowerCase() + ">" : V) };\n'
    + '  }\n'
    + '  let nonfinite = false, s;\n'
    + '  try {\n'
    + '    s = JSON.stringify(V === undefined ? null : V, function (k, val) {\n'
    + '      if (typeof val === "number" && !isFinite(val)) { nonfinite = true;\n'
    + '        return val !== val ? "__NaN__" : (val > 0 ? "__Infinity__" : "__-Infinity__"); }\n'
    + '      return val;\n'
    + '    });\n'
    + '  } catch (e) { return { __probe: 1, ok: false, kind: kind + " (" + e.message + ")", v: String(V) }; }\n'
    + '  if (s === undefined) return { __probe: 1, ok: false, kind: kind, v: String(V) };\n'
    + '  return { __probe: 1, ok: true, kind: kind, nonfinite: nonfinite, v: JSON.parse(s) };\n'
    + '})(' + argJson + ')';
}

/* ---------- server state ---------------------------------------------------------------------- */

const state = {
  started: Date.now(),
  browser: null,
  context: null,
  page: null,
  url: '',
  html: '',
  viewport: Object.assign({}, DEFAULT_VIEWPORT),
  worldId: 0,
  reloadedAt: 0,
  probesServed: 0,
  probesSinceReload: 0,
  pristine: false,
  dirtyWhy: 'no world loaded yet',
  ambient: 0,
  attributable: true,
  quiesceFrames: 0,
  readyMode: '',
  lastSettle: null,
  lastReloadMs: 0,
  launchArgs: [],
  reloadMode: 'context',
  quiet: false,
  idleTtlMs: 0,
  lastActivityAt: 0,
  idleMsBeforeLastRequest: 0,
};

function log() {
  if (state.quiet) return;
  const a = Array.prototype.slice.call(arguments);
  process.stdout.write('[probe-server] ' + a.join(' ') + '\n');
}

/* The audit stamp that rides on EVERY response. One function, so no endpoint can forget it and no
   endpoint can invent its own dialect of it. */
function stamp() {
  return {
    world_id: state.worldId,
    since_reload_ms: state.reloadedAt ? Date.now() - state.reloadedAt : 0,
    probes_since_reload: state.probesSinceReload,
    pristine: state.pristine,
    probes_served: state.probesServed,
    viewport: { w: state.viewport.w, h: state.viewport.h },
  };
}

function dirty(why) {
  if (state.pristine) log('world', state.worldId, 'is now DIRTY:', why);
  state.pristine = false;
  state.dirtyWhy = why;
}

/* ---------- one probe at a time --------------------------------------------------------------- */

/* ONE PAGE, ONE PROBE AT A TIME. Two concurrent evaluates against a shared page is the
   contamination hazard again, this time as a race: probe A's mutation lands inside probe B's
   attribution window and the ledger blames the wrong probe. Serialising costs nothing (the server
   is single-client by design) and makes every stamp defensible. */
let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(() => fn(), () => fn());
  chain = run.then(() => {}, () => {});
  return run;
}

/* ---------- browser lifecycle ----------------------------------------------------------------- */

async function launch(opts) {
  const lo = B.launchOpts({ headless: opts.headed ? false : true });
  state.launchArgs = (lo.args || []).slice();
  state.browser = await chromium.launch(lo);
  log('chromium up, pid', process.pid, 'headless=' + (opts.headed ? 'no' : 'yes'));
}

async function drainLedger() {
  const empty = { n: 0, what: [] };
  if (!state.page || state.page.isClosed()) return empty;
  try {
    return await state.page.evaluate(
      () => (window.__probeLedger ? window.__probeLedger.drain() : { n: 0, what: [] }));
  } catch (e) { return empty; }
}

/* WAIT FOR A FRAME IN WHICH NOTHING MUTATES. A condition, never a duration, and never a fudge
   factor subtracted from a later measurement -- see the essay above INSTALL_LEDGER for what the
   subtraction cost. Returns quiet:true once a whole frame pair passes with an empty ledger, so
   every subsequent probe's mutation count is attributable to that probe alone. A page that never
   goes quiet is reported honestly rather than averaged away. */
async function quiesce(page, maxFrames) {
  const cap = maxFrames || 40;
  const NEED = 3;            /* CONSECUTIVE quiet frames -- see below */
  let run = 0, last = { n: 0, what: [] };
  for (let i = 0; i < cap; i++) {
    await drainLedger();
    await B.settle(page);
    last = await drainLedger();
    /* ONE QUIET FRAME IS NOT PROOF OF QUIET. Measured: a single-quiet-frame exit let a late
       straggler land inside the FIRST probe's window, which dirtied the world on a pure read and
       got that probe's successor refused -- 1 run in 10. Requiring a RUN of quiet frames is the
       same rAF-separated-confirmation idea the gate's at-rest primitive uses, for the same reason:
       a condition sampled once is a coin flip, a condition that holds across frames is a state. */
    if (last.n === 0) { run++; if (run >= NEED) return { quiet: true, frames: i + 1, residual: 0, what: [] }; }
    else run = 0;
  }
  return { quiet: false, frames: cap, residual: last.n, what: last.what };
}

async function settleDoc(page, ms) {
  return B.pollFor(
    async () => {
      const a = await page.evaluate(DOC_REST);
      if (a.inflight) return a;
      await B.settle(page);                       /* rAF-separated confirmation, same as the gate */
      const b = await page.evaluate(DOC_REST);
      b.confirmed = b.inflight === 0;
      return b;
    },
    (s) => !!(s && s.confirmed),
    ms || B.ACT_MS,
    'the document to come to rest (nothing in flight, confirmed across a frame)');
}

/* Wait for the app, but do not DEMAND it: this server is useful against any page, and --url can
   point somewhere that has never heard of TopicRegistry. Two stages so neither case is slow:
   probe cheaply for the app's own globals, and only spend the full readiness budget if they are
   actually appearing. Reports which mode it achieved rather than pretending. */
async function waitReady(page) {
  let looksLikeApp = true;
  try {
    await page.waitForFunction(() => typeof TopicRegistry !== 'undefined', null, { timeout: 3000 });
  } catch (e) { looksLikeApp = false; }
  if (looksLikeApp) {
    await page.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
    return 'app';
  }
  await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: B.READY_MS });
  return 'dom';
}

/* THE FRESH WORLD. See the header: a new CONTEXT, not just a new navigation, because this app
   persists theme/stars/notes and a navigation would hand the next measurement the last one's saved
   state. Returns only once the app is ready AND nothing is in flight. */
async function reload(o) {
  const opts = o || {};
  const t0 = Date.now();
  const vp = opts.viewport ? parseViewport(
    typeof opts.viewport === 'string' ? opts.viewport : opts.viewport.w + 'x' + opts.viewport.h,
    state.viewport) : state.viewport;
  const url = opts.url || state.url;
  const keep = !!opts.keep_context && state.context && state.page && !state.page.isClosed();

  if (keep) {
    /* The weaker reset, opt-in: globals go, storage does not. Clear what we can reach so the gap is
       as narrow as the option allows, and say in the response which reset was used. */
    try {
      await state.page.evaluate(() => {
        try { localStorage.clear(); } catch (e) { /* opaque origin */ }
        try { sessionStorage.clear(); } catch (e) { /* opaque origin */ }
      });
    } catch (e) { /* page may be mid-navigation */ }
    if (vp.w !== state.viewport.w || vp.h !== state.viewport.h) {
      await state.page.setViewportSize({ width: vp.w, height: vp.h });
    }
  } else {
    if (state.context) { try { await state.context.close(); } catch (e) { /* already gone */ } }
    state.context = await state.browser.newContext(contextOpts(vp));
    state.page = await state.context.newPage();
  }
  state.viewport = { w: vp.w, h: vp.h };

  await state.page.goto(url, { timeout: B.NAV_MS, waitUntil: 'load' });
  state.readyMode = await waitReady(state.page);
  try { await state.page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
  const settled = await settleDoc(state.page);

  /* Ledger AFTER settle, then WAIT until a frame passes with nothing mutating. Not a sample of the
     noise -- the absence of it. Every probe after this point owns its own mutations. */
  await state.page.evaluate(INSTALL_LEDGER);
  const q = await quiesce(state.page);
  state.ambient = q.residual;
  state.attributable = q.quiet;
  if (!q.quiet) {
    log('WARNING: the page never went quiet (' + q.residual + ' mutation(s)/frame after '
      + q.frames + ' frames: ' + q.what.join(', ') + '). Attribution is uncertain; '
      + 'any mutation will dirty the world anyway.');
  }

  state.url = url;
  state.worldId += 1;
  state.reloadedAt = Date.now();
  state.probesSinceReload = 0;
  state.pristine = true;
  state.dirtyWhy = '';
  state.lastSettle = settled;
  state.lastReloadMs = Date.now() - t0;

  const out = Object.assign({ ok: true }, stamp(), {
    ms: state.lastReloadMs,
    url: state.url,
    ready_mode: state.readyMode,
    reset: keep ? 'navigation (keep_context: storage cleared, cookies and workers survive)'
      : 'fresh context (storage, cookies and workers all reset)',
    settle: settled,
    quiesce_frames: q.frames,
    residual_mutations_per_frame: state.ambient,
    mutation_attribution: state.attributable
      ? 'exact (the world went quiet before any probe ran)'
      : 'uncertain (the page never went quiet; any mutation will dirty the world anyway)',
  });
  if (opts.settle_scope) {
    /* Element-level rest, delegated to the gate's own shadow-crossing walk rather than a second
       implementation of the same idea. */
    const scopes = Array.isArray(opts.settle_scope) ? opts.settle_scope : [opts.settle_scope];
    out.settle_scope = {};
    for (const sel of scopes) {
      out.settle_scope[sel] = await B.pollFor(
        () => state.page.evaluate(B.REST_STATE, sel),
        (s) => !!(s && s.alpha >= 0.995 && s.still),
        B.ACT_MS, 'scope at rest: ' + sel);
    }
  }
  return out;
}

/* ---------- endpoints ------------------------------------------------------------------------- */

async function ensurePage() {
  if (!state.page || state.page.isClosed() || !state.worldId) {
    log('no live page (first use, or it crashed) -- loading a world');
    await reload({});
  }
}

async function doEval(body) {
  const mode = body.mode || 'assert';
  if (mode !== 'assert' && mode !== 'explore') {
    const e = new Error('mode must be "assert" (fresh world required) or "explore" (opt in to a dirty world)');
    e.status = 400; throw e;
  }
  const code = body.expr !== undefined ? body.expr : body.body;
  if (typeof code !== 'string' || !code.trim()) {
    const e = new Error('need {expr} (an expression) or {body} (statements)'); e.status = 400; throw e;
  }
  await ensurePage();

  /* THE ENFORCEMENT. An assertive measurement against a world someone has already touched is
     refused, loudly, with the reason it was refused and what to do about it. This is the whole
     point of the tool having a server rather than being a convention in a README. */
  if (mode === 'assert' && !state.pristine) {
    const e = new Error(
      'CONTAMINATED_WORLD: refusing an assert-mode probe against a world that is no longer pristine. '
      + 'Reason: ' + (state.dirtyWhy || 'unknown') + '. '
      + 'POST /reload for a fresh world, or pass mode:"explore" to measure the dirty one on the record.');
    e.status = 409;
    e.payload = Object.assign({ error: 'CONTAMINATED_WORLD', why: state.dirtyWhy }, stamp());
    throw e;
  }

  await drainLedger();                             /* discard anything ambient since the last probe */
  const t0 = Date.now();
  let value, err = null, meta = null;
  try {
    const raw = await state.page.evaluate(wrapExpression(code, body.expr === undefined, body.arg));
    /* THE WRAPPER MUST COME BACK. If it does not, the expression did not run the way we think it
       did, and the one thing this server must never do is hand back a confident null for a probe
       that never happened. */
    if (!raw || raw.__probe !== 1) {
      throw new Error('the probe wrapper did not return (got ' + JSON.stringify(raw) + ') -- the '
        + 'expression did not evaluate as expected; this is a bug in probe_server, not in your probe');
    }
    if (!raw.ok) {
      throw new Error('the expression produced a ' + raw.kind + ', which cannot cross the wire: '
        + raw.v + '. Return a plain JSON value instead -- e.g. el.getBoundingClientRect().toJSON(), '
        + 'el.textContent, or [...nodes].map(n => n.id).');
    }
    value = raw.v;
    meta = { kind: raw.kind, nonfinite: raw.nonfinite };
  } catch (ex) {
    err = ex;
  }
  const ms = Date.now() - t0;
  const drained = await drainLedger();
  const mutations = drained.n;

  state.probesServed += 1;
  state.probesSinceReload += 1;

  /* A PROBE THAT MUTATED IS A PROBE THAT SPENT THE WORLD.
     NOTHING IS SUBTRACTED HERE. The world was quiesced at reload, so a mutation seen inside a
     probe's window is that probe's. The version that subtracted a sampled noise floor missed a
     real one-mutation contamination in 2 runs out of 3 -- the essay above INSTALL_LEDGER has the
     measurement. When the page could NOT be quiesced, this still dirties on any mutation: erring
     toward a loud false refusal, never toward a silent false pristine. */
  const attributed = mutations;
  if (mode === 'explore') {
    dirty('an explore-mode probe ran (probe #' + state.probesSinceReload + ' of world ' + state.worldId + ')');
  } else if (attributed > 0) {
    dirty('an assert-mode probe MUTATED the DOM (' + attributed + ' mutation(s): '
      + drained.what.join(', ') + ') at probe #'
      + state.probesSinceReload + ' of world ' + state.worldId
      + (state.attributable ? '' : ' -- NOTE: this page never went quiet, so the mutation may be the '
        + 'page\'s own; refusing anyway, because a false refusal is cheaper than a false pristine'));
  }

  if (err) { const e = new Error(String(err && err.message || err)); e.status = 400; e.stamp = true; throw e; }

  const out = Object.assign({ ok: true, value: value === undefined ? null : value }, stamp(), {
    ms: ms,
    mode: mode,
    mutations: attributed,
    mutation_detail: drained.what,
    mutation_attribution: state.attributable ? 'exact' : 'uncertain (page never went quiet)',
    kind: meta && meta.kind,
  });
  if (meta && meta.nonfinite) {
    out.nonfinite = true;
    out.warning = 'the value contained NaN or Infinity, preserved as "__NaN__" / "__Infinity__" '
      + 'rather than silently becoming null -- a geometry probe reporting these measured nothing';
  }
  return out;
}

async function doGoto(body) {
  const p = body.path !== undefined ? body.path : body.url;
  if (typeof p !== 'string' || !p) { const e = new Error('need {path}'); e.status = 400; throw e; }
  let url;
  if (/^[a-z]+:\/\//i.test(p)) url = p;
  else if (p.startsWith('#')) url = state.url.replace(/#.*$/, '') + p;
  else url = B.fileUrl(p);
  /* A navigation is a new world by definition, so it goes through the same fresh-world path as
     /reload -- including the settle. A "goto" that returned before the app was at rest would be a
     fast way to measure a half-built page. */
  return reload({ url: url, viewport: body.viewport, keep_context: body.keep_context, settle_scope: body.settle_scope });
}

async function doViewport(body) {
  const vp = parseViewport(
    body.viewport || (body.w && body.h ? body.w + 'x' + body.h : null), state.viewport);
  await ensurePage();
  await state.page.setViewportSize({ width: vp.w, height: vp.h });
  state.viewport = vp;
  await B.settle(state.page);
  /* DELIBERATE: resizing dirties the world. An app that has already booted at 1280 and been resized
     to 390 is NOT the app a phone gets -- one-shot boot measurements, cached layout decisions and
     anything computed once at startup are all still carrying the desktop's answer. Measuring
     responsive geometry that way is the exact lie this discipline exists to prevent, so the next
     assert-mode probe is refused until someone reloads. Want a real 390 world? /reload {viewport}. */
  dirty('the viewport was changed to ' + vp.w + 'x' + vp.h + ' WITHOUT a reload -- the app booted at '
    + 'another size and may still be carrying decisions it made there');
  return Object.assign({ ok: true }, stamp(), {
    note: 'viewport changed without a reload; the world is now dirty on purpose. '
      + 'Use POST /reload {"viewport":"' + vp.w + 'x' + vp.h + '"} to measure a world that BOOTED at this size.',
  });
}

async function doScreenshot(body) {
  if (!body.path || typeof body.path !== 'string') { const e = new Error('need {path}'); e.status = 400; throw e; }
  let reloaded = null;
  if (body.viewport) {
    /* A screenshot at another viewport is a screenshot of another world. Reload into it rather than
       resizing under the app's feet -- same reason as /viewport above. */
    reloaded = await reload({ viewport: body.viewport });
  }
  await ensurePage();
  const out = path.resolve(body.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const shotOpts = { path: out, fullPage: !!body.full_page };
  const t0 = Date.now();
  let buf;
  if (body.selector) buf = await state.page.locator(body.selector).first().screenshot({ path: out });
  else buf = await state.page.screenshot(shotOpts);
  const ms = Date.now() - t0;
  state.probesServed += 1;
  state.probesSinceReload += 1;
  return Object.assign({ ok: true }, stamp(), {
    ms: ms,
    path: out,
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    reloaded_for_viewport: reloaded ? reloaded.ms : null,
  });
}

function doStatus() {
  return Object.assign({ ok: true }, stamp(), {
    url: state.url,
    html: state.html,
    uptime_ms: Date.now() - state.started,
    uptime_s: +((Date.now() - state.started) / 1000).toFixed(1),
    ready_mode: state.readyMode,
    dirty_why: state.pristine ? '' : state.dirtyWhy,
    last_reload_ms: state.lastReloadMs,
    last_settle: state.lastSettle,
    residual_mutations_per_frame: state.ambient,
    mutation_attribution: state.attributable ? 'exact' : 'uncertain (page never went quiet)',
    reload_mode: state.reloadMode,
    /* THE DEAD-MAN SWITCH, on the record. A verifier (or the agent that inherited this port) can
       see how long this server will outlive the last thing anyone asked it. idle_ms is the gap
       BEFORE the request being answered right now -- reporting "0" because /status itself just
       reset the timer would be a number that cannot ever be interesting. */
    idle_ttl_ms: state.idleTtlMs,
    idle_ttl_min: state.idleTtlMs ? +(state.idleTtlMs / 60000).toFixed(2) : 0,
    idle_ms: state.idleMsBeforeLastRequest,
    idle_exit_in_ms: state.idleTtlMs ? Math.max(0, state.idleTtlMs - (Date.now() - state.lastActivityAt)) : null,
    /* PUBLISHED LAUNCH TERMS, for the same reason test/_gate_browser_server.cjs publishes them:
       --force-color-profile and friends are PROCESS-level and change how text rasterises, so a
       measurement taken here is only comparable to a measurement taken elsewhere if the terms
       match. A verifier should not have to guess. */
    launch_args: state.launchArgs,
    pid: process.pid,
    node: process.version,
  });
}

/* ---------- http ------------------------------------------------------------------------------ */

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > 4 * 1024 * 1024) { reject(new Error('request body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8');
      if (!s.trim()) return resolve({});
      try { resolve(JSON.parse(s)); } catch (e) { reject(new Error('body is not JSON: ' + e.message)); }
    });
    req.on('error', reject);
  });
}

const ROUTES = {
  '/eval': doEval,
  '/reload': (b) => reload(b),
  '/goto': doGoto,
  '/viewport': doViewport,
  '/screenshot': doScreenshot,
  '/status': () => doStatus(),
};

async function handle(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  const route = u.pathname.replace(/\/+$/, '') || '/status';

  /* Loopback bind is not by itself a defence against DNS rebinding: a browser on this box can be
     pointed at a hostname that resolves here and will happily send its own Host header. One line. */
  const host = (req.headers.host || '').split(':')[0];
  if (host && host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]' && host !== '::1') {
    res.writeHead(403, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'loopback only (bad Host header: ' + host + ')' }));
    return;
  }

  if (route === '/shutdown') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, bye: true, probes_served: state.probesServed }));
    setTimeout(bye, 30);
    return;
  }

  const fn = ROUTES[route];
  if (!fn) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: false, error: 'no such endpoint: ' + route,
      endpoints: Object.keys(ROUTES).concat(['/shutdown']),
    }));
    return;
  }

  let body = {};
  try {
    body = req.method === 'POST' ? await readBody(req) : {};
  } catch (e) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    return;
  }
  /* Query params work too, so a probe is curl-able and greppable in a transcript:
     curl '127.0.0.1:9377/eval?expr=document.title&mode=explore' */
  for (const [k, v] of u.searchParams) if (body[k] === undefined) body[k] = v;
  if (typeof body.full_page === 'string') body.full_page = body.full_page === 'true';
  if (typeof body.keep_context === 'string') body.keep_context = body.keep_context === 'true';

  try {
    const out = await serial(() => fn(body));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
  } catch (e) {
    const status = e.status || 500;
    const payload = e.payload || Object.assign({ ok: false, error: String(e.message || e) }, stamp());
    payload.ok = false;
    if (!payload.error) payload.error = String(e.message || e);
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
  }
}

/* ---------- lifecycle ------------------------------------------------------------------------- */

let closing = false;
let server = null;
async function bye(code, why) {
  if (closing) return;
  closing = true;
  log('shutting down after', state.probesServed, 'probes and', state.worldId, 'worlds'
    + (why ? ' -- ' + why : ''));
  try { if (server) server.close(); } catch (e) { /* not listening */ }
  /* A WEDGED RENDERER MUST NOT BUY THE BROWSER A LONGER LIFE THAN THE SERVER. A probe that left an
     infinite loop running in the page can make browser.close() hang, and a shutdown path that can
     hang is not a shutdown path -- it is the orphan again, wearing a graceful-close costume. So:
     close politely, but exit regardless. Chromium is a child of this process and its pipe dies with
     us, which is what actually takes the browser down. */
  const hard = setTimeout(() => {
    log('browser.close() did not return in 8s -- exiting anyway; the browser pipe dies with us');
    process.exit(code || 0);
  }, 8000);
  try { if (state.browser) await state.browser.close(); } catch (e) { /* already gone */ }
  clearTimeout(hard);
  process.exit(code || 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) { process.stdout.write(HELP); process.exit(0); }
  state.quiet = !!args.quiet;
  state.html = args.html ? path.resolve(String(args.html)) : DEFAULT_HTML;
  state.url = args.url ? String(args.url) : B.fileUrl(state.html);
  state.viewport = parseViewport(args.viewport, DEFAULT_VIEWPORT);
  const port = Number(args.port || process.env.PROBE_PORT || DEFAULT_PORT);
  /* RESOLVED BEFORE THE BROWSER IS LAUNCHED, so a mistyped flag costs a message rather than a
     chromium launch and an 11.7 MiB parse first. */
  const idleMs = resolveIdleMs(args);

  await launch(args);
  const first = await reload({});
  log('world', first.world_id, 'ready in', first.ms + 'ms', '(' + first.ready_mode + ')', state.url);

  server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      try {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
      } catch (e2) { /* client vanished */ }
    });
  });

  /* ===== THE IDLE TTL, ON BY DEFAULT (verifier-added per the adoption gate) ======================
   * A server that is autostarted by a client shim must be able to die on its own. The agent that
   * started it can be killed mid-wave and never reach /shutdown -- proven in this repo's own cold
   * verify: kill the client and the server keeps the port and the browser indefinitely. An orphan
   * costs a chromium's memory, poisons the next measurement (ensureUp() ADOPTS whatever is already
   * answering on the port), and lands in the operator's process list.
   *
   * ON BY DEFAULT, because opt-in is exactly what fails here: the agent that forgets to pass the
   * flag is the same agent that forgets to shut down. The timer is reset when a request ARRIVES and
   * again when its response COMPLETES, so a 1.3s /reload or a slow screenshot can never be mistaken
   * for silence. The poll is a quarter of the budget (capped at 5s) so a small TTL is still honest
   * rather than rounded up to the poll interval. */
  state.idleTtlMs = idleMs;
  state.lastActivityAt = Date.now();
  if (idleMs > 0) {
    const bump = () => { state.lastActivityAt = Date.now(); };
    server.on('request', (req, res) => {
      state.idleMsBeforeLastRequest = Date.now() - state.lastActivityAt;
      bump();
      res.on('finish', bump);
      res.on('close', bump);
    });
    const tick = Math.max(250, Math.min(5000, Math.floor(idleMs / 4)));
    const timer = setInterval(() => {
      const idle = Date.now() - state.lastActivityAt;
      if (idle >= idleMs) {
        clearInterval(timer);
        bye(0, 'idle for ' + idle + 'ms (--idle-ttl ' + (idleMs / 60000) + ' min); the browser goes with me');
      }
    }, tick);
    timer.unref();
    log('idle ttl', idleMs + 'ms (' + (idleMs / 60000) + ' min), checked every ' + tick + 'ms');
  } else {
    log('idle ttl DISABLED -- this server will outlive its client. Remember to /shutdown.');
  }

  server.listen(port, '127.0.0.1', () => {
    /* ONE machine-readable line, like the gate's browser server: a client can wait for this instead
       of sleeping and hoping. */
    process.stdout.write(JSON.stringify({
      probe_server: 'up', port: port, url: state.url, pid: process.pid,
      viewport: state.viewport, world_id: state.worldId, boot_ms: first.ms,
      idle_ttl_ms: state.idleTtlMs,
    }) + '\n');
  });
  server.on('error', (e) => {
    process.stdout.write(JSON.stringify({ probe_server: 'error', error: String(e.message || e) }) + '\n');
    bye(1);
  });

  process.on('SIGINT', () => bye(0));
  process.on('SIGTERM', () => bye(0));
}

const HELP = [
  'tools/probe_server.cjs -- one warm chromium, probes over localhost HTTP',
  '',
  '  --port N            listen port (default ' + DEFAULT_PORT + ')',
  '  --html PATH         file to load (default the repo deliverable)',
  '  --url URL           load this URL instead of --html',
  '  --viewport WxH      initial viewport (default 1280x800)',
  '  --headed            show the browser (debugging)',
  '  --idle-ttl MIN      exit after MIN minutes with no requests (default '
    + (DEFAULT_IDLE_TTL_MS / 60000) + '; 0 disables)',
  '  --idle-exit-ms N    the same budget in milliseconds; wins over --idle-ttl if both are given',
  '  --quiet             no chatter on stdout beyond the ready line',
  '',
  'endpoints: /eval /reload /goto /viewport /screenshot /status /shutdown',
  'discipline: assert-mode probes require a pristine world. See tools/PROBE_SERVER.md.',
  '',
].join('\n');

/* Exported so the self-test's COLD path can build a byte-identical context, evaluate through the
   identical wrapper, and settle on the identical predicate. Parity that is asserted by two
   independent implementations is really a test of the two implementations; parity built from one
   shared definition tests the thing it claims to test -- warm versus cold. */
module.exports = {
  contextOpts, wrapExpression, DOC_REST, INSTALL_LEDGER, settleDoc, waitReady, parseViewport,
  resolveIdleMs, DEFAULT_PORT, DEFAULT_HTML, DEFAULT_IDLE_TTL_MS,
};

if (require.main === module) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ probe_server: 'error', error: String(e && e.stack || e) }) + '\n');
    process.exit(1);
  });
}
