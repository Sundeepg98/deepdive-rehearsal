import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const errs = [];

const b = await chromium.launch();

// ---------- 1. discover topics ----------
let ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
let p = await ctx.newPage();
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE:' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR:' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

const topics = await p.evaluate(() => {
  // find the topic list however it is exposed
  if (window.TOPICS && Array.isArray(window.TOPICS)) return window.TOPICS.map(t => t.slug || t.id || t);
  const out = [];
  document.querySelectorAll('[data-topic]').forEach(e => { const v = e.getAttribute('data-topic'); if (v && !out.includes(v)) out.push(v); });
  return out;
});
console.log('TOPICS FOUND:', topics.length, JSON.stringify(topics.slice(0, 5)));

// ---------- 2. DOM shape of the topic nav ----------
const shape = await p.evaluate(() => {
  const tn = document.querySelector('.topic-nav');
  const sideId = document.querySelector('.side-id');
  if (!tn) return { err: 'no .topic-nav' };
  const cs = getComputedStyle(tn);
  const sc = getComputedStyle(sideId);
  const kids = [...tn.children].map(c => ({
    tag: c.tagName, id: c.id, cls: c.className,
    w: +c.getBoundingClientRect().width.toFixed(1),
    x: +c.getBoundingClientRect().x.toFixed(1),
    right: +c.getBoundingClientRect().right.toFixed(1),
    minW: getComputedStyle(c).minWidth, flex: getComputedStyle(c).flex, ovf: getComputedStyle(c).overflow
  }));
  return {
    tnId: tn.id, tnCls: tn.className,
    tnMinWidth: cs.minWidth, tnFlex: cs.flex, tnFlexBasis: cs.flexBasis, tnOverflow: cs.overflow, tnDisplay: cs.display, tnFlexWrap: cs.flexWrap,
    tnW: +tn.getBoundingClientRect().width.toFixed(1), tnX: +tn.getBoundingClientRect().x.toFixed(1), tnRight: +tn.getBoundingClientRect().right.toFixed(1),
    sideIdDisplay: sc.display, sideIdFlexWrap: sc.flexWrap, sideIdW: +sideId.getBoundingClientRect().width.toFixed(1),
    sideIdPadL: sc.paddingLeft, sideIdPadR: sc.paddingRight, sideIdOverflow: sc.overflow,
    htmlOvfX: getComputedStyle(document.documentElement).overflowX,
    bodyOvfX: getComputedStyle(document.body).overflowX,
    kids
  };
});
console.log('\n=== TOPIC-NAV SHAPE @360 ===');
console.log(JSON.stringify(shape, null, 1));

// ---------- 3. min-content probe (independent method) ----------
const minContent = await p.evaluate(() => {
  const tn = document.querySelector('.topic-nav');
  // METHOD A: clone with width:min-content (what the original lens did)
  const clone = tn.cloneNode(true);
  clone.style.cssText = 'position:absolute;left:-9999px;top:0;width:min-content;';
  document.body.appendChild(clone);
  const cloneW = clone.getBoundingClientRect().width;
  clone.remove();

  // METHOD B: the REAL question -- squeeze the parent and see where topic-nav bottoms out
  const sideId = document.querySelector('.side-id');
  const prevW = sideId.style.width;
  sideId.style.width = '50px';   // force max squeeze
  const squeezedW = tn.getBoundingClientRect().width;
  sideId.style.width = prevW;

  // METHOD C: what does the trigger's own min-content look like?
  const trig = tn.querySelector('.tn-trigger');
  const cur = tn.querySelector('.tn-current');
  const tclone = trig.cloneNode(true);
  tclone.style.cssText = 'position:absolute;left:-9999px;top:0;width:min-content;';
  document.body.appendChild(tclone);
  const trigMinC = tclone.getBoundingClientRect().width;
  tclone.remove();
  return {
    cloneMinContent: +cloneW.toFixed(1),
    squeezedTopicNavWidth: +squeezedW.toFixed(1),
    trigMinContent: +trigMinC.toFixed(1),
    trigMinWidthComputed: getComputedStyle(trig).minWidth,
    curWhiteSpace: getComputedStyle(cur).whiteSpace,
    curOverflow: getComputedStyle(cur).overflow,
    curTextOverflow: getComputedStyle(cur).textOverflow,
    stepCount: tn.querySelectorAll('.tn-step').length,
    stepMinW: getComputedStyle(tn.querySelector('.tn-step')).minWidth
  };
});
console.log('\n=== MIN-CONTENT PROBE ===');
console.log(JSON.stringify(minContent, null, 1));
await ctx.close();

// ---------- 4. overflow across viewports x all topics ----------
const VPS = [320, 360, 390, 414, 430];
const results = {};
for (const w of VPS) {
  ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR:' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  const rows = [];
  for (const t of topics) {
    await p.evaluate(t => { location.hash = '#' + t + '/walk'; }, t);
    await p.waitForTimeout(90);
    const m = await p.evaluate(() => {
      const de = document.documentElement;
      const tn = document.querySelector('.topic-nav');
      const nx = document.getElementById('tnnext');
      const cur = document.querySelector('.tn-current');
      return {
        sw: de.scrollWidth, cw: de.clientWidth,
        bsw: document.body.scrollWidth,
        tnW: tn ? +tn.getBoundingClientRect().width.toFixed(1) : null,
        tnRight: tn ? +tn.getBoundingClientRect().right.toFixed(1) : null,
        nxX: nx ? +nx.getBoundingClientRect().x.toFixed(1) : null,
        nxRight: nx ? +nx.getBoundingClientRect().right.toFixed(1) : null,
        name: cur ? cur.textContent.trim() : ''
      };
    });
    rows.push({ topic: t, over: m.sw - m.cw, ...m });
  }
  const bad = rows.filter(r => r.over > 0);
  const sws = [...new Set(rows.map(r => r.sw))];
  results[w] = {
    total: rows.length, overflowing: bad.length,
    maxOver: Math.max(...rows.map(r => r.over)),
    minOver: Math.min(...rows.map(r => r.over)),
    distinctScrollWidths: sws.sort((a, b) => a - b),
    worst: rows.sort((a, b) => b.over - a.over)[0],
    rows
  };
  console.log(`\n=== ${w}px === overflowing ${bad.length}/${rows.length} | over range ${results[w].minOver}..${results[w].maxOver} | distinct scrollWidths: ${JSON.stringify(sws.sort((a,b)=>a-b))}`);
  console.log(`   worst: ${results[w].worst.topic} sw=${results[w].worst.sw} over=+${results[w].worst.over} name="${results[w].worst.name}"`);
  await ctx.close();
}

// desktop control
ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(700);
const desk = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
console.log('\n=== 1440px desktop control === sw', desk.sw, 'cw', desk.cw, 'over', desk.sw - desk.cw);
await ctx.close();

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v1-overflow.json',
  JSON.stringify({ topics: topics.length, shape, minContent, results, desk, errs }, null, 1));
console.log('\nERRORS:', errs.length, errs.slice(0, 5));
await b.close();
