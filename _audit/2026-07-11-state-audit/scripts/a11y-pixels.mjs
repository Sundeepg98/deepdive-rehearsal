/* a11y-pixels.mjs -- GROUND TRUTH: sample real painted pixels for the suspect contrast cases,
   confirm the drill reveal actually reveals, and check whether a11y is in the gate at all. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const SHOTS = path.join(OUT, 'shots', 'a11y');

const b = await chromium.launch();

console.log('======== 1. PIXEL GROUND-TRUTH on the suspect .badge (and its peers) ========');
for (const theme of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(t => { localStorage.clear(); localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); }, theme);
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1300);
  await p.evaluate(() => window.IndexOverlay.close());
  await p.waitForTimeout(900);

  // Render the element region to a canvas via html2canvas-free approach:
  // screenshot the element, then decode PNG pixels in node? Simpler: use CDP screenshot of the clip
  // and analyse with a tiny PNG decoder... instead, use the browser: draw the element's
  // bounding box from a full-page screenshot into a canvas by re-screenshotting via CDP is messy.
  // Cleanest ground truth available in-page: read the element's OWN painted background stack.
  const stack = await p.evaluate(() => {
    const el = document.querySelector('.badge');
    const c = getComputedStyle(el);
    const before = getComputedStyle(el, '::before');
    const after = getComputedStyle(el, '::after');
    const parent = getComputedStyle(el.parentElement);
    return {
      badge: { color: c.color, bg: c.backgroundColor, bgImage: c.backgroundImage.slice(0, 120), border: c.border, fontSize: c.fontSize, fontWeight: c.fontWeight, textShadow: c.textShadow, WebkitTextFillColor: c.webkitTextFillColor },
      before: { content: before.content, bg: before.backgroundColor, bgImage: before.backgroundImage.slice(0, 90) },
      after: { content: after.content, bg: after.backgroundColor, bgImage: after.backgroundImage.slice(0, 90) },
      parentBg: parent.backgroundColor,
      rect: (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(el.getBoundingClientRect()),
    };
  });
  console.log(`\n  --- ${theme.toUpperCase()} .badge computed stack ---`);
  console.log('   color      :', stack.badge.color, ' (text-fill:', stack.badge.WebkitTextFillColor + ')');
  console.log('   background :', stack.badge.bg);
  console.log('   background-image:', stack.badge.bgImage);
  console.log('   ::before   : content=' + stack.before.content + ' bg=' + stack.before.bg + ' img=' + stack.before.bgImage);
  console.log('   ::after    : content=' + stack.after.content + ' bg=' + stack.after.bg + ' img=' + stack.after.bgImage);
  console.log('   font       :', stack.badge.fontSize, '/', stack.badge.fontWeight, ' rect=', JSON.stringify(stack.rect));

  // TRUE pixel sample: screenshot just the badge, decode with the browser's own canvas
  const shot = await p.locator('.badge').screenshot({ path: path.join(SHOTS, `95-badge-${theme}.png`) });
  const b64 = shot.toString('base64');
  const px = await p.evaluate(async (data) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const hist = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
      hist.set(k, (hist.get(k) || 0) + 1);
    }
    const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
    const lum = ([r, g, bb]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb); };
    const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
    // the two dominant colours = background and text (antialiasing gives the rest)
    const top = sorted.slice(0, 2).map(([k, n]) => ({ rgb: k.split(',').map(Number), n }));
    // most-extreme pair by luminance = best estimate of fg vs bg
    const cands = sorted.slice(0, 12).map(([k, n]) => ({ rgb: k.split(',').map(Number), n, L: lum(k.split(',').map(Number)) }));
    const darkest = cands.reduce((a, c) => c.L < a.L ? c : a);
    const lightest = cands.reduce((a, c) => c.L > a.L ? c : a);
    return {
      size: `${cv.width}x${cv.height}`,
      dominant: top,
      darkest: darkest.rgb, lightest: lightest.rgb,
      measuredRatio: +ratio(darkest.rgb, lightest.rgb).toFixed(2),
      dominantPairRatio: top.length === 2 ? +ratio(top[0].rgb, top[1].rgb).toFixed(2) : null,
    };
  }, b64);
  console.log('   PAINTED PIXELS:', JSON.stringify(px));
  console.log(`   >>> REAL rendered contrast (darkest vs lightest painted px): ${px.measuredRatio}:1  [need 4.5:1 for 10px/800 text]`);
  console.log(`   >>> dominant-two-colour ratio: ${px.dominantPairRatio}:1`);
  await p.close();
}

console.log('\n======== 2. Did Space ACTUALLY reveal the drill answer? (visual proof) ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1300);
  await p.evaluate(() => window.IndexOverlay.close());
  await p.waitForTimeout(600);
  await p.evaluate(() => window.switchTab('drill'));
  await p.waitForTimeout(900);
  const probe = () => p.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const a = r.querySelector('.ans');
    let deep = document.activeElement, d = 0;
    while (deep.shadowRoot && deep.shadowRoot.activeElement && d++ < 4) deep = deep.shadowRoot.activeElement;
    return {
      ansExists: !!a,
      ansClass: a ? a.className : null,
      ansHeight: a ? Math.round(a.getBoundingClientRect().height) : 0,
      ansAriaLive: a ? a.getAttribute('aria-live') : null,
      ansRole: a ? a.getAttribute('role') : null,
      ansTabIndex: a ? a.tabIndex : null,
      ansText: a ? a.textContent.trim().slice(0, 45) : null,
      focus: deep.tagName + (deep.id ? '#' + deep.id : ''),
      docLive: [...document.querySelectorAll('[aria-live]')].map(e => e.textContent.trim().slice(0, 30)),
      shadowLive: [...r.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e => (e.id || e.className) + '="' + e.textContent.trim().slice(0, 12) + '"'),
    };
  });
  const pre = await probe();
  console.log('  BEFORE Space:', JSON.stringify(pre));
  await p.screenshot({ path: path.join(SHOTS, '96-drill-before.png') });
  await p.keyboard.press('Space');
  await p.waitForTimeout(900);
  const post = await probe();
  console.log('  AFTER Space :', JSON.stringify(post, null, 1));
  console.log(`  >>> answer element INSERTED into DOM: ${!pre.ansExists && post.ansExists} (height ${pre.ansHeight} -> ${post.ansHeight}px)`);
  console.log(`  >>> aria-live on it: ${post.ansAriaLive} | role: ${post.ansRole} | focus moved to it: ${post.focus.includes('ans')} (focus is on ${post.focus})`);
  console.log(`  >>> live regions announcing the new answer: ${post.shadowLive.join(', ') || 'NONE in drill'} | doc-level: ${JSON.stringify(post.docLive)}`);
  await p.screenshot({ path: path.join(SHOTS, '97-drill-after.png') });
  await p.close();
}

console.log('\n======== 3. keybody overflow at 200% zoom (WCAG 1.4.4 Resize Text) ========');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => window.IndexOverlay.close());
  await p.waitForTimeout(500);
  for (const zoom of [1, 1.5, 2]) {
    // emulate browser zoom by shrinking the CSS viewport proportionally
    await p.setViewportSize({ width: Math.round(1280 / zoom), height: Math.round(800 / zoom) });
    await p.click('#keyopen'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const el = document.getElementById('keybody');
      return { hidden: el.scrollHeight - el.clientHeight, sh: el.scrollHeight, ch: el.clientHeight, tabIndex: el.tabIndex, role: el.getAttribute('role') };
    });
    const pct = ((r.hidden / r.sh) * 100).toFixed(0);
    console.log(`  zoom ${zoom * 100}% (CSS vp ${Math.round(1280 / zoom)}x${Math.round(800 / zoom)}): #keybody hides ${r.hidden}px of ${r.sh}px (${pct}% of the shortcut list) -- tabIndex=${r.tabIndex} role=${r.role}`);
    if (zoom === 2) await p.screenshot({ path: path.join(SHOTS, '98-keybody-200pct-zoom.png') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  }
  await p.close();
}

await b.close();
console.log('\nDONE');
