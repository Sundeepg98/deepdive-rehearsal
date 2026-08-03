/* HOME TEXT FLOORS, AS A DELTA BETWEEN TWO BUILDS.
 *
 * WHY THIS IS A TOOL AND NOT A ONE-OFF. W-ADDRESSES item 8 moved the home's ground and its
 * surface, which changes the background under every text node on the route, so the wave owed a
 * before/after on the floors rather than an assertion. That sweep was run by hand, its output
 * was pasted into _audit/w-addresses-home-before-after/text-floor-sweep.txt, and by the next
 * cycle the receipt named a build (12,322,642 bytes) that no longer existed -- the numbers were
 * still right and nobody could re-derive them. A receipt that cannot be re-run is a quotation.
 *
 * THE METHOD, stated because three different figures can be produced from the same page:
 *   - every text node under #home, in document order, with a non-empty trimmed value
 *   - its OWN computed colour against the first ancestor whose background-color is not
 *     transparent, composited in sRGB (so an alpha ground is resolved rather than assumed)
 *   - WCAG 2.x relative-luminance contrast; floor 4.5:1, or 3.0:1 for large text
 *     (>=24px, or >=18.66px at weight >=700)
 *   - keyed by a selector built from tag + class, worst instance per selector
 *   - 1280x900, both schemes, both record classes; the ENGAGED record is seeded here so the
 *     two builds see the identical record
 *
 * Usage: node tools/home_text_floors.cjs <before.html> <after.html> [out.txt]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', 'test', '_boot.cjs'));

const BEFORE = process.argv[2];
const AFTER = process.argv[3];
const OUT = process.argv[4] || null;
if (!BEFORE || !AFTER) {
  console.error('usage: node tools/home_text_floors.cjs <before.html> <after.html> [out.txt]');
  process.exit(2);
}

/* ONE seed for both builds, and it is deliberately not the app's own generator: a record that
   differs between the two runs makes every delta meaningless. Graded, flagged, bookmarked and
   with a weekly goal, so the engaged home renders every panel it has. */
const ENGAGED = () => {
  localStorage.clear();
  const ids = TopicRegistry.ids();
  ids.forEach((id, k) => {
    if (k % 3 === 2) return;
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards);
    const map = {};
    const share = (k % 4) / 4;
    cards.forEach((c, i) => { map[keys[i]] = (i / cards.length < share) ? 3 : ((k % 2) ? 1 : 2); });
    const solid = Object.keys(map).filter((x) => map[x] >= 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: solid, shk: cards.length - solid, done: cards.length, tot: cards.length,
      revisit: ['idempotency'], cards: map, cv: 1, ts: Date.now() - k * 60000 }));
  });
  localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: ids[0], view: 'drill' }));
  localStorage.setItem('ddr.v1.bookmarks', JSON.stringify([ids[0]]));
  localStorage.setItem('ddr.v1.goal.weekly', JSON.stringify(6));
};

const SWEEP = () => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Y = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const rgba = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  /* the first ancestor with a real background, composited down in sRGB */
  const groundOf = (el) => {
    const stack = [];
    let n = el;
    while (n && n.nodeType === 1) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
      n = n.parentElement;
    }
    if (!stack.length) return { r: 255, g: 255, b: 255 };
    let out = stack[stack.length - 1];
    for (let i = stack.length - 2; i >= 0; i--) {
      const t = stack[i];
      out = { r: t.r * t.a + out.r * (1 - t.a), g: t.g * t.a + out.g * (1 - t.a), b: t.b * t.a + out.b * (1 - t.a), a: 1 };
    }
    return out;
  };
  const key = (el) => el.tagName.toLowerCase()
    + (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '');
  const root = document.querySelector('#home');
  if (!root) return { err: 'no #home' };
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const best = {};
  let n;
  while ((n = walk.nextNode())) {
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const fc = rgba(cs.color);
    if (!fc) continue;
    const g = groundOf(el);
    const yf = Y(fc.r, fc.g, fc.b), yg = Y(g.r, g.g, g.b);
    const cr = (Math.max(yf, yg) + 0.05) / (Math.min(yf, yg) + 0.05);
    const px = parseFloat(cs.fontSize) || 16;
    const wt = parseInt(cs.fontWeight, 10) || 400;
    const floor = (px >= 24 || (px >= 18.66 && wt >= 700)) ? 3.0 : 4.5;
    const k = key(el);
    if (!best[k] || cr < best[k].cr) {
      best[k] = { cr: +cr.toFixed(2), floor,
        fg: 'rgb(' + [fc.r, fc.g, fc.b].join(', ') + ')',
        bg: 'rgb(' + [g.r, g.g, g.b].map((v) => Math.round(v)).join(',') + ')' };
    }
  }
  return { best };
};

const CELLS = [['light', 'engaged'], ['light', 'cold'], ['dark', 'engaged'], ['dark', 'cold']];

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const runs = {};
  for (const [label, html] of [['before', BEFORE], ['after', AFTER]]) {
    runs[label] = {};
    for (const [theme, record] of CELLS) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
      await B.gotoApp(page, html, { hash: '#home' });
      await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
      if (record === 'engaged') await page.evaluate(ENGAGED);
      await page.evaluate((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
      await B.gotoApp(page, html, { hash: '#home' });
      await B.until(page, () => !!document.querySelector('#home .hm-continue, #home .hm-alt, #home .hm-lead'),
        null, B.ACT_MS, 'the home rendered');
      await B.settle(page);
      runs[label][theme + '/' + record] = await page.evaluate(SWEEP);
      await ctx.close();
    }
  }
  await browser.close();

  const L = (s, w) => String(s).padEnd(w).slice(0, w);
  const R = (v, w, d) => (typeof v === 'number' ? v.toFixed(d) : String(v)).padStart(w);
  const lines = [];
  const say = (s) => { lines.push(s); console.log(s); };

  say('HOME TEXT FLOORS -- BEFORE vs AFTER, every text node under #home');
  say('taken: ' + new Date().toISOString());
  say('  before  ' + path.resolve(BEFORE) + '  (' + fs.statSync(BEFORE).size + ' bytes)');
  say('  after   ' + path.resolve(AFTER) + '  (' + fs.statSync(AFTER).size + ' bytes)');
  say('');
  say('method: computed sweep, every text node under #home, own colour vs first non-transparent');
  say('        ancestor background composited in sRGB. AA floors: 4.5:1 normal, 3.0:1 large');
  say('        (>=24px, or >=18.66px at weight >=700). Keyed by tag+class; worst instance per');
  say('        selector. 1280x900, both schemes, both record classes, ONE seed on both builds.');
  say('        Re-run: node tools/home_text_floors.cjs <before.html> <after.html> [out.txt]');
  say('');
  say(L('cell', 17) + L('sel-groups', 13) + '  min CR before   min CR after   delta   under before / after');
  say(L('-'.repeat(15), 17) + L('-'.repeat(11), 13) + '  -------------   ------------   -----   --------------------');
  const moved = [], carried = [];
  for (const [theme, record] of CELLS) {
    const cell = theme + '/' + record;
    const a = runs.before[cell].best || {}, b = runs.after[cell].best || {};
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    const mn = (o) => (Object.keys(o).length ? Math.min(...Object.values(o).map((v) => v.cr)) : 0);
    const un = (o) => Object.values(o).filter((v) => v.cr < v.floor).length;
    say(L(cell, 17) + R(keys.length, 11) + '  ' + R(mn(a), 13, 2) + '   ' + R(mn(b), 12, 2)
      + '   ' + R(mn(b) - mn(a), 5, 2) + '   ' + R(un(a), 5) + ' / ' + un(b));
    for (const k of keys) {
      if (!a[k] || !b[k]) continue;
      if (Math.abs(a[k].cr - b[k].cr) >= 0.01) {
        moved.push('    ' + L(cell, 14) + L(k, 22) + a[k].cr.toFixed(2) + ' on ' + a[k].bg
          + '   ->   ' + b[k].cr.toFixed(2) + ' on ' + b[k].bg + '   floor ' + b[k].floor
          + (b[k].cr >= b[k].floor ? '  CLEARS' : '  UNDER'));
      }
      if (b[k].cr < b[k].floor) {
        carried.push('    ' + L(cell, 14) + L(k, 22) + a[k].cr.toFixed(2) + ' -> ' + b[k].cr.toFixed(2)
          + '   ' + b[k].fg + ' on ' + b[k].bg + '   floor ' + b[k].floor
          + (Math.abs(a[k].cr - b[k].cr) < 0.01 ? '   (identical on both builds)' : '   MOVED'));
      }
    }
  }
  say('');
  say('--- EVERY SELECTOR WHOSE RATIO MOVED BETWEEN THE TWO BUILDS');
  if (moved.length) moved.forEach(say); else say('    (none)');
  say('');
  say('--- EVERY SELECTOR UNDER ITS FLOOR ON THE AFTER BUILD');
  if (carried.length) carried.forEach(say); else say('    (none)');
  say('');
  const regressed = carried.filter((s) => s.indexOf('MOVED') !== -1);
  say(regressed.length
    ? 'VERDICT: REGRESSION -- ' + regressed.length + ' selector(s) are under floor AFTER and moved.'
    : 'VERDICT: NO REGRESSION -- every selector under floor after is under floor before, at the '
      + 'same ratio.');
  if (OUT) { fs.writeFileSync(OUT, lines.join('\n') + '\n'); console.log('\nwritten: ' + OUT); }
  process.exit(regressed.length ? 1 : 0);
})();
