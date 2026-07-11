import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-tools';
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }];
async function fresh(vp) {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.name === 'mobile', isMobile: vp.name === 'mobile' });
  await c.addInitScript(() => { try { localStorage.setItem('ddr.v1.__auditseed', '1'); } catch (e) { } });
  const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.message))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(700);
  return { b, p, errs };
}
const out = []; const rec = o => { out.push(o); console.log(JSON.stringify(o)); };

for (const vp of VIEWPORTS) {
  console.log('\n########## ' + vp.name.toUpperCase() + ' ##########');

  /* === 1. TEXT ZOOM, measured correctly (--read-zoom on .stage -> zoom on .pane) === */
  {
    const { b, p, errs } = await fresh(vp);
    const before = await p.evaluate(() => { const st = document.querySelector('.stage'); const pane = document.querySelector('.stage .pane.on'); return { readZoom: st.style.getPropertyValue('--read-zoom') || '(unset)', paneZoom: getComputedStyle(pane).zoom, paneW: Math.round(pane.getBoundingClientRect().width), tzVisible: getComputedStyle(document.getElementById('textzoom')).display !== 'none' }; });
    // click A+ twice via real clicks if visible, else JS
    const vis = before.tzVisible;
    if (vis) { const btns = await p.$$('#textzoom button'); await btns[1].click(); await p.waitForTimeout(200); await btns[1].click(); }
    else { await p.evaluate(() => { const bs = [...document.querySelectorAll('#textzoom button')]; bs[1].click(); bs[1].click(); }); }
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => { const st = document.querySelector('.stage'); const pane = document.querySelector('.stage .pane.on'); return { readZoom: st.style.getPropertyValue('--read-zoom') || '(unset)', paneZoom: getComputedStyle(pane).zoom, paneW: Math.round(pane.getBoundingClientRect().width), stored: localStorage.getItem('ddr.v1.ui.textzoom') }; });
    rec({ vp: vp.name, tool: 'TEXT-ZOOM(correct probe)', controlVisible: vis, before, after, zoomApplied: before.paneZoom !== after.paneZoom, errs: errs.length });
    if (vis) await p.screenshot({ path: `${SHOTS}/${vp.name}-textzoom-116.png` });
    await b.close();
  }

  /* === 2. FOCUS MODE: is it an inescapable trap without a keyboard? === */
  {
    const { b, p, errs } = await fresh(vp);
    await p.screenshot({ path: `${SHOTS}/${vp.name}-focusmode-BEFORE.png` });
    // click the real Focus button the way a user would
    await p.click('#_focus-toggle'); await p.waitForTimeout(900);
    await p.screenshot({ path: `${SHOTS}/${vp.name}-focusmode-AFTER-trapped.png` });

    const survey = await p.evaluate(() => {
      // every element a user could actually TAP: visible, in-viewport, hit-testable
      const all = [...document.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"]),summary')];
      const tappable = all.filter(el => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (r.width < 2 || r.height < 2) return false;
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return false;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
        const hit = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
        return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
      }).map(el => ({ tag: el.tagName.toLowerCase(), id: el.id || null, cls: String(el.className || '').slice(0, 28), txt: (el.textContent || '').trim().slice(0, 26) }));
      const fb = document.getElementById('_focus-toggle');
      const fr = fb.getBoundingClientRect();
      const hitAtFocusBtn = document.elementFromPoint(Math.round(fr.x + fr.width / 2), Math.round(fr.y + fr.height / 2));
      return {
        focusModeOn: document.querySelector('.app').classList.contains('_focus-mode'),
        focusBtnVisibility: getComputedStyle(fb).visibility,
        focusBtnHitTest: hitAtFocusBtn ? (hitAtFocusBtn.id || hitAtFocusBtn.className || hitAtFocusBtn.tagName) : 'nothing',
        focusBtnClickable: hitAtFocusBtn === fb,
        segTabsVisible: getComputedStyle(document.querySelector('.seg')).visibility,
        toolsFabVisible: getComputedStyle(document.getElementById('toolsfab')).visibility,
        mockctaVisible: getComputedStyle(document.querySelector('.mockcta')).visibility,
        topicNavVisible: getComputedStyle(document.getElementById('topicnav')).visibility,
        persisted: Object.keys(localStorage).filter(k => /focus/i.test(k)),
        tappableCount: tappable.length,
        tappable,
      };
    });
    rec({ vp: vp.name, tool: 'FOCUS-MODE-TRAP', ...survey });

    // Try to click the Focus button again (as a user with no keyboard would)
    let clickErr = null;
    try { await p.click('#_focus-toggle', { timeout: 3500 }); } catch (e) { clickErr = String(e).split('\n')[0].slice(0, 90); }
    await p.waitForTimeout(400);
    const stillOn = await p.evaluate(() => document.querySelector('.app').classList.contains('_focus-mode'));
    rec({ vp: vp.name, tool: 'FOCUS-MODE-exit-by-click', clickError: clickErr, stillTrapped: stillOn });

    // Escape key?
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const afterEsc = await p.evaluate(() => document.querySelector('.app').classList.contains('_focus-mode'));
    // does a reload escape?
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(700);
    const afterReload = await p.evaluate(() => document.querySelector('.app').classList.contains('_focus-mode'));
    rec({ vp: vp.name, tool: 'FOCUS-MODE-escape-routes', escapeKeyExits: !afterEsc, reloadExits: !afterReload, onlyExit: 'f key (desktop kbd) or reload' });
    await b.close();
  }

  /* === 3. ONE ESC closes TWO stacked overlays === */
  {
    const { b, p, errs } = await fresh(vp);
    await p.evaluate(() => { document.getElementById('cramopen').click(); }); await p.waitForTimeout(700);
    const a = await p.evaluate(() => ({ cram: document.getElementById('cramov').classList.contains('open') }));
    await p.evaluate(() => window.SearchOverlay.open()); await p.waitForTimeout(600);
    const bth = await p.evaluate(() => ({ cram: document.getElementById('cramov').classList.contains('open'), search: getComputedStyle(document.getElementById('_search-overlay')).display !== 'none', bodyOv: document.body.style.overflow }));
    await p.screenshot({ path: `${SHOTS}/${vp.name}-stacked-search-over-cram.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    const afterOneEsc = await p.evaluate(() => ({ cram: document.getElementById('cramov').classList.contains('open'), search: getComputedStyle(document.getElementById('_search-overlay')).display !== 'none', bodyOv: document.body.style.overflow }));
    rec({ vp: vp.name, tool: 'ESC-double-close', cramOpen: a.cram, whenBothOpen: bth, afterSingleEsc: afterOneEsc, BOTH_CLOSED_BY_ONE_ESC: !afterOneEsc.cram && !afterOneEsc.search, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-stacked-after-one-esc.png` });
    await b.close();
  }

  /* === 4. SEARCH overlay: is it a proper dialog? + mobile usability === */
  {
    const { b, p, errs } = await fresh(vp);
    await p.evaluate(() => window.SearchOverlay.open()); await p.waitForTimeout(600);
    await p.keyboard.type('cache');
    await p.waitForTimeout(600);
    const s = await p.evaluate(() => {
      const el = document.getElementById('_search-overlay');
      const box = el.firstElementChild; const r = box.getBoundingClientRect();
      const res = el.querySelector('div[style*="max-height"]');
      return {
        role: el.getAttribute('role'), ariaModal: el.getAttribute('aria-modal'), ariaLabel: el.getAttribute('aria-label'),
        boxW: Math.round(r.width), boxTop: Math.round(r.top), boxBottom: Math.round(r.bottom), innerH: innerHeight,
        offB: Math.round(r.bottom - innerHeight),
        resultCount: res ? res.children.length : 0,
        resultsScrollable: res ? res.scrollHeight > res.clientHeight + 2 : false,
        bodyOverflow: document.body.style.overflow,
        inputFocused: document.activeElement === el.querySelector('input'),
      };
    });
    rec({ vp: vp.name, tool: 'SEARCH-overlay', ...s, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-search-results.png` });
    await b.close();
  }

  /* === 5. NOTES overlay: typing + persistence + mobile keyboard === */
  {
    const { b, p, errs } = await fresh(vp);
    await p.evaluate(() => document.getElementById('notesopen').click()); await p.waitForTimeout(700);
    const n0 = await p.evaluate(() => { const el = document.getElementById('_notes-overlay'); const pr = el.querySelector('.nt-panel').getBoundingClientRect(); return { open: el.classList.contains('open'), taFocused: document.activeElement && document.activeElement.tagName === 'TEXTAREA', offB: Math.round(pr.bottom - innerHeight), h: Math.round(pr.height) }; });
    await p.keyboard.type('audit note xyz');
    await p.waitForTimeout(700);
    const n1 = await p.evaluate(() => ({ stored: Object.keys(localStorage).filter(k => k.includes('notes')), val: Object.entries(localStorage).filter(([k]) => k.includes('notes')).map(([, v]) => v)[0], dot: document.getElementById('notesopen').classList.contains('has-notes') }));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    const n2 = await p.evaluate(() => ({ closed: !document.getElementById('_notes-overlay').classList.contains('open'), dot: document.getElementById('notesopen').classList.contains('has-notes') }));
    rec({ vp: vp.name, tool: 'NOTES-overlay', ...n0, ...n1, ...n2, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-notes-typed.png` });
    await b.close();
  }

  /* === 6. TOUR GUIDE ('g') rendering === */
  {
    const { b, p, errs } = await fresh(vp);
    await p.keyboard.press('g'); await p.waitForTimeout(1000);
    const t = await p.evaluate(() => {
      const cands = [...document.querySelectorAll('body > div')].filter(d => { const cs = getComputedStyle(d); const r = d.getBoundingClientRect(); return cs.position === 'fixed' && r.width > 40 && r.height > 20 && cs.display !== 'none' && +cs.opacity > 0.05; });
      return { active: window.TourGuide.isActive(), fixedLayers: cands.map(d => ({ id: d.id, cls: String(d.className).slice(0, 24), w: Math.round(d.getBoundingClientRect().width), h: Math.round(d.getBoundingClientRect().height), offR: Math.round(d.getBoundingClientRect().right - innerWidth), offB: Math.round(d.getBoundingClientRect().bottom - innerHeight), txt: (d.textContent || '').trim().slice(0, 40) })) };
    });
    rec({ vp: vp.name, tool: 'TOUR-GUIDE', ...t, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-tour.png` });
    await b.close();
  }
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/rt-tools4-results.json', JSON.stringify(out, null, 2));
console.log('\nDONE');
