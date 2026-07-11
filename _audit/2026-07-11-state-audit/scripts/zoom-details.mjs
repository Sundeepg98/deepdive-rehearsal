import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-desktop';
fs.mkdirSync(SHOT, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.click('.ix-card');
await p.waitForTimeout(900);

// A. sidebar overflow measurement
const sb = await p.evaluate(() => {
  const s = document.querySelector('.sidebar');
  return { scrollH: s.scrollHeight, clientH: s.clientHeight, overflow: s.scrollHeight - s.clientHeight };
});
console.log('SIDEBAR:', JSON.stringify(sb));

// B. scroll the sidebar to the bottom and shoot the tools grid (chevron placement)
await p.evaluate(() => { document.querySelector('.sidebar').scrollTop = 99999; });
await p.waitForTimeout(400);
await p.screenshot({ path: `${SHOT}/detail-sidebar-tools-bottom.png`, clip: { x: 0, y: 400, width: 296, height: 500 } });
await p.evaluate(() => { document.querySelector('.sidebar').scrollTop = 0; });
await p.waitForTimeout(300);
await p.screenshot({ path: `${SHOT}/detail-sidebar-top.png`, clip: { x: 0, y: 0, width: 296, height: 500 } });

// C. topic-nav trigger measurement
const tn = await p.evaluate(() => {
  const q = s => document.querySelector(s);
  const r = e => { const b = e.getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const cur = q('#tncurrent');
  return {
    trigger: r(q('#tntrigger')),
    eyebrow: r(q('.tn-eyebrow')),
    current: r(cur),
    currentText: cur.textContent,
    currentScrollW: cur.scrollWidth,
    truncated: cur.scrollWidth > cur.clientWidth,
    fontSize: getComputedStyle(cur).fontSize
  };
});
console.log('TOPICNAV:', JSON.stringify(tn, null, 1));
await p.screenshot({ path: `${SHOT}/detail-topicnav-truncated.png`, clip: { x: 8, y: 160, width: 280, height: 42 } });

// D. system-map pivot overflow
await p.click('.seg button[data-tab="sys"]');
await p.waitForTimeout(1000);
const sysm = await p.evaluate(() => {
  const host = document.querySelector('deep-system-map');
  const sr = host.shadowRoot;
  const out = { classes: [], overflowing: [] };
  sr.querySelectorAll('*').forEach(e => {
    if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) {
      out.overflowing.push({
        cls: e.className, tag: e.tagName.toLowerCase(),
        clientW: e.clientWidth, scrollW: e.scrollWidth,
        text: (e.textContent || '').trim().slice(0, 70)
      });
    }
  });
  // measure the label/value columns
  const rows = [...sr.querySelectorAll('*')].filter(e => e.children.length === 2 && /piv|pivot|row/i.test(e.className || ''));
  out.rowSample = rows.slice(0, 3).map(r => ({
    cls: r.className,
    kids: [...r.children].map(c => ({ cls: c.className, w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height), t: c.textContent.trim().slice(0, 40) }))
  }));
  out.html = sr.innerHTML.slice(0, 1500);
  return out;
});
console.log('SYSMAP OVERFLOW:', JSON.stringify(sysm.overflowing, null, 1));
console.log('SYSMAP ROWS:', JSON.stringify(sysm.rowSample, null, 1));
console.log('SYSMAP HTML HEAD:', sysm.html.replace(/</g, '\n<').slice(0, 1400));
await p.screenshot({ path: `${SHOT}/detail-sysmap-broken.png`, clip: { x: 340, y: 250, width: 780, height: 380 } });

await p.close();
await b.close();
