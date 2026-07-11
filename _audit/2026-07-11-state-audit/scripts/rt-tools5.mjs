import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-tools';
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }];
async function fresh(vp) {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: vp.width, height: vp.height }, acceptDownloads: true });
  await c.addInitScript(() => { try { localStorage.setItem('ddr.v1.__auditseed', '1'); } catch (e) { } });
  const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.message))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed++; }; window.__confirmed = []; window.confirm = m => { window.__confirmed.push(m); return false; }; });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(700);
  return { b, p, errs };
}
const drawerOpen = p => p.evaluate(() => document.body.classList.contains('tools-open'));
const fabShown = p => p.evaluate(() => { const f = document.getElementById('toolsfab'); return !!f && getComputedStyle(f).display !== 'none'; });
async function ensureDrawer(p) { if (!(await fabShown(p))) return; if (await drawerOpen(p)) return; await p.click('#toolsfab'); await p.waitForTimeout(420); }
const out = []; const rec = o => { out.push(o); console.log(JSON.stringify(o)); };

for (const vp of VIEWPORTS) {
  console.log('\n########## ' + vp.name.toUpperCase() + ' ##########');

  /* --- INDEX overlay internals: controls, export, reset, import, cross-drill, scroll-chaining --- */
  {
    const { b, p, errs } = await fresh(vp);
    await p.evaluate(() => window.IndexOverlay.open()); await p.waitForTimeout(700);
    const ctrls = await p.evaluate(() => {
      const el = document.getElementById('_index-overlay');
      return [...el.querySelectorAll('[data-cross],[data-io],.ix-reset,[data-hash]')].map(x => ({ key: x.getAttribute('data-cross') || x.getAttribute('data-io') || x.getAttribute('data-hash') || (x.classList.contains('ix-reset') ? 'RESET' : '?'), txt: (x.textContent || '').trim().slice(0, 30) }));
    });
    rec({ vp: vp.name, tool: 'index-controls', n: ctrls.length, ctrls });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-index-home.png` });

    // scroll chaining: pin the index list to its bottom, keep wheeling
    const ch = await p.evaluate(() => {
      const el = document.getElementById('_index-overlay');
      const sc = [...el.querySelectorAll('*')].find(n => n.scrollHeight > n.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY));
      if (!sc) return { none: true };
      sc.scrollTop = sc.scrollHeight;
      const r = sc.getBoundingClientRect();
      return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), overscrollY: getComputedStyle(sc).overscrollBehaviorY, y0: window.scrollY, cls: String(sc.className).slice(0, 20) };
    });
    if (!ch.none) {
      await p.mouse.move(ch.cx, ch.cy); await p.mouse.wheel(0, 700); await p.waitForTimeout(350);
      const y1 = await p.evaluate(() => window.scrollY);
      rec({ vp: vp.name, tool: 'INDEX-scroll-chaining', scroller: ch.cls, overscrollBehaviorY: ch.overscrollY, bodyBefore: ch.y0, bodyAfter: y1, CHAINS_TO_PAGE: y1 !== ch.y0, delta: y1 - ch.y0 });
      if (y1 !== ch.y0) await p.screenshot({ path: `${SHOTS}/${vp.name}-index-scrollchain-LEAK.png` });
      await p.evaluate(() => window.scrollTo(0, 0));
    }

    // export
    const dlP = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    const hasExp = await p.evaluate(() => !!document.querySelector('[data-io="export"]'));
    if (hasExp) await p.click('[data-io="export"]');
    const dl = await dlP;
    rec({ vp: vp.name, tool: 'export', present: hasExp, downloadFired: !!dl, filename: dl ? dl.suggestedFilename() : null, errs: errs.length });

    // import (hidden file input .click())
    const imp = await p.evaluate(() => {
      const btn = document.querySelector('[data-io="import-btn"]'), fi = document.querySelector('[data-io="import"]');
      if (!fi) return { fileInput: false, btn: !!btn };
      let clicked = false; const o = fi.click.bind(fi); fi.click = () => { clicked = true; };
      if (btn) btn.click(); fi.click = o;
      return { btn: !!btn, fileInput: true, opensPicker: clicked, accept: fi.accept || '(none)' };
    });
    rec({ vp: vp.name, tool: 'import', ...imp, errs: errs.length });

    // reset (confirm stubbed -> false, so nothing should be wiped)
    const keysBefore = await p.evaluate(() => Object.keys(localStorage).length);
    const hasReset = await p.evaluate(() => !!document.querySelector('.ix-reset'));
    if (hasReset) { await p.click('.ix-reset'); await p.waitForTimeout(350); }
    const rst = await p.evaluate(() => ({ prompts: window.__confirmed, keys: Object.keys(localStorage).length }));
    rec({ vp: vp.name, tool: 'reset', present: hasReset, confirmPrompt: rst.prompts, keysBefore, keysAfter: rst.keys, guarded: rst.keys === keysBefore, errs: errs.length });

    // CROSS-DRILL — every data-cross mode, incl. the "weak" one on a FRESH profile
    const modes = await p.evaluate(() => [...document.querySelectorAll('[data-cross]')].map(x => ({ m: x.getAttribute('data-cross'), t: (x.textContent || '').trim().slice(0, 30) })));
    rec({ vp: vp.name, tool: 'cross-drill-modes', modes });
    for (const md of modes) {
      await p.evaluate(() => { if (!document.getElementById('_index-overlay').classList.contains('open')) window.IndexOverlay.open(); }); await p.waitForTimeout(400);
      await p.evaluate((m) => { const el = document.querySelector('[data-cross="' + m + '"]'); if (el) el.click(); }, md.m);
      await p.waitForTimeout(700);
      const xd = await p.evaluate(() => {
        const el = document.getElementById('_cross-overlay');
        if (!el) return { created: false, opened: false };
        const cs = getComputedStyle(el);
        const opened = el.classList.contains('open') && cs.display !== 'none' && +cs.opacity > 0.01;
        const pr = el.querySelector('.xd-panel') ? el.querySelector('.xd-panel').getBoundingClientRect() : null;
        return { created: true, opened, bodyOverflow: document.body.style.overflow, offR: pr ? Math.round(pr.right - innerWidth) : null, offB: pr ? Math.round(pr.bottom - innerHeight) : null, indexStillOpen: document.getElementById('_index-overlay').classList.contains('open'), focus: document.activeElement ? (document.activeElement.id || String(document.activeElement.className)) : null };
      });
      rec({ vp: vp.name, tool: 'cross-drill[' + md.m + ']', label: md.t, ...xd, SILENT_NOOP: xd.created && !xd.opened, errs: errs.length });
      if (xd.opened) {
        await p.screenshot({ path: `${SHOTS}/${vp.name}-crossdrill-${md.m.replace(/[^a-z0-9]/gi, '_')}.png` });
        const y0 = await p.evaluate(() => window.scrollY);
        await p.mouse.move(vp.width / 2, 12); await p.mouse.wheel(0, 500); await p.waitForTimeout(250);
        const y1 = await p.evaluate(() => window.scrollY);
        await p.keyboard.press('Escape'); await p.waitForTimeout(500);
        const closed = await p.evaluate(() => !document.getElementById('_cross-overlay').classList.contains('open'));
        rec({ vp: vp.name, tool: 'cross-drill[' + md.m + ']-behaviour', scrollLeak: y1 !== y0, leakDelta: y1 - y0, escCloses: closed });
      } else if (xd.created) {
        await p.screenshot({ path: `${SHOTS}/${vp.name}-crossdrill-${md.m.replace(/[^a-z0-9]/gi, '_')}-SILENT-NOOP.png` });
        await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      }
    }
    await b.close();
  }

  /* --- print Q&A, topic-nav menu, interrupt toggle, mixed/session content --- */
  {
    const { b, p, errs } = await fresh(vp);
    await ensureDrawer(p);
    await p.click('#printqa'); await p.waitForTimeout(900);
    const pq = await p.evaluate(() => ({ printed: window.__printed, bodyCls: document.body.className, injected: !!document.querySelector('[class*=pq],#printroot,.print-qa') }));
    rec({ vp: vp.name, tool: 'print-qa', printCalled: pq.printed, bodyClass: pq.bodyCls, errs: errs.length });

    // interrupt toggle: lives in .mockcta (NOT .mockbar) -> the open drawer COVERS it on mobile
    await ensureDrawer(p);
    const covered = await p.evaluate(() => {
      const t = document.getElementById('inttog'); const r = t.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
      return { inMockbar: !!document.querySelector('.mockbar').contains(t), coveredWhileDrawerOpen: hit !== t && !t.contains(hit), coveredBy: hit ? (hit.id || String(hit.className).slice(0, 20)) : null, drawerOpen: document.body.classList.contains('tools-open') };
    });
    rec({ vp: vp.name, tool: 'interrupt-toggle-drawer-occlusion', ...covered });
    // close the drawer, then toggle for real
    await p.evaluate(() => document.body.classList.remove('tools-open')); await p.waitForTimeout(350);
    const i0 = await p.evaluate(() => document.getElementById('inttog').getAttribute('aria-pressed'));
    await p.click('#inttog'); await p.waitForTimeout(300);
    const i1 = await p.evaluate(() => ({ pressed: document.getElementById('inttog').getAttribute('aria-pressed'), drawerOpen: document.body.classList.contains('tools-open'), label: document.getElementById('inttog').textContent.trim().slice(0, 40) }));
    rec({ vp: vp.name, tool: 'interrupt-toggle', before: i0, after: i1.pressed, toggled: i0 !== i1.pressed, label: i1.label, errs: errs.length });

    // topic-nav dropdown
    await p.evaluate(() => { document.body.classList.remove('tools-open'); });
    await p.click('#tntrigger'); await p.waitForTimeout(400);
    const tn = await p.evaluate(() => { const m = document.getElementById('tnmenu'); const r = m.getBoundingClientRect(); const cs = getComputedStyle(m); return { hidden: m.hidden, expanded: document.getElementById('tntrigger').getAttribute('aria-expanded'), w: Math.round(r.width), h: Math.round(r.height), offR: Math.round(r.right - innerWidth), offB: Math.round(r.bottom - innerHeight), items: m.querySelectorAll('button').length, scrollable: m.scrollHeight > m.clientHeight + 2, overflowY: cs.overflowY }; });
    rec({ vp: vp.name, tool: 'topic-nav-menu', ...tn, errs: errs.length });
    if (!tn.hidden) await p.screenshot({ path: `${SHOTS}/${vp.name}-topicnav-menu.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    rec({ vp: vp.name, tool: 'topic-nav-menu-esc', closedByEsc: await p.evaluate(() => document.getElementById('tnmenu').hidden) });

    // mixed fire + session render
    await ensureDrawer(p); await p.click('#mixopen'); await p.waitForTimeout(900);
    const mf = await p.evaluate(() => { const r = document.querySelector('deep-mixed-fire').shadowRoot; const txt = [...r.querySelectorAll('*')].map(n => n.tagName === 'STYLE' ? '' : '').join(''); const visible = r.textContent.replace(/\.[a-z-]+\{[^}]*\}/g, '').trim(); return { probeText: visible.slice(0, 70), buttons: [...r.querySelectorAll('button')].map(x => x.textContent.trim().slice(0, 20)) }; });
    rec({ vp: vp.name, tool: 'mixed-fire-render', ...mf, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-mixedfire.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);

    await ensureDrawer(p); await p.click('#sessopen'); await p.waitForTimeout(900);
    const ss = await p.evaluate(() => { const r = document.querySelector('deep-session').shadowRoot; const el = document.getElementById('sessov'); const pr = el.querySelector('.mock-panel').getBoundingClientRect(); const sc = [...r.querySelectorAll('*')].filter(n => n.scrollHeight > n.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY)); return { text: r.textContent.replace(/\.[a-z-]+\{[^}]*\}/g, '').trim().slice(0, 70), panelBottom: Math.round(pr.bottom), innerH: innerHeight, offB: Math.round(pr.bottom - innerHeight), innerScrollers: sc.length, buttons: [...r.querySelectorAll('button')].length }; });
    rec({ vp: vp.name, tool: 'session-render', ...ss, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-session.png` });
    await b.close();
  }
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/rt-tools5-results.json', JSON.stringify(out, null, 2));
console.log('\nDONE');
