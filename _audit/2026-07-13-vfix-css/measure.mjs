/* ============ THE VFIX MEASUREMENT PASS ============
   Usage: node _audit/2026-07-13-vfix-css/measure.mjs <label> [distPath]

   Five measurements, all of which CAN FAIL. In a repo that has already shipped four
   checks that could not (an a11y audit that passed a blank page; a topic contract that
   tested truthiness not population; a cram guard satisfied by its own <style> tag; an
   entity_leak check that never opened the overlays it inspected), the burden is on the
   check to demonstrate it has teeth. Each one below is paired with the specific way its
   naive version lies:

     1 CTA CONTRAST     pixel-decoded, not getComputedStyle (which returns rgba(0,0,0,0)
                        on a gradient -- the reviewer's own cta.mjs reported ratio=None
                        for all six light-theme CTAs and nobody noticed).
     2 SCOREBOARD ORDER salience by pixel distance from the backdrop, at a GOOD score.
                        Asserting "the solid pill has class .g" would pass in the teal
                        room where it is invisible. Ranking the three tiles cannot.
     3 TAP TARGETS      shadow-piercing, at 390px.
     4 REDUCED MOTION   PAINTED PIXELS, not visible-node count (opacity:0 on <body> does
                        not propagate to descendants' computed opacity: a node counter
                        reports 276 "visible" nodes on a blank page).
     5 ROOM SHOTS       6 rooms x 2 themes, written to disk to be LOOKED AT.                */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grab, textContrastAt, paintedPixels, salience, hex, modal } from './pixlib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LABEL = process.argv[2] || 'AFTER';
const DIST = (process.argv[3] || path.join(HERE, '..', '..', 'dist', 'index.html')).replace(/\\/g, '/');
const SHOTS = path.join(HERE, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL = 'file:///' + DIST;

const ROOMS = {
  'messaging-events': 'event-driven',
  'data-storage': 'caching',
  'reliability-observability': 'retries-timeouts',
  'platform-infra': 'iac',
  'architecture-apis': 'state-machine',
  'security-tenancy': 'signing',
};

/* deep = pierce every shadow root. The 9 panes are shadow DOM; a light-DOM query silently
   misses "Reveal answer", the entire scoreboard, and every judge button. */
const DEEP = () => {
  window.__deep = (root, out) => {
    out = out || [];
    (root.querySelectorAll('*') || []).forEach((n) => {
      out.push(n);
      if (n.shadowRoot) window.__deep(n.shadowRoot, out);
    });
    return out;
  };
  window.__find = (re) => window.__deep(document).find(
    (e) => re.test((e.textContent || '').trim()) && e.tagName === 'BUTTON');
  window.__sel = (s) => window.__deep(document).find((e) => e.matches && e.matches(s));
};

/* Scroll the target into view, THEN read its box -- in that order, as TWO round trips.
   Doing it in one evaluate silently corrupts every measurement: styles.css sets
   `html{scroll-behavior:smooth}`, so the scroll is ANIMATED, and a getBoundingClientRect()
   taken in the same tick returns the PRE-scroll rect. The screenshot then lands on stale
   coordinates and you dutifully measure the wrong pixels. That is exactly how this harness
   first reported the light-theme Mock CTA as "#006c64 text on #ffffff" (1.19:1, six
   failures) when the button is plainly a teal slab with white text: it had captured a
   blank patch of card several hundred pixels away. Scroll, WAIT for it to land, re-read. */
const box = async (p, sel) => {
  const found = await p.evaluate((s) => {
    const e = window.__sel(s);
    if (!e) return false;
    e.scrollIntoView({ block: 'center', behavior: 'instant' });
    return true;
  }, sel);
  if (!found) return null;
  await p.waitForTimeout(260);                      // let the smooth scroll actually land
  return p.evaluate((s) => {
    const e = window.__sel(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();            // re-read AFTER the scroll settled
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y));
    const w = Math.min(Math.round(r.width), vw - x), h = Math.min(Math.round(r.height), vh - y);
    if (w <= 0 || h <= 0) return null;
    return { x, y, width: w, height: h };
  }, sel);
};

const settle = (p, ms = 420) => p.waitForTimeout(ms);
const out = { label: LABEL, dist: DIST, cta: [], board: [], taps: [], rm: null };

const br = await chromium.launch();
const helper = await (await br.newContext()).newPage();
await helper.goto('data:text/html,<title>decoder</title>');

/* ---------------------------------------------------------------- 1 + 2 + 5 (desktop) */
{
  const ctx = await br.newContext({ viewport: { width: 1100, height: 620 } });
  const p = await ctx.newPage();
  await p.addInitScript(DEEP);
  await p.goto(URL);
  await settle(p, 2200);
  await p.keyboard.press('Escape');
  await settle(p, 500);

  for (const [group, topic] of Object.entries(ROOMS)) {
    for (const theme of ['light', 'dark']) {
      await p.evaluate((t) => { location.hash = '#' + t + '/drill'; }, topic);
      await settle(p, 700);
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await settle(p, 380);

      /* ---- 1. CTA CONTRAST, by decoding the slab the compositor actually painted ---- */
      /* #adv = "Reveal answer" (INSIDE the drill shadow root -- a light-DOM query misses it
         entirely, which is why the reviewer's cta.mjs only ever measured the mock button).
         #mockopen = the sidebar "Mock run" slab (light DOM). Both are room-tinted CTAs. */
      for (const [name, sel] of [['reveal', '#adv'], ['mock', '#mockopen']]) {
        const b = await box(p, sel);
        if (!b || b.width < 40 || b.height < 14) { out.cta.push({ group, theme, el: name, ratio: null, note: 'NOT FOUND' }); continue; }
        const tc = await textContrastAt(p, helper, b);
        out.cta.push({
          group, theme, el: name,
          bg: hex(tc && tc.bg), fg: hex(tc && tc.fg),
          ratio: tc && tc.ratio, ratioWorst: tc && tc.ratioWorst,
          nText: tc && tc.nText, nLocal: tc && tc.nLocal,
          AA: tc && tc.ratioWorst != null ? tc.ratioWorst >= 4.5 : null,
        });
      }

      /* ---- 2. SCOREBOARD ORDER, at a GOOD score (5 solid, 1 revisit) ---- */
      await p.evaluate(() => {
        const d = document.querySelector('deep-drill');
        if (!d) return;
        d.got = 0; d.shk = 0; d.di = 0; d.results = [];
        for (let i = 0; i < 5; i++) d.judge(3);   // 5 Solid
        d.judge(2);                                // 1 Revisit
      });
      await settle(p, 400);

      /* The backdrop a tile sits ON -- sampled from the live strip directly above the score
         row, not from a guessed coordinate. This is the "wallpaper" the tile must not
         dissolve into, so it has to be the wallpaper actually behind it in THIS room. */
      const scoreBox = await box(p, '.score');
      const backdrop = modal(await grab(p, helper, {
        x: scoreBox.x + 4, y: Math.max(0, scoreBox.y - 12), width: Math.max(20, scoreBox.width - 8), height: 6,
      }, 0));

      const tiles = {};
      for (const [k, sel] of [['solid', '.pill.g'], ['revisit', '.pill.s'], ['left', '.pill.left']]) {
        const b = await box(p, sel);
        if (!b) continue;
        tiles[k] = salience(await grab(p, helper, b, 1), backdrop);
      }
      const rank = Object.entries(tiles).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      out.board.push({
        group, theme, ...tiles, winner: rank[0],
        correct: rank[0] === 'solid',
        margin: tiles.solid != null && tiles.revisit != null ? +(tiles.solid - tiles.revisit).toFixed(2) : null,
      });

      /* ---- 5. THE SHOT (with the good score on the board -- the state under test) ---- */
      await p.screenshot({ path: path.join(SHOTS, `${LABEL}_ROOM_${group}_${theme}.png`) });
    }
  }
  await ctx.close();
}

/* ---------------------------------------------------------------- 3. TAP TARGETS @390 */
{
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.addInitScript(DEEP);
  await p.goto(URL);
  await settle(p, 2200);
  await p.keyboard.press('Escape');
  await settle(p, 500);
  await p.evaluate(() => { location.hash = '#content-pipeline/drill'; });
  await settle(p, 1400);

  for (const theme of ['light', 'dark']) {
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await settle(p, 400);
    const r = await p.evaluate(() => {
      const els = window.__deep(document);
      const vis = (e) => {
        const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01;
      };
      const inter = (e) => /^(BUTTON|A|INPUT|SELECT|SUMMARY|TEXTAREA)$/.test(e.tagName)
        || e.getAttribute('role') === 'button' || e.hasAttribute('data-tab') || e.hasAttribute('data-topic');
      const all = els.filter((e) => inter(e) && vis(e));
      const small = [];
      all.forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.height < 44 || r.width < 44) {
          small.push({ tag: e.tagName, id: e.id || '', cls: (e.className || '').toString().split(' ')[0], w: Math.round(r.width), h: Math.round(r.height) });
        }
      });
      return {
        total: all.length, small: small.length, pass: all.length - small.length,
        worst: small.sort((a, b) => (a.w * a.h) - (b.w * b.h)).slice(0, 14),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    out.taps.push({ theme, ...r });
    await p.screenshot({ path: path.join(SHOTS, `${LABEL}_mobile_${theme}.png`) });
  }
  await ctx.close();
}

/* ------------------------------------------- 4. REDUCED MOTION -- BY PAINTED PIXELS */
{
  const ctx = await br.newContext({ viewport: { width: 1100, height: 700 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.addInitScript(DEEP);
  await p.goto(URL);
  await settle(p, 2600);
  await p.keyboard.press('Escape');
  await settle(p, 700);

  const st = await grab(p, helper, null, 0);
  const pp = paintedPixels(st);
  /* the node counter that CANNOT FAIL -- reported alongside, to show the gap */
  const naive = await p.evaluate(() => window.__deep(document).filter((e) => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  }).length);
  const bodyOpacity = await p.evaluate(() => getComputedStyle(document.body).opacity);
  out.rm = {
    paintedPixels: pp.painted, sharePainted: pp.share, distinctColours: pp.distinct,
    backdrop: hex(pp.bg), bodyOpacity, naiveVisibleNodeCount: naive,
    RENDERS: pp.share > 0.05 && pp.distinct > 50,
  };
  await p.screenshot({ path: path.join(SHOTS, `${LABEL}_reducedmotion.png`) });
  await ctx.close();
}

await br.close();
fs.writeFileSync(path.join(HERE, `${LABEL}.json`), JSON.stringify(out, null, 2));

/* ------------------------------------------------------------------------ REPORT */
const L = console.log;
L(`\n################ ${LABEL} ################\n`);

L('=== 1. CTA CONTRAST (decoded from rendered pixels; worst-case vs the gradient) ===');
for (const theme of ['light', 'dark']) {
  const rows = out.cta.filter((r) => r.theme === theme && r.ratioWorst != null);
  rows.forEach((r) => L(`  ${theme.padEnd(5)} ${r.group.padEnd(26)} ${r.el.padEnd(7)} ${String(r.ratioWorst).padStart(5)}:1  ${r.AA ? 'PASS' : 'FAIL'}   fg=${r.fg} on ${r.bg}`));
  const v = rows.map((r) => r.ratioWorst);
  if (v.length) L(`  ---> ${theme} band: ${Math.min(...v).toFixed(2)} - ${Math.max(...v).toFixed(2)}:1   failures: ${rows.filter((r) => !r.AA).length}/${rows.length}\n`);
}
const ctaFail = out.cta.filter((r) => r.ratioWorst != null && !r.AA).length;
const ctaMiss = out.cta.filter((r) => r.ratio == null).length;
L(`  CTA: ${ctaFail} failing AA, ${ctaMiss} not found\n`);

L('=== 2. SCOREBOARD: which tile POPS at a good score (5 solid / 1 revisit)? ===');
L('    salience = mean pixel distance from the page backdrop. Higher = louder.');
out.board.forEach((b) => L(
  `  ${b.theme.padEnd(5)} ${b.group.padEnd(26)} solid=${String(b.solid).padStart(6)} revisit=${String(b.revisit).padStart(6)} left=${String(b.left).padStart(6)}  -> ${b.winner.toUpperCase().padEnd(7)} ${b.correct ? 'OK' : '*** INVERTED ***'}`));
const bad = out.board.filter((b) => !b.correct);
L(`\n  SCOREBOARD READS CORRECTLY IN ${out.board.length - bad.length}/${out.board.length} room-themes` + (bad.length ? `  -- BROKEN: ${bad.map((b) => b.group + '/' + b.theme).join(', ')}` : ''));

L('\n=== 3. TAP TARGETS @390px (shadow-pierced) ===');
out.taps.forEach((t) => {
  L(`  ${t.theme}: ${t.pass}/${t.total} >= 44x44   (${t.small} under)   overflowX=${t.overflowX}`);
  if (t.worst.length) L('    under: ' + t.worst.map((s) => `${s.id ? '#' + s.id : s.tag + '.' + s.cls}(${s.w}x${s.h})`).join(' '));
});

L('\n=== 4. REDUCED MOTION -- DOES IT ACTUALLY RENDER? (painted pixels) ===');
L(`  body computed opacity : ${out.rm.bodyOpacity}`);
L(`  PAINTED PIXELS        : ${out.rm.paintedPixels}  (${(out.rm.sharePainted * 100).toFixed(1)}% of viewport, ${out.rm.distinctColours} distinct colours)`);
L(`  naive visible-node ctr: ${out.rm.naiveVisibleNodeCount}  <-- the number that reports ~276 on a BLANK page. Ignore it.`);
L(`  VERDICT               : ${out.rm.RENDERS ? 'RENDERS' : '*** BLANK PAGE ***'}`);
L(`\nwrote ${path.join(HERE, LABEL + '.json')} + shots/${LABEL}_*.png\n`);
