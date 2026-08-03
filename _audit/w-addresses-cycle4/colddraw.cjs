'use strict';
/* R12 THE COLD DRAW -- diagnose the 390/light fill-strip flake by dumping the RAW sampled device
 * rows, on a FRESH BROWSER PROFILE each iteration (chromium.launch() makes a new user-data-dir).
 * Reproduces scoreboard_salience's gauge path exactly up to shot A, then reports:
 *   - the track's x/y at GEOMETRY time and again at SHOT time (the guard that does not exist)
 *   - per --lv step: mean, and the per-capsule min/max spread (a flat strip must be uniform)
 *   - for one lv=1 capsule: every sampled device row's own mean
 *   - anything still animating / not fully opaque at shot time
 */
const { chromium } = require('playwright');
const R = 'D:/claude-workspace/_worktrees/deepdive-rehearsal/w-addresses/';
const B = require(R + 'test/_boot.cjs');
const HTML = R + 'deepdive_content_pipeline_rehearsal.html';
const N = parseInt(process.argv[2] || '6', 10);

const GAUGE_SEED = () => {
  localStorage.clear();
  let j = -1;
  TopicRegistry.ids().forEach((id, k) => {
    if (k % 3 === 2) return;
    j++;
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    const share = (j % 4) / 4;
    const bad = (Math.floor(j / 4) % 2) ? 1 : 2;
    cards.forEach((c, i) => { map[keys[i]] = (i / cards.length < share) ? 3 : bad; });
    const solid = Object.keys(map).filter((x) => map[x] >= 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: solid, shk: cards.length - solid, done: cards.length, tot: cards.length,
      revisit: ['idempotency'], cards: map, cv: 1, ts: Date.now() - 3 * 3600 * 1000 }));
  });
};

const ROWS = async ({ shot, boxes }) => {
  const un64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Y = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const bmp = await createImageBitmap(new Blob([un64(shot)], { type: 'image/png' }));
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, bmp.width, bmp.height).data;
  return boxes.map((b) => {
    const x0 = Math.max(0, Math.round(b.x)), x1 = Math.min(bmp.width, Math.round(b.x + b.w));
    const y0 = Math.max(0, Math.round(b.y)), y1 = Math.min(bmp.height, Math.round(b.y + b.h));
    let acc = 0, n = 0, lo = Infinity, hi = -Infinity;
    const rows = [];
    for (let yy = y0; yy < y1; yy++) {
      let ra = 0, rn = 0;
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * bmp.width + xx) * 4;
        const v = Y(d[i], d[i + 1], d[i + 2]);
        acc += v; n++; ra += v; rn++;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      rows.push(rn ? ra / rn : null);
    }
    return n ? { mean: acc / n, min: lo, max: hi, rows, y0, y1, x0, x1 } : null;
  });
};

(async () => {
  for (let it = 0; it < N; it++) {
    const browser = await chromium.launch(B.launchOpts());
    const scratch = await (await browser.newContext()).newPage();
    const ctx = await browser.newContext({ deviceScaleFactor: 3, viewport: { width: 390, height: 2400 } });
    const page = await ctx.newPage();
    await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, 'light');
    await B.gotoApp(page, HTML, { hash: '#home' });
    await page.evaluate(GAUGE_SEED);
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.until(page, () => !!document.querySelector('#home .hm-alt .hm-seg.keel'), null, B.ACT_MS, 'keel');
    await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'splash gone');
    await B.settle(page);
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await B.settle(page);

    const geo = await page.evaluate(() => {
      const track = document.querySelector('.hm-alt .hm-gr-t');
      const rel = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const segCs = getComputedStyle(document.querySelector('.hm-alt .hm-seg'));
      const keelH = parseFloat(segCs.getPropertyValue('--keel-h')) || 2;
      const keelGap = parseFloat(segCs.getPropertyValue('--keel-gap')) || 0;
      const segs = [...document.querySelectorAll('.hm-alt .hm-seg')].map((s) => ({
        ...rel(s), open: s.classList.contains('open'),
        lv: parseFloat(getComputedStyle(s).getPropertyValue('--lv')) || 0,
      }));
      return { keelH, keelGap, track: rel(track), segs };
    });

    // the state of the world AT SHOT TIME
    await page.evaluate(() => window.scrollTo(0, 0));
    await B.settle(page);
    const atShot = await page.evaluate(() => {
      const track = document.querySelector('.hm-alt .hm-gr-t').getBoundingClientRect();
      const anims = (document.getAnimations ? document.getAnimations() : []).map((a) => {
        let n = '?'; try { n = (a.effect && a.effect.target && a.effect.target.className) || a.animationName || '?'; } catch (e) {}
        return (a.animationName || a.transitionProperty || 'anim') + '@' + String(n).slice(0, 30) + ':' + a.playState;
      });
      const faded = [...document.querySelectorAll('body, .stage, .pane, #home, #home .hm-panel, .hm-alt, .hm-gr-t')]
        .map((e) => [e.tagName + '.' + String(e.className).slice(0, 22), getComputedStyle(e).opacity])
        .filter((r) => r[1] !== '1');
      return { tx: track.x, ty: track.y, anims, faded, sy: window.scrollY,
        dpr: window.devicePixelRatio, fonts: document.fonts ? document.fonts.status : '?' };
    });
    const shot = (await page.screenshot()).toString('base64');

    const S = (n) => n * 3;
    const boxes = [], lvs = [];
    for (const s of geo.segs) {
      if (!s.open) continue;
      const hDevF = (s.h - geo.keelH - geo.keelGap) * 3 - 2;
      if (hDevF < 2 || S(s.w) - 2 < 3) continue;
      boxes.push({ x: S(s.x) + 1, y: S(s.y) + 1, w: S(s.w) - 2, h: hDevF });
      lvs.push(s.lv);
    }
    const res = await scratch.evaluate(ROWS, { shot, boxes });
    const byLv = new Map();
    res.forEach((b, i) => {
      if (!b) return;
      if (!byLv.has(lvs[i])) byLv.set(lvs[i], []);
      byLv.get(lvs[i]).push(b);
    });
    const steps = [...byLv.entries()].sort((a, b) => a[0] - b[0]);
    console.log('--- run %d  geo.track=(%s,%s) shot.track=(%s,%s) dx=%s dy=%s  scrollY=%s fonts=%s',
      it, geo.track.x.toFixed(3), geo.track.y.toFixed(3), atShot.tx.toFixed(3), atShot.ty.toFixed(3),
      (atShot.tx - geo.track.x).toFixed(3), (atShot.ty - geo.track.y).toFixed(3), atShot.sy, atShot.fonts);
    if (atShot.anims.length) console.log('    ANIMATING:', atShot.anims.slice(0, 8).join(' | '));
    if (atShot.faded.length) console.log('    NOT OPAQUE:', JSON.stringify(atShot.faded));
    for (const [lv, bs] of steps) {
      const mean = bs.reduce((a, b) => a + b.mean, 0) / bs.length;
      const spread = Math.max(...bs.map((b) => b.max - b.min));
      console.log('    lv %s  n%d  mean %s  worst in-box spread %s  (min %s max %s)',
        String(lv).padEnd(4), bs.length, mean.toFixed(4), spread.toFixed(4),
        Math.min(...bs.map((b) => b.min)).toFixed(4), Math.max(...bs.map((b) => b.max)).toFixed(4));
    }
    const one = (byLv.get(1) || byLv.get(steps[steps.length - 1][0]))[0];
    console.log('    lv=1 capsule[0] box y%d..%d x%d..%d rows: %s',
      one.y0, one.y1, one.x0, one.x1, one.rows.map((r) => r.toFixed(4)).join(' '));
    await browser.close();
  }
})();
