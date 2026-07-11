/* Apples-to-apples topicnav overflow test: plain 390x844 context (exactly what the
   original lens used: newPage({viewport:{width:390,height:844}}) — no isMobile/hasTouch).
   Also re-checks the "no text-size control on mobile" claim properly. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-tools';
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = {};
const log = (k, v) => { OUT[k] = v; console.log('::' + k + ':: ' + JSON.stringify(v)); };

const browser = await chromium.launch();

for (const mode of ['plain390', 'isMobile390']) {
  const opts = mode === 'plain390'
    ? { viewport: { width: 390, height: 844 } }
    : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1300);
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
  await p.waitForTimeout(600);

  // baseline: any horizontal overflow BEFORE opening the menu?
  const baseline = await p.evaluate(() => ({
    innerWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    hOverflowBefore: document.documentElement.scrollWidth > window.innerWidth,
  }));
  log(`${mode}.baseline`, baseline);

  await p.click('#tntrigger');
  await p.waitForTimeout(600);
  const menu = await p.evaluate(() => {
    const m = document.getElementById('tnmenu');
    if (!m || m.hidden) return { hidden: true };
    const r = m.getBoundingClientRect();
    const cs = getComputedStyle(m);
    return {
      left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
      innerWidth: window.innerWidth,
      overflowRightPx: Math.round(r.right - window.innerWidth),
      cssWidth: cs.width, cssMaxWidth: cs.maxWidth, cssPosition: cs.position, cssRight: cs.right, cssLeft: cs.left,
      docScrollWidth: document.documentElement.scrollWidth,
      hOverflow: document.documentElement.scrollWidth > window.innerWidth,
      // can the user actually PAN the page sideways?
      canPan: (() => { const before = window.scrollX; window.scrollTo(9999, 0); const after = window.scrollX; window.scrollTo(before, 0); return after > before; })(),
    };
  });
  log(`${mode}.tnmenu`, menu);
  await p.screenshot({ path: `${SHOTS}/${mode}-topicnav.png` });

  // text-size control reachability on mobile
  const tz = await p.evaluate(() => {
    const el = document.getElementById('textzoom');
    const btns = el ? el.querySelectorAll('button') : [];
    return {
      textzoomExists: !!el,
      textzoomDisplay: el ? getComputedStyle(el).display : null,
      textzoomOffsetParentNull: el ? el.offsetParent === null : null,
      buttonsReachable: Array.from(btns).filter(b => getComputedStyle(b).display !== 'none' && b.offsetParent !== null).length,
      pomodoroDisplay: (() => { const q = document.getElementById('pomodoro'); return q ? getComputedStyle(q).display : null; })(),
    };
  });
  log(`${mode}.textzoom`, tz);

  await ctx.close();
}

await browser.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/verify-topicnav.json', JSON.stringify(OUT, null, 2));
console.log('=== DONE ===');
