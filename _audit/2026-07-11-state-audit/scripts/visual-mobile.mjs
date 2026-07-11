import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
fs.mkdirSync(SHOTS, { recursive: true });

const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const log = [];
const L = (...a) => { const s = a.join(' '); console.log(s); log.push(s); };

const b = await chromium.launch();

async function session(theme, width = 390) {
  const ctx = await b.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, colorScheme: theme === 'dark' ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') L('CONSOLE-ERROR:', m.text()); });
  p.on('pageerror', e => L('PAGE-ERROR:', e.message));
  if (theme === 'dark') {
    await p.addInitScript(() => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify('dark')); } catch (e) {} });
  }
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  return { ctx, p };
}

const tag = (theme, w) => `${w}-${theme}`;

for (const theme of ['light', 'dark']) {
  const { ctx, p } = await session(theme);
  const T = tag(theme, 390);

  // ---------- HOME (index overlay is auto-open on first load) ----------
  await p.waitForTimeout(500);
  const homeOpen = await p.evaluate(() => !!document.querySelector('#_index-overlay.open'));
  L(`[${T}] home/index overlay auto-open on first load: ${homeOpen}`);
  await p.screenshot({ path: `${SHOTS}/home-${T}.png` });
  await p.screenshot({ path: `${SHOTS}/home-full-${T}.png`, fullPage: true });

  // Home metrics
  const homeM = await p.evaluate(() => {
    const q = s => document.querySelector(s);
    const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), y: +r.y.toFixed(1), fs: cs.fontSize, lh: cs.lineHeight, pad: cs.padding }; };
    const ov = q('#_index-overlay');
    const cards = [...document.querySelectorAll('.ix-card')];
    return {
      overlayH: ov ? ov.scrollHeight : null,
      panelScrollH: (() => { const pn = ov && ov.firstElementChild; return pn ? pn.scrollHeight : null; })(),
      cardCount: cards.length,
      card0: R(cards[0]),
      groups: [...document.querySelectorAll('.ix-group')].length,
      searchInput: R(q('.ix-search input, .ix-q, #ixq')),
      closeBtn: R(q('.ix-x'))
    };
  });
  L(`[${T}] HOME metrics: ${JSON.stringify(homeM)}`);

  // ---------- close home ----------
  await p.click('.ix-x').catch(() => p.keyboard.press('Escape'));
  await p.waitForTimeout(600);

  // ---------- 9 panes ----------
  for (const id of PANES) {
    await p.evaluate(v => { location.hash = '#' + v; }, id);
    await p.waitForTimeout(700);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/pane-${id}-${T}.png` });
    if (theme === 'light') await p.screenshot({ path: `${SHOTS}/pane-${id}-full-${T}.png`, fullPage: true });
  }

  // ---------- tools drawer ----------
  await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0, 0); });
  await p.waitForTimeout(400);
  await p.click('#toolsfab');
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${SHOTS}/tools-drawer-${T}.png` });
  const drawerM = await p.evaluate(() => {
    const mb = document.querySelector('.sidebar .mockbar'); const r = mb.getBoundingClientRect();
    const btns = [...mb.querySelectorAll('button')].map(x => { const rr = x.getBoundingClientRect();
      return { id: x.id, h: +rr.height.toFixed(1), y: +rr.y.toFixed(1) }; });
    return { top: +r.y.toFixed(1), h: +r.height.toFixed(1), scrollH: mb.scrollHeight, clientH: mb.clientHeight,
      maxH: getComputedStyle(mb).maxHeight, offscreenBtns: btns.filter(x => x.y + x.h > 844).length, btns };
  });
  L(`[${T}] TOOLS DRAWER: ${JSON.stringify(drawerM)}`);
  // close drawer
  await p.click('.tools-bd').catch(() => {});
  await p.keyboard.press('Escape').catch(() => {});
  await p.waitForTimeout(500);

  // ---------- overlays ----------
  const OVL = [
    ['mockopen', 'mock-run'], ['mixopen', 'mixed-fire'], ['cramopen', 'cram'],
    ['sessopen', 'session'], ['planopen', 'gameplan'], ['scopeopen', 'scope'],
    ['searchopen', 'search'], ['notesopen', 'notes'], ['idxopen', 'index']
  ];
  for (const [btn, name] of OVL) {
    await p.evaluate(() => { document.body.classList.remove('tools-open'); });
    await p.click('#toolsfab');
    await p.waitForTimeout(500);
    const ok = await p.evaluate(id => { const el = document.getElementById(id); if (!el) return false; el.click(); return true; }, btn);
    if (!ok) { L(`[${T}] MISSING BUTTON #${btn}`); continue; }
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SHOTS}/ov-${name}-${T}.png` });
    // close
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    await p.evaluate(() => { document.body.classList.remove('tools-open'); });
    await p.waitForTimeout(200);
  }

  await ctx.close();
}

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/visual-mobile.log', log.join('\n'));
await b.close();
L('DONE');
