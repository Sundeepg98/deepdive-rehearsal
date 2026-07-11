import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);

/* 1. HOME: the clipped cross-topic drill row */
await p.screenshot({ path: `${SHOTS}/BUG-home-cross-clip.png`, clip: { x: 20, y: 300, width: 350, height: 90 } });
const cross = await p.evaluate(() => {
  const e = document.querySelector('.ix-cross'); const cs = getComputedStyle(e);
  return { clientH: e.clientHeight, scrollH: e.scrollHeight, hiddenPx: e.scrollHeight - e.clientHeight,
    overflow: cs.overflow, height: cs.height, maxHeight: cs.maxHeight, padding: cs.padding, alignItems: cs.alignItems, display: cs.display };
});
console.log('.ix-cross (home "Cross-topic drill" row):', JSON.stringify(cross));
await p.click('.ix-x').catch(() => {});
await p.waitForTimeout(400);

/* 2. The FOCUS chip (20px tall) */
const focus = await p.evaluate(() => {
  const e = document.getElementById('_focus-toggle'); if (!e) return null;
  const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
  return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: +r.x.toFixed(1), y: +r.y.toFixed(1),
    fs: cs.fontSize, pad: cs.padding, txt: e.textContent.trim(), title: e.title || e.getAttribute('aria-label') };
});
console.log('#_focus-toggle:', JSON.stringify(focus));
await p.screenshot({ path: `${SHOTS}/BUG-focus-chip.png`, clip: { x: 10, y: 108, width: 200, height: 44 } });

/* 3. Whiteboard 28px buttons */
await p.evaluate(() => { location.hash = '#wb'; window.scrollTo(0, 0); });
await p.waitForTimeout(800);
const wbBtn = await p.evaluate(() => {
  const pane = document.querySelector('#wb'); let found = null;
  (function walk(r) { r.querySelectorAll('.wb-rev').forEach(e => { if (found) return; const rr = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      found = { w: +rr.width.toFixed(1), h: +rr.height.toFixed(1), y: +rr.y.toFixed(1), pad: cs.padding, fs: cs.fontSize, txt: e.textContent.trim() }; });
    r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); }); })(pane);
  return found;
});
console.log('.wb-rev (Whiteboard Reveal btn):', JSON.stringify(wbBtn));
if (wbBtn) await p.screenshot({ path: `${SHOTS}/BUG-wb-28px-buttons.png`, clip: { x: 20, y: Math.max(0, wbBtn.y - 40), width: 350, height: 110 } });

/* 4. Companion accordion OPEN */
await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0, 0); });
await p.waitForTimeout(700);
await p.click('.mcomp-sum');
await p.waitForTimeout(600);
const mc = await p.evaluate(() => { const e = document.querySelector('.mcomp'); const r = e.getBoundingClientRect();
  return { h: +r.height.toFixed(1), open: e.open, transition: getComputedStyle(e).transition }; });
console.log('.mcomp open:', JSON.stringify(mc));
await p.screenshot({ path: `${SHOTS}/companion-open-390.png` });

/* 5. Walkthrough "Observability hooks" flow-grid clip */
await p.evaluate(() => { const el = [...document.querySelectorAll('*')]; location.hash = '#walk'; });
await p.waitForTimeout(500);
const arc = await p.evaluate(() => {
  const pane = document.querySelector('#walk'); let f = null;
  (function walk(r) { r.querySelectorAll('*').forEach(el => { if (f || el.children.length) return;
      if (!/Observabilit/.test(el.textContent || '')) return;
      const rr = el.getBoundingClientRect(); const pr = el.parentElement.getBoundingClientRect();
      // measure the actual painted text width with a range
      const range = document.createRange(); range.selectNodeContents(el);
      const tw = range.getBoundingClientRect().width;
      f = { boxW: +rr.width.toFixed(1), textW: +tw.toFixed(1), overflowsBoxBy: +(tw - rr.width).toFixed(1),
        parentW: +pr.width.toFixed(1), parentRight: +pr.right.toFixed(1), textRight: +range.getBoundingClientRect().right.toFixed(1),
        parentOverflow: getComputedStyle(el.parentElement).overflow, y: +rr.y.toFixed(1) };
    }); r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); }); })(pane);
  return f;
});
console.log('"Observability hooks" label:', JSON.stringify(arc));
if (arc) {
  await p.evaluate(y => window.scrollTo(0, y - 300), arc.y + window.scrollY || 0);
  await p.waitForTimeout(400);
}

/* 6. bottom bar: how much vertical space, and what's in the thumb zone */
await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0, 0); });
await p.waitForTimeout(500);
const bar = await p.evaluate(() => {
  const cta = document.querySelector('.sidebar .mockcta'); const r = cta.getBoundingClientRect();
  const vh = innerHeight;
  return { h: +r.height.toFixed(1), pctOfViewport: +(r.height / vh * 100).toFixed(1), top: +r.top.toFixed(1),
    rows: [...cta.children].map(c => { const cr = c.getBoundingClientRect();
      return { id: c.id || c.className, w: +cr.width.toFixed(1), h: +cr.height.toFixed(1), y: +cr.y.toFixed(1) }; }) };
});
console.log('bottom bar:', JSON.stringify(bar, null, 1));
await p.screenshot({ path: `${SHOTS}/bottombar-390.png`, clip: { x: 0, y: 715, width: 390, height: 129 } });

await b.close();
