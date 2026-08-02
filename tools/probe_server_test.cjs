/* ===== THE SELF-TEST: does the warm world measure the same thing a cold one does? ===============
 *
 * A probe server is only worth having if its answers are the SAME answers a cold browser gives. If
 * they differ anywhere, the speedup is not a speedup -- it is a quiet change of subject, and every
 * measurement taken through it is suspect. So this does not test the server's plumbing. It tests
 * the only claim that matters:
 *
 *     for each of N representative measurements:
 *         value measured via the server (behind /reload)  ===  value measured by a cold chromium
 *
 * "===" is EXACT. Geometry is compared as full floats, not rounded: sub-pixel widths like 3.86 vs
 * 3.88 are the strongest parity evidence available, and rounding them away is how a parity test
 * stops being able to fail. Computed styles are compared as exact strings.
 *
 * THE COLD SIDE IS GENUINELY COLD: a fresh chromium.launch() per measurement, the full 11.7 MiB
 * parse, then teardown -- the thing this tool exists to abolish, run honestly so the comparison is
 * fair and the timing is real.
 *
 * PARITY IS BUILT FROM ONE DEFINITION, NOT TWO. The cold path imports contextOpts(),
 * wrapExpression(), waitReady() and settleDoc() from probe_server.cjs itself. Two hand-written
 * implementations would mostly test each other; sharing the definitions means a mismatch can only
 * come from the thing under test -- warm versus cold.
 *
 * IT ALSO PROVES THE RESET IS REAL: mutate the world through /eval, watch the mutation be caught
 * and the world be refused, then reload and confirm the pristine value is back. A "fresh world"
 * that is not fresh would make every assertive probe a lie, so it is not taken on trust.
 *
 * Writes tools/PROBE_SERVER_RECEIPTS.txt. Exit 0 only if every value matches.
 *
 *   node tools/probe_server_test.cjs [--port 9377] [--html PATH] [--cold-repeats 1]
 */
'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');

const B = require('../test/_boot.cjs');
const S = require('./probe_server.cjs');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html');
const RECEIPTS = path.join(__dirname, 'PROBE_SERVER_RECEIPTS.txt');
const DESKTOP = { w: 1280, h: 800 };
const PHONE = { w: 390, h: 844 };

const args = (() => {
  const a = { _: [] };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (!v[i].startsWith('--')) { a._.push(v[i]); continue; }
    const k = v[i].slice(2).replace(/-/g, '_');
    const n = v[i + 1];
    if (n !== undefined && !n.startsWith('--')) { a[k] = n; i++; } else { a[k] = true; }
  }
  return a;
})();
const PORT = Number(args.port || 9377);
const HOST = '127.0.0.1';

/* ===== THE MEASUREMENTS =========================================================================
 * Representative of what probe-heavy agents actually ask: element geometry at two viewports, a
 * computed-style read, a token read, an at-rest animation census, fold membership, and a
 * screenshot. Every one is an ASSERTIVE measurement -- the kind that must run behind a reload.
 *
 * Chosen for DISCRIMINATING POWER, not convenience: #homerail and #hometabs change shape between
 * the two viewports (a parity test on values that never move proves nothing), and .hm-seg widths
 * land on sub-pixel fractions, which is where a rendering difference would show up first. Nothing
 * here may be measured where it is display:none -- see vacuous(), which fails the run rather than
 * printing MATCH for a comparison of 0 against 0. */
const MEASUREMENTS = [
  { name: 'doc_identity', vp: DESKTOP,
    expr: '({ view: document.documentElement.dataset.view, group: document.documentElement.dataset.group,'
      + ' theme: document.documentElement.dataset.theme, topics: TopicRegistry.ids().length,'
      + ' nodes: document.querySelectorAll("*").length, title: document.title })' },

  { name: 'homerail_geom_1280', vp: DESKTOP,
    expr: 'document.querySelector("#homerail").getBoundingClientRect()' },

  /* #hometabs is deliberately NOT measured at 1280: it is display:none there, so its rect is all
     zeros and a warm-vs-cold comparison of it would be 0 === 0 -- a check that cannot fail. It IS
     measured at 390, where it has real geometry. vacuous() below enforces this mechanically so the
     next person to add a measurement cannot reintroduce the hole by accident. */
  { name: 'homestatus_geom_1280', vp: DESKTOP,
    expr: 'document.querySelector("#homestatus").getBoundingClientRect()' },

  { name: 'homelib_geom_1280', vp: DESKTOP,
    expr: 'document.querySelector("#homelib").getBoundingClientRect()' },

  /* Sub-pixel fractions: the most sensitive parity signal on the page. */
  { name: 'hm_seg_subpixel_1280', vp: DESKTOP,
    expr: '[...document.querySelectorAll(".hm-seg")].slice(0, 12).map(e => e.getBoundingClientRect().width)' },

  { name: 'computed_style_body_1280', vp: DESKTOP,
    expr: '(cs => ({ bg: cs.backgroundColor, fg: cs.color, ff: cs.fontFamily, fs: cs.fontSize,'
      + ' lh: cs.lineHeight }))(getComputedStyle(document.body))' },

  /* The six-rooms accent tokens -- custom properties resolved off the root. */
  { name: 'accent_tokens_1280', vp: DESKTOP,
    expr: '(cs => ["--acc", "--topic-ink", "--topic-solid", "--topic-wash", "--topic-edge"]'
      + '.reduce((o, k) => (o[k] = cs.getPropertyValue(k).trim(), o), {}))(getComputedStyle(document.documentElement))' },

  /* THE AT-REST CENSUS, plus the evidence that makes it mean something.
   *
   * The census ALONE was the first version of this row, and vacuous() rejected it: after the settle
   * document.getAnimations() is legitimately empty, so the row compared {0,0,0} against {0,0,0} and
   * printed MATCH while asserting nothing. Zero is the RIGHT answer -- it is just not an
   * INFORMATIVE one, and those are different properties.
   *
   * So the census now travels with the state it is a claim about: the boot animations this app runs
   * (bodyIn on <body>, panelIn on the panels) ramp opacity from 0 and scale from .96, so a world
   * sampled mid-flight reports a fractional opacity, a non-identity transform matrix, and a width
   * ~4% short. At rest it reports opacity "1", transform "none" and the full width. Those values
   * carry information, they differ if the settle ever regresses, and the census sitting at zero
   * beside them is then a claim with teeth. */
  { name: 'at_rest_census_1280', vp: DESKTOP,
    expr: '(() => {'
      + ' const as = document.getAnimations();'
      + ' const fin = a => { let i = 1; try { i = a.effect.getComputedTiming().iterations; } catch (e) {} return i !== Infinity; };'
      + ' const live = a => a.playState === "running" || a.playState === "pending" || a.playState === "paused";'
      + ' const el = document.querySelector("#homerail"), cs = getComputedStyle(el), r = el.getBoundingClientRect();'
      + ' return { in_flight_finite: as.filter(a => fin(a) && live(a)).length,'
      + ' infinite: as.filter(a => !fin(a)).length, total: as.length,'
      + ' body_opacity: getComputedStyle(document.body).opacity,'
      + ' rail_opacity: cs.opacity, rail_transform: cs.transform,'
      + ' rail_w: r.width, rail_h: r.height };'
      + '})()' },

  /* Fold membership -- an assertion that is meaningless against a contaminated world, and exactly
     the kind of thing agents ask this server for. */
  { name: 'fold_membership_1280', vp: DESKTOP,
    expr: '[...document.querySelectorAll("#homerail, #hometabs, #homelib, #homestatus")]'
      + '.map(e => ({ id: e.id, top: e.getBoundingClientRect().top, above_fold: e.getBoundingClientRect().top < innerHeight }))' },

  { name: 'scroll_extent_1280', vp: DESKTOP,
    expr: '({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,'
      + ' iw: innerWidth, ih: innerHeight })' },

  { name: 'homerail_geom_390', vp: PHONE,
    expr: 'document.querySelector("#homerail").getBoundingClientRect()' },

  { name: 'hometabs_geom_390', vp: PHONE,
    expr: 'document.querySelector("#hometabs").getBoundingClientRect()' },

  { name: 'hm_seg_subpixel_390', vp: PHONE,
    expr: '[...document.querySelectorAll(".hm-seg")].slice(0, 12).map(e => e.getBoundingClientRect().width)' },

  { name: 'computed_style_rail_390', vp: PHONE,
    expr: '(cs => ({ display: cs.display, pos: cs.position, pad: cs.padding, bg: cs.backgroundColor,'
      + ' bs: cs.boxShadow }))(getComputedStyle(document.querySelector("#homerail")))' },

  /* No horizontal scroll at 390 is a real product invariant, and it is a geometry read. */
  { name: 'scroll_extent_390', vp: PHONE,
    expr: '({ sw: document.documentElement.scrollWidth, iw: innerWidth,'
      + ' overflows: document.documentElement.scrollWidth > innerWidth })' },
];

/* ===== ASCII DISCIPLINE =========================================================================
 * The page's own content is NOT ASCII (its <title> carries an em dash, and #homestatus a middle
 * dot). This repo enforces strict 7-bit ASCII on its files, and a receipts file that pasted a
 * measured string in raw would smuggle a high byte into the tree -- the exact silent-corruption
 * vector test/ascii_guard.py exists to stop. So every measured value is escaped on its way to
 * disk. The escape is lossless and reviewable, which is the standard the guard asks for. */
function asciiSafe(s) {
  return String(s).replace(/[^\x20-\x7E\n]/g, (c) => {
    if (c === '\t') return '\\t';
    const h = c.charCodeAt(0).toString(16).toUpperCase();
    return '\\u' + '0000'.slice(h.length) + h;
  });
}
const j = (v) => asciiSafe(JSON.stringify(v));

/* ===== the warm side: HTTP to the server ======================================================= */

function post(route, body, method) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body || {}), 'utf8');
    const req = http.request({
      host: HOST, port: PORT, path: route, method: method || 'POST',
      headers: { 'content-type': 'application/json', 'content-length': data.length },
      timeout: 300000,
    }, (res) => {
      const cs = [];
      res.on('data', (c) => cs.push(c));
      res.on('end', () => {
        const s = Buffer.concat(cs).toString('utf8');
        let jj = null;
        try { jj = JSON.parse(s); } catch (e) { return reject(new Error('non-JSON from ' + route + ': ' + s.slice(0, 200))); }
        jj.__status = res.statusCode;
        resolve(jj);
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout on ' + route)));
    req.on('error', reject);
    req.end(data);
  });
}

/* ===== the cold side: a whole browser, per measurement ========================================= */

/* Everything here that could differ from the server's path is IMPORTED from the server's path.
   What remains different is the only thing under test: this one launches a browser and throws it
   away, and the server does not. */
async function coldMeasure(m) {
  const t0 = Date.now();
  const browser = await chromium.launch(B.launchOpts({ headless: true }));
  const context = await browser.newContext(S.contextOpts(m.vp));
  const page = await context.newPage();
  await page.goto(B.fileUrl(HTML), { timeout: B.NAV_MS, waitUntil: 'load' });
  await S.waitReady(page);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
  await S.settleDoc(page);
  const raw = await page.evaluate(S.wrapExpression(m.expr, false, undefined));
  let shot = null;
  if (m.screenshot) {
    const buf = await page.screenshot({ path: m.screenshot.cold });
    shot = { bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
  }
  await browser.close();
  return { value: raw && raw.ok ? raw.v : null, err: raw && raw.ok ? null : JSON.stringify(raw), ms: Date.now() - t0, shot: shot };
}

/* ===== comparison ============================================================================== */

/* Canonical form for comparison: key order must not decide a verdict. Numbers are compared as
   FULL floats -- no rounding, no epsilon. If the warm world ever renders one sub-pixel differently
   from a cold one, that is precisely the finding this test exists to surface, and an epsilon would
   hide it. */
function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

/* ===== A PARITY CHECK ON NOTHING IS NOT A PARITY CHECK =========================================
 * The first draft of this file measured #hometabs at 1280x800, where it is display:none. Its rect
 * is all zeros, so warm and cold agreed perfectly -- 0 === 0 -- and the row printed [MATCH] while
 * proving exactly nothing. That is this repo's signature failure mode (nine checks that could not
 * fail have been found here before), and it had reappeared inside the very test written to certify
 * a new tool.
 *
 * So it is caught mechanically rather than by remembering: a measurement whose value carries no
 * information -- null, an empty array or object, or an object whose every number is zero -- FAILS
 * the run. If a future measurement legitimately expects zeros, it has to say so out loud by
 * measuring something alongside them. */
function vacuous(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v === '';
  if (typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => vacuous(x));
  const keys = Object.keys(v);
  if (!keys.length) return true;
  const nums = keys.filter((k) => typeof v[k] === 'number');
  if (nums.length === keys.length) return nums.every((k) => v[k] === 0);
  return false;
}

/* ===== main ==================================================================================== */

const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const fmt = (n) => (n === null || n === undefined ? 'n/a' : String(Math.round(n)));

(async () => {
  const started = new Date();
  const lines = [];
  const say = (s) => { lines.push(s === undefined ? '' : s); process.stdout.write((s === undefined ? '' : s) + '\n'); };

  const up = await post('/status', {}, 'GET').catch(() => null);
  if (!up || !up.ok) {
    process.stdout.write('probe_server_test: no server on ' + HOST + ':' + PORT + '\n'
      + '  start one first:  node tools/probe_server.cjs --port ' + PORT + '\n');
    process.exit(2);
  }

  const shotDir = path.join(require('os').tmpdir(), 'probe-parity-' + process.pid);
  fs.mkdirSync(shotDir, { recursive: true });

  const rows = [];
  let mismatches = 0;

  /* ---- pass 1: every measurement through the SERVER, each behind its own /reload ---- */
  say('=== pass 1: via the warm server, each measurement behind its own /reload ===');
  for (const m of MEASUREMENTS) {
    const tR0 = Date.now();
    const rl = await post('/reload', { viewport: m.vp.w + 'x' + m.vp.h });
    const reloadMs = Date.now() - tR0;
    if (!rl.ok) { say('  ' + m.name + ': RELOAD FAILED ' + j(rl)); mismatches++; continue; }
    const tE0 = Date.now();
    const ev = await post('/eval', { expr: m.expr });
    const evalMs = Date.now() - tE0;
    if (!ev.ok) { say('  ' + m.name + ': EVAL FAILED ' + j(ev)); mismatches++; continue; }

    /* THE FAST PATH, measured on the same world: a second identical probe against held state.
       This is the number an agent gets when it explores rather than asserts. */
    const tF0 = Date.now();
    await post('/eval', { expr: m.expr, mode: 'explore' });
    const heldMs = Date.now() - tF0;

    rows.push({
      name: m.name, vp: m.vp, warm: ev.value, warmReloadMs: reloadMs, warmEvalMs: evalMs,
      heldMs: heldMs, stamp: { world: ev.world_id, since: ev.since_reload_ms, probes: ev.probes_since_reload, pristine: ev.pristine },
    });
    say('  ' + m.name.padEnd(26) + ' reload ' + fmt(reloadMs) + 'ms + eval ' + fmt(evalMs)
      + 'ms | held-state eval ' + fmt(heldMs) + 'ms | pristine=' + ev.pristine + ' probes_since_reload=' + ev.probes_since_reload);
  }

  /* ---- pass 2: every measurement through a COLD browser of its own ---- */
  say('');
  say('=== pass 2: via a cold chromium, launched and torn down per measurement ===');
  const repeats = Number(args.cold_repeats || 1);
  for (const row of rows) {
    const m = MEASUREMENTS.find((x) => x.name === row.name);
    const times = [];
    let cold = null;
    for (let i = 0; i < repeats; i++) {
      cold = await coldMeasure(m);
      times.push(cold.ms);
    }
    row.cold = cold.value;
    row.coldMs = median(times);
    row.coldErr = cold.err;
    const same = canon(row.warm) === canon(row.cold);
    row.vacuous = vacuous(row.warm);
    row.same = same && !row.vacuous;
    if (!same || row.vacuous) mismatches++;
    say('  ' + row.name.padEnd(26) + ' cold ' + fmt(row.coldMs) + 'ms | '
      + (row.vacuous ? 'VACUOUS (carries no information -- this row proves nothing)'
        : (same ? 'MATCH' : 'MISMATCH'))
      + (same ? '' : '\n      warm=' + j(row.warm) + '\n      cold=' + j(row.cold)));
  }

  /* ---- the screenshot, both ways ---- */
  say('');
  say('=== screenshot parity (1280x800, viewport) ===');
  const warmShotPath = path.join(shotDir, 'warm.png');
  const coldShotPath = path.join(shotDir, 'cold.png');
  await post('/reload', { viewport: '1280x800' });
  const tS0 = Date.now();
  const warmShot = await post('/screenshot', { path: warmShotPath });
  const warmShotMs = Date.now() - tS0;
  const coldShot = await coldMeasure({ name: 'screenshot', vp: DESKTOP, expr: '1', screenshot: { cold: coldShotPath } });
  const shotSame = warmShot.sha256 === coldShot.shot.sha256;
  say('  warm: ' + warmShot.bytes + ' bytes  sha256 ' + warmShot.sha256.slice(0, 16) + '  (' + fmt(warmShotMs) + 'ms)');
  say('  cold: ' + coldShot.shot.bytes + ' bytes  sha256 ' + coldShot.shot.sha256.slice(0, 16) + '  (' + fmt(coldShot.ms) + 'ms)');
  let shotNote = shotSame ? 'byte-identical' : 'BYTES DIFFER';
  if (!shotSame) {
    /* Not automatically a defect: this repo has already established that a rasteriser can produce
       float noise across processes (which is why the mermaid SVGs are cached rather than rebuilt).
       So report the PIXEL difference rather than a hash verdict -- a hash says "different", pixels
       say "different by how much", and only the second is actionable. */
    try {
      const P = require('../test/_pixels.cjs');
      const a = P.decodePng(fs.readFileSync(warmShotPath));
      const b = P.decodePng(fs.readFileSync(coldShotPath));
      if (a.w !== b.w || a.h !== b.h) shotNote = 'DIFFERENT SIZE ' + a.w + 'x' + a.h + ' vs ' + b.w + 'x' + b.h;
      else {
        let diff = 0, maxd = 0;
        for (let i = 0; i < a.data.length; i += 4) {
          const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
          if (d) { diff++; if (d > maxd) maxd = d; }
        }
        shotNote = 'bytes differ; ' + diff + ' of ' + (a.w * a.h) + ' pixels differ ('
          + (100 * diff / (a.w * a.h)).toFixed(4) + '%), max channel delta ' + maxd;
      }
    } catch (e) { shotNote = 'bytes differ; pixel compare failed: ' + e.message; }
  }
  say('  ' + shotNote);

  /* ---- the reset proof, REPEATED ----
   * REPEATED ON PURPOSE, and the repetition is the point. The first version of this ran the cycle
   * ONCE and passed. The guard it was testing subtracted a sampled noise floor, and that floor
   * sampled as 0 or 1 depending on which frame it landed in -- so a real one-mutation
   * contamination went undetected in roughly 2 runs out of 3, and a single-shot proof was a coin
   * flip dressed as evidence. A guard that fires intermittently is the flaky-gate pathology: it
   * teaches everyone that a refusal means "try again". So the cycle runs N times and ALL N must
   * catch it. */
  const RESET_TRIALS = Number(args.reset_trials || 5);
  say('');
  say('=== the reset actually resets: mutate -> caught -> refused -> reload -> pristine  (x'
    + RESET_TRIALS + ') ===');
  const resetSteps = [];
  let resetPassed = 0;
  let pristineRef = null;
  for (let t = 1; t <= RESET_TRIALS; t++) {
    const rl = await post('/reload', { viewport: '1280x800' });
    const before = await post('/eval', { expr: 'document.querySelector("#homestatus").textContent' });
    if (pristineRef === null) pristineRef = canon(before.value);

    /* THE NEGATIVE CONTROL, and it is not optional. A guard that dirtied the world on EVERY probe
       would sail through the catch test below while being useless -- it would refuse every honest
       measurement too. So a pure READ must leave the world pristine. This arm has already earned
       its place: an earlier quiesce that exited after ONE quiet frame let a straggler land inside
       this read's window and dirty the world on a probe that touched nothing (1 run in 10). */
    const readClean = before.__status === 200 && before.mutations === 0 && before.pristine === true;

    const mut = await post('/eval', { expr: '(document.querySelector("#homestatus").textContent = "CONTAMINATED-BY-PROBE", 1)' });
    const caught = mut.mutations > 0 && mut.pristine === false;

    const refused = await post('/eval', { expr: 'document.querySelector("#homestatus").textContent' });
    const wasRefused = refused.__status === 409;

    const explored = await post('/eval', { expr: 'document.querySelector("#homestatus").textContent', mode: 'explore' });
    const sawDamage = String(explored.value) === 'CONTAMINATED-BY-PROBE';

    await post('/reload', { viewport: '1280x800' });
    const after = await post('/eval', { expr: 'document.querySelector("#homestatus").textContent' });
    const restored = canon(after.value) === canon(before.value) && canon(after.value) === pristineRef;

    const ok = readClean && caught && wasRefused && sawDamage && restored;
    if (ok) resetPassed++;
    resetSteps.push('trial ' + t + ': quiesce=' + rl.quiesce_frames + 'f'
      + ' | pure read left it pristine=' + (readClean ? 'yes' : 'NO')
      + ' | mutation caught=' + (caught ? 'yes(' + mut.mutations + ': ' + j(mut.mutation_detail) + ')' : 'NO')
      + ' | next probe=' + (wasRefused ? 'REFUSED 409' : 'SERVED ' + refused.__status)
      + ' | explore saw damage=' + (sawDamage ? 'yes' : 'NO')
      + ' | after reload=' + (restored ? 'PRISTINE' : 'NOT RESTORED')
      + '  -> ' + (ok ? 'PASS' : 'FAIL'));
  }
  resetSteps.push('pristine value: ' + j(String(JSON.parse(pristineRef)).slice(0, 48)));
  resetSteps.push('VERDICT: ' + resetPassed + '/' + RESET_TRIALS + ' trials caught the contamination and restored the world'
    + (resetPassed === RESET_TRIALS ? '  -- the reset is real and the guard is deterministic' : '  -- RESET PROOF FAILED'));
  for (const s of resetSteps) say('  ' + s);
  if (resetPassed !== RESET_TRIALS) mismatches++;

  /* ---- contention: the condition this tool actually exists for ----
   * The quiet-box comparison understates the win, and quoting someone else's "5-13s under load"
   * would be citing a number rather than measuring one. So measure it here: N cold boots running
   * at once (a fleet of probe-heavy agents) versus server probes taken during that same window.
   * The cold path pays for contention twice -- once in launch, once in parse -- and the warm path
   * pays for neither, which is the whole thesis of the tool stated as an experiment. */
  const CONC = Number(args.concurrency || 4);
  say('');
  say('=== contention: ' + CONC + ' cold boots at once, versus warm probes during the same window ===');
  await post('/reload', { viewport: '1280x800' });
  const warmUnderLoad = [];
  let loadDone = false;
  const warmLoop = (async () => {
    while (!loadDone) {
      const t = Date.now();
      const r = await post('/eval', { expr: 'document.querySelector("#homerail").getBoundingClientRect().width', mode: 'explore' });
      if (r.ok) warmUnderLoad.push(Date.now() - t);
      await new Promise((r2) => setTimeout(r2, 20));
    }
  })();
  const coldConcT0 = Date.now();
  const coldConc = await Promise.all(
    Array.from({ length: CONC }, () => coldMeasure({ name: 'load', vp: DESKTOP, expr: 'document.querySelector("#homerail").getBoundingClientRect().width' })));
  const coldConcWall = Date.now() - coldConcT0;
  loadDone = true;
  await warmLoop;
  const coldConcMs = coldConc.map((c) => c.ms);
  const coldConcMed = median(coldConcMs);
  const warmLoadMed = warmUnderLoad.length ? median(warmUnderLoad) : null;
  const coldValuesAgree = coldConc.every((c) => canon(c.value) === canon(coldConc[0].value));
  say('  cold boots (concurrent x' + CONC + ') : ' + coldConcMs.map(fmt).join(', ') + ' ms  (median '
    + fmt(coldConcMed) + 'ms, wall ' + fmt(coldConcWall) + 'ms)');
  say('  warm /eval during that window   : median ' + fmt(warmLoadMed) + 'ms over ' + warmUnderLoad.length + ' probes');
  say('  cold values agree with warm     : ' + (coldValuesAgree && canon(coldConc[0].value) === canon(rows.find((r) => r.name === 'homerail_geom_1280').warm.width) ? 'yes' : 'see table'));

  /* ---- timings ---- */
  const wReload = rows.map((r) => r.warmReloadMs + r.warmEvalMs);
  const wEval = rows.map((r) => r.heldMs);
  const cold = rows.map((r) => r.coldMs);
  const medReload = median(wReload), medEval = median(wEval), medCold = median(cold);

  say('');
  say('=== timings (median over ' + rows.length + ' measurements) ===');
  say('  server, behind /reload (fresh world) : ' + fmt(medReload) + 'ms');
  say('  server, /eval against held state     : ' + fmt(medEval) + 'ms');
  say('  cold chromium boot per probe         : ' + fmt(medCold) + 'ms');
  say('  speedup, fresh-world probe           : ' + (medCold / medReload).toFixed(2) + 'x');
  say('  speedup, held-state probe            : ' + (medCold / Math.max(1, medEval)).toFixed(1) + 'x');

  const matched = rows.filter((r) => r.same).length;
  say('');
  say('=== VERDICT: ' + (mismatches === 0 ? 'PASS' : 'FAIL') + '  (' + matched + '/' + rows.length + ' values identical, '
    + mismatches + ' problem(s)) ===');

  /* ---- receipts ---- */
  const fin = await post('/status', {}, 'GET');
  const rec = [];
  rec.push('PROBE SERVER RECEIPTS');
  rec.push('=====================');
  rec.push('');
  rec.push('WHAT THIS FILE IS. The evidence that tools/probe_server.cjs measures the same thing a');
  rec.push('cold chromium measures. Regenerate with:');
  rec.push('    node tools/probe_server.cjs --port ' + PORT + ' &');
  rec.push('    node tools/probe_server_test.cjs --port ' + PORT);
  rec.push('');
  rec.push('run       : ' + started.toISOString());
  rec.push('node      : ' + process.version);
  const htmlBytes = fs.statSync(HTML).size;
  const htmlMiB = (htmlBytes / 1048576).toFixed(2) + ' MiB';
  rec.push('deliverable: ' + path.basename(HTML) + '  (' + htmlBytes.toLocaleString('en-US') + ' bytes = ' + htmlMiB + ')');
  rec.push('launch args (identical on both sides): ' + j(fin.launch_args));
  rec.push('cold repeats per measurement: ' + repeats);
  rec.push('');
  rec.push('NOTE ON ENCODING: measured strings are \\u-escaped on their way into this file. The');
  rec.push('page content is not ASCII (its title carries an em dash) and this repo enforces strict');
  rec.push('7-bit ASCII on its files -- see test/ascii_guard.py.');
  rec.push('');
  rec.push('VERDICT: ' + (mismatches === 0 ? 'PASS' : 'FAIL') + ' -- ' + matched + '/' + rows.length
    + ' measurements byte-identical between the warm server and a cold browser.');
  rec.push('');
  rec.push('');
  rec.push('1. VALUE PARITY (exact; geometry compared as full floats, no rounding)');
  rec.push('----------------------------------------------------------------------');
  rec.push('');
  for (const r of rows) {
    rec.push((r.vacuous ? '[VACUOUS]  ' : (r.same ? '[MATCH]    ' : '[MISMATCH] ')) + r.name + '   @' + r.vp.w + 'x' + r.vp.h);
    rec.push('    value : ' + j(r.warm));
    if (!r.same) rec.push('    cold  : ' + j(r.cold));
    rec.push('    stamp : world=' + r.stamp.world + ' probes_since_reload=' + r.stamp.probes
      + ' since_reload_ms=' + r.stamp.since + ' pristine=' + r.stamp.pristine);
    rec.push('');
  }
  rec.push('screenshot @1280x800: warm ' + warmShot.bytes + 'B sha256 ' + warmShot.sha256);
  rec.push('                      cold ' + coldShot.shot.bytes + 'B sha256 ' + coldShot.shot.sha256);
  rec.push('                      ' + shotNote);
  rec.push('');
  rec.push('');
  rec.push('2. TIMING (per probe, milliseconds)');
  rec.push('-----------------------------------');
  rec.push('');
  rec.push('measurement                  server+reload   server /eval    cold boot');
  rec.push('                             (fresh world)   (held state)    (per probe)');
  for (const r of rows) {
    rec.push('  ' + r.name.padEnd(27)
      + String(fmt(r.warmReloadMs + r.warmEvalMs)).padStart(9)
      + String(fmt(r.heldMs)).padStart(15)
      + String(fmt(r.coldMs)).padStart(15));
  }
  rec.push('');
  rec.push('  MEDIAN                     ' + String(fmt(medReload)).padStart(9)
    + String(fmt(medEval)).padStart(15) + String(fmt(medCold)).padStart(15));
  rec.push('');
  rec.push('  fresh-world probe vs cold boot : ' + (medCold / medReload).toFixed(2) + 'x faster');
  rec.push('  held-state probe vs cold boot  : ' + (medCold / Math.max(1, medEval)).toFixed(1) + 'x faster');
  rec.push('');
  rec.push('HOW TO READ THESE. The cold column is a full chromium launch, a ' + htmlMiB + ' parse, the app');
  rec.push('readiness wait, the at-rest settle, the measurement and teardown. Both columns were');
  rec.push('measured on a QUIET box, which is the condition LEAST favourable to this tool: the cost');
  rec.push('a warm browser avoids is precisely the cost that inflates under load. Section 2b');
  rec.push('measures that directly rather than asserting it.');
  rec.push('');
  rec.push('');
  rec.push('2b. THE SAME COMPARISON UNDER CONTENTION (' + CONC + ' cold boots at once)');
  rec.push('----------------------------------------------------------------');
  rec.push('');
  rec.push('  cold boots, concurrent x' + CONC + ' : ' + coldConcMs.map(fmt).join(', ') + ' ms');
  rec.push('                            median ' + fmt(coldConcMed) + 'ms (vs ' + fmt(medCold) + 'ms unloaded, '
    + (coldConcMed / medCold).toFixed(2) + 'x)');
  rec.push('  warm /eval in that window : median ' + fmt(warmLoadMed) + 'ms over ' + warmUnderLoad.length + ' probes'
    + ' (vs ' + fmt(medEval) + 'ms unloaded, ' + (warmLoadMed / Math.max(1, medEval)).toFixed(2) + 'x)');
  rec.push('  held-state probe vs a contended cold boot: '
    + (coldConcMed / Math.max(1, warmLoadMed)).toFixed(1) + 'x faster');
  rec.push('');
  rec.push('This is the operating condition the tool is for: a fleet of probe-heavy agents on one');
  rec.push('box. The cold path pays for contention twice, in launch and in parse; the warm path');
  rec.push('pays for neither.');
  rec.push('');
  rec.push('');
  rec.push('3. THE RESET ACTUALLY RESETS');
  rec.push('----------------------------');
  rec.push('');
  rec.push('An assertive measurement is only worth anything if the world behind it is really fresh.');
  rec.push('This is that proof, end to end:');
  rec.push('');
  for (const s of resetSteps) rec.push('  ' + s);
  rec.push('');
  rec.push('');
  rec.push('4. WHAT THIS DOES NOT PROVE');
  rec.push('---------------------------');
  rec.push('');
  rec.push('  - It does not prove parity under LOAD. Both passes ran on a quiet box. The claim is');
  rec.push('    value parity, plus a timing floor; a loaded box changes the timings, not the values.');
  rec.push('  - It does not prove every possible measurement agrees -- ' + rows.length + ' representative ones do.');
  rec.push('    A measurement that depends on wall-clock time, on animation phase, or on anything');
  rec.push('    the app persists across a session is exactly where warm and cold could still part');
  rec.push('    company, which is why /reload builds a NEW CONTEXT rather than just navigating.');
  rec.push('  - It does not make the server safe to use carelessly: the contamination discipline is');
  rec.push('    what keeps a fast probe honest, and section 3 is the proof the guard fires, not a');
  rec.push('    promise that nobody will pass mode:"explore" to something that deserved a reload.');
  rec.push('');
  fs.writeFileSync(RECEIPTS, rec.join('\n') + '\n', 'ascii');
  say('');
  say('receipts -> ' + RECEIPTS);

  try { fs.rmSync(shotDir, { recursive: true, force: true }); } catch (e) { /* leave it */ }
  process.exit(mismatches === 0 ? 0 : 1);
})().catch((e) => {
  process.stdout.write('probe_server_test: ' + (e && e.stack || e) + '\n');
  process.exit(1);
});
