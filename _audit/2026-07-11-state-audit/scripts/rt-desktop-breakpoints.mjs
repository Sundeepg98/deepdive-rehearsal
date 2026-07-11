/* Breakpoint geometry at the 5 required desktop sizes + the boundary pixels.
   Measures the reading-column width (the thing that actually matters) as the layout reflows. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const SIZES = [[768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
// boundary probes around the two CSS breakpoints (920 and 1280)
const BOUNDS = [[918, 900], [919, 900], [920, 900], [921, 900], [1278, 900], [1279, 900], [1280, 900], [1281, 900]];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

const GEO = `(() => {
  const g = (s) => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { x: Math.round(r.x), w: Math.round(r.width), display: cs.display, shown: cs.display !== 'none' }; };
  const stage = document.querySelector('.stage');
  const scs = getComputedStyle(stage);
  const pane = document.querySelector('.pane.on');
  const card = pane ? pane.querySelector('.card, deep-walkthrough, deep-system-map') : null;
  // the actual reading column = the .pane's content box
  const pr = pane ? pane.getBoundingClientRect() : null;
  const de = document.documentElement;
  return {
    vw: window.innerWidth,
    docScrollW: de.scrollWidth, docClientW: de.clientWidth, docOverflow: de.scrollWidth - de.clientWidth,
    sidebar: g('.sidebar'), stage: g('.stage'), companion: g('.companion'), mcomp: g('.mcomp'),
    cmpReopen: g('.cmp-reopen'),
    stagePadL: scs.paddingLeft, stagePadR: scs.paddingRight,
    readingColumn: pr ? Math.round(pr.width) : null,
    paneMaxW: pane ? getComputedStyle(pane).maxWidth : null
  };
})()`;

console.log('=== LAYOUT GEOMETRY (topic=caching, view=walk) ===');
console.log('vw    sidebar  stage   companion  mcomp  READING-COLUMN  stage-padding   docOverflow');
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.keyboard.press('Escape');

const all = [...SIZES, ...BOUNDS];
const seen = [];
for (const [w, h] of all) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(220);
  const r = await p.evaluate(GEO);
  seen.push(r);
  const sb = r.sidebar.shown ? r.sidebar.w : 0;
  const cp = r.companion.shown ? r.companion.w : 0;
  const mc = r.mcomp.shown ? 'yes' : 'no';
  console.log(
    String(w).padEnd(6) + String(sb).padEnd(9) + String(r.stage.w).padEnd(8) +
    String(cp).padEnd(11) + mc.padEnd(7) + String(r.readingColumn).padEnd(16) +
    (r.stagePadL + '/' + r.stagePadR).padEnd(16) + r.docOverflow
  );
  if (SIZES.some(s => s[0] === w && s[1] === h)) {
    await p.screenshot({ path: SHOTS + `/walk-${w}x${h}.png` });
  }
}

// Reading-column discontinuity report
console.log('\n=== READING-COLUMN DISCONTINUITIES (the jarring reflows) ===');
const idx = (w) => seen[all.findIndex(s => s[0] === w)];
const j1a = idx(919), j1b = idx(920), j2a = idx(1279), j2b = idx(1280);
console.log(`  919px -> 920px : reading column ${j1a.readingColumn}px -> ${j1b.readingColumn}px  (${j1b.readingColumn - j1a.readingColumn >= 0 ? '+' : ''}${j1b.readingColumn - j1a.readingColumn}px)  [sidebar docks: ${j1a.sidebar.w}->${j1b.sidebar.w}]`);
console.log(`  1279px -> 1280px: reading column ${j2a.readingColumn}px -> ${j2b.readingColumn}px  (${j2b.readingColumn - j2a.readingColumn >= 0 ? '+' : ''}${j2b.readingColumn - j2a.readingColumn}px)  [companion appears: ${j2a.companion.shown ? j2a.companion.w : 0}->${j2b.companion.w}]`);
console.log(`\n  Widest reading column across ALL widths: ${Math.max(...seen.map(s => s.readingColumn))}px`);
console.log(`  At 1920 (widest viewport):               ${idx(1920).readingColumn}px  (pane max-width: ${idx(1920).paneMaxW})`);

// tablet dead zone: 768..1279 -- sidebar+stage only, no companion
console.log('\n=== TABLET DEAD ZONE 768-1279 ===');
for (const w of [768, 800, 900, 919, 920, 1000, 1100, 1200, 1279]) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.waitForTimeout(180);
  const r = await p.evaluate(GEO);
  console.log(`  ${String(w).padStart(4)}px: sidebar=${r.sidebar.shown ? r.sidebar.w + 'px docked' : 'collapsed to top strip'}  readingColumn=${r.readingColumn}px  companion=${r.companion.shown ? 'yes' : 'no'}  mcomp(fallback)=${r.mcomp.shown ? 'yes' : 'no'}`);
}
await b.close();
