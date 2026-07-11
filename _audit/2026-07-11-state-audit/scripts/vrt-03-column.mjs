/* VERIFY F2: "reading column is non-monotonic; 1280x800 is the narrowest column >900px".
   Measures .pane.on width (the reading column) across viewport widths. caching/walk. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(600);

const measure = async (w) => {
  await p.setViewportSize({ width: w, height: 800 });
  await p.waitForTimeout(160);
  await p.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  return await p.evaluate(() => {
    const pane = document.querySelector('.stage .pane.on');
    const sb = document.querySelector('.sidebar');
    const st = document.querySelector('.stage');
    const cmp = document.querySelector('.companion');
    const vis = el => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    const stCS = st ? getComputedStyle(st) : null;
    return {
      pane: pane ? Math.round(pane.getBoundingClientRect().width) : -1,
      sidebar: vis(sb) ? Math.round(sb.getBoundingClientRect().width) : 0,
      stage: st ? Math.round(st.getBoundingClientRect().width) : -1,
      cmp: vis(cmp) ? Math.round(cmp.getBoundingClientRect().width) : 0,
      padL: stCS ? Math.round(parseFloat(stCS.paddingLeft)) : -1,
      paneOn: pane ? pane.id : null,
    };
  });
};

// The exact widths the lens cited
const cited = [768, 860, 919, 920, 1024, 1260, 1280, 1440, 1520, 1920];
console.log('=== F2: cited widths (caching/walk, reducedMotion) ===');
console.log('  vw | sidebar | stage | cmp | padL | READING COLUMN');
const seen = {};
for (const w of cited) {
  const m = await measure(w);
  seen[w] = m.pane;
  console.log(String(w).padStart(4), '|', String(m.sidebar).padStart(7), '|', String(m.stage).padStart(5), '|',
    String(m.cmp).padStart(3), '|', String(m.padL).padStart(4), '|', String(m.pane).padStart(4) + 'px', '(pane#' + m.paneOn + ')');
}

// Full sweep to find the true monotonicity violations
console.log('\n=== F2: full sweep 820 -> 1600 (step 10) — cliff detection ===');
let prev = null, cliffs = [];
const curve = [];
for (let w = 820; w <= 1600; w += 10) {
  const m = await measure(w);
  curve.push({ w, c: m.pane, cmp: m.cmp, sb: m.sidebar });
  if (prev !== null && m.pane < prev.c) {
    const drop = m.pane - prev.c;
    if (drop <= -20) cliffs.push({ from: prev.w, to: w, fromC: prev.c, toC: m.pane, drop });
  }
  prev = { w, c: m.pane };
}
cliffs.forEach(c => console.log(`  CLIFF: vw ${c.from}px (col ${c.fromC}px) -> vw ${c.to}px (col ${c.toC}px)  = ${c.drop}px NARROWER on a WIDER window`));

const above900 = curve.filter(x => x.w >= 900);
const min = above900.reduce((m, x) => x.c < m.c ? x : m);
console.log('\nnarrowest column at any vw >=900 in sweep:', min.c + 'px @ vw ' + min.w);
console.log('column @1280 :', seen[1280] + 'px  | @1260:', seen[1260] + 'px | @1024:', seen[1024] + 'px | @860:', seen[860] + 'px');
console.log('first vw at/above 1280 that regains the 830px cap:', (curve.find(x => x.w >= 1280 && x.c >= 830) || {}).w);

// Fold recovery at 1280
await p.setViewportSize({ width: 1280, height: 800 });
await p.waitForTimeout(200);
const before = await measure(1280);
const folded = await p.evaluate(() => {
  const f = document.querySelector('.cmp-fold');
  if (!f) return { err: 'no .cmp-fold' };
  f.click();
  return { clicked: true };
});
await p.waitForTimeout(400);
const after = await measure(1280);
console.log('\nfold recovery @1280:', before.pane + 'px -> ' + after.pane + 'px  (+' + (after.pane - before.pane) + 'px)', JSON.stringify(folded));
console.log('body.cmp-collapsed:', await p.evaluate(() => document.body.classList.contains('cmp-collapsed')));
await b.close();
