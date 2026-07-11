import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-mobile';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();

/* ---------- 1. horizontal overflow, visual proof ---------- */
for (const [w, h, tag] of [[320, 568, '320'], [360, 640, '360'], [390, 844, '390'], [414, 896, '414']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL + '#api-design/walk', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${S}/hoverflow-${tag}-at-scrollX0.png` });
  // scroll fully right to expose the dead zone
  await p.evaluate(() => window.scrollTo(document.documentElement.scrollWidth, 0));
  await p.waitForTimeout(350);
  const sx = await p.evaluate(() => ({ x: window.scrollX, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await p.screenshot({ path: `${S}/hoverflow-${tag}-scrolledRight.png` });
  console.log(`[hoverflow ${tag}] scrollX=${sx.x} scrollWidth=${sx.sw} clientWidth=${sx.cw} -> +${sx.sw - sx.cw}px dead zone; shots saved`);
  await ctx.close();
}

/* ---------- 2. mockbar: RCA root-cause-3 regression (keyboard focus into a closed off-screen sheet) ---------- */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL + '#content-pipeline/walk', { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const closed = await p.evaluate(() => {
    const mb = document.querySelector('.sidebar .mockbar');
    const cs = getComputedStyle(mb);
    const r = mb.getBoundingClientRect();
    return {
      toolsOpen: document.body.classList.contains('tools-open'),
      display: cs.display, visibility: cs.visibility, transform: cs.transform,
      top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), vh: window.innerHeight,
      ariaHidden: mb.getAttribute('aria-hidden'), inert: mb.hasAttribute('inert'),
      focusables: [...mb.querySelectorAll('button')].map(x => x.id || x.className)
    };
  });
  console.log('\n[mockbar CLOSED state]', JSON.stringify(closed, null, 2));

  // Tab through the page and see if focus lands inside the CLOSED mockbar
  const trail = [];
  await p.evaluate(() => document.body.focus());
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press('Tab');
    const f = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a) return null;
      const inMockbar = !!a.closest?.('.mockbar');
      const r = a.getBoundingClientRect();
      return {
        id: a.id || a.className || a.tagName, inMockbar,
        top: +r.top.toFixed(0), offscreen: r.top >= window.innerHeight || r.bottom <= 0,
        txt: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)
      };
    });
    trail.push(f);
    if (f?.inMockbar) break;
  }
  const hit = trail.find(t => t?.inMockbar);
  console.log('\n[TAB TRAIL] steps=' + trail.length);
  trail.forEach((t, i) => console.log(`  ${i + 1}. ${t.inMockbar ? '>>> IN CLOSED MOCKBAR <<< ' : ''}${t.id} top=${t.top} offscreen=${t.offscreen} "${t.txt}"`));
  if (hit) {
    console.log(`\n  *** REGRESSION CONFIRMED: Tab #${trail.indexOf(hit) + 1} focused "${hit.txt}" (${hit.id}) inside the CLOSED tools sheet at y=${hit.top} (viewport h=${closed.vh}) -> offscreen=${hit.offscreen}`);
    await p.screenshot({ path: `${S}/mockbar-closed-focus-trap.png` });
    const after = await p.evaluate(() => ({ scrollY: window.scrollY, scrollX: window.scrollX }));
    console.log('  page scroll after focusing the off-screen sheet:', JSON.stringify(after));
  }

  // now OPEN the tools sheet and measure it for real
  await p.click('#toolsfab');
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${S}/tools-sheet-open-390.png` });
  const open = await p.evaluate(() => {
    const mb = document.querySelector('.sidebar .mockbar');
    const r = mb.getBoundingClientRect();
    const btns = [...mb.querySelectorAll('button')].map(x => {
      const b = x.getBoundingClientRect();
      return { id: x.id || x.className, w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    });
    return {
      toolsOpen: document.body.classList.contains('tools-open'),
      rect: { top: +r.top.toFixed(1), h: +r.height.toFixed(1) },
      vh: window.innerHeight,
      cutOff: +(r.bottom - window.innerHeight).toFixed(1),
      scrollable: mb.scrollHeight > mb.clientHeight,
      scrollH: mb.scrollHeight, clientH: mb.clientHeight,
      under44: btns.filter(x => x.h < 44 || x.w < 44)
    };
  });
  console.log('\n[mockbar OPEN state]', JSON.stringify(open, null, 2));
  await ctx.close();
}

/* ---------- 3. the CLIPPED containers: details.piv (api-design/sys) + main.stage ---------- */
{
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL + '#api-design/sys', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${S}/sys-api-design-360.png`, fullPage: true });
  const piv = await p.evaluate(() => {
    const host = document.querySelector('deep-system-map');
    const sr = host.shadowRoot;
    const pivs = [...sr.querySelectorAll('details.piv')];
    return pivs.map(d => {
      const cs = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      return {
        open: d.open, overflowX: cs.overflowX, overflow: cs.overflow,
        clientW: d.clientWidth, scrollW: d.scrollWidth, over: d.scrollWidth - d.clientWidth,
        w: +r.width.toFixed(1),
        summary: (d.querySelector('summary')?.textContent || '').trim().slice(0, 40),
        // what inside is wide?
        widest: [...d.querySelectorAll('*')].map(e => ({ t: e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0], sw: e.scrollWidth, cw: e.clientWidth, w: +e.getBoundingClientRect().width.toFixed(1) })).sort((a, b) => b.sw - a.sw).slice(0, 4)
      };
    });
  });
  console.log('\n[api-design/sys details.piv]', JSON.stringify(piv, null, 2));
  await ctx.close();
}
await b.close();
