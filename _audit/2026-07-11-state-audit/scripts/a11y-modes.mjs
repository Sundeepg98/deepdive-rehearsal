/* a11y-modes.mjs -- focus-indicator delta, REAL-keyboard overlay focus restore,
   scrollable regions inside overlays, reduced-motion / forced-colors / prefers-contrast,
   axe INCOMPLETE results, live regions for dynamic content. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const SHOTS = path.join(OUT, 'shots', 'a11y');
fs.mkdirSync(SHOTS, { recursive: true });
const AXE = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');

const b = await chromium.launch();
const boot = async (p) => {
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1300);
  await p.evaluate(() => window.IndexOverlay.close());
  await p.waitForTimeout(600);
};

/* ================= A. FOCUS INDICATOR DELTA ================= */
console.log('======== A. FOCUS INDICATOR: focused-vs-unfocused computed delta ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  const snap = (sel) => p.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const c = getComputedStyle(el);
    return { outline: `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor}`, boxShadow: c.boxShadow, border: c.borderColor, bg: c.backgroundColor };
  }, sel);

  const CHECK = ['#homeBtn', '#mockopen', '#cramopen', '#themetog', '.seg button[data-tab="drill"]', '.cmp-fold', '#scrolltop'];
  const rows = [];
  for (const sel of CHECK) {
    const before = await snap(sel);
    if (!before) { console.log(`  (missing ${sel})`); continue; }
    await p.focus(sel);
    await p.waitForTimeout(120);
    const after = await snap(sel);
    const outlineChanged = before.outline !== after.outline;
    const shadowChanged = before.boxShadow !== after.boxShadow;
    // an outline only actually PAINTS if style != none and width > 0
    const outlinePaints = !/ none /.test(after.outline) && !after.outline.startsWith('0px');
    const visible = outlinePaints || shadowChanged;
    rows.push({ sel, visible, outlinePaints, outlineAfter: after.outline, shadowChanged });
    console.log(`  ${visible ? 'OK  ' : 'FAIL'} ${sel.padEnd(30)} outline(focused)="${after.outline}" outlinePaints=${outlinePaints} shadowDelta=${shadowChanged}`);
    await p.evaluate(() => document.activeElement.blur());
  }
  // screenshot a focused control for evidence
  await p.focus('#cramopen');
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(SHOTS, '30-focus-ring-cramopen.png'), clip: { x: 0, y: 300, width: 320, height: 400 } });
  await p.close();
}

/* ================= B. REAL-KEYBOARD overlay open + focus restore ================= */
console.log('\n======== B. REAL keyboard/mouse: focus capture + restore on overlay close ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  const OV = [['cram-sheet', '#cramopen', '#cramov'], ['session', '#sessopen', '#sessov'], ['keyboard', '#keyopen', '#keyov'], ['mock-run', '#mockopen', '#mockov']];
  for (const [name, trig, ov] of OV) {
    // REAL keyboard activation: focus the trigger, press Enter
    await p.focus(trig);
    const focusedBefore = await p.evaluate(() => document.activeElement.id);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
    const openOK = await p.evaluate(s => document.querySelector(s).classList.contains('open'), ov);
    const inside = await p.evaluate(s => document.querySelector(s).contains(document.activeElement), ov);
    await p.keyboard.press('Escape');
    for (let i = 0; i < 20; i++) { await p.waitForTimeout(100); if (await p.evaluate(s => !document.querySelector(s).classList.contains('open'), ov)) break; }
    await p.waitForTimeout(200);
    const restoredTo = await p.evaluate(() => document.activeElement.id || document.activeElement.tagName);
    const ok = restoredTo === trig.slice(1);
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(12)} ENTER-opens=${openOK} focusIntoOverlay=${inside} triggerBefore=${focusedBefore} -> focusAfterClose=${restoredTo} ${ok ? '(restored)' : '(NOT restored)'}`);
  }
  // Also: real MOUSE click
  console.log('  -- real mouse click path --');
  await p.click('#cramopen');
  await p.waitForTimeout(700);
  await p.keyboard.press('Escape');
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(100); if (await p.evaluate(() => !document.getElementById('cramov').classList.contains('open'))) break; }
  await p.waitForTimeout(200);
  const afterMouse = await p.evaluate(() => document.activeElement.id || document.activeElement.tagName);
  console.log(`  mouse-open cram -> Esc -> focus lands on: ${afterMouse} ${afterMouse === 'cramopen' ? '(restored OK)' : '(NOT restored)'}`);
  await p.close();
}

/* ================= C. SCROLLABLE REGIONS INSIDE EVERY OVERLAY ================= */
console.log('\n======== C. Keyboard-scrollable regions with each overlay OPEN ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 700 } });
  await boot(p);
  const scan = () => p.evaluate(() => {
    const out = [];
    const walk = (root) => {
      root.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        const scrolls = ['auto', 'scroll'].includes(cs.overflowY) || ['auto', 'scroll'].includes(cs.overflowX);
        if (scrolls) {
          const canScrollY = el.scrollHeight > el.clientHeight + 2;
          const canScrollX = el.scrollWidth > el.clientWidth + 2;
          if ((canScrollY || canScrollX) && (el.offsetParent !== null || el === document.body)) {
            const tag = el.tagName.toLowerCase();
            const selfFocusable = el.tabIndex >= 0 || ['input', 'textarea', 'select', 'button', 'a'].includes(tag);
            // does it contain any natively focusable descendant (incl. shadow)? if so, tabbing scrolls it
            const inner = el.querySelectorAll('button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])').length;
            out.push({
              sel: tag + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''),
              tabIndex: el.tabIndex, selfFocusable, innerFocusables: inner,
              role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
              overflowPx: Math.max(el.scrollHeight - el.clientHeight, el.scrollWidth - el.clientWidth),
            });
          }
        }
        if (el.shadowRoot) walk(el.shadowRoot);
      });
    };
    walk(document);
    return out;
  });

  const OV = [['cram-sheet', '#cramopen'], ['session', '#sessopen'], ['keyboard', '#keyopen'], ['scope', '#scopeopen'], ['gameplan', '#planopen'], ['mock-run', '#mockopen'], ['mixed-fire', '#mixopen']];
  const bad = [];
  for (const [name, trig] of OV) {
    await p.click(trig);
    await p.waitForTimeout(800);
    const s = await scan();
    for (const r of s) {
      const reachable = r.selfFocusable || r.innerFocusables > 0;
      if (!reachable) bad.push({ overlay: name, ...r });
      console.log(`  [${name.padEnd(11)}] ${reachable ? 'OK  ' : 'FAIL'} ${r.sel.padEnd(26)} tabIndex=${String(r.tabIndex).padEnd(3)} role=${String(r.role).padEnd(6)} innerFocusables=${String(r.innerFocusables).padEnd(3)} overflow=${r.overflowPx}px`);
    }
    await p.keyboard.press('Escape');
    await p.waitForTimeout(700);
  }
  console.log(`  ==> UNREACHABLE-by-keyboard scrollable regions: ${bad.length}`);
  bad.forEach(x => console.log('     !! ' + JSON.stringify(x)));
  await p.close();
}

/* ================= D. prefers-reduced-motion ================= */
console.log('\n======== D. prefers-reduced-motion ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await boot(p);
  const rm = await p.evaluate(() => {
    const matches = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const samples = [];
    const sels = ['.pane.on', '.seg button', '.stage-head', '#scrolltop', '.cmp-inner', 'html', 'body', '.mock-panel', '.crambtn'];
    sels.forEach(s => {
      const el = document.querySelector(s);
      if (!el) return;
      const c = getComputedStyle(el);
      samples.push({ sel: s, animationDuration: c.animationDuration, transitionDuration: c.transitionDuration, animationName: c.animationName, scrollBehavior: c.scrollBehavior });
    });
    return { matches, samples };
  });
  console.log('  matchMedia(prefers-reduced-motion:reduce) =', rm.matches);
  rm.samples.forEach(s => {
    const anim = parseFloat(s.animationDuration) || 0;
    const tr = parseFloat(s.transitionDuration) || 0;
    const stilled = anim <= 0.001 && tr <= 0.001;
    console.log(`  ${stilled ? 'OK  ' : 'MOVES'} ${s.sel.padEnd(14)} anim=${s.animationDuration}/${s.animationName} trans=${s.transitionDuration} scroll-behavior=${s.scrollBehavior}`);
  });
  // does the CSS actually contain a reduced-motion block?
  const cssHas = await p.evaluate(() => {
    let n = 0, rules = [];
    for (const sh of document.styleSheets) {
      try {
        const walk = (list) => { for (const r of list) { if (r.cssRules) { if (/prefers-reduced-motion/.test(r.conditionText || r.media?.mediaText || '')) { n++; rules.push((r.conditionText || r.media.mediaText) + ' {' + r.cssRules.length + ' rules}'); } walk(r.cssRules); } } };
        walk(sh.cssRules);
      } catch (e) {}
    }
    return { n, rules: rules.slice(0, 5) };
  });
  console.log(`  CSS @media prefers-reduced-motion blocks: ${cssHas.n} -> ${JSON.stringify(cssHas.rules)}`);
  await p.screenshot({ path: path.join(SHOTS, '40-reduced-motion.png') });
  await p.close();
}

/* ================= E. forced-colors ================= */
console.log('\n======== E. forced-colors (Windows High Contrast) ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, forcedColors: 'active' });
  await boot(p);
  const fc = await p.evaluate(() => {
    const matches = matchMedia('(forced-colors: active)').matches;
    let n = 0; const rules = [];
    for (const sh of document.styleSheets) {
      try {
        const walk = (list) => { for (const r of list) { if (r.cssRules) { const cond = r.conditionText || (r.media && r.media.mediaText) || ''; if (/forced-colors/.test(cond)) { n++; rules.push(cond); } walk(r.cssRules); } } };
        walk(sh.cssRules);
      } catch (e) {}
    }
    // are interactive controls still visually bounded?
    const probe = ['#mockopen', '#cramopen', '.seg button.on', '.seg button:not(.on)', '#homeBtn'].map(s => {
      const el = document.querySelector(s);
      if (!el) return null;
      const c = getComputedStyle(el);
      return { sel: s, border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor, bg: c.backgroundColor, color: c.color, outline: c.outlineWidth + ' ' + c.outlineStyle };
    }).filter(Boolean);
    return { matches, n, rules: [...new Set(rules)].slice(0, 6), probe };
  });
  console.log('  matchMedia(forced-colors:active) =', fc.matches);
  console.log(`  CSS @media forced-colors blocks: ${fc.n} -> ${JSON.stringify(fc.rules)}`);
  fc.probe.forEach(x => console.log(`    ${x.sel.padEnd(24)} border="${x.border}" bg=${x.bg} color=${x.color} outline="${x.outline}"`));
  // is the ACTIVE seg tab distinguishable from inactive in forced-colors? (colour-only state = invisible in HCM)
  await p.screenshot({ path: path.join(SHOTS, '50-forced-colors-shell.png') });
  await p.click('#cramopen'); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(SHOTS, '51-forced-colors-cram.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  // focus ring in forced-colors
  await p.focus('#cramopen'); await p.waitForTimeout(150);
  const ring = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('#cramopen')); return c.outlineWidth + ' ' + c.outlineStyle + ' ' + c.outlineColor; });
  console.log('  focus ring on #cramopen in forced-colors:', ring);
  await p.screenshot({ path: path.join(SHOTS, '52-forced-colors-focus.png'), clip: { x: 0, y: 300, width: 320, height: 400 } });
  await p.close();
}

/* ================= F. prefers-contrast ================= */
console.log('\n======== F. prefers-contrast: more ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, contrast: 'more' });
  await boot(p);
  const pc = await p.evaluate(() => {
    const matches = matchMedia('(prefers-contrast: more)').matches;
    let n = 0; const rules = [];
    for (const sh of document.styleSheets) {
      try {
        const walk = (list) => { for (const r of list) { if (r.cssRules) { const cond = r.conditionText || (r.media && r.media.mediaText) || ''; if (/prefers-contrast/.test(cond)) { n++; rules.push(cond); } walk(r.cssRules); } } };
        walk(sh.cssRules);
      } catch (e) {}
    }
    return { matches, n, rules: [...new Set(rules)].slice(0, 6) };
  });
  console.log('  matchMedia(prefers-contrast:more) =', pc.matches);
  console.log(`  CSS @media prefers-contrast blocks: ${pc.n} -> ${JSON.stringify(pc.rules)}`);
  await p.screenshot({ path: path.join(SHOTS, '60-prefers-contrast.png') });
  await p.close();
}

/* ================= G. axe INCOMPLETE (what axe couldn't decide) ================= */
console.log('\n======== G. axe INCOMPLETE results (unverifiable contrast etc.) ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  for (const scen of ['walk', 'drill', 'sys', 'num']) {
    await p.evaluate(v => window.switchTab(v), scen);
    await p.waitForTimeout(500);
    await p.addScriptTag({ content: AXE });
    const inc = await p.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return r.incomplete.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, ex: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
    });
    console.log(`  pane:${scen} incomplete -> ${inc.length ? inc.map(i => `${i.id}(${i.impact},${i.nodes}n)`).join(' ') : 'none'}`);
    inc.forEach(i => i.ex.forEach(e => console.log(`      ${i.id}: ${e}`)));
  }
  await p.close();
}

/* ================= H. rate-limiting drill contrast -- reproduce or dismiss ================= */
console.log('\n======== H. reproduce the rate-limiting/drill color-contrast hit ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  for (const attempt of [1, 2, 3]) {
    await p.evaluate(() => window.TopicRegistry.setTopic('rate-limiting'));
    await p.waitForTimeout(600);
    await p.evaluate(() => window.switchTab('drill'));
    await p.waitForTimeout(attempt === 1 ? 400 : 2500);   // short wait vs long (settle animations)
    await p.addScriptTag({ content: AXE });
    const r = await p.evaluate(async () => {
      const res = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
      return res.violations.map(v => ({ nodes: v.nodes.map(n => ({ t: n.target.join(' >>> '), s: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 180) })) }));
    });
    const n = r.reduce((a, v) => a + v.nodes.length, 0);
    console.log(`  attempt ${attempt} (wait ${attempt === 1 ? '400ms' : '2500ms'}): ${n} contrast violations`);
    r.forEach(v => v.nodes.forEach(nd => console.log(`      ${nd.t}\n        ${nd.s}`)));
    await p.evaluate(() => window.switchTab('walk'));
    await p.waitForTimeout(300);
  }
  // measure the actual computed contrast on those buttons after full settle
  await p.evaluate(() => window.TopicRegistry.setTopic('rate-limiting'));
  await p.waitForTimeout(500);
  await p.evaluate(() => window.switchTab('drill'));
  await p.waitForTimeout(3000);
  const measured = await p.evaluate(() => {
    const dd = document.querySelector('deep-drill');
    if (!dd || !dd.shadowRoot) return 'no deep-drill shadow';
    return [...dd.shadowRoot.querySelectorAll('button[data-m],button[data-tier]')].map(bt => {
      const c = getComputedStyle(bt);
      return { txt: bt.textContent.trim(), color: c.color, bg: c.backgroundColor, opacity: c.opacity, parentOpacity: getComputedStyle(bt.parentElement).opacity };
    });
  });
  console.log('  measured after 3s settle:', JSON.stringify(measured, null, 1));
  await p.screenshot({ path: path.join(SHOTS, '70-ratelimiting-drill.png') });
  await p.close();
}

/* ================= I. LIVE REGIONS for dynamic content ================= */
console.log('\n======== I. aria-live coverage for dynamic content (drill reveal, toasts, view change) ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  // view change
  await p.evaluate(() => window.switchTab('num'));
  await p.waitForTimeout(500);
  const live1 = await p.evaluate(() => [...document.querySelectorAll('[aria-live],[role=status],[role=alert],output')].map(e => ({ tag: e.tagName, live: e.getAttribute('aria-live'), role: e.getAttribute('role'), txt: (e.textContent || '').trim().slice(0, 40) })));
  console.log('  after view change, doc live regions:', JSON.stringify(live1));

  // drill: reveal an answer, check if the revealed text sits in a live region
  await p.evaluate(() => window.switchTab('drill'));
  await p.waitForTimeout(800);
  const drillInfo = await p.evaluate(() => {
    const dd = document.querySelector('#drill deep-drill');
    if (!dd || !dd.shadowRoot) return { err: 'no drill' };
    const r = dd.shadowRoot;
    const adv = r.getElementById('adv');
    const before = { liveNodes: [...r.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e => e.id || e.className) };
    if (adv) adv.click();
    return { advClicked: !!adv, ...before };
  });
  await p.waitForTimeout(600);
  const afterReveal = await p.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const live = [...r.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e => ({ id: e.id, cls: e.className, live: e.getAttribute('aria-live'), txt: (e.textContent || '').trim().slice(0, 50) }));
    // the answer element
    const ans = r.querySelector('#ans,.ans,[class*=answer]');
    return { liveInShadow: live, answerEl: ans ? { id: ans.id, cls: ans.className, live: ans.getAttribute('aria-live'), role: ans.getAttribute('role'), visible: ans.offsetParent !== null, txt: (ans.textContent || '').trim().slice(0, 60) } : null };
  });
  console.log('  drill shadow live regions:', JSON.stringify(afterReveal.liveInShadow));
  console.log('  drill answer element:', JSON.stringify(afterReveal.answerEl));
  await p.screenshot({ path: path.join(SHOTS, '80-drill-revealed.png') });

  // toast: copy link
  await p.evaluate(() => window.switchTab('walk'));
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('copylink').click());
  await p.waitForTimeout(600);
  const toast = await p.evaluate(() => {
    const cands = [...document.querySelectorAll('[class*=toast],[class*=Toast],[class*=copied],[class*=flash]')].filter(e => e.offsetParent !== null);
    return cands.map(e => ({ cls: e.className, live: e.getAttribute('aria-live'), role: e.getAttribute('role'), txt: (e.textContent || '').trim().slice(0, 40) }));
  });
  console.log('  toast elements after Copy link:', JSON.stringify(toast));
  await p.screenshot({ path: path.join(SHOTS, '81-toast.png') });
  await p.close();
}

await b.close();
console.log('\nDONE');
