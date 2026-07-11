import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: false, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

const recon = await p.evaluate(() => {
  const out = {};
  out.hash = location.hash;
  out.bodyClass = document.body.className;
  // what overlays are open?
  out.openOverlays = [...document.querySelectorAll('[class*="-ov"]')].map(e => ({
    cls: e.className, display: getComputedStyle(e).display, open: e.classList.contains('open')
  })).filter(o => o.display !== 'none');
  out.ixOpen = !!document.querySelector('.ix-ov.open');
  // close buttons
  out.closeBtns = [...document.querySelectorAll('.ix-x, [id*="close"], [class*="-x"]')].slice(0, 12).map(e => ({ tag: e.tagName, id: e.id, cls: e.className, txt: (e.textContent || '').trim().slice(0, 24) }));
  // topicnav hidden?
  const tn = document.getElementById('topicnav');
  out.topicnavHidden = tn ? tn.hasAttribute('hidden') : 'MISSING';
  out.topicnavDisplay = tn ? getComputedStyle(tn).display : null;
  // seg buttons
  out.segButtons = [...document.querySelectorAll('.sidebar .seg button')].map(b => ({ id: b.id, txt: (b.textContent || '').trim().slice(0, 20), on: b.classList.contains('on') }));
  // panes
  out.panes = [...document.querySelectorAll('.pane')].map(e => ({ id: e.id, on: e.classList.contains('on'), tag: e.tagName }));
  out.docScrollWidth = document.documentElement.scrollWidth;
  out.docClientWidth = document.documentElement.clientWidth;
  out.bodyScrollWidth = document.body.scrollWidth;
  out.innerWidth = window.innerWidth;
  return out;
});
console.log(JSON.stringify(recon, null, 2));

await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile/recon-boot-390.png' });

await b.close();
