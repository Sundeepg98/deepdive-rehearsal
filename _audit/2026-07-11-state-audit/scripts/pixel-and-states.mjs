import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.click('.ix-card'); await p.waitForTimeout(700);
await p.click('.seg button[data-tab="rf"]'); await p.waitForTimeout(900);

// ---- real composited pixel sampling from a screenshot ----
async function samples(theme) {
  await p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(600);
  const buf = await p.screenshot();
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  return await p.evaluate(async (du) => {
    const img = new Image(); img.src = du; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const at = (px, py) => { const d = x.getImageData(px, py, 1, 1).data; return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const lum = h => { const m = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
    const cr = (a, bb) => { const A = lum(a), B = lum(bb); const hi = Math.max(A, B), lo = Math.min(A, B); return +((hi + .05) / (lo + .05)).toFixed(3); };
    const sidebar = at(150, 780);          // empty sidebar area
    const stageL  = at(420, 800);          // stage canvas, LEFT of the seam
    const stageR  = at(1000, 800);         // stage canvas, RIGHT of the seam
    const companion = at(1300, 850);       // companion empty area
    // scan for the vertical seam along y=800 inside the stage (x 300..1145)
    let seam = null, prev = at(310, 800);
    for (let px = 312; px < 1145; px += 2) {
      const cur = at(px, 800);
      if (cr(prev, cur) > 1.008) { seam = { x: px, from: prev, to: cur, jump: cr(prev, cur) }; break; }
      prev = cur;
    }
    // scan for a horizontal seam down x=1000
    let hseam = null; let prev2 = at(1000, 620);
    for (let py = 622; py < 895; py += 2) {
      const cur = at(1000, py);
      if (cr(prev2, cur) > 1.008) { hseam = { y: py, from: prev2, to: cur, jump: cr(prev2, cur) }; break; }
      prev2 = cur;
    }
    return {
      sidebar, stageL, stageR, companion,
      sidebar_vs_stage: cr(sidebar, stageL),
      companion_vs_stage: cr(companion, stageR),
      stageL_vs_stageR: cr(stageL, stageR),
      verticalSeam: seam, horizontalSeam: hseam
    };
  }, dataUrl);
}
for (const t of ['light', 'dark']) {
  const s = await samples(t);
  console.log(`\n===== COMPOSITED PIXELS [${t}] =====`);
  console.log(` sidebar   ${s.sidebar}   stage(L) ${s.stageL}   stage(R) ${s.stageR}   companion ${s.companion}`);
  console.log(` sidebar vs stage   contrast: ${s.sidebar_vs_stage}:1`);
  console.log(` companion vs stage contrast: ${s.companion_vs_stage}:1`);
  console.log(` stage LEFT vs stage RIGHT (the blob seam): ${s.stageL_vs_stageR}:1  ${s.stageL} -> ${s.stageR}`);
  console.log(` vertical seam found  : ${JSON.stringify(s.verticalSeam)}`);
  console.log(` horizontal seam found: ${JSON.stringify(s.horizontalSeam)}`);
}
await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
await p.waitForTimeout(400);

// ---- STATES: hover / focus / disabled ----
console.log('\n===== INTERACTIVE STATES =====');
await p.click('.seg button[data-tab="walk"]'); await p.waitForTimeout(700);
const st = await p.evaluate(() => {
  const sr = document.querySelector('deep-walkthrough').shadowRoot;
  const prev = sr.querySelector('.nav button, [class*=prev]');
  const out = {};
  if (prev) { const cs = getComputedStyle(prev); out.prevBtn = { cls: prev.className, disabled: prev.disabled, opacity: cs.opacity, color: cs.color, cursor: cs.cursor, bg: cs.backgroundColor }; }
  // empty containers that are visible
  const empties = [];
  document.querySelectorAll('.stage .pane > *').forEach(h => {
    if (!h.shadowRoot) return;
    h.shadowRoot.querySelectorAll('*').forEach(e => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none') return;
      const r = e.getBoundingClientRect();
      if (!e.textContent.trim() && e.children.length === 0 && r.height > 8 && r.width > 40 &&
          (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderLeftWidth !== '0px')) {
        empties.push({ pane: h.tagName.toLowerCase(), cls: String(e.className), w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor });
      }
    });
  });
  out.emptyVisibleBoxes = empties;
  return out;
});
console.log(' walkthrough Prev button:', JSON.stringify(st.prevBtn));
console.log(' EMPTY-but-VISIBLE styled boxes:', JSON.stringify(st.emptyVisibleBoxes, null, 1));

// wb pane empty footer
await p.click('.seg button[data-tab="wb"]'); await p.waitForTimeout(800);
const wb = await p.evaluate(() => {
  const sr = document.querySelector('deep-whiteboard').shadowRoot;
  const out = [];
  sr.querySelectorAll('*').forEach(e => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    if (cs.display !== 'none' && !e.textContent.trim() && r.height > 8 && r.width > 100)
      out.push({ cls: String(e.className), w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, bl: cs.borderLeft });
  });
  return out;
});
console.log(' WHITEBOARD empty boxes:', JSON.stringify(wb, null, 1));
await p.screenshot({ path: `${SHOT}/detail-wb-empty-footer.png`, clip: { x: 350, y: 460, width: 750, height: 70 } });

// crambtn chevron in the desktop 2-col grid
await p.evaluate(() => { document.querySelector('.sidebar').scrollTop = 99999; });
await p.waitForTimeout(400);
const chev = await p.evaluate(() => {
  const btn = document.getElementById('copylink');
  const r = btn.getBoundingClientRect();
  const cs = getComputedStyle(btn, '::after');
  return { btnW: Math.round(r.width), btnH: Math.round(r.height), afterContent: cs.content, afterFont: cs.font, display: getComputedStyle(btn).display, gridCol: getComputedStyle(btn.parentElement).gridTemplateColumns };
});
console.log('\n TOOLS ROW (.crambtn) in desktop 2-col grid:', JSON.stringify(chev));
await p.screenshot({ path: `${SHOT}/detail-tools-grid-chevron.png`, clip: { x: 8, y: 380, width: 285, height: 300 } });

await b.close();
