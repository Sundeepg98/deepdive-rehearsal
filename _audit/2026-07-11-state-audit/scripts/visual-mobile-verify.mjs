import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const b = await chromium.launch();

for (const W of [390, 360]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.click('.ix-x').catch(() => {});
  await p.waitForTimeout(400);

  console.log(`\n===== ${W}px =====`);
  // 1. can the PAGE actually pan horizontally?
  const pan = await p.evaluate(() => {
    const before = window.scrollX;
    window.scrollTo(200, 0);
    const after = window.scrollX;
    window.scrollTo(0, 0);
    return { docScrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth, scrolledTo: after, canPan: after > 0 };
  });
  console.log('HORIZONTAL PAN:', JSON.stringify(pan));

  // 2. what is 396px wide?
  const wide = await p.evaluate(() => {
    const cw = document.documentElement.clientWidth; const bad = [];
    document.querySelectorAll('body *').forEach(el => {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.position === 'fixed') return;
      const r = el.getBoundingClientRect();
      if (r.right > cw + 0.5) bad.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '')),
        right: +r.right.toFixed(1), w: +r.width.toFixed(1), overflowStyle: cs.overflow, txt: (el.textContent || '').trim().slice(0, 24) });
    });
    return bad.slice(0, 10);
  });
  console.log('ELEMENTS PAST VIEWPORT (non-fixed):', JSON.stringify(wide, null, 1));

  // 3. Walkthrough flow-grid label clipping ("Observability hooks")
  await p.evaluate(() => { location.hash = '#walk'; });
  await p.waitForTimeout(700);
  const clip = await p.evaluate(() => {
    const pane = document.querySelector('#walk'); const res = [];
    (function walk(r) {
      r.querySelectorAll('*').forEach(el => {
        if (el.children.length) return;
        const t = (el.textContent || '').trim(); if (!t) return;
        const cs = getComputedStyle(el);
        const overflowX = el.scrollWidth > el.clientWidth + 1;
        const overflowY = el.scrollHeight > el.clientHeight + 1;
        if ((overflowX || overflowY) && el.clientHeight > 0 && cs.overflow !== 'visible' && !cs.webkitLineClamp) {
          res.push({ cls: (typeof el.className === 'string' ? el.className : '').slice(0, 20), sw: el.scrollWidth, cw: el.clientWidth,
            sh: el.scrollHeight, ch: el.clientHeight, overflow: cs.overflow, txt: t.slice(0, 30) });
        }
      });
      r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
    })(pane);
    return res.slice(0, 10);
  });
  console.log('CLIPPED TEXT in #walk:', JSON.stringify(clip, null, 1));

  // 4. flow-grid step cards
  const flow = await p.evaluate(() => {
    const pane = document.querySelector('#walk'); let res = [];
    (function walk(r) {
      const cards = r.querySelectorAll('[class*="flow"] *, .wk-jump, .jump');
      r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
    })(pane);
    // just grab anything with text 'Observability'
    const found = [];
    (function walk(r) {
      r.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0 && /Observabilit/.test(el.textContent || '')) {
          const rr = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          found.push({ cls: (typeof el.className === 'string' ? el.className : ''), txt: el.textContent.trim(),
            w: +rr.width.toFixed(1), sw: el.scrollWidth, cw: el.clientWidth, clipped: el.scrollWidth > el.clientWidth + 1,
            overflow: cs.overflow, textOverflow: cs.textOverflow, ws: cs.whiteSpace,
            parentW: +el.parentElement.getBoundingClientRect().width.toFixed(1),
            parentOverflow: getComputedStyle(el.parentElement).overflow });
        }
      });
      r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
    })(pane);
    return found;
  });
  console.log('"Observability hooks" step label:', JSON.stringify(flow, null, 1));
  await ctx.close();
}

/* Tools sheet: is it swipe/drag dismissable? (the grabber implies it) */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.click('.ix-x').catch(() => {});
  await p.waitForTimeout(400);
  await p.click('#toolsfab');
  await p.waitForTimeout(700);
  const openBefore = await p.evaluate(() => document.body.classList.contains('tools-open'));
  // drag the grabber down
  await p.evaluate(() => {
    const mb = document.querySelector('.sidebar .mockbar');
    function t(type, y) { const touch = new Touch({ identifier: 3, target: mb, clientX: 195, clientY: y, pageX: 195, pageY: y, screenX: 195, screenY: y });
      mb.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true,
        touches: type === 'touchend' ? [] : [touch], targetTouches: type === 'touchend' ? [] : [touch], changedTouches: [touch] })); }
    t('touchstart', 165); t('touchmove', 300); t('touchmove', 500); t('touchend', 640);
  });
  await p.waitForTimeout(700);
  const openAfter = await p.evaluate(() => document.body.classList.contains('tools-open'));
  console.log(`\n===== TOOLS SHEET =====`);
  console.log(`grabber drag-down dismiss: open before=${openBefore} after=${openAfter} -> ${openBefore && openAfter ? 'NOT DISMISSABLE BY DRAG (grabber is decorative)' : 'dismissable'}`);
  const grab = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.sidebar .mockbar'), '::before');
    return { w: cs.width, h: cs.height, bg: cs.backgroundColor, content: cs.content };
  });
  console.log('grabber pseudo-element:', JSON.stringify(grab));
  const closers = await p.evaluate(() => {
    const mb = document.querySelector('.sidebar .mockbar');
    return { hasCloseButton: !!mb.querySelector('[aria-label*="lose"], .sheet-x, .mock-x'),
      hasHeading: !!mb.querySelector('h1,h2,h3,[role="heading"]'),
      backdropPresent: getComputedStyle(document.querySelector('.tools-bd')).display !== 'none' };
  });
  console.log('sheet affordances:', JSON.stringify(closers));
  await ctx.close();
}
await b.close();
