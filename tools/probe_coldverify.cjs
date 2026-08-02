/* ===== THE COLD VERIFIER'S ADVERSARIAL BATTERY =================================================
 *
 * Written by an INDEPENDENT verifier that shares no context with the builder of probe_server.cjs.
 * tools/probe_server_test.cjs is the builder's own parity proof; this is the second opinion, and it
 * is deliberately aimed at the places that proof does NOT reach:
 *
 *   A. PARITY IN FAMILIES THE 15 DO NOT COVER. The builder's 15 measurements are all pure reads of
 *      the HOME surface of a just-booted world. This battery measures worlds that have been DRIVEN:
 *      a cue in flight, a transition paused at a fixed phase, a shadow tree entered, a viewport
 *      resized mid-session, a page scrolled, app state persisted and then reset. Every row runs the
 *      IDENTICAL step sequence through the warm server and through a cold chromium, and requires
 *      the two to be exactly equal.
 *   B. THE SECOND CLIENT. The server is documented as single-client. What does it actually do when
 *      two clients interleave?
 *   C. THE CLIENT DIES. Does the server survive it, and does the port stay held?
 *   D. ERROR PATHS. A syntax error, a rejecting promise, a probe that navigates away.
 *   E. WHAT THE MUTATION LEDGER CANNOT SEE. A MutationObserver is a DOM-mutation instrument. Not
 *      every way of spending a world is a DOM mutation.
 *   F. THE ONE-MUTATION CONTAMINATION, in a DIFFERENT class from the builder's (an attribute set,
 *      not a textContent write), repeated.
 *   G. THE STAMPS: present on every response, and actually reset by /reload.
 *   H. THE IDLE TTL: an orphaned server must take its browser with it.
 *
 * PARITY IS BUILT FROM ONE DEFINITION. Like the builder's test, the cold path imports contextOpts(),
 * wrapExpression(), waitReady() and settleDoc() from probe_server.cjs, so a mismatch can only come
 * from warm-versus-cold rather than from two hand-written implementations disagreeing. Section A
 * then adds a NORMALISER CROSS-CHECK: two rows are also measured cold through a plain closure that
 * never touches wrapExpression, so a wrapper that distorted BOTH sides identically would be caught.
 *
 *   node tools/probe_server.cjs --port 9401 &
 *   node tools/probe_coldverify.cjs --port 9401
 *
 * Exit 0 only if every parity row matches and no BLOCKING behaviour is found.
 */
'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const B = require('../test/_boot.cjs');
const S = require('./probe_server.cjs');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html');
const DESKTOP = { w: 1280, h: 800 };
const PHONE = { w: 390, h: 844 };
const HOST = '127.0.0.1';

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
const PORT = Number(args.port || 9401);
const ONLY = args.only ? String(args.only).split(',') : null;

/* ---------- output discipline: this repo is strict 7-bit ASCII ---------------------------------- */
function asciiSafe(s) {
  return String(s).replace(/[^\x20-\x7E\n]/g, (c) => {
    if (c === '\t') return '\\t';
    const h = c.charCodeAt(0).toString(16).toUpperCase();
    return '\\u' + '0000'.slice(h.length) + h;
  });
}
const j = (v) => asciiSafe(JSON.stringify(v));
const LINES = [];
const say = (s) => { const t = s === undefined ? '' : s; LINES.push(t); process.stdout.write(t + '\n'); };

/* ---------- the wire, raw (status codes matter here) -------------------------------------------- */
function post(route, body, method, port) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body || {}), 'utf8');
    const req = http.request({
      host: HOST, port: port || PORT, path: route, method: method || 'POST',
      headers: { 'content-type': 'application/json', 'content-length': data.length },
      timeout: Number(args.http_timeout_ms || 300000),
    }, (res) => {
      const cs = [];
      res.on('data', (c) => cs.push(c));
      res.on('end', () => {
        const s = Buffer.concat(cs).toString('utf8');
        let jj = null;
        try { jj = JSON.parse(s); } catch (e) { return resolve({ __status: res.statusCode, __nonjson: s.slice(0, 300) }); }
        jj.__status = res.statusCode;
        resolve(jj);
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout on ' + route)));
    req.on('error', reject);
    req.end(data);
  });
}

/* ---------- comparison, and a vacuity guard of my own ------------------------------------------- */
function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

/* A row that compares nothing against nothing is not a row. Same discipline the builder's vacuous()
   enforces -- restated here rather than imported, because a verifier that inherits the thing it is
   auditing is not verifying it. */
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

/* ---------- shared step vocabulary -------------------------------------------------------------- */
/* Two rAFs, expressed as an in-page expression so the SAME wait runs on both sides of the wire.
   The warm side cannot call B.settle() -- it only has /eval -- so the wait has to be a probe. */
const RAF2 = '(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return 1; })()';
const NAV_WALK = '(window.Router.navigate("walk"), 1)';
const THEME_CLICK = '(document.querySelector("#themetog").click(), 1)';

/* ===== SECTION A: the measurements ==============================================================
 * Each row: boot at vp, run `steps` in order, then measure `expr`. Warm and cold run the identical
 * sequence. `expect_divergence` marks a row whose whole point is to expose a KNOWN difference. */
const ROWS = [
  /* --- family: font loading (their 15 never ask) --- */
  { name: 'fonts_state', vp: DESKTOP,
    expr: '({ status: document.fonts.status, size: document.fonts.size,'
      + ' sys: document.fonts.check("16px -apple-system"), mono: document.fonts.check("16px monospace") })',
    plainFn: () => ({
      status: document.fonts.status, size: document.fonts.size,
      sys: document.fonts.check('16px -apple-system'), mono: document.fonts.check('16px monospace'),
    }) },

  /* --- family: the environment the world was built in --- */
  { name: 'env_and_media', vp: DESKTOP,
    expr: '({ dpr: devicePixelRatio, dark: matchMedia("(prefers-color-scheme: dark)").matches,'
      + ' reduce: matchMedia("(prefers-reduced-motion: reduce)").matches, hover: matchMedia("(hover: hover)").matches,'
      + ' fine: matchMedia("(pointer: fine)").matches, lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,'
      + ' sw: screen.width, sh: screen.height, cd: screen.colorDepth, hc: navigator.hardwareConcurrency })' },

  /* --- family: DEEP SHADOW DOM, on a surface none of the 15 visit (a topic view, not home).
         107 nodes live inside deep-walkthrough's shadow root; their widths land on sub-pixel
         fractions, which is where a rendering difference shows up first. --- */
  { name: 'shadow_deep_geom', vp: DESKTOP, steps: [NAV_WALK, RAF2],
    expr: '(() => { const h = document.querySelector("deep-walkthrough"), sr = h.shadowRoot;'
      + ' const all = [...sr.querySelectorAll("*")];'
      + ' const vis = all.filter(e => e.getBoundingClientRect().width > 0);'
      + ' return { hash: location.hash, host_w: h.getBoundingClientRect().width, host_h: h.getBoundingClientRect().height,'
      + ' total: all.length, visible: vis.length,'
      + ' widths: vis.slice(0, 8).map(e => e.getBoundingClientRect().width),'
      + ' tops: vis.slice(0, 8).map(e => e.getBoundingClientRect().top) }; })()',
    plainFn: () => {
      const h = document.querySelector('deep-walkthrough'); const sr = h.shadowRoot;
      const all = [...sr.querySelectorAll('*')];
      const vis = all.filter((e) => e.getBoundingClientRect().width > 0);
      return {
        hash: location.hash, host_w: h.getBoundingClientRect().width, host_h: h.getBoundingClientRect().height,
        total: all.length, visible: vis.length,
        widths: vis.slice(0, 8).map((e) => e.getBoundingClientRect().width),
        tops: vis.slice(0, 8).map((e) => e.getBoundingClientRect().top),
      };
    } },

  { name: 'shadow_deep_style', vp: DESKTOP, steps: [NAV_WALK, RAF2],
    expr: '(() => { const sr = document.querySelector("deep-walkthrough").shadowRoot;'
      + ' const e = [...sr.querySelectorAll("*")].filter(x => x.getBoundingClientRect().width > 0)[2];'
      + ' const cs = getComputedStyle(e);'
      + ' return { tag: e.tagName.toLowerCase(), fs: cs.fontSize, lh: cs.lineHeight, color: cs.color,'
      + ' bg: cs.backgroundColor, border: cs.borderTopColor, radius: cs.borderTopLeftRadius }; })()' },

  /* --- family: A CUE IN FLIGHT. getAnimations() during a real app transition, not at rest.
         The builder's at_rest_census reads the SETTLED world (0 in flight); this reads the world
         one tick after a theme flip, when a dozen transitions are live. --- */
  { name: 'anim_census_during_cue', vp: DESKTOP, steps: [THEME_CLICK],
    expr: '(() => { const as = document.getAnimations();'
      + ' const sig = as.map(a => (a.transitionProperty || a.animationName || "?") + "@"'
      + ' + ((a.effect && a.effect.target && (a.effect.target.id || a.effect.target.tagName)) || "?") + ":" + a.playState);'
      + ' sig.sort();'
      + ' return { n: as.length, states: [...new Set(as.map(a => a.playState))].sort(), sig: sig.slice(0, 12),'
      + ' theme: document.documentElement.dataset.theme }; })()' },

  /* --- family: A COMPUTED STYLE MID-TRANSITION, at a phase pinned by hand.
         Pause every animation and park it at exactly 120ms, so the phase is a CONSTANT rather than
         a race. If the warm world settles differently from a cold one, the interpolated colour at
         120ms is where it shows. --- */
  { name: 'computed_style_mid_transition', vp: DESKTOP, steps: [THEME_CLICK],
    expr: '(() => { const as = document.getAnimations();'
      + ' as.forEach(a => { try { a.pause(); a.currentTime = 120; } catch (e) { /* finished */ } });'
      + ' const btn = document.querySelector("#themetog"), cb = getComputedStyle(btn), bb = getComputedStyle(document.body);'
      + ' return { paused: as.filter(a => a.playState === "paused").length, n: as.length,'
      + ' btn_color: cb.color, btn_border: cb.borderTopColor, btn_bg: cb.backgroundColor,'
      + ' body_bg: bb.backgroundColor, body_color: bb.color, theme: document.documentElement.dataset.theme }; })()' },

  /* --- family: A RESIZE MID-SESSION. Does /viewport actually re-lay-out? Warm resizes through
         /viewport; cold resizes through page.setViewportSize. Both then settle and measure. --- */
  { name: 'resize_midsession_geom', vp: DESKTOP, resize: PHONE, steps: [RAF2],
    expr: '({ iw: innerWidth, ih: innerHeight,'
      + ' rail: document.querySelector("#homerail").getBoundingClientRect().toJSON(),'
      + ' tabs: document.querySelector("#hometabs").getBoundingClientRect().toJSON(),'
      + ' lib_w: document.querySelector("#homelib").getBoundingClientRect().width })' },

  /* --- family: SCROLL STATE. Fold membership is one of the builder's assertive measurements, and
         fold membership is a function of scroll -- which is not a DOM mutation. --- */
  { name: 'scrolled_fold', vp: DESKTOP, steps: ['(window.scrollTo(0, 400), 1)', RAF2],
    expr: '({ y: Math.round(scrollY), tops: [...document.querySelectorAll("#homerail, #homelib, #homestatus")]'
      + '.map(e => ({ id: e.id, top: e.getBoundingClientRect().top, above: e.getBoundingClientRect().top < innerHeight })) })' },

  /* --- family: CSSOM. Four stylesheets; their rule counts are a world property the builder's rows
         never read, and section E uses the same surface to show what the ledger cannot see. --- */
  { name: 'cssom_census', vp: DESKTOP,
    expr: '({ sheets: document.styleSheets.length,'
      + ' rules: [...document.styleSheets].map(s => { try { return s.cssRules.length; } catch (e) { return -1; } }) })' },

  /* --- family: PERSISTED APP STATE, RESET ACROSS A RELOAD. The builder's reset proof mutates the
         DOM directly. This one goes through the APP's own persistence (theme -> ddr.v1.theme in
         localStorage) and then demands a reload erase it -- the class a bare navigation would NOT
         reset, which is the entire justification for a fresh context. --- */
  { name: 'theme_persist_then_reset', vp: DESKTOP, steps: [THEME_CLICK, RAF2], postReload: true,
    expr: '({ theme: document.documentElement.dataset.theme, ls: Object.keys(localStorage).sort(),'
      + ' bg: getComputedStyle(document.body).backgroundColor })' },

  /* --- same shape, a DIFFERENT persistence class: bookmarks + viewseen + nav.last, written by the
         app across three keys. --- */
  { name: 'bookmark_persist_then_reset', vp: DESKTOP,
    steps: [NAV_WALK, '(window.Bookmarks.toggle(window.TopicRegistry.ids()[0]), 1)', RAF2], postReload: true,
    expr: '({ marks: window.Bookmarks.all(), ls: Object.keys(localStorage).sort(),'
      + ' status: document.querySelector("#homestatus").textContent.slice(0, 40) })' },

  /* --- family: A TOPIC SURFACE. Every one of the builder's 15 measures home. --- */
  { name: 'topic_surface_geom', vp: DESKTOP, steps: [NAV_WALK, RAF2],
    expr: '(() => { const p = document.querySelectorAll("deep-walkthrough, deep-drill, deep-scope");'
      + ' return { panes: p.length, rects: [...p].map(e => { const r = e.getBoundingClientRect();'
      + ' return { t: e.tagName.toLowerCase(), w: r.width, h: r.height, top: r.top }; }),'
      + ' cards: document.querySelectorAll(".ix-card").length, hash: location.hash }; })()' },

  /* --- family: the same, at PHONE size, driven. --- */
  { name: 'topic_surface_geom_390', vp: PHONE, steps: [NAV_WALK, RAF2],
    expr: '(() => { const e = document.querySelector("deep-walkthrough"); const r = e.getBoundingClientRect();'
      + ' const sr = e.shadowRoot; const vis = [...sr.querySelectorAll("*")].filter(x => x.getBoundingClientRect().width > 0);'
      + ' return { w: r.width, h: r.height, visible: vis.length, widths: vis.slice(0, 6).map(x => x.getBoundingClientRect().width),'
      + ' iw: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }; })()' },

  /* --- THE INSTRUMENT IS IN THE WORLD IT MEASURES. Expected to differ; recorded so that the
         difference is on the record rather than discovered by whoever writes the first probe that
         enumerates globals or counts observers. --- */
  { name: 'instrument_footprint', vp: DESKTOP, expect_divergence: true,
    expr: '({ ledger: typeof window.__probeLedger,'
      + ' probe_globals: Object.keys(window).filter(k => /probe/i.test(k)).sort() })' },
];

/* ---------- the cold side ----------------------------------------------------------------------- */
async function coldRun(row) {
  const t0 = Date.now();
  const browser = await chromium.launch(B.launchOpts({ headless: true }));
  try {
    let context = await browser.newContext(S.contextOpts(row.vp));
    let page = await context.newPage();
    await page.goto(B.fileUrl(HTML), { timeout: B.NAV_MS, waitUntil: 'load' });
    await S.waitReady(page);
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
    await S.settleDoc(page);

    for (const s of (row.steps || [])) {
      const r = await page.evaluate(S.wrapExpression(s, false, undefined));
      if (!r || !r.ok) throw new Error('cold step failed: ' + s.slice(0, 60) + ' -> ' + JSON.stringify(r));
    }
    if (row.resize) {
      await page.setViewportSize({ width: row.resize.w, height: row.resize.h });
      await B.settle(page);
    }
    if (row.postReload) {
      /* The cold equivalent of the server's fresh-context reload: throw the context away. */
      await context.close();
      context = await browser.newContext(S.contextOpts(row.vp));
      page = await context.newPage();
      await page.goto(B.fileUrl(HTML), { timeout: B.NAV_MS, waitUntil: 'load' });
      await S.waitReady(page);
      try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
      await S.settleDoc(page);
    }
    const raw = await page.evaluate(S.wrapExpression(row.expr, false, undefined));
    let plain = null;
    if (row.plainFn) {
      /* NORMALISER CROSS-CHECK. A wrapper bug that distorted BOTH sides identically would hide
         behind a MATCH, because both sides go through wrapExpression(). So two rows are ALSO
         measured by a hand-written closure that never touches the wrapper -- a genuinely separate
         path (Playwright serialises the function; there is no string evaluation involved). */
      plain = await page.evaluate(row.plainFn);
    }
    return { value: raw && raw.ok ? raw.v : null, err: raw && raw.ok ? null : JSON.stringify(raw), ms: Date.now() - t0, plain: plain };
  } finally {
    await browser.close();
  }
}

/* ---------- the warm side ----------------------------------------------------------------------- */
async function warmRun(row) {
  const t0 = Date.now();
  const rl = await post('/reload', { viewport: row.vp.w + 'x' + row.vp.h });
  if (!rl.ok) throw new Error('warm reload failed: ' + j(rl));
  for (const s of (row.steps || [])) {
    const r = await post('/eval', { expr: s, mode: 'explore' });
    if (!r.ok) throw new Error('warm step failed: ' + s.slice(0, 60) + ' -> ' + j(r));
  }
  if (row.resize) {
    const v = await post('/viewport', { w: row.resize.w, h: row.resize.h });
    if (!v.ok) throw new Error('warm /viewport failed: ' + j(v));
    await post('/eval', { expr: RAF2, mode: 'explore' });
  }
  if (row.postReload) {
    const r2 = await post('/reload', { viewport: row.vp.w + 'x' + row.vp.h });
    if (!r2.ok) throw new Error('warm post-reload failed: ' + j(r2));
  }
  /* A row with no steps is measured in ASSERT mode -- so the strict path is exercised too. A driven
     row is measured in EXPLORE mode, because driving it is exactly what dirties it, and pretending
     otherwise would be the lie this tool exists to prevent. */
  const driven = (row.steps && row.steps.length) || row.resize;
  const mode = driven && !row.postReload ? 'explore' : 'assert';
  const ev = await post('/eval', { expr: row.expr, mode: mode });
  if (!ev.ok) throw new Error('warm eval failed (' + mode + '): ' + j(ev));
  return { value: ev.value, ms: Date.now() - t0, stamp: ev, mode: mode };
}

/* ---------- helpers for the behavioural sections ------------------------------------------------ */
function portFree(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: HOST, port: port }, () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(true));
    setTimeout(() => { try { s.destroy(); } catch (e) { /* gone */ } resolve(true); }, 2000);
  });
}
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer(port, extra) {
  return new Promise((resolve, reject) => {
    const a = [path.join(__dirname, 'probe_server.cjs'), '--port', String(port)].concat(extra || []);
    const ch = spawn(process.execPath, a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const to = setTimeout(() => reject(new Error('server on ' + port + ' never announced')), 180000);
    ch.stdout.on('data', (d) => {
      buf += String(d);
      const m = /\{"probe_server":"up"[^\n]*\}/.exec(buf);
      if (m) { clearTimeout(to); resolve({ child: ch, hello: JSON.parse(m[0]), out: () => buf }); }
    });
    ch.on('exit', (c) => { clearTimeout(to); reject(new Error('server exited early (' + c + '): ' + buf.slice(0, 300))); });
  });
}

let BLOCKING = 0, NOTES = 0, MISMATCH = 0;

/* ===== main ===================================================================================== */
(async () => {
  const started = new Date();
  say('PROBE SERVER -- INDEPENDENT COLD VERIFY');
  say('=======================================');
  say('run  : ' + started.toISOString());
  say('node : ' + process.version);
  say('port : ' + PORT);
  say('');

  const up = await post('/status', {}, 'GET').catch(() => null);
  if (!up || !up.ok) {
    say('no server on ' + HOST + ':' + PORT + ' -- start one:  node tools/probe_server.cjs --port ' + PORT);
    process.exit(2);
  }
  say('server pid ' + up.pid + ', launch args ' + j(up.launch_args));
  say('');

  const runSection = (n) => !ONLY || ONLY.indexOf(n) >= 0;
  const rows = [];

  /* ---------- A ---------- */
  if (runSection('A')) {
    say('=== A. PARITY IN FAMILIES THE BUILDER\'S 15 DO NOT COVER ===');
    say('    (identical step sequence warm and cold; exact comparison, full floats)');
    say('');
    for (const row of ROWS) {
      let warm = null, cold = null, err = null;
      try {
        warm = await warmRun(row);
        cold = await coldRun(row);
      } catch (e) { err = e; }
      if (err) {
        say('  [ERROR]    ' + row.name + ' -- ' + asciiSafe(err.message).slice(0, 300));
        MISMATCH++; rows.push({ name: row.name, ok: false });
        continue;
      }
      const same = canon(warm.value) === canon(cold.value);
      const vac = vacuous(warm.value);
      const tag = row.expect_divergence
        ? (same ? '[SAME]     ' : '[DIVERGES] ')
        : (vac ? '[VACUOUS]  ' : (same ? '[MATCH]    ' : '[MISMATCH] '));
      if (!row.expect_divergence && (!same || vac)) MISMATCH++;
      say('  ' + tag + row.name + '   @' + row.vp.w + 'x' + row.vp.h
        + (row.resize ? ' -> resized ' + row.resize.w + 'x' + row.resize.h : '')
        + (row.steps ? '  steps=' + row.steps.length : '') + (row.postReload ? ' +reload' : '')
        + '  mode=' + warm.mode + '  warm ' + warm.ms + 'ms / cold ' + cold.ms + 'ms');
      say('      warm : ' + j(warm.value));
      if (!same) say('      cold : ' + j(cold.value));
      say('      stamp: world=' + warm.stamp.world_id + ' probes_since_reload=' + warm.stamp.probes_since_reload
        + ' since_reload_ms=' + warm.stamp.since_reload_ms + ' pristine=' + warm.stamp.pristine
        + ' mutations=' + warm.stamp.mutations);
      if (cold.plain) {
        const cross = canon(cold.plain) === canon(cold.value);
        say('      normaliser cross-check (cold, no wrapper): ' + (cross ? 'agrees' : 'DIFFERS ' + j(cold.plain)));
        if (!cross) MISMATCH++;
      }
      rows.push({ name: row.name, ok: row.expect_divergence ? true : (same && !vac), same: same, div: !!row.expect_divergence });
      say('');
    }
  }

  /* ---------- B ---------- */
  if (runSection('B')) {
    say('=== B. THE SECOND CLIENT (documented as "single client" -- what actually happens?) ===');
    say('');
    /* B1: two clients, interleaved worlds. */
    const a1 = await post('/reload', { viewport: '1280x800' });
    const b1 = await post('/reload', { viewport: '390x844' });          /* the "other agent" */
    const a2 = await post('/eval', { expr: '({ iw: innerWidth, ih: innerHeight })' });
    say('  B1 world theft:');
    say('     client A reloaded at 1280x800 -> world ' + a1.world_id);
    say('     client B reloaded at  390x844 -> world ' + b1.world_id);
    say('     client A then measured        -> ' + j(a2.value) + '  (stamp world=' + a2.world_id
      + ' pristine=' + a2.pristine + ' viewport=' + j(a2.viewport) + ')');
    const stolen = a2.value && a2.value.iw === 390;
    say('     VERDICT: ' + (stolen
      ? 'A measured B\'s world and was told pristine=true. The stamp DOES carry world_id and'
      + '\n              viewport (so it is auditable after the fact) but no client checks it.'
      : 'A kept its own world'));
    if (stolen) NOTES++;
    say('');
    /* B2: simultaneous requests -- serialised or interleaved? */
    const slow = '(() => { const t = Date.now(); while (Date.now() - t < 900) {} return "SLOW"; })()';
    const t0 = Date.now();
    await post('/reload', { viewport: '1280x800' });
    const pSlow = post('/eval', { expr: slow, mode: 'explore' }).then((r) => ({ who: 'slow', at: Date.now() - t0, r: r }));
    await sleep(60);
    const pFast = post('/eval', { expr: '"FAST"', mode: 'explore' }).then((r) => ({ who: 'fast', at: Date.now() - t0, r: r }));
    const done = await Promise.all([pSlow, pFast]);
    const fast = done.find((d) => d.who === 'fast'), slw = done.find((d) => d.who === 'slow');
    say('  B2 concurrent requests:');
    say('     slow probe (900ms busy loop) returned at t+' + slw.at + 'ms, value ' + j(slw.r.value) + ' ms=' + slw.r.ms);
    say('     fast probe issued at t+60ms  returned at t+' + fast.at + 'ms, value ' + j(fast.r.value) + ' ms=' + fast.r.ms);
    const serialised = fast.at >= slw.at - 30;
    say('     VERDICT: ' + (serialised
      ? 'SERIALISED -- the fast probe waited for the slow one. No interleaving, so no'
      + '\n              cross-attribution of mutations. Requests QUEUE; they do not race.'
      : 'INTERLEAVED -- the fast probe overtook the slow one. Mutation attribution is'
      + '\n              not defensible under two clients.'));
    if (!serialised) BLOCKING++;
    say('');
    /* B3: does the server refuse a second client at all? */
    const s1 = await post('/status', {}, 'GET');
    const s2 = await post('/status', {}, 'GET');
    say('  B3 admission control: two independent connections both served (' + s1.__status + ', ' + s2.__status
      + '). There is NO client identity, no lock, no lease -- "single client" is a CONVENTION,');
    say('     enforced by nothing. Concurrency safety comes only from B2 serialisation.');
    NOTES++;
    say('');
  }

  /* ---------- C ---------- */
  if (runSection('C')) {
    say('=== C. THE CLIENT DIES MID-MEASUREMENT ===');
    say('');
    const killer = path.join(require('os').tmpdir(), 'cv-slow-client-' + process.pid + '.cjs');
    fs.writeFileSync(killer, 'const http=require("http");'
      + 'const d=Buffer.from(JSON.stringify({expr:"(()=>{const t=Date.now();while(Date.now()-t<4000){}return 1})()",mode:"explore"}));'
      + 'const r=http.request({host:"127.0.0.1",port:' + PORT + ',path:"/eval",method:"POST",'
      + 'headers:{"content-type":"application/json","content-length":d.length}},()=>{});r.end(d);'
      + 'setInterval(()=>{},1000);', 'ascii');
    const ch = spawn(process.execPath, [killer], { stdio: 'ignore' });
    await sleep(700);
    say('  client pid ' + ch.pid + ' issued a 4s probe; killing it mid-flight');
    ch.kill('SIGKILL');
    await sleep(400);
    say('  client alive after kill: ' + alive(ch.pid));
    const st = await post('/status', {}, 'GET').catch((e) => ({ __err: String(e.message) }));
    say('  server answers /status : ' + (st && st.ok ? 'YES (uptime ' + st.uptime_s + 's, probes ' + st.probes_served + ')' : 'NO ' + j(st)));
    say('  port ' + PORT + ' still held  : ' + (!(await portFree(PORT))));
    say('  VERDICT: the server OUTLIVES its client and keeps the port and the browser. That is the');
    say('           orphan hazard: an agent that dies leaves a chromium holding ~200MB and a port.');
    say('           Section H is the mitigation.');
    try { fs.unlinkSync(killer); } catch (e) { /* leave it */ }
    NOTES++;
    say('');
  }

  /* ---------- D ---------- */
  if (runSection('D')) {
    say('=== D. ERROR PATHS: does it name the failure, or hand back a confident null? ===');
    say('');
    await post('/reload', { viewport: '1280x800' });
    const cases = [
      ['syntax error', { expr: 'document.querySelector("#homerail' }],
      ['reference error', { expr: 'thisIdentifierDoesNotExist.width' }],
      ['throw', { expr: '(() => { throw new TypeError("deliberate"); })()' }],
      ['rejecting promise', { expr: 'Promise.reject(new Error("rejected on purpose"))' }],
      ['DOM node returned', { expr: 'document.querySelector("#homerail")' }],
      ['DOM collection returned', { expr: 'document.querySelectorAll(".hm-seg")' }],
      ['function returned', { expr: '(function named() {})' }],
      ['undefined returned', { expr: 'void 0' }],
      ['NaN returned', { expr: '({ w: parseFloat("nope"), h: 1 / 0, d: -1 / 0 })' }],
      ['circular object', { expr: '(() => { const o = {}; o.self = o; return o; })()' }],
      ['huge string', { expr: '"x".repeat(2000000).length' }],
      ['empty expr', { expr: '   ' }],
      ['bad mode', { expr: '1', mode: 'whatever' }],
    ];
    for (const [label, body] of cases) {
      const r = await post('/eval', Object.assign({ mode: 'explore' }, body));
      const shown = r.ok ? 'ok value=' + j(r.value) + (r.nonfinite ? ' [nonfinite preserved]' : '')
        : 'HTTP ' + r.__status + ' ' + asciiSafe(String(r.error)).slice(0, 150);
      say('  ' + label.padEnd(24) + ' -> ' + shown);
    }
    say('');
    /* the one that changes the world under the server's feet */
    say('  D-nav: a probe that NAVIGATES the page away');
    await post('/reload', { viewport: '1280x800' });
    const before = await post('/eval', { expr: 'document.title' });
    const nav = await post('/eval', { expr: '(location.href = "about:blank", 1)' });
    await sleep(1200);
    const st = await post('/status', {}, 'GET');
    const after = await post('/eval', { expr: '({ url: location.href, title: document.title, ready: document.readyState,'
      + ' app: typeof TopicRegistry, ledger: typeof window.__probeLedger })' });
    say('     before      : title ' + j(before.value) + ' pristine=' + before.pristine);
    say('     nav probe   : HTTP ' + nav.__status + ' ' + (nav.ok ? 'ok' : asciiSafe(String(nav.error)).slice(0, 120)));
    say('     /status     : pristine=' + st.pristine + ' world=' + st.world_id + ' dirty_why=' + j(st.dirty_why));
    say('     next probe  : HTTP ' + after.__status + ' ' + (after.ok ? j(after.value) + ' pristine=' + after.pristine : asciiSafe(String(after.error)).slice(0, 120)));
    const escaped = after.ok && after.pristine === true && after.value && after.value.app === 'undefined';
    say('     VERDICT: ' + (escaped
      ? 'A NAVIGATION ESCAPES THE GUARD. The document was replaced, the ledger died with it,'
      + '\n              and the server still reports pristine=true -- so the next ASSERT probe is served'
      + '\n              against a world that is not the app at all.'
      : 'the navigation did not leave a pristine-looking world'));
    if (escaped) BLOCKING++;
    say('');
  }

  /* ---------- E ---------- */
  if (runSection('E')) {
    say('=== E. WHAT A MutationObserver CANNOT SEE (the guard\'s blind spots) ===');
    say('    Every case below is an ASSERT-mode probe that changes what the next measurement will');
    say('    read, without emitting a single DOM mutation record.');
    say('');
    const blind = [
      ['CSSOM insertRule',
        '(document.styleSheets[0].insertRule("#homerail{width:5px !important}", 0), 1)',
        'document.querySelector("#homerail").getBoundingClientRect().width'],
      ['scrollTo (fold membership)',
        '(window.scrollTo(0, 500), 1)',
        '({ y: Math.round(scrollY), status_top: document.querySelector("#homestatus").getBoundingClientRect().top })'],
      ['shadow-root write',
        '(() => { const sr = document.querySelector("deep-walkthrough").shadowRoot;'
        + ' sr.querySelector("div").textContent = "SHADOW-CONTAMINATED"; return 1; })()',
        '(() => { const sr = document.querySelector("deep-walkthrough").shadowRoot;'
        + ' return sr.querySelector("div").textContent.slice(0, 24); })()'],
      ['localStorage write',
        '(localStorage.setItem("ddr.v1.theme", "\\"dark\\""), 1)',
        'Object.keys(localStorage).sort()'],
      ['canvas/inline style on a detached-then-attached node is a real mutation (control)',
        '(document.documentElement.setAttribute("data-cv-control", "1"), 1)',
        'document.documentElement.getAttribute("data-cv-control")'],
    ];
    for (const [label, mutate, read] of blind) {
      await post('/reload', { viewport: '1280x800' });
      const baseline = await post('/eval', { expr: read });
      const m = await post('/eval', { expr: mutate });                 /* ASSERT mode on purpose */
      const stAfter = await post('/status', {}, 'GET');
      const next = await post('/eval', { expr: read });                 /* ASSERT mode again */
      const changed = canon(baseline.value) !== canon(next.value);
      const caught = m.ok && m.mutations > 0;
      const refused = next.__status === 409;
      say('  ' + label);
      say('     mutations attributed : ' + (m.ok ? m.mutations : 'probe errored') + '  ' + j(m.mutation_detail || []));
      say('     world after          : pristine=' + stAfter.pristine + ' ' + j(stAfter.dirty_why || ''));
      say('     next assert probe    : ' + (refused ? 'REFUSED 409 (guard held)' : 'SERVED 200'));
      say('     value changed        : ' + changed + '   before=' + j(baseline.value).slice(0, 90) + '  after=' + j(next.value).slice(0, 90));
      const escaped = changed && !refused && !caught;
      say('     VERDICT: ' + (escaped ? 'ESCAPED THE GUARD -- served an assert probe against a world it had spent'
        : (caught ? 'caught (' + m.mutations + ' mutation(s))' : (changed ? 'changed but refused anyway' : 'no change'))));
      if (escaped) BLOCKING++;
      say('');
    }
  }

  /* ---------- F ---------- */
  if (runSection('F')) {
    const N = Number(args.trials || 3);
    say('=== F. A ONE-MUTATION CONTAMINATION, DIFFERENT CLASS FROM THE BUILDER\'S, x' + N + ' ===');
    say('    theirs: textContent write (childList). mine: a single attribute set on <html>.');
    say('');
    let pass = 0;
    for (let t = 1; t <= N; t++) {
      const rl = await post('/reload', { viewport: '1280x800' });
      const read = await post('/eval', { expr: 'document.documentElement.getAttribute("data-theme")' });
      const clean = read.__status === 200 && read.mutations === 0 && read.pristine === true;
      const mut = await post('/eval', { expr: '(document.documentElement.setAttribute("data-cv", "seeded"), 1)' });
      const caught = mut.ok && mut.mutations === 1 && mut.pristine === false;
      const refused = await post('/eval', { expr: 'document.documentElement.getAttribute("data-cv")' });
      const wasRefused = refused.__status === 409;
      const seen = await post('/eval', { expr: 'document.documentElement.getAttribute("data-cv")', mode: 'explore' });
      const sawIt = seen.value === 'seeded';
      await post('/reload', { viewport: '1280x800' });
      const after = await post('/eval', { expr: 'document.documentElement.getAttribute("data-cv")' });
      const gone = after.value === null && after.pristine === true;
      const ok = clean && caught && wasRefused && sawIt && gone;
      if (ok) pass++;
      say('  trial ' + t + ': quiesce=' + rl.quiesce_frames + 'f | pure read pristine=' + (clean ? 'yes' : 'NO')
        + ' | caught=' + (caught ? 'yes(' + mut.mutations + ': ' + j(mut.mutation_detail) + ')' : 'NO(' + (mut.mutations) + ')')
        + ' | next=' + (wasRefused ? 'REFUSED 409' : 'SERVED ' + refused.__status)
        + ' | explore saw it=' + (sawIt ? 'yes' : 'NO')
        + ' | after reload=' + (gone ? 'GONE' : 'STILL THERE') + ' -> ' + (ok ? 'PASS' : 'FAIL'));
    }
    say('  VERDICT: ' + pass + '/' + N + ' -- ' + (pass === N ? 'the guard fires on a one-attribute mutation, deterministically'
      : 'THE GUARD IS NOT DETERMINISTIC ON THIS CLASS'));
    if (pass !== N) BLOCKING++;
    say('');
    /* the net-zero mutation: mutate and undo. A guard that compares end-states would miss it. */
    await post('/reload', { viewport: '1280x800' });
    const undo = await post('/eval', { expr: '(() => { const d = document.documentElement;'
      + ' d.setAttribute("data-cv2", "1"); d.removeAttribute("data-cv2"); return 1; })()' });
    say('  net-zero mutation (set then remove): mutations=' + undo.mutations + ' pristine=' + undo.pristine
      + ' -> ' + (undo.mutations >= 2 && undo.pristine === false ? 'caught (end-state comparison would have missed it)' : 'MISSED'));
    if (!(undo.mutations >= 2 && undo.pristine === false)) BLOCKING++;
    /* the false-positive control: a mutation OUTSIDE the observed tree must NOT dirty the world. */
    await post('/reload', { viewport: '1280x800' });
    const det = await post('/eval', { expr: '(() => { const d = document.createElement("div");'
      + ' d.textContent = "detached"; d.setAttribute("x", "1"); return 1; })()' });
    say('  detached-node mutation             : mutations=' + det.mutations + ' pristine=' + det.pristine
      + ' -> ' + (det.mutations === 0 && det.pristine === true ? 'correctly NOT dirty (no false refusal)' : 'FALSE POSITIVE'));
    if (!(det.mutations === 0 && det.pristine === true)) NOTES++;
    say('');
  }

  /* ---------- G ---------- */
  if (runSection('G')) {
    say('=== G. THE STAMPS: on every response, and reset by /reload ===');
    say('');
    const rl = await post('/reload', { viewport: '1280x800' });
    const seq = [];
    for (let i = 0; i < 3; i++) seq.push(await post('/eval', { expr: '1 + ' + i, mode: 'explore' }));
    const rl2 = await post('/reload', { viewport: '1280x800' });
    const afterReload = await post('/eval', { expr: '1' });
    const sv = await post('/screenshot', { path: path.join(require('os').tmpdir(), 'cv-stamp-' + process.pid + '.png') });
    const vp = await post('/viewport', { w: 1000, h: 700 });
    const refused = await post('/eval', { expr: '1' });                 /* must be 409 with a stamp */
    const keys = ['world_id', 'since_reload_ms', 'probes_since_reload', 'pristine', 'probes_served', 'viewport'];
    const has = (o) => keys.filter((k) => o[k] === undefined);
    const report = [['/reload', rl], ['/eval#1', seq[0]], ['/eval#2', seq[1]], ['/eval#3', seq[2]],
      ['/reload(2)', rl2], ['/eval after reload', afterReload], ['/screenshot', sv], ['/viewport', vp],
      ['/eval refused 409', refused]];
    let missing = 0;
    for (const [label, o] of report) {
      const m = has(o);
      if (m.length) missing++;
      say('  ' + label.padEnd(20) + ' world=' + o.world_id + ' probes_since_reload=' + o.probes_since_reload
        + ' since_reload_ms=' + o.since_reload_ms + ' pristine=' + o.pristine + ' probes_served=' + o.probes_served
        + (m.length ? '   MISSING: ' + m.join(',') : ''));
    }
    const counted = seq.map((s) => s.probes_since_reload).join(',');
    const reset = afterReload.probes_since_reload === 1 && rl2.probes_since_reload === 0 && rl2.world_id > rl.world_id;
    say('  probes_since_reload across three probes: ' + counted + '  (monotonic: ' + (counted === '1,2,3') + ')');
    say('  after /reload: world ' + rl.world_id + ' -> ' + rl2.world_id + ', probes_since_reload reset to '
      + rl2.probes_since_reload + ', first probe of the new world = ' + afterReload.probes_since_reload);
    say('  since_reload_ms after a fresh reload: ' + afterReload.since_reload_ms + 'ms');
    say('  VERDICT: ' + (missing === 0 && reset && counted === '1,2,3'
      ? 'every response carries the full stamp, and /reload resets it'
      : 'STAMP DEFECT (missing on ' + missing + ' response(s), reset ok=' + reset + ')'));
    if (!(missing === 0 && reset && counted === '1,2,3')) BLOCKING++;
    say('');
  }

  /* ---------- H ---------- */
  if (runSection('H')) {
    say('=== H. THE IDLE TTL (adoption gate): an orphaned server must take its browser with it ===');
    say('');
    const tport = PORT + 7;
    const ttlMin = 0.05;                                              /* 3 seconds */
    let srv = null;
    try {
      srv = await startServer(tport, ['--idle-ttl', String(ttlMin), '--quiet']);
    } catch (e) {
      say('  could not start a server with --idle-ttl: ' + asciiSafe(e.message).slice(0, 200));
      say('  VERDICT: NO IDLE TTL -- an orphaned server lives forever.');
      BLOCKING++;
      srv = null;
    }
    if (srv) {
      const pid = srv.hello.pid;
      say('  started pid ' + pid + ' on port ' + tport + ' with --idle-ttl ' + ttlMin + ' (' + (ttlMin * 60) + 's)');
      const st0 = await post('/status', {}, 'GET', tport);
      say('  /status reports idle_ttl_ms=' + st0.idle_ttl_ms + ' idle_ms=' + st0.idle_ms);
      /* keep-alive: a request must push the deadline out */
      await sleep(2000);
      const ping = await post('/eval', { expr: '1', mode: 'explore' }, 'POST', tport);
      say('  a probe at t+2.0s was served (' + ping.__status + ') -- the timer must have been reset');
      await sleep(2200);
      const stillUp = await post('/status', {}, 'GET', tport).then((r) => !!r.ok).catch(() => false);
      say('  at t+4.2s (2.2s after that probe): server alive = ' + stillUp + '  [expected true: TTL is 3s]');
      if (!stillUp) BLOCKING++;
      /* now let it starve */
      const t0 = Date.now();
      let gone = false;
      for (let i = 0; i < 60; i++) {
        await sleep(500);
        if (!alive(pid)) { gone = true; break; }
      }
      const waited = Date.now() - t0;
      say('  left idle: process exited after ' + waited + 'ms of silence = ' + gone);
      const free = await portFree(tport);
      say('  port ' + tport + ' free at the OS level: ' + free);
      say('  server stdout tail: ' + asciiSafe(srv.out().split('\n').filter(Boolean).slice(-2).join(' | ')).slice(0, 200));
      const okH = gone && free;
      say('  VERDICT: ' + (okH ? 'the idle TTL fires, the process exits and the port is released'
        : 'IDLE TTL DID NOT FIRE (gone=' + gone + ' port_free=' + free + ')'));
      if (!okH) BLOCKING++;
      try { srv.child.kill(); } catch (e) { /* already gone */ }
    }
    say('');
  }

  /* ---------- I ---------- */
  if (runSection('I')) {
    say('=== I. FOLLOW-UPS THE FIRST PASS EARNED ===');
    say('');

    /* I1: the mismatch from section A, re-run with the PHASE PINNED. The app sets
       scroll-behavior:smooth, so window.scrollTo() is ANIMATED and reading scrollY two frames later
       samples an animation, not a world. Wait for scrollY to hold still instead, and the same
       measurement should agree exactly -- which would locate the divergence in the probe rather
       than in the tool. */
    const SETTLE_SCROLL = '(async () => { let last = -1, same = 0;'
      + ' for (let i = 0; i < 300; i++) { await new Promise(r => requestAnimationFrame(r));'
      + ' const y = Math.round(scrollY); if (y === last) { if (++same >= 5) break; } else { same = 0; last = y; } }'
      + ' return last; })()';
    const pinned = { name: 'scrolled_fold_phase_pinned', vp: DESKTOP,
      steps: ['(window.scrollTo(0, 400), 1)', SETTLE_SCROLL],
      expr: '({ y: Math.round(scrollY), tops: [...document.querySelectorAll("#homerail, #homelib, #homestatus")]'
        + '.map(e => ({ id: e.id, top: e.getBoundingClientRect().top, above: e.getBoundingClientRect().top < innerHeight })) })' };
    const pw = await warmRun(pinned);
    const pc = await coldRun(pinned);
    const psame = canon(pw.value) === canon(pc.value);
    say('  I1 the section-A mismatch, "phase-pinned" by waiting for scrollY to hold 5 frames:');
    say('     warm : ' + j(pw.value));
    say('     cold : ' + j(pc.value));
    say('     VERDICT: ' + (psame ? 'identical'
      : 'STILL DIFFERENT -- and note WHICH way. This predicate is itself broken: "scrollY has'
      + '\n              held for 5 frames" is satisfied by a scroll that has not STARTED yet, so the'
      + '\n              side whose two steps arrive closer together (cold, in-process) exits at 0'
      + '\n              while the side with an HTTP round trip between them (warm) follows the'
      + '\n              animation to 400. A stillness test that cannot tell "finished" from "not'
      + '\n              begun" is this repo\'s inverted-guard shape, built fresh, by the verifier.'));
    say('');

    /* I1a: THE SAME QUESTION WITH THE ANIMATION REMOVED. The app sets scroll-behavior:smooth, so
       every scroll measurement above was sampling an animation. Turn it off and the scroll is
       instantaneous -- and then warm and cold have nothing left to disagree about except the world.
       THIS is the row that carries the parity claim for scroll geometry; I1 and I1b are diagnostics
       about the instrument. */
    const instant = { name: 'scroll_geometry_no_animation', vp: DESKTOP,
      steps: ['(document.documentElement.style.scrollBehavior = "auto", 1)',
        '(window.scrollTo(0, 400), 1)', RAF2],
      expr: '({ y: Math.round(scrollY), sh: document.documentElement.scrollHeight,'
        + ' tops: [...document.querySelectorAll("#homerail, #homelib, #homestatus")]'
        + '.map(e => ({ id: e.id, top: e.getBoundingClientRect().top, above: e.getBoundingClientRect().top < innerHeight })) })' };
    const iw2 = await warmRun(instant);
    const ic2 = await coldRun(instant);
    const isame = canon(iw2.value) === canon(ic2.value);
    say('  I1a the same measurement with scroll-behavior forced to auto (no animation to sample):');
    say('     warm : ' + j(iw2.value));
    if (!isame) say('     cold : ' + j(ic2.value));
    say('     VERDICT: ' + (isame
      ? 'IDENTICAL, including the fold membership that flips when the page actually scrolls.'
      + '\n              The scroll divergence was the PROBE sampling an animation, not the warm'
      + '\n              world differing from a cold one -- exactly the limit the receipts declare.'
      : 'REAL DIVERGENCE -- warm and cold do not scroll alike even without animation.'));
    if (!isame) MISMATCH++;
    say('');

    /* I1b: and the animation itself, waited out on a condition that cannot be satisfied by "not
       begun" -- wait for motion to appear, THEN for it to stop. */
    const smooth = { name: 'smooth_scroll_completion', vp: DESKTOP,
      steps: ['(window.scrollTo(0, 400), 1)',
        '(async () => { const t0 = Date.now();'
        + ' while (scrollY === 0 && Date.now() - t0 < 3000) await new Promise(r => requestAnimationFrame(r));'
        + ' let last = -1, same = 0;'
        + ' for (let i = 0; i < 600; i++) { await new Promise(r => requestAnimationFrame(r));'
        + ' const y = Math.round(scrollY); if (y === last) { if (++same >= 5) break; } else { same = 0; last = y; } }'
        + ' return last; })()'],
      expr: '({ y: Math.round(scrollY), behavior: getComputedStyle(document.documentElement).scrollBehavior })' };
    const sw = await warmRun(smooth);
    const sc = await coldRun(smooth);
    const ssame = canon(sw.value) === canon(sc.value);
    say('  I1b the smooth scroll, waited out on "motion appeared, then stopped":');
    say('     warm : ' + j(sw.value) + '   cold : ' + j(sc.value));
    say('     VERDICT: ' + (ssame ? 'IDENTICAL -- the animation lands in the same place on both sides.'
      : 'differs; a wall-clock-phase measurement, which the receipts already disclaim.'));
    say('');

    /* I2: the documentation's central claim about /viewport -- "an app that booted at 1280 and was
       resized to 390 is NOT the app a phone gets". Is that true here, or merely prudent? Compare a
       BOOTED 390 world against a RESIZED 390 world on the same server, over a wide read. */
    const WIDE = '({ iw: innerWidth, ih: innerHeight, sw: document.documentElement.scrollWidth,'
      + ' sh: document.documentElement.scrollHeight,'
      + ' rects: [...document.querySelectorAll("#homerail, #hometabs, #homelib, #homestatus")]'
      + '.map(e => ({ id: e.id, r: e.getBoundingClientRect().toJSON(),'
      + ' d: getComputedStyle(e).display, p: getComputedStyle(e).position })),'
      + ' segs: [...document.querySelectorAll(".hm-seg")].slice(0, 12).map(e => e.getBoundingClientRect().width),'
      + ' cards: document.querySelectorAll(".ix-card").length })';
    await post('/reload', { viewport: '390x844' });
    const booted = await post('/eval', { expr: WIDE });
    await post('/reload', { viewport: '1280x800' });
    await post('/viewport', { w: 390, h: 844 });
    await post('/eval', { expr: RAF2, mode: 'explore' });
    const resized = await post('/eval', { expr: WIDE, mode: 'explore' });
    const bootedS = canon(booted.value), resizedS = canon(resized.value);
    say('  I2 booted-at-390 vs resized-to-390 (the reason /viewport dirties the world):');
    say('     booted  : ' + j(booted.value).slice(0, 240));
    say('     resized : ' + j(resized.value).slice(0, 240));
    say('     VERDICT: ' + (bootedS === resizedS
      ? 'IDENTICAL on this read. The claim that a resize is not a boot is PRUDENT but not'
      + '\n              demonstrated here -- /viewport dirtying the world costs a reload it may not owe.'
      : 'THEY DIFFER -- the claim is demonstrated: a resize is not a boot.'));
    say('');

    /* I3: is the viewport STICKY? If /viewport changes the size a later bare /reload boots at, an
       assert taken after an exploration detour is taken at a size nobody asked for. */
    await post('/reload', { viewport: '1280x800' });
    const before = await post('/eval', { expr: 'innerWidth' });
    await post('/viewport', { w: 390, h: 844 });
    const rl = await post('/reload', {});                   /* bare reload, no viewport asked for */
    const after = await post('/eval', { expr: 'innerWidth' });
    say('  I3 viewport stickiness across a bare /reload:');
    say('     started at ' + before.value + ', /viewport 390x844, then a bare /reload -> innerWidth '
      + after.value + '  (stamp viewport ' + j(after.viewport) + ')');
    say('     VERDICT: ' + (after.value === 390
      ? 'STICKY. A bare /reload inherits the exploratory resize. The stamp does report it,'
      + '\n              so it is auditable -- but pass the viewport explicitly when it matters.'
      : 'not sticky (a bare reload returns to ' + after.value + ')'));
    if (after.value === 390) NOTES++;
    say('');

    /* I4: the settle primitive is REQUIRED, not copied -- the claim that this tool cannot drift
       from the gate's definition of "still". Proven by identity, not by reading the source: the
       module object the server holds IS the module object the gate holds. */
    const boot = require('../test/_boot.cjs');
    const sameModule = boot.settle === require.cache[require.resolve('../test/_boot.cjs')].exports.settle;
    const serverSrc = fs.readFileSync(path.join(__dirname, 'probe_server.cjs'), 'utf8');
    const ownRaf = /requestAnimationFrame/.test(serverSrc.replace(/B\.settle\(/g, ''));
    say('  I4 the at-rest primitive is required from test/_boot.cjs, not reimplemented:');
    say('     require identity holds            : ' + sameModule);
    say('     B.settle call sites in the server : ' + (serverSrc.match(/B\.settle\(/g) || []).length);
    say('     own requestAnimationFrame in it   : ' + ownRaf + '   [false = no second definition]');
    say('     B.pollFor / B.ACT_MS / B.REST_STATE used: '
      + /B\.pollFor\(/.test(serverSrc) + ' / ' + /B\.ACT_MS/.test(serverSrc) + ' / ' + /B\.REST_STATE/.test(serverSrc));
    say('     VERDICT: ' + (sameModule && !ownRaf ? 'single source confirmed' : 'A SECOND DEFINITION EXISTS'));
    if (!(sameModule && !ownRaf)) BLOCKING++;
    say('');
  }

  /* ---------- verdict ---------- */
  say('=== SUMMARY ===');
  const parity = rows.filter((r) => !r.div);
  say('  A. parity rows            : ' + parity.filter((r) => r.ok).length + '/' + parity.length + ' identical'
    + (rows.some((r) => r.div) ? ' (+' + rows.filter((r) => r.div).length + ' deliberate-divergence row(s))' : ''));
  say('  blocking findings         : ' + BLOCKING);
  say('  notes / non-blocking      : ' + NOTES);
  say('  parity mismatches         : ' + MISMATCH);
  say('');
  const out = args.out ? String(args.out) : null;
  if (out) { fs.writeFileSync(out, LINES.join('\n') + '\n', 'ascii'); say('written -> ' + out); }
  process.exit(MISMATCH === 0 && BLOCKING === 0 ? 0 : 1);
})().catch((e) => {
  process.stdout.write('probe_coldverify FATAL: ' + (e && e.stack || e) + '\n');
  process.exit(1);
});
