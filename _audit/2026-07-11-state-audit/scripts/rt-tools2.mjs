import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-tools';
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

async function fresh(vp, { seed = true } = {}) {
  const b = await chromium.launch();
  const context = await b.newContext({ viewport: { width: vp.width, height: vp.height }, permissions: [] });
  if (seed) await context.addInitScript(() => { try { localStorage.setItem('ddr.v1.__auditseed', '1'); } catch (e) { } });
  const p = await context.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
  await p.addInitScript(() => {
    window.__printed = 0; window.print = function () { window.__printed++; };
    window.__confirmed = []; window.confirm = function (m) { window.__confirmed.push(m); return false; };
    window.__alerted = []; window.alert = function (m) { window.__alerted.push(m); };
  });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  return { b, p, errs };
}
async function openDrawer(p) {
  const fab = await p.evaluate(() => { const f = document.getElementById('toolsfab'); return !!f && getComputedStyle(f).display !== 'none'; });
  if (fab) { await p.click('#toolsfab'); await p.waitForTimeout(400); }
  return fab;
}
const out = [];
const rec = (o) => { out.push(o); console.log(JSON.stringify(o)); };

for (const vp of VIEWPORTS) {
  console.log('\n\n############### ' + vp.name.toUpperCase() + ' ###############');

  /* ---------- 1. NON-MODAL TOOLS: copylink / star / printqa / theme / interrupt ---------- */
  {
    const { b, p, errs } = await fresh(vp);
    await openDrawer(p);

    // COPY LINK
    await p.evaluate(() => { window.__clip = null; if (!navigator.clipboard) navigator.clipboard = {}; navigator.clipboard.writeText = (t) => { window.__clip = t; return Promise.resolve(); }; });
    await p.click('#copylink'); await p.waitForTimeout(500);
    const clip = await p.evaluate(() => ({ clip: window.__clip, toast: [...document.querySelectorAll('body>div,body>span')].map(e => (e.textContent || '').trim()).filter(t => /copied|link/i.test(t)).slice(0, 2), btnText: (document.getElementById('copylink') || {}).textContent }));
    rec({ vp: vp.name, tool: 'copylink', clip: clip.clip, feedback: clip.toast, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-copylink.png` });

    // STAR / BOOKMARK
    await openDrawer(p);
    const starBefore = await p.evaluate(() => document.getElementById('starbtn').getAttribute('aria-pressed'));
    await p.click('#starbtn'); await p.waitForTimeout(400);
    const starAfter = await p.evaluate(() => ({ pressed: document.getElementById('starbtn').getAttribute('aria-pressed'), stored: Object.keys(localStorage).filter(k => k.includes('bookmark') || k.includes('star')) }));
    rec({ vp: vp.name, tool: 'star', before: starBefore, after: starAfter.pressed, persisted: starAfter.stored, toggled: starBefore !== starAfter.pressed, errs: errs.length });

    // THEME
    await openDrawer(p);
    const thBefore = await p.evaluate(() => document.documentElement.dataset.theme || '(none)');
    await p.click('#themetog'); await p.waitForTimeout(400);
    const thAfter = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, pressed: document.getElementById('themetog').getAttribute('aria-pressed'), meta: document.querySelector('meta[name=theme-color]').getAttribute('content'), stored: localStorage.getItem('ddr.v1.theme') }));
    rec({ vp: vp.name, tool: 'theme', before: thBefore, ...thAfter, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-theme-dark.png` });
    await openDrawer(p); await p.click('#themetog'); await p.waitForTimeout(300); // back to light

    // INTERRUPT TOGGLE
    const intB = await p.evaluate(() => document.getElementById('inttog').getAttribute('aria-pressed'));
    await p.click('#inttog'); await p.waitForTimeout(300);
    const intA = await p.evaluate(() => document.getElementById('inttog').getAttribute('aria-pressed'));
    const drawerStillOpen = await p.evaluate(() => document.body.classList.contains('tools-open'));
    rec({ vp: vp.name, tool: 'interrupt-toggle', before: intB, after: intA, toggled: intB !== intA, drawerStaysOpen: drawerStillOpen, errs: errs.length });

    // PRINT Q&A
    await openDrawer(p);
    await p.click('#printqa'); await p.waitForTimeout(800);
    const pq = await p.evaluate(() => ({ printed: window.__printed, bodyCls: document.body.className, printRoot: !!document.querySelector('.pq-root,#printqa-root,[class*=pq-]') }));
    rec({ vp: vp.name, tool: 'printqa', printCalled: pq.printed, bodyClass: pq.bodyCls, printDomInjected: pq.printRoot, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-printqa.png` });
    await b.close();
  }

  /* ---------- 2. '?' KEY -> keyboard overlay (only path on mobile) ---------- */
  {
    const { b, p, errs } = await fresh(vp);
    await p.keyboard.press('?'); await p.waitForTimeout(600);
    const k = await p.evaluate(() => { const el = document.getElementById('keyov'); const cs = getComputedStyle(el); const pr = el.querySelector('.mock-panel').getBoundingClientRect(); return { open: el.classList.contains('open'), display: cs.display, offR: Math.round(pr.right - innerWidth), offB: Math.round(pr.bottom - innerHeight), top: Math.round(pr.top) }; });
    rec({ vp: vp.name, tool: 'keyboard-via-?', ...k, errs: errs.length });
    if (k.open) await p.screenshot({ path: `${SHOTS}/${vp.name}-keyboard-via-questionmark.png` });
    await b.close();
  }

  /* ---------- 3. INDEX overlay internals: cross-drill, export, import, reset, scroll-chaining ---------- */
  {
    const { b, p, errs } = await fresh(vp);
    await p.evaluate(() => window.IndexOverlay.open()); await p.waitForTimeout(600);

    const ixInner = await p.evaluate(() => {
      const el = document.getElementById('_index-overlay');
      const btns = [...el.querySelectorAll('[data-cross],[data-io],.ix-reset,[data-reset],[data-goal],[data-hash]')].map(x => ({ tag: x.tagName, cls: String(x.className).slice(0, 30), attr: x.getAttribute('data-cross') || x.getAttribute('data-io') || x.getAttribute('data-reset') || x.getAttribute('data-goal') || x.getAttribute('data-hash') || 'reset', txt: (x.textContent || '').trim().slice(0, 34) }));
      const scroller = [...el.querySelectorAll('*')].find(n => n.scrollHeight > n.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY));
      return { controls: btns, hasScroller: !!scroller, scrollerCls: scroller ? String(scroller.className).slice(0, 30) : null, sh: scroller ? scroller.scrollHeight : 0, ch: scroller ? scroller.clientHeight : 0 };
    });
    rec({ vp: vp.name, tool: 'index-controls', count: ixInner.controls.length, hasScroller: ixInner.hasScroller, scroller: ixInner.scrollerCls, sh: ixInner.sh, ch: ixInner.ch });
    console.log('   controls:', ixInner.controls.map(c => c.attr + ':"' + c.txt + '"').join(' | '));
    await p.screenshot({ path: `${SHOTS}/${vp.name}-index-open.png`, fullPage: false });

    // ---- SCROLL CHAINING: scroll the index list to its end, then keep wheeling ----
    const chain = await p.evaluate(async () => {
      const el = document.getElementById('_index-overlay');
      const sc = [...el.querySelectorAll('*')].find(n => n.scrollHeight > n.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY));
      if (!sc) return { noScroller: true };
      sc.scrollTop = sc.scrollHeight; // pin to bottom
      const r = sc.getBoundingClientRect();
      return { ok: true, cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), atBottom: sc.scrollTop, sh: sc.scrollHeight, ch: sc.clientHeight, bodyScrollY: window.scrollY, overscroll: getComputedStyle(sc).overscrollBehaviorY };
    });
    if (chain.ok) {
      await p.mouse.move(chain.cx, chain.cy);
      await p.mouse.wheel(0, 600);
      await p.waitForTimeout(300);
      const after = await p.evaluate(() => ({ y: window.scrollY }));
      rec({ vp: vp.name, tool: 'index-scroll-CHAINING', overscrollBehaviorY: chain.overscroll, listAtBottom: true, bodyScrollBefore: chain.bodyScrollY, bodyScrollAfter: after.y, CHAINED: after.y !== chain.bodyScrollY, delta: after.y - chain.bodyScrollY });
      if (after.y !== chain.bodyScrollY) await p.screenshot({ path: `${SHOTS}/${vp.name}-index-SCROLLCHAIN-leak.png` });
      await p.evaluate(() => window.scrollTo(0, 0));
    }

    // ---- EXPORT ----
    const dl = p.waitForEvent('download', { timeout: 4000 }).catch(() => null);
    const hasExport = await p.evaluate(() => !!document.querySelector('[data-io="export"]'));
    if (hasExport) { await p.click('[data-io="export"]'); }
    const d = await dl;
    rec({ vp: vp.name, tool: 'export', triggerPresent: hasExport, downloadFired: !!d, filename: d ? d.suggestedFilename() : null, errs: errs.length });

    // ---- RESET (confirm stubbed to false) ----
    const hasReset = await p.evaluate(() => !!document.querySelector('.ix-reset'));
    if (hasReset) { await p.click('.ix-reset'); await p.waitForTimeout(300); }
    const cfm = await p.evaluate(() => window.__confirmed);
    rec({ vp: vp.name, tool: 'reset', triggerPresent: hasReset, confirmPrompt: cfm, errs: errs.length });

    // ---- IMPORT (should open a file picker => the hidden input gets .click()) ----
    const imp = await p.evaluate(() => {
      const btn = document.querySelector('[data-io="import-btn"]'); const fi = document.querySelector('[data-io="import"]');
      if (!fi) return { noInput: true, btnPresent: !!btn };
      let clicked = false; const orig = fi.click.bind(fi); fi.click = function () { clicked = true; };
      if (btn) btn.click();
      fi.click = orig;
      return { btnPresent: !!btn, fileInputClicked: clicked, inputType: fi.type, accept: fi.accept };
    });
    rec({ vp: vp.name, tool: 'import', ...imp, errs: errs.length });

    // ---- CROSS-DRILL from the index ----
    const crossSel = await p.evaluate(() => { const b2 = document.querySelector('[data-cross]'); return b2 ? { mode: b2.getAttribute('data-cross'), txt: (b2.textContent || '').trim().slice(0, 40) } : null; });
    if (crossSel) {
      await p.click('[data-cross]'); await p.waitForTimeout(700);
      const xd = await p.evaluate(() => {
        const el = document.getElementById('_cross-overlay');
        if (!el) return { created: false };
        const cs = getComputedStyle(el);
        const open = el.classList.contains('open') && cs.display !== 'none' && +cs.opacity > 0.01;
        const pr = el.querySelector('.xd-panel') ? el.querySelector('.xd-panel').getBoundingClientRect() : null;
        return { created: true, open, display: cs.display, bodyOverflow: document.body.style.overflow, offR: pr ? Math.round(pr.right - innerWidth) : null, offB: pr ? Math.round(pr.bottom - innerHeight) : null, activeEl: document.activeElement ? (document.activeElement.id || document.activeElement.className) : null, ixStillOpen: !!(document.getElementById('_index-overlay') && document.getElementById('_index-overlay').classList.contains('open')) };
      });
      rec({ vp: vp.name, tool: 'cross-drill-open', mode: crossSel.mode, label: crossSel.txt, ...xd, errs: errs.length });
      if (xd.open) {
        await p.screenshot({ path: `${SHOTS}/${vp.name}-crossdrill-open.png` });
        // scroll leak while cross-drill open
        const y0 = await p.evaluate(() => window.scrollY);
        await p.mouse.move(vp.width / 2, 15); await p.mouse.wheel(0, 500); await p.waitForTimeout(250);
        const y1 = await p.evaluate(() => window.scrollY);
        // ESC from cross-drill
        await p.keyboard.press('Escape'); await p.waitForTimeout(500);
        const closed = await p.evaluate(() => { const el = document.getElementById('_cross-overlay'); return !el.classList.contains('open'); });
        rec({ vp: vp.name, tool: 'cross-drill-behaviour', scrollLeak: y1 !== y0, leakDelta: y1 - y0, escCloses: closed, errs: errs.length });
      }
    }
    await b.close();
  }

  /* ---------- 4. HOME BUTTON + TOPIC-NAV MENU ---------- */
  {
    const { b, p, errs } = await fresh(vp);
    await p.click('#homeBtn'); await p.waitForTimeout(600);
    const home = await p.evaluate(() => { const el = document.getElementById('_index-overlay'); return { open: !!el && el.classList.contains('open') }; });
    rec({ vp: vp.name, tool: 'homeBtn', opensIndex: home.open, errs: errs.length });
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);

    await p.click('#tntrigger'); await p.waitForTimeout(400);
    const menu = await p.evaluate(() => {
      const m = document.getElementById('tnmenu'); const r = m.getBoundingClientRect(); const cs = getComputedStyle(m);
      return { hidden: m.hidden, expanded: document.getElementById('tntrigger').getAttribute('aria-expanded'), w: Math.round(r.width), h: Math.round(r.height), offR: Math.round(r.right - innerWidth), offB: Math.round(r.bottom - innerHeight), items: m.querySelectorAll('button,[role=menuitem]').length, scrollable: m.scrollHeight > m.clientHeight + 2, overflowY: cs.overflowY, sh: m.scrollHeight, ch: m.clientHeight };
    });
    rec({ vp: vp.name, tool: 'topic-nav-menu', ...menu, errs: errs.length });
    if (!menu.hidden) await p.screenshot({ path: `${SHOTS}/${vp.name}-topicnav-menu.png` });
    // ESC on the topic menu?
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const menuAfterEsc = await p.evaluate(() => document.getElementById('tnmenu').hidden);
    rec({ vp: vp.name, tool: 'topic-nav-menu-esc', closedByEsc: menuAfterEsc, errs: errs.length });
    await b.close();
  }

  /* ---------- 5. DRIVE the mock run + mixed fire + session (do they actually WORK?) ---------- */
  {
    const { b, p, errs } = await fresh(vp);
    await p.click('#mockopen'); await p.waitForTimeout(900);
    const m1 = await p.evaluate(() => {
      const c = document.querySelector('deep-mock-run'); const r = c && c.shadowRoot;
      const body = r && r.getElementById('mockbody');
      return { clock: (document.getElementById('mockclock') || {}).textContent, hasShadow: !!r, bodyLen: body ? body.innerHTML.length : 0, text: body ? body.textContent.trim().slice(0, 90) : null, buttons: body ? [...body.querySelectorAll('button')].map(x => x.id + ':' + x.textContent.trim().slice(0, 18)) : [] };
    });
    rec({ vp: vp.name, tool: 'mock-run-content', ...m1, errs: errs.length });
    await p.waitForTimeout(1400);
    const clock2 = await p.evaluate(() => document.getElementById('mockclock').textContent);
    rec({ vp: vp.name, tool: 'mock-run-clock', tickedFrom: m1.clock, to: clock2, running: clock2 !== '0:00' });
    // advance beats
    for (let i = 0; i < 4; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(220); }
    const m2 = await p.evaluate(() => { const r = document.querySelector('deep-mock-run').shadowRoot; const bdy = r.getElementById('mockbody'); return { text: bdy.textContent.trim().slice(0, 80), scrolled: bdy.scrollTop, sh: bdy.scrollHeight, ch: bdy.clientHeight }; });
    rec({ vp: vp.name, tool: 'mock-run-advance', ...m2, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-mock-advanced.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    // clock stopped after close?
    const clockStopped = await p.evaluate(() => { const before = document.getElementById('mockclock').textContent; return new Promise(res => setTimeout(() => res({ before, after: document.getElementById('mockclock').textContent }), 1300)); });
    rec({ vp: vp.name, tool: 'mock-run-clock-after-close', ...clockStopped, stopped: clockStopped.before === clockStopped.after, errs: errs.length });

    // MIXED FIRE content
    await openDrawer(p);
    await p.click('#mixopen'); await p.waitForTimeout(900);
    const mf = await p.evaluate(() => { const c = document.querySelector('deep-mixed-fire'); const r = c && c.shadowRoot; return { hasShadow: !!r, len: r ? r.innerHTML.length : 0, text: r ? r.textContent.trim().slice(0, 90) : null, buttons: r ? [...r.querySelectorAll('button')].map(x => x.textContent.trim().slice(0, 16)) : [] }; });
    rec({ vp: vp.name, tool: 'mixed-fire-content', ...mf, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-mixed-content.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);

    // SESSION content
    await openDrawer(p);
    await p.click('#sessopen'); await p.waitForTimeout(900);
    const ss = await p.evaluate(() => {
      const c = document.querySelector('deep-session'); const r = c && c.shadowRoot;
      const el = document.getElementById('sessov'); const pr = el.querySelector('.mock-panel').getBoundingClientRect();
      const inner = r ? [...r.querySelectorAll('*')].filter(n => n.scrollHeight > n.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY)) : [];
      return { hasShadow: !!r, len: r ? r.innerHTML.length : 0, text: r ? r.textContent.trim().slice(0, 90) : null, panelH: Math.round(pr.height), panelBottom: Math.round(pr.bottom), innerH: innerHeight, innerScrollers: inner.length, scrollerInfo: inner.map(n => ({ c: String(n.className).slice(0, 20), sh: n.scrollHeight, ch: n.clientHeight })) };
    });
    rec({ vp: vp.name, tool: 'session-content', ...ss, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-session-content.png` });
    await b.close();
  }
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/rt-tools2-results.json', JSON.stringify(out, null, 2));
console.log('\nDONE -> rt-tools2-results.json');
