'use strict';
/* R12 part 2 -- is the SHIPPED fill box strictly interior, and would a ceil/floor box be?
 * Also: force the entrance fade to be live at shot time and measure what it does to the means. */
const { chromium } = require('playwright');
const R = 'D:/claude-workspace/_worktrees/deepdive-rehearsal/w-addresses/';
const B = require(R + 'test/_boot.cjs');
const HTML = R + 'deepdive_content_pipeline_rehearsal.html';
const VEIL = process.argv[2] === 'veil';

const GAUGE_SEED = () => {
  localStorage.clear();
  let j = -1;
  TopicRegistry.ids().forEach((id, k) => {
    if (k % 3 === 2) return; j++;
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    const share = (j % 4) / 4; const bad = (Math.floor(j / 4) % 2) ? 1 : 2;
    cards.forEach((c, i) => { map[keys[i]] = (i / cards.length < share) ? 3 : bad; });
    const solid = Object.keys(map).filter((x) => map[x] >= 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: solid, shk: cards.length - solid, done: cards.length, tot: cards.length,
      revisit: ['idempotency'], cards: map, cv: 1, ts: Date.now() - 3 * 3600 * 1000 }));
  });
};
const BOXES = async ({ shot, boxes }) => {
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
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * bmp.width + xx) * 4;
      const v = Y(d[i], d[i + 1], d[i + 2]);
      acc += v; n++; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    return n ? { mean: acc / n, min: lo, max: hi, n, x0, x1, y0, y1 } : null;
  });
};

(async () => {
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
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await B.settle(page);
  if (VEIL) {
    /* hold the entrance fade at a fixed, KNOWN alpha -- the state the cold runs were caught in */
    await page.addStyleTag({ content: 'body{animation:none!important;opacity:.9117!important}' });
    await B.settle(page);
  }
  const geo = await page.evaluate(() => {
    const rel = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const segCs = getComputedStyle(document.querySelector('.hm-alt .hm-seg'));
    return {
      keelH: parseFloat(segCs.getPropertyValue('--keel-h')) || 2,
      keelGap: parseFloat(segCs.getPropertyValue('--keel-gap')) || 0,
      rad: parseFloat(segCs.borderTopLeftRadius) || 0,
      bodyOpacity: getComputedStyle(document.body).opacity,
      segs: [...document.querySelectorAll('.hm-alt .hm-seg')].map((s) => ({
        ...rel(s), open: s.classList.contains('open'),
        lv: parseFloat(getComputedStyle(s).getPropertyValue('--lv')) || 0 })),
    };
  });
  const tgeo = await page.evaluate(() => {
    const t = document.querySelector('.hm-alt .hm-gr-t');
    const r = t.getBoundingClientRect(); const cs = getComputedStyle(t);
    const px = (v) => parseFloat(v) || 0;
    return { x: r.x, y: r.y, w: r.width, bdT: px(cs.borderTopWidth), bdL: px(cs.borderLeftWidth),
      bdR: px(cs.borderRightWidth), padT: px(cs.paddingTop), padL: px(cs.paddingLeft),
      padR: px(cs.paddingRight), radL: px(cs.borderTopLeftRadius), radR: px(cs.borderTopRightRadius),
      bg: cs.backgroundColor, canvas: getComputedStyle(document.body).backgroundColor };
  });
  const shot = (await page.screenshot()).toString('base64');
  const D = 3, S = (n) => n * D;
  {
    const trX0 = Math.ceil((tgeo.x + Math.max(tgeo.bdL + tgeo.padL, tgeo.radL)) * D) + 1;
    const trX1 = Math.floor((tgeo.x + tgeo.w - Math.max(tgeo.bdR + tgeo.padR, tgeo.radR)) * D) - 1;
    const trY0 = Math.ceil((tgeo.y + tgeo.bdT) * D) + 1;
    const trY1 = Math.floor((tgeo.y + tgeo.bdT + tgeo.padT) * D) - 1;
    const [tb] = await scratch.evaluate(BOXES, { shot,
      boxes: [{ x: trX0, y: trY0, w: trX1 - trX0, h: trY1 - trY0 }] });
    console.log('== TROUGH  computed bg %s (canvas %s)  measured mean %s min %s max %s  n%d',
      tgeo.bg, tgeo.canvas, tb.mean.toFixed(5), tb.min.toFixed(5), tb.max.toFixed(5), tb.n);
  }
  const mk = (kind) => {
    const boxes = [], lvs = [];
    for (const s of geo.segs) {
      if (!s.open) continue;
      let b;
      if (kind === 'shipped') {
        const h = (s.h - geo.keelH - geo.keelGap) * D - 2;
        if (h < 2 || S(s.w) - 2 < 3) continue;
        b = { x: S(s.x) + 1, y: S(s.y) + 1, w: S(s.w) - 2, h };
      } else {
        const x0 = Math.ceil(S(s.x)) + 1;
        const x1 = Math.floor(S(s.x + s.w)) - 1;
        const y0 = Math.ceil(S(s.y)) + 1;
        const y1 = Math.floor(S(s.y + s.h - geo.keelH - geo.keelGap)) - 1;
        if (x1 - x0 < 3 || y1 - y0 < 2) continue;
        b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      boxes.push(b); lvs.push(s.lv);
    }
    return { boxes, lvs };
  };
  for (const kind of ['shipped', 'interior']) {
    const { boxes, lvs } = mk(kind);
    const res = await scratch.evaluate(BOXES, { shot, boxes });
    const byLv = new Map();
    res.forEach((b, i) => { if (b) { if (!byLv.has(lvs[i])) byLv.set(lvs[i], []); byLv.get(lvs[i]).push(b); } });
    console.log('== %s box  (body opacity at geo time %s, veil=%s)', kind, geo.bodyOpacity, VEIL);
    for (const [lv, bs] of [...byLv.entries()].sort((a, b) => a[0] - b[0])) {
      console.log('   lv %-5s n%-3d mean %s   worst spread %s   px/box %d',
        lv, bs.length, (bs.reduce((a, b) => a + b.mean, 0) / bs.length).toFixed(4),
        Math.max(...bs.map((b) => b.max - b.min)).toFixed(5), bs[0].n);
    }
  }
  await browser.close();
})();
