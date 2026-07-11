import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-tools';
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

/* Every tool: how to trigger it, and what we expect to appear. */
const TOOLS = [
  { key: 'mock',     label: 'Mock run',           trig: '#mockopen',   ov: '#mockov',  closeBtn: '#mockx',  inBar: false },
  { key: 'index',    label: 'Topic index',        trig: '#idxopen',    ov: '#_index-overlay', closeBtn: '.ix-x', inBar: true },
  { key: 'search',   label: 'Search',             trig: '#searchopen', ov: '#_search-overlay', closeBtn: null, inBar: true },
  { key: 'notes',    label: 'Your notes',         trig: '#notesopen',  ov: '#_notes-overlay', closeBtn: '.nt-x', inBar: true },
  { key: 'cram',     label: 'Cram sheet',         trig: '#cramopen',   ov: '#cramov',  closeBtn: '#cramx',  inBar: true },
  { key: 'session',  label: 'Session progress',   trig: '#sessopen',   ov: '#sessov',  closeBtn: '#sessx',  inBar: true },
  { key: 'mixed',    label: 'Mixed fire',         trig: '#mixopen',    ov: '#mixov',   closeBtn: '#mixx',   inBar: true },
  { key: 'gameplan', label: 'Game plan',          trig: '#planopen',   ov: '#planov',  closeBtn: '#planx',  inBar: true },
  { key: 'scope',    label: 'Scope it first',     trig: '#scopeopen',  ov: '#scopeov', closeBtn: '#scopex', inBar: true },
  { key: 'keyboard', label: 'Keyboard shortcuts', trig: '#keyopen',    ov: '#keyov',   closeBtn: '#keyx',   inBar: true },
];

const OV_SELS = '#mockov,#mixov,#cramov,#sessov,#keyov,#scopeov,#planov,#_index-overlay,#_search-overlay,#_notes-overlay,#_cross-overlay';

/* --- shared page-side probe: what is actually visible/open right now --- */
const probeFn = () => {
  const sels = ['#mockov', '#mixov', '#cramov', '#sessov', '#keyov', '#scopeov', '#planov', '#_index-overlay', '#_search-overlay', '#_notes-overlay', '#_cross-overlay'];
  const shown = [];
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01 && r.width > 0 && r.height > 0;
    if (visible) {
      const panel = el.querySelector('.mock-panel,.cram-panel,.ix-panel,.nt-panel,.xd-panel') || el.firstElementChild;
      const pr = panel ? panel.getBoundingClientRect() : null;
      shown.push({
        sel: s, cls: el.className, opacity: cs.opacity, zIndex: cs.zIndex,
        ovBox: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        panelBox: pr ? { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) } : null,
        panelOverflowsRight: pr ? Math.round(pr.right - window.innerWidth) : null,
        panelOverflowsBottom: pr ? Math.round(pr.bottom - window.innerHeight) : null,
        panelOffTop: pr ? Math.round(pr.top) : null,
        // is the panel's own content scrollable / clipped?
        scrollers: [...el.querySelectorAll('*')].filter(n => n.scrollHeight > n.clientHeight + 2 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY)).map(n => ({ cls: (n.className || '').toString().slice(0, 30), sh: n.scrollHeight, ch: n.clientHeight })),
      });
    }
  }
  const ae = document.activeElement;
  return {
    shown,
    bodyOverflow: document.body.style.overflow,
    htmlOverflow: document.documentElement.style.overflow,
    bodyClass: document.body.className,
    activeEl: ae ? (ae.id ? '#' + ae.id : ae.tagName.toLowerCase() + '.' + String(ae.className || '').split(' ')[0]) : null,
    activeInsideOverlay: !!(ae && shown.length && document.querySelector(shown[0].sel) && document.querySelector(shown[0].sel).contains(ae)),
    scrollY: window.scrollY,
    docScrollable: document.documentElement.scrollHeight > window.innerHeight + 2,
  };
};

const results = [];

for (const vp of VIEWPORTS) {
  for (const tool of TOOLS) {
    const ctx = await chromium.launchPersistentContext('', { viewport: { width: vp.width, height: vp.height }, args: ['--allow-file-access-from-files'] }).catch(() => null);
    // simpler: fresh browser per tool for full isolation
    if (ctx) await ctx.close();
    const b = await chromium.launch();
    const context = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
    // seed a Store key so the boot "auto-open index" gate is OFF -> deterministic topic view
    await context.addInitScript(() => { try { localStorage.setItem('ddr.v1.__auditseed', '1'); } catch (e) { } });
    const p = await context.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
    p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
    // stub print so it never blocks
    await p.addInitScript(() => { window.__printed = 0; window.print = function () { window.__printed++; }; });

    const R = { vp: vp.name, tool: tool.key, label: tool.label, notes: [] };
    try {
      await p.goto(URL, { waitUntil: 'load' });
      await p.waitForTimeout(700);

      const pre = await p.evaluate(probeFn);
      R.bootOverlays = pre.shown.map(s => s.sel);
      R.pageScrollableBehind = pre.docScrollable;

      // --- trigger visibility ---
      const trigInfo = await p.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { exists: false };
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        return { exists: true, display: cs.display, w: Math.round(r.width), h: Math.round(r.height), inViewport: r.top >= 0 && r.bottom <= window.innerHeight };
      }, tool.trig);
      R.trigger = trigInfo;

      // --- open the tools drawer if this tool lives in the mockbar and the FAB is shown (mobile) ---
      const fabVisible = await p.evaluate(() => { const f = document.getElementById('toolsfab'); return !!f && getComputedStyle(f).display !== 'none'; });
      R.fabVisible = fabVisible;
      if (tool.inBar && fabVisible) {
        await p.click('#toolsfab');
        await p.waitForTimeout(450);
        const drawer = await p.evaluate(() => {
          const mb = document.querySelector('.mockbar'); const r = mb.getBoundingClientRect(); const cs = getComputedStyle(mb);
          return { open: document.body.classList.contains('tools-open'), y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), innerH: window.innerHeight, transform: cs.transform, scrollable: mb.scrollHeight > mb.clientHeight + 2, sh: mb.scrollHeight, ch: mb.clientHeight, overflowY: cs.overflowY };
        });
        R.drawer = drawer;
        await p.screenshot({ path: `${SHOTS}/${vp.name}-00-toolsdrawer.png` });
      }

      if (!trigInfo.exists || trigInfo.display === 'none') {
        R.open = 'TRIGGER-NOT-REACHABLE';
        R.errs = errs.slice();
        results.push(R); await b.close(); continue;
      }

      // --- CLICK THE TRIGGER ---
      await p.click(tool.trig, { timeout: 5000 });
      await p.waitForTimeout(600);

      const post = await p.evaluate(probeFn);
      const target = post.shown.find(s => s.sel === tool.ov);
      R.open = !!target;
      R.shownAfterOpen = post.shown.map(s => s.sel);
      if (target) {
        R.panelBox = target.panelBox;
        R.overflowRight = target.panelOverflowsRight;
        R.overflowBottom = target.panelOverflowsBottom;
        R.panelTop = target.panelOffTop;
        R.innerScrollers = target.scrollers.length;
      }
      R.bodyOverflow = post.bodyOverflow;
      R.scrollLocked = post.bodyOverflow === 'hidden';
      R.focusAfterOpen = post.activeEl;
      R.focusInside = await p.evaluate((sel) => { const el = document.querySelector(sel); return !!(el && document.activeElement && el.contains(document.activeElement)); }, tool.ov);

      await p.screenshot({ path: `${SHOTS}/${vp.name}-${tool.key}-open.png` });

      // --- SCROLL-LEAK: can the page behind still scroll? ---
      const leak = await p.evaluate(() => {
        const before = window.scrollY;
        window.scrollBy(0, 400);
        const after = window.scrollY;
        window.scrollTo(0, before);
        return { before, after, leaked: after !== before };
      });
      R.scrollLeakProgrammatic = leak.leaked;
      // real wheel event over the backdrop
      await p.mouse.move(vp.width / 2, 30);
      const wheelLeak = await p.evaluate(() => window.scrollY);
      await p.mouse.wheel(0, 500);
      await p.waitForTimeout(200);
      const wheelAfter = await p.evaluate(() => window.scrollY);
      R.scrollLeakWheel = wheelAfter !== wheelLeak;
      R.wheelDelta = wheelAfter - wheelLeak;
      await p.evaluate((y) => window.scrollTo(0, y), wheelLeak);

      // --- FOCUS TRAP: Tab N times, does focus stay inside? ---
      if (R.open) {
        let escaped = null;
        for (let i = 0; i < 12; i++) {
          await p.keyboard.press('Tab');
          const inside = await p.evaluate((sel) => {
            const el = document.querySelector(sel);
            const ae = document.activeElement;
            return { inside: !!(el && ae && el.contains(ae)), ae: ae ? (ae.id ? '#' + ae.id : ae.tagName.toLowerCase() + '.' + String(ae.className || '').split(' ')[0]) : 'null' };
          }, tool.ov);
          if (!inside.inside) { escaped = { atTab: i + 1, landedOn: inside.ae }; break; }
        }
        R.focusTrapped = escaped === null;
        R.focusEscape = escaped;
      }

      // --- ESC closes? ---
      await p.keyboard.press('Escape');
      await p.waitForTimeout(700);
      const afterEsc = await p.evaluate(probeFn);
      R.escCloses = !afterEsc.shown.some(s => s.sel === tool.ov);
      R.bodyOverflowAfterEsc = afterEsc.bodyOverflow;
      R.scrollLockReleased = afterEsc.bodyOverflow !== 'hidden';
      R.focusAfterEsc = afterEsc.activeEl;
      R.focusRestored = afterEsc.activeEl === tool.trig;
      if (!R.escCloses) await p.screenshot({ path: `${SHOTS}/${vp.name}-${tool.key}-ESC-FAILED.png` });

      // --- reopen: test BACKDROP click + CLOSE button ---
      if (R.escCloses) {
        if (tool.inBar && fabVisible) { await p.click('#toolsfab'); await p.waitForTimeout(400); }
        await p.click(tool.trig, { timeout: 5000 }).catch(() => { });
        await p.waitForTimeout(600);
        const isOpen2 = await p.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && +cs.opacity > 0.01; }, tool.ov);
        if (isOpen2) {
          // backdrop click: top-left corner of the overlay (outside the panel)
          const pb = await p.evaluate((sel) => { const el = document.querySelector(sel); const panel = el.querySelector('.mock-panel,.cram-panel,.ix-panel,.nt-panel,.xd-panel') || el.firstElementChild; const r = panel.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom }; }, tool.ov);
          // click a point inside the overlay but outside the panel
          let bx = 5, by = 5;
          if (pb.top > 30) by = Math.max(4, Math.round(pb.top / 2)), bx = Math.round(vp.width / 2);
          else if (pb.left > 30) bx = Math.round(pb.left / 2), by = Math.round(vp.height / 2);
          R.backdropPoint = { bx, by, panelTop: Math.round(pb.top), panelLeft: Math.round(pb.left) };
          await p.mouse.click(bx, by);
          await p.waitForTimeout(600);
          const afterBd = await p.evaluate(probeFn);
          R.backdropCloses = !afterBd.shown.some(s => s.sel === tool.ov);

          // if still open, use the close button
          if (!R.backdropCloses && tool.closeBtn) {
            await p.click(tool.closeBtn, { timeout: 4000 }).catch(e => { R.closeBtnErr = String(e).slice(0, 80); });
            await p.waitForTimeout(700);
            const afterX = await p.evaluate(probeFn);
            R.closeBtnCloses = !afterX.shown.some(s => s.sel === tool.ov);
            R.bodyOverflowAfterX = afterX.bodyOverflow;
            R.focusAfterX = afterX.activeEl;
          } else if (R.backdropCloses) {
            R.closeBtnCloses = 'n/a (backdrop closed it)';
          }
        } else { R.reopenFailed = true; }
      }

      R.errs = errs.slice();
    } catch (e) {
      R.fatal = String(e).slice(0, 300);
      R.errs = errs.slice();
    }
    results.push(R);
    await b.close();
  }
}

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/rt-tools-results.json', JSON.stringify(results, null, 2));

// ---- print matrix ----
const F = (v) => v === true ? 'PASS' : v === false ? 'FAIL' : String(v);
for (const vp of VIEWPORTS) {
  console.log('\n============================ ' + vp.name.toUpperCase() + ' ============================');
  console.log('tool        | open | render(offR/offB) | esc | backdrop | closeX | scrollLock | leak | trap | focusRestore | errs');
  console.log('-'.repeat(130));
  for (const r of results.filter(x => x.vp === vp.name)) {
    const render = r.open === true ? `${r.overflowRight}/${r.overflowBottom}` : '-';
    console.log(
      r.tool.padEnd(11) + ' | ' + F(r.open).padEnd(4) + ' | ' + String(render).padEnd(17) + ' | ' +
      F(r.escCloses).padEnd(3) + ' | ' + F(r.backdropCloses).padEnd(8) + ' | ' + F(r.closeBtnCloses).padEnd(6) + ' | ' +
      F(r.scrollLocked).padEnd(10) + ' | ' + F(r.scrollLeakWheel).padEnd(4) + ' | ' + F(r.focusTrapped).padEnd(4) + ' | ' +
      F(r.focusRestored).padEnd(12) + ' | ' + (r.errs && r.errs.length ? r.errs.length : 0)
    );
    if (r.errs && r.errs.length) r.errs.slice(0, 3).forEach(e => console.log('      !! ' + e.slice(0, 110)));
    if (r.fatal) console.log('      FATAL: ' + r.fatal);
    if (r.focusEscape) console.log('      focus escaped at Tab#' + r.focusEscape.atTab + ' -> ' + r.focusEscape.landedOn);
    if (r.drawer) console.log('      drawer: y=' + r.drawer.y + ' h=' + r.drawer.h + ' bottom=' + r.drawer.bottom + ' innerH=' + r.drawer.innerH + ' scrollable=' + r.drawer.scrollable + ' (sh=' + r.drawer.sh + ' ch=' + r.drawer.ch + ') overflowY=' + r.drawer.overflowY);
    if (r.open === 'TRIGGER-NOT-REACHABLE') console.log('      trigger: ' + JSON.stringify(r.trigger));
  }
}
console.log('\nJSON -> scripts/rt-tools-results.json');
