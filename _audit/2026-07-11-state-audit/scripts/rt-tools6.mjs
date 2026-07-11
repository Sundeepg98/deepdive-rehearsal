import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-tools';
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }];
const out = []; const rec = o => { out.push(o); console.log(JSON.stringify(o)); };

for (const vp of VIEWPORTS) {
  console.log('\n########## ' + vp.name.toUpperCase() + ' ##########');
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
  await c.addInitScript(() => { try { localStorage.setItem('ddr.v1.__auditseed', '1'); } catch (e) { } });
  const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.message))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(700);

  /* === PRINT Q&A: it opens a POPUP. Does the popup's CSS resolve? === */
  const popupP = p.waitForEvent('popup', { timeout: 6000 }).catch(() => null);
  await p.evaluate(() => { window.print = () => { window.__p = 1; }; document.getElementById('printqa').click(); });
  const pop = await popupP;
  if (pop) {
    await pop.waitForTimeout(900);
    const style = await pop.evaluate(() => {
      const body = document.body, h1 = document.querySelector('h1'), art = document.querySelector('article');
      const sig = document.querySelector('.sig'), a = document.querySelector('.a'), fu = document.querySelector('.fu'), sr = document.querySelector('.sr');
      const cs = getComputedStyle(body);
      const gv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '(UNDEFINED)';
      return {
        title: document.title,
        articles: document.querySelectorAll('article').length,
        hasTokens: { space40: gv('--space-40'), fontDisplay: gv('--font-size-display'), space760: gv('--space-760') },
        bodyPadding: cs.padding, bodyMaxWidth: cs.maxWidth, bodyWidth: Math.round(body.getBoundingClientRect().width),
        h1FontSize: h1 ? getComputedStyle(h1).fontSize : null,
        h1FontWeight: h1 ? getComputedStyle(h1).fontWeight : null,
        h2FontSize: document.querySelector('h2') ? getComputedStyle(document.querySelector('h2')).fontSize : null,
        sigFontSize: sig ? getComputedStyle(sig).fontSize : null,
        aFontSize: a ? getComputedStyle(a).fontSize : null,
        fuMargin: fu ? getComputedStyle(fu).margin : null,
        fuPaddingLeft: fu ? getComputedStyle(fu).paddingLeft : null,
        srPadding: sr ? getComputedStyle(sr).padding : null,
        articleMarginBottom: art ? getComputedStyle(art).marginBottom : null,
        articlePaddingBottom: art ? getComputedStyle(art).paddingBottom : null,
        stylesheetVarCount: (document.querySelector('style') || { textContent: '' }).textContent.split('var(--').length - 1,
      };
    });
    rec({ vp: vp.name, tool: 'PRINT-QA-popup', popupOpened: true, ...style, errs: errs.length });
    await pop.screenshot({ path: `${SHOTS}/${vp.name}-printqa-popup-BROKEN-CSS.png`, fullPage: false });
    await pop.close();
  } else {
    rec({ vp: vp.name, tool: 'PRINT-QA-popup', popupOpened: false, note: 'no popup fired' });
  }

  /* === INDEX scroll-chaining (both viewports, explicit) === */
  await p.evaluate(() => window.IndexOverlay.open()); await p.waitForTimeout(700);
  const ch = await p.evaluate(() => {
    const el = document.getElementById('_index-overlay');
    const sc = el.querySelector('.ix-scroll') || [...el.querySelectorAll('*')].find(n => n.scrollHeight > n.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY));
    sc.scrollTop = sc.scrollHeight;
    const r = sc.getBoundingClientRect();
    return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), overscrollY: getComputedStyle(sc).overscrollBehaviorY, bodyOverflow: document.body.style.overflow, y0: window.scrollY, pageScrollH: document.documentElement.scrollHeight, innerH: window.innerHeight };
  });
  await p.mouse.move(ch.cx, ch.cy); await p.mouse.wheel(0, 800); await p.waitForTimeout(400);
  const y1 = await p.evaluate(() => window.scrollY);
  rec({ vp: vp.name, tool: 'INDEX-scroll-CHAINING', bodyScrollLock: ch.bodyOverflow || '(none)', overscrollBehaviorY: ch.overscrollY, pageScrollHeight: ch.pageScrollH, viewportH: ch.innerH, bodyScrollBefore: ch.y0, bodyScrollAfter: y1, CHAINS_TO_PAGE_BEHIND: y1 !== ch.y0, pxLeaked: y1 - ch.y0, errs: errs.length });
  if (y1 !== ch.y0) await p.screenshot({ path: `${SHOTS}/${vp.name}-index-SCROLLCHAIN-page-moved.png` });

  /* === TOPIC-NAV dropdown overflow (mobile showed offR=+6) === */
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.click('#tntrigger'); await p.waitForTimeout(400);
  const tn = await p.evaluate(() => {
    const m = document.getElementById('tnmenu'); const r = m.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), innerW: innerWidth, overflowRightPx: Math.round(r.right - innerWidth), clipped: r.right > innerWidth || r.left < 0, docScrollW: document.documentElement.scrollWidth, hOverflow: document.documentElement.scrollWidth > innerWidth };
  });
  rec({ vp: vp.name, tool: 'TOPIC-NAV-menu-overflow', ...tn, errs: errs.length });
  await p.screenshot({ path: `${SHOTS}/${vp.name}-topicnav-overflow.png` });

  await b.close();
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/rt-tools6-results.json', JSON.stringify(out, null, 2));
console.log('\nDONE');
