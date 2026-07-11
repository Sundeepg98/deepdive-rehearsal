/* ADVERSARIAL RE-VERIFICATION: F3 (shadow-piercing, corrected), F4, F7 + missed-item hunt. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-a11y';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.keyboard.press('Escape');
await p.waitForTimeout(500);

console.log('============ F3 (CORRECTED — shadow-piercing) ============');
console.log('NOTE: TopicPane attaches a shadow root (topic-protocol.js:133), so .ans lives in deep-drill.shadowRoot.');

await p.evaluate(() => window.switchTab('drill'));
await p.waitForTimeout(800);

const probeDrill = () => p.evaluate(() => {
  const dd = document.querySelector('#drill deep-drill');
  if (!dd || !dd.shadowRoot) return { err: 'no deep-drill shadowRoot' };
  const r = dd.shadowRoot;
  const a = r.querySelector('.ans');
  const doc = [...document.querySelectorAll('[aria-live]')].map(e => ({
    sel: e.id ? '#' + e.id : (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : e.tagName),
    live: e.getAttribute('aria-live'), text: (e.textContent || '').trim().slice(0, 30)
  }));
  // live regions INSIDE the drill shadow root too
  const shadowLive = [...r.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e => ({
    sel: e.id ? '#' + e.id : (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : e.tagName),
    live: e.getAttribute('aria-live'), role: e.getAttribute('role'),
    visible: !!e.getClientRects().length, text: (e.textContent || '').trim().slice(0, 25)
  }));
  let ansInfo = null;
  if (a) {
    const anc = [];
    let cur = a;
    while (cur) {
      anc.push({
        sel: cur.id ? '#' + cur.id : (typeof cur.className === 'string' && cur.className ? '.' + String(cur.className).split(' ')[0] : (cur.tagName || cur.nodeName)),
        ariaLive: cur.getAttribute ? cur.getAttribute('aria-live') : null,
        role: cur.getAttribute ? cur.getAttribute('role') : null
      });
      cur = cur.parentElement || (cur.parentNode && cur.parentNode.host) || null;
      if (anc.length > 12) break;
    }
    ansInfo = {
      height: Math.round(a.getBoundingClientRect().height),
      text: (a.textContent || '').trim().slice(0, 55),
      ariaLive: a.getAttribute('aria-live'), role: a.getAttribute('role'), tabIndex: a.tabIndex,
      ancestorChain: anc
    };
  }
  return {
    ansExists: !!a, ansInfo,
    activeElement: document.activeElement ? document.activeElement.tagName + (document.activeElement.id ? '#' + document.activeElement.id : '') : null,
    shadowActiveElement: r.activeElement ? r.activeElement.tagName + (r.activeElement.id ? '#' + r.activeElement.id : '') : null,
    docLiveRegions: doc, shadowLiveRegions: shadowLive
  };
});

const before = await probeDrill();
console.log('BEFORE Space:', JSON.stringify({ ansExists: before.ansExists, activeElement: before.activeElement, docLiveRegions: before.docLiveRegions, shadowLiveRegions: before.shadowLiveRegions }, null, 1));
await p.screenshot({ path: SHOTS + '/f3-drill-before.png' });

await p.keyboard.press('Space');
await p.waitForTimeout(800);
const after = await probeDrill();
console.log('AFTER Space:', JSON.stringify(after, null, 1));
await p.screenshot({ path: SHOTS + '/f3-drill-after.png' });

console.log('\n============ MISSED-HUNT A: drill mock timer = per-second live region ============');
// switch drill into "Mock round" mode and watch #timer (role=timer aria-live=polite)
const timerSeries = await p.evaluate(async () => {
  const dd = document.querySelector('#drill deep-drill');
  const r = dd.shadowRoot;
  const modetog = r.getElementById('modetog');
  const mockBtn = modetog ? modetog.querySelector('[data-m="mock"]') : null;
  if (!mockBtn) return { err: 'no mock button' };
  mockBtn.click();
  const t = r.getElementById('timer');
  const attrs = { role: t.getAttribute('role'), ariaLive: t.getAttribute('aria-live'), ariaLabel: t.getAttribute('aria-label'), display: getComputedStyle(t).display };
  const samples = [];
  for (let i = 0; i < 6; i++) {
    samples.push({ t: i * 1000, text: t.textContent });
    await new Promise(res => setTimeout(res, 1000));
  }
  return { attrs, samples };
});
console.log(JSON.stringify(timerSeries, null, 1));
await p.screenshot({ path: SHOTS + '/missed-timer-liveregion.png' });

console.log('\n============ F7: COPY LINK ============');
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
const nameBefore = await p.evaluate(() => {
  const btn = document.getElementById('copylink');
  return { text: btn.textContent.replace(/\s+/g, ' ').trim(), ariaLive: btn.getAttribute('aria-live'), role: btn.getAttribute('role'), ariaLabel: btn.getAttribute('aria-label') };
});
console.log('BEFORE click:', JSON.stringify(nameBefore));
await p.click('#copylink');
await p.waitForTimeout(400);
const nameAfter = await p.evaluate(() => {
  const btn = document.getElementById('copylink');
  const anc = [];
  let cur = btn;
  while (cur && cur !== document.documentElement) {
    anc.push({ sel: cur.id ? '#' + cur.id : (typeof cur.className === 'string' && cur.className ? '.' + cur.className.split(' ')[0] : cur.tagName), ariaLive: cur.getAttribute('aria-live'), role: cur.getAttribute('role') });
    cur = cur.parentElement;
  }
  return {
    text: btn.textContent.replace(/\s+/g, ' ').trim(),
    ariaLive: btn.getAttribute('aria-live'), role: btn.getAttribute('role'),
    ancestorChain: anc,
    docLiveRegions: [...document.querySelectorAll('[aria-live]')].map(e => ({ sel: e.id ? '#' + e.id : (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : e.tagName), live: e.getAttribute('aria-live'), text: (e.textContent || '').trim().slice(0, 30) })),
    anyCopiedInLiveRegion: [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].some(e => /copied/i.test(e.textContent || ''))
  };
});
console.log('AFTER click:', JSON.stringify(nameAfter, null, 1));
// what a screen reader actually computes as the accessible name:
const axName = await p.evaluate(() => {
  const btn = document.getElementById('copylink');
  return btn.getAttribute('aria-label') || btn.textContent.replace(/\s+/g, ' ').trim();
});
console.log('computed accessible name AFTER click:', JSON.stringify(axName));
await p.screenshot({ path: SHOTS + '/f7-copylink.png' });

console.log('\nERRORS:', errs.length ? errs : 'none');
await b.close();
