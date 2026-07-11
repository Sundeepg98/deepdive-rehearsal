import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-tools';
fs.mkdirSync(SHOTS, { recursive: true });
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }];

async function fresh(vp) {
  const b = await chromium.launch();
  const context = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
  await context.addInitScript(() => { try { localStorage.setItem('ddr.v1.__auditseed', '1'); } catch (e) { } });
  const p = await context.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
  await p.addInitScript(() => {
    window.__printed = 0; window.print = () => { window.__printed++; };
    window.__confirmed = []; window.confirm = (m) => { window.__confirmed.push(m); return false; };
  });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  return { b, p, errs };
}
const drawerOpen = (p) => p.evaluate(() => document.body.classList.contains('tools-open'));
const fabShown = (p) => p.evaluate(() => { const f = document.getElementById('toolsfab'); return !!f && getComputedStyle(f).display !== 'none'; });
async function ensureDrawer(p) {
  if (!(await fabShown(p))) return false;          // desktop: bar always visible
  if (await drawerOpen(p)) return true;             // already open
  await p.click('#toolsfab'); await p.waitForTimeout(420);
  return true;
}
const out = [];
const rec = (o) => { out.push(o); console.log(JSON.stringify(o)); };

for (const vp of VIEWPORTS) {
  console.log('\n############### ' + vp.name.toUpperCase() + ' ###############');

  /* ---- A. MOBILE DRAWER MECHANICS (scrim dismiss, FAB coverage, z-order) ---- */
  {
    const { b, p, errs } = await fresh(vp);
    const opened = await ensureDrawer(p);
    if (opened) {
      const geo = await p.evaluate(() => {
        const fab = document.getElementById('toolsfab'), bar = document.querySelector('.mockbar'), bd = document.getElementById('toolsbd');
        const fr = fab.getBoundingClientRect(), br = bar.getBoundingClientRect();
        const cx = Math.round(fr.x + fr.width / 2), cy = Math.round(fr.y + fr.height / 2);
        const hit = document.elementFromPoint(cx, cy);
        return {
          scrimVisible: bd ? getComputedStyle(bd).display !== 'none' : false,
          scrimZ: bd ? getComputedStyle(bd).zIndex : null,
          barZ: getComputedStyle(bar).zIndex,
          fabRect: { y: Math.round(fr.y), h: Math.round(fr.height) },
          barRect: { y: Math.round(br.y), bottom: Math.round(br.bottom) },
          fabCoveredBy: hit ? (hit.id || hit.className || hit.tagName) : null,
          fabClickable: hit === fab,
          barBottomVsViewport: Math.round(br.bottom - innerHeight),
          barScrollable: bar.scrollHeight > bar.clientHeight + 2,
        };
      });
      rec({ vp: vp.name, tool: 'DRAWER-geometry', ...geo, errs: errs.length });
      await p.screenshot({ path: `${SHOTS}/${vp.name}-drawer-open.png` });
      // scrim dismiss
      await p.mouse.click(vp.width / 2, 40); await p.waitForTimeout(400);
      rec({ vp: vp.name, tool: 'DRAWER-scrim-dismiss', closed: !(await drawerOpen(p)), errs: errs.length });
      // ESC dismiss?
      await ensureDrawer(p);
      await p.keyboard.press('Escape'); await p.waitForTimeout(350);
      rec({ vp: vp.name, tool: 'DRAWER-esc-dismiss', closedByEsc: !(await drawerOpen(p)), errs: errs.length });
    } else rec({ vp: vp.name, tool: 'DRAWER-geometry', note: 'no FAB on desktop; mockbar always in sidebar' });
    await b.close();
  }

  /* ---- B. NEWLY-FOUND TOOLS: text zoom / pomodoro / focus mode ---- */
  {
    const { b, p, errs } = await fresh(vp);
    const where = await p.evaluate(() => {
      const q = (s) => { const e = document.querySelector(s); if (!e) return { missing: true }; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { display: cs.display, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), inViewport: r.top >= 0 && r.bottom <= innerHeight && r.height > 0, needsScroll: r.top > innerHeight || r.bottom < 0 }; };
      return { textzoom: q('#textzoom'), pomodoro: q('#pomodoro'), focusBtn: q('#_focus-toggle') };
    });
    rec({ vp: vp.name, tool: 'extra-tools-placement', ...where });

    // TEXT ZOOM
    const tzBefore = await p.evaluate(() => ({ scale: getComputedStyle(document.documentElement).getPropertyValue('--text-scale') || '(unset)', stageFs: getComputedStyle(document.querySelector('.stage')).fontSize }));
    await p.evaluate(() => { const b2 = [...document.querySelectorAll('#textzoom button')]; if (b2[1]) b2[1].click(); if (b2[1]) b2[1].click(); });
    await p.waitForTimeout(300);
    const tzAfter = await p.evaluate(() => ({ scale: getComputedStyle(document.documentElement).getPropertyValue('--text-scale') || '(unset)', stageFs: getComputedStyle(document.querySelector('.stage')).fontSize, stored: localStorage.getItem('ddr.v1.textzoom') || localStorage.getItem('ddr.v1.zoom') || Object.keys(localStorage).filter(k => /zoom|scale|text/i.test(k)).join(',') }));
    rec({ vp: vp.name, tool: 'text-zoom', before: tzBefore, after: tzAfter, changed: tzBefore.stageFs !== tzAfter.stageFs || tzBefore.scale !== tzAfter.scale, errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-textzoom-max.png` });

    // POMODORO
    const pmB = await p.evaluate(() => document.querySelector('.pomodoro-time').textContent);
    await p.evaluate(() => document.querySelector('.pomodoro-play').click());
    await p.waitForTimeout(2200);
    const pmA = await p.evaluate(() => ({ t: document.querySelector('.pomodoro-time').textContent, phase: document.querySelector('.pomodoro-phase').textContent }));
    await p.evaluate(() => document.querySelector('.pomodoro-reset').click());
    await p.waitForTimeout(300);
    const pmR = await p.evaluate(() => document.querySelector('.pomodoro-time').textContent);
    rec({ vp: vp.name, tool: 'pomodoro', start: pmB, after2s: pmA.t, phase: pmA.phase, counting: pmB !== pmA.t, afterReset: pmR, resetWorks: pmR === pmB, errs: errs.length });

    // FOCUS MODE (button + 'f' key)
    await p.evaluate(() => document.getElementById('_focus-toggle').click());
    await p.waitForTimeout(600);
    const fm = await p.evaluate(() => { const app = document.querySelector('.app'); const sb = document.querySelector('.sidebar'); const cp = document.querySelector('.companion'); return { cls: app.className, pressed: document.getElementById('_focus-toggle').getAttribute('aria-pressed'), label: document.getElementById('_focus-toggle').textContent, sidebarW: Math.round(sb.getBoundingClientRect().width), compW: Math.round(cp.getBoundingClientRect().width) }; });
    rec({ vp: vp.name, tool: 'focus-mode', ...fm, engaged: fm.cls.includes('_focus-mode'), errs: errs.length });
    await p.screenshot({ path: `${SHOTS}/${vp.name}-focusmode-on.png` });
    // BUG CHECK: in focus mode the sidebar is hidden -> is the Focus button (inside .hdr in the sidebar) still reachable to EXIT?
    const exitReach = await p.evaluate(() => { const btn = document.getElementById('_focus-toggle'); const r = btn.getBoundingClientRect(); const cs = getComputedStyle(btn); const par = getComputedStyle(document.querySelector('.sidebar')); return { btnW: Math.round(r.width), btnH: Math.round(r.height), btnVisible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden', sidebarVis: par.visibility, sidebarOpacity: par.opacity, sidebarW: par.width }; });
    rec({ vp: vp.name, tool: 'focus-mode-EXIT-reachable', ...exitReach, canClickExitButton: exitReach.btnVisible });
    // 'f' key to exit
    await p.keyboard.press('f'); await p.waitForTimeout(500);
    const fmOff = await p.evaluate(() => document.querySelector('.app').className.includes('_focus-mode'));
    rec({ vp: vp.name, tool: 'focus-mode-f-key-exit', stillFocused: fmOff, exitedViaKey: !fmOff, errs: errs.length });
    await b.close();
  }

  /* ---- C. COPY LINK on a NON-default topic + non-default view (does the link carry the topic?) ---- */
  {
    const { b, p, errs } = await fresh(vp);
    await p.evaluate(() => { window.__clip = null; if (!navigator.clipboard) navigator.clipboard = {}; navigator.clipboard.writeText = (t) => { window.__clip = t; return Promise.resolve(); }; });
    // switch to a different topic + a different view
    const topic = await p.evaluate(() => { const ids = TopicRegistry.all ? TopicRegistry.all().map(t => t.id) : []; const target = ids.find(i => i !== TopicRegistry.current().id); if (target) TopicRegistry.setTopic(target); return { target, cur: TopicRegistry.current().id }; });
    await p.waitForTimeout(400);
    await p.evaluate(() => window.Router.navigate('num'));
    await p.waitForTimeout(400);
    const state = await p.evaluate(() => ({ hash: location.hash, topic: TopicRegistry.current().id, title: TopicRegistry.current().identity.title }));
    await ensureDrawer(p);
    await p.click('#copylink'); await p.waitForTimeout(500);
    const clip = await p.evaluate(() => window.__clip);
    const carriesTopic = !!clip && clip.includes(state.topic);
    const carriesView = !!clip && /num/.test(clip);
    rec({ vp: vp.name, tool: 'copylink-deeplink', switchedTo: state.topic, title: state.title, locationHash: state.hash, copied: clip, carriesTopic, carriesView, errs: errs.length });
    // does the copied link actually restore that topic+view?
    if (clip) {
      const p2 = await p.context().newPage();
      const e2 = []; p2.on('pageerror', e => e2.push(String(e.message)));
      await p2.goto(clip, { waitUntil: 'load' }); await p2.waitForTimeout(900);
      const restored = await p2.evaluate(() => ({ topic: TopicRegistry.current().id, view: [...document.querySelectorAll('.pane')].filter(x => x.classList.contains('on')).map(x => x.id)[0], hash: location.hash }));
      rec({ vp: vp.name, tool: 'copylink-ROUNDTRIP', expectTopic: state.topic, expectView: 'num', gotTopic: restored.topic, gotView: restored.view, topicOK: restored.topic === state.topic, viewOK: restored.view === 'num', errs: e2.length });
      await p2.close();
    }
    await b.close();
  }

  /* ---- D. KEYBOARD-DRIVEN tool entry points: / \ ? g d ---- */
  {
    const { b, p, errs } = await fresh(vp);
    const keyTests = [
      { k: '/', expect: () => !!document.querySelector('#_search-overlay') && getComputedStyle(document.querySelector('#_search-overlay')).display !== 'none', name: 'search' },
      { k: '\\', expect: () => { const e = document.getElementById('_index-overlay'); return !!e && e.classList.contains('open'); }, name: 'index' },
      { k: '?', expect: () => document.getElementById('keyov').classList.contains('open'), name: 'keyboard' },
    ];
    for (const t of keyTests) {
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.keyboard.press(t.k); await p.waitForTimeout(600);
      const ok = await p.evaluate(t.expect);
      rec({ vp: vp.name, tool: 'key-' + t.k + ' -> ' + t.name, opened: ok, errs: errs.length });
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    }
    // 'g' tour
    await p.keyboard.press('g'); await p.waitForTimeout(900);
    const tour = await p.evaluate(() => ({ active: !!(window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()), popover: !!document.querySelector('[class*=tour],[class*=tg-]') }));
    rec({ vp: vp.name, tool: 'key-g -> tour', ...tour, errs: errs.length });
    if (tour.active || tour.popover) await p.screenshot({ path: `${SHOTS}/${vp.name}-tour-guide.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    // 'd' density
    const d0 = await p.evaluate(() => document.documentElement.dataset.density || '(default)');
    await p.keyboard.press('d'); await p.waitForTimeout(300);
    const d1 = await p.evaluate(() => document.documentElement.dataset.density || '(default)');
    rec({ vp: vp.name, tool: 'key-d -> density', before: d0, after: d1, changed: d0 !== d1, errs: errs.length });
    await b.close();
  }

  /* ---- E. DOUBLE-OVERLAY scroll-lock clobber: open a locking overlay, then a non-locking one, close it ---- */
  {
    const { b, p, errs } = await fresh(vp);
    await ensureDrawer(p);
    await p.click('#cramopen'); await p.waitForTimeout(600);              // locks body
    const s1 = await p.evaluate(() => document.body.style.overflow);
    await p.evaluate(() => window.SearchOverlay.open());                   // open search ON TOP (does not lock)
    await p.waitForTimeout(500);
    const s2 = await p.evaluate(() => ({ ov: document.body.style.overflow, bothOpen: document.getElementById('cramov').classList.contains('open') && getComputedStyle(document.getElementById('_search-overlay')).display !== 'none' }));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);         // close search
    const s3 = await p.evaluate(() => ({ ov: document.body.style.overflow, cramStillOpen: document.getElementById('cramov').classList.contains('open'), searchOpen: getComputedStyle(document.getElementById('_search-overlay')).display !== 'none' }));
    // now can the page behind scroll while cram is STILL open?
    const y0 = await p.evaluate(() => window.scrollY);
    await p.mouse.move(vp.width / 2, 8); await p.mouse.wheel(0, 500); await p.waitForTimeout(250);
    const y1 = await p.evaluate(() => window.scrollY);
    rec({ vp: vp.name, tool: 'STACKED-overlay-scrolllock', afterCram: s1, whileSearchOnTop: s2.ov, bothOpen: s2.bothOpen, afterSearchClosed: s3.ov, cramStillOpen: s3.cramStillOpen, leakedAfter: y1 !== y0, leakDelta: y1 - y0, errs: errs.length });
    if (s3.cramStillOpen) await p.screenshot({ path: `${SHOTS}/${vp.name}-stacked-overlay.png` });
    await b.close();
  }
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/rt-tools3-results.json', JSON.stringify(out, null, 2));
console.log('\nDONE');
