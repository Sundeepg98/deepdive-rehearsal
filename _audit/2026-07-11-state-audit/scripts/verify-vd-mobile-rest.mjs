import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';
const b = await chromium.launch();
const errs = [];

async function boot({ w = 390, h = 844, dismissHome = true, dark = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  if (dark) { await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await p.waitForTimeout(300); }
  if (dismissHome) { const x = await p.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p.waitForTimeout(500); } }
  return { ctx, p };
}

// deep query helper injected into the page: walks shadow roots
const DEEP = `
function __deepAll(sel, root=document){
  const out=[...root.querySelectorAll(sel)];
  const walk=(r)=>{ for(const e of r.querySelectorAll('*')){ if(e.shadowRoot){ out.push(...e.shadowRoot.querySelectorAll(sel)); walk(e.shadowRoot);} } };
  walk(root); return out;
}
function __deepOne(sel){ return __deepAll(sel)[0]||null; }
function __shadowHosts(){ const h=[]; const walk=(r)=>{ for(const e of r.querySelectorAll('*')){ if(e.shadowRoot){ h.push(e.tagName.toLowerCase()); walk(e.shadowRoot);} } }; walk(document); return h; }
`;

const line = s => console.log(s);
const H = t => console.log('\n\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));

/* ---------------- SHADOW DOM SANITY (lens claimed all 9 panes are custom elements w/ shadow roots) ---------------- */
H('S0. SHADOW-DOM CLAIM CHECK  ("all 9 panes are custom elements with shadow roots")');
{
  const { ctx, p } = await boot({});
  const r = await p.evaluate(`(() => {
    ${DEEP}
    const panes = [...document.querySelectorAll('.pane')].map(e => ({ id: e.id, tag: e.tagName.toLowerCase(), hasShadow: !!e.shadowRoot }));
    return { panes, shadowHosts: [...new Set(__shadowHosts())] };
  })()`);
  line('  .pane elements: ' + r.panes.map(x => `${x.id}=<${x.tag}>${x.hasShadow ? '+shadow' : ''}`).join(', '));
  line('  panes WITH shadow root: ' + r.panes.filter(x => x.hasShadow).length + ' / ' + r.panes.length);
  line('  shadow hosts anywhere in doc: ' + JSON.stringify(r.shadowHosts));
  await ctx.close();
}

/* ---------------- F2: TOOLS SHEET FLEX-SHRINK ---------------- */
H('F2. TOOLS SHEET flex-shrink  (lens: rows 36.7px -> 59.6px natural; scrollHeight 691 -> 954)');
{
  for (const fix of [false, true]) {
    const { ctx, p } = await boot({});
    if (fix) await p.addStyleTag({ content: '.sidebar .mockbar > *{flex-shrink:0 !important}' });
    await p.click('#toolsfab'); await p.waitForTimeout(700);
    const m = await p.evaluate(() => {
      const bar = document.querySelector('.sidebar .mockbar');
      const cs = getComputedStyle(bar);
      const rows = [...bar.querySelectorAll('.crambtn')];
      const hs = rows.map(r => +r.getBoundingClientRect().height.toFixed(1));
      const tog = bar.querySelector('.crambtn.cram-tog');
      const grabber = getComputedStyle(bar, '::before');
      return {
        display: cs.display, flexDirection: cs.flexDirection, maxHeight: cs.maxHeight, overflowY: cs.overflowY,
        barH: +bar.getBoundingClientRect().height.toFixed(1),
        scrollHeight: bar.scrollHeight, clientHeight: bar.clientHeight,
        rowCount: rows.length,
        rowHeights: [...new Set(hs)].sort((a, b) => a - b),
        medianRowH: hs.sort((a, b) => a - b)[Math.floor(hs.length / 2)],
        togH: tog ? +tog.getBoundingClientRect().height.toFixed(1) : null,
        grabberSpecH: grabber.height, // computed ::before height
        rowsUnder44: hs.filter(x => x < 44).length,
        hasCloseBtn: !!bar.querySelector('[class*="close"],[aria-label*="lose"]'),
        heading: (bar.querySelector('.mb-sec') || {}).textContent,
      };
    });
    line(`\n  --- ${fix ? 'WITH flex-shrink:0 injected' : 'SHIPPED (baseline)'} ---`);
    line(`     .mockbar display=${m.display} dir=${m.flexDirection} maxH=${m.maxHeight} overflowY=${m.overflowY}`);
    line(`     bar height=${m.barH}  scrollHeight=${m.scrollHeight}  clientHeight=${m.clientHeight}`);
    line(`     .crambtn rows: n=${m.rowCount}  distinct heights=${JSON.stringify(m.rowHeights)}  median=${m.medianRowH}`);
    line(`     .cram-tog height=${m.togH}   rows under 44px = ${m.rowsUnder44}/${m.rowCount}`);
    line(`     ::before grabber computed height = ${m.grabberSpecH}`);
    if (!fix) line(`     tools sheet has close button? ${m.hasCloseBtn}`);
    await p.screenshot({ path: `${SHOTS}/f2-tools-${fix ? 'FIXED-flexshrink0' : 'baseline'}.png` });
    await ctx.close();
  }
}

/* ---------------- F3: SWIPE DESYNCS TAB STRIP ---------------- */
H('F3. SWIPE -> TAB STRIP DESYNC  (lens: after swipe, NO tab highlighted; segScrollLeft=0)');
{
  const { ctx, p } = await boot({});
  const cdp = await ctx.newCDPSession(p);
  const swipeLeft = async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: 600 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 240, y: 602 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 140, y: 604 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 60, y: 605 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(650);
  };
  const state = () => p.evaluate(() => {
    const strip = document.querySelector('.sidebar .seg');
    const on = strip.querySelector('button.on');
    const sr = strip.getBoundingClientRect();
    const br = on ? on.getBoundingClientRect() : null;
    return {
      hash: location.hash,
      stageHead: (document.querySelector('#stagehead .sh-name') || document.querySelector('#stagehead') || {}).textContent?.trim().slice(0, 40),
      activeTab: on ? on.textContent.trim().slice(0, 20) : 'NONE',
      segScrollLeft: strip.scrollLeft,
      btnLeft: br ? +br.left.toFixed(0) : null,
      btnRight: br ? +br.right.toFixed(0) : null,
      stripLeft: +sr.left.toFixed(0), stripRight: +sr.right.toFixed(0),
      activeTabFullyVisible: br ? (br.left >= sr.left - 1 && br.right <= sr.right + 1) : false,
      activeTabVisiblePx: br ? +Math.max(0, Math.min(br.right, sr.right) - Math.max(br.left, sr.left)).toFixed(1) : 0,
      activeTabWidth: br ? +br.width.toFixed(1) : 0,
    };
  });
  line('  start: ' + JSON.stringify(await state()));
  for (let i = 1; i <= 5; i++) { await swipeLeft(); const s = await state(); line(`  swipe #${i}: hash=${s.hash} head="${s.stageHead}" activeTab="${s.activeTab}" segScrollLeft=${s.segScrollLeft} btnLeft=${s.btnLeft} visible=${s.activeTabVisiblePx}/${s.activeTabWidth}px fullyVisible=${s.activeTabFullyVisible}`); }
  await p.screenshot({ path: `${SHOTS}/f3-after-5-swipes.png` });
  await p.locator('.sidebar .seg').screenshot({ path: `${SHOTS}/f3-tabstrip-after-swipe.png` }).catch(() => { });

  // CONTROL: click nav
  line('\n  CONTROL — navigate the same distance by CLICKING the tab instead:');
  const { ctx: c2, p: p2 } = await boot({});
  await p2.evaluate(() => { const bs = [...document.querySelectorAll('.sidebar .seg button')]; bs[5].click(); });
  await p2.waitForTimeout(800);
  const cs = await p2.evaluate(() => {
    const strip = document.querySelector('.sidebar .seg'); const on = strip.querySelector('button.on');
    const sr = strip.getBoundingClientRect(), br = on.getBoundingClientRect();
    return { activeTab: on.textContent.trim().slice(0, 20), segScrollLeft: strip.scrollLeft, fullyVisible: br.left >= sr.left - 1 && br.right <= sr.right + 1 };
  });
  line('  click-nav: ' + JSON.stringify(cs));
  await c2.close();

  // deep-link arrival
  line('\n  DEEP-LINK arrival (reload straight to #rf / #open):');
  for (const hash of ['#sys', '#rf', '#open']) {
    const ctx3 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const p3 = await ctx3.newPage();
    await p3.goto(URL + hash, { waitUntil: 'load' }); await p3.waitForTimeout(1100);
    const x = await p3.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p3.waitForTimeout(400); }
    const s = await p3.evaluate(() => {
      const strip = document.querySelector('.sidebar .seg'); const on = strip.querySelector('button.on');
      if (!on) return { activeTab: 'NONE' };
      const sr = strip.getBoundingClientRect(), br = on.getBoundingClientRect();
      const v = Math.max(0, Math.min(br.right, sr.right) - Math.max(br.left, sr.left));
      return { activeTab: on.textContent.trim().slice(0, 18), segScrollLeft: strip.scrollLeft, visiblePx: +v.toFixed(1), width: +br.width.toFixed(1), clippedPx: +(br.width - v).toFixed(1) };
    });
    line(`    ${hash}: ` + JSON.stringify(s));
    await ctx3.close();
  }
  await ctx.close();
}

/* ---------------- F4: CHROME BUDGET ---------------- */
H('F4. CHROME BUDGET  (lens: content starts y=373.5; chrome 58.8%; .mockcta 123px)');
for (const w of [390, 360]) {
  const { ctx, p } = await boot({ w });
  const m = await p.evaluate(() => {
    const h = e => e ? +e.getBoundingClientRect().height.toFixed(1) : null;
    const pane = document.querySelector('.pane.on');
    const first = pane?.firstElementChild;
    const vpH = window.innerHeight;
    const cta = document.querySelector('.sidebar .mockcta');
    return {
      seg: h(document.querySelector('.sidebar .seg')),
      sideId: h(document.querySelector('.side-id')),
      stageHead: h(document.querySelector('#stagehead')),
      mcomp: h(document.querySelector('.mcomp')),
      firstContentTop: first ? +first.getBoundingClientRect().top.toFixed(1) : null,
      mockcta: h(cta),
      mockctaTop: cta ? +cta.getBoundingClientRect().top.toFixed(1) : null,
      vpH,
      h1: document.querySelector('.side-id h1')?.textContent,
      pill: document.querySelector('#tncurrent')?.textContent,
      activeTab: document.querySelector('.seg button.on')?.textContent.trim().slice(0, 20),
      stageHeadName: document.querySelector('#stagehead .sh-name')?.textContent,
      stageHeadKick: document.querySelector('#stagehead .sh-kick')?.textContent,
    };
  });
  const contentWindow = m.mockctaTop - m.firstContentTop;
  line(`\n  --- ${w}px ---`);
  line(`     seg=${m.seg}  .side-id=${m.sideId}  .stage-head=${m.stageHead}  .mcomp=${m.mcomp}`);
  line(`     first content pixel y=${m.firstContentTop}   .mockcta top=${m.mockctaTop} h=${m.mockcta}  viewportH=${m.vpH}`);
  line(`     => visible content window = ${contentWindow.toFixed(1)}px = ${(100 * contentWindow / m.vpH).toFixed(1)}%   CHROME = ${(100 - 100 * contentWindow / m.vpH).toFixed(1)}%`);
  line(`     REDUNDANCY: h1="${m.h1}" | pill="${m.pill}"  ||  activeTab="${m.activeTab}" | stageHead name="${m.stageHeadName}" kick="${m.stageHeadKick}"`);
  if (w === 390) await p.screenshot({ path: `${SHOTS}/f4-chrome-390.png` });
  await ctx.close();
}

/* ---------------- F5: MOCK RUN OVERLAY ---------------- */
H('F5. MOCK RUN OVERLAY  (lens: top-pinned, panel y=36 h=338 bottom=374; buttons 525px from bottom; .mb-keys shown)');
{
  const { ctx, p } = await boot({});
  await p.click('#mockopen'); await p.waitForTimeout(900);
  const m = await p.evaluate(() => {
    const ov = document.querySelector('.mock-ov.open') || document.querySelector('#mockov');
    const panel = document.querySelector('.mock-panel');
    const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { y: +b.y.toFixed(0), h: +b.height.toFixed(0), w: +b.width.toFixed(0), bottom: +b.bottom.toFixed(0) }; };
    const btns = [...document.querySelectorAll('.mock-panel button')].map(e => ({ cls: e.className, txt: e.textContent.trim().slice(0, 18), ...r(e), distFromBottom: +(window.innerHeight - e.getBoundingClientRect().bottom).toFixed(0) }));
    const keys = document.querySelector('.mb-keys');
    return {
      ovAlignItems: ov ? getComputedStyle(ov).alignItems : null,
      ovDisplay: ov ? getComputedStyle(ov).display : null,
      panel: r(panel),
      vpH: window.innerHeight,
      deadSpaceBelow: panel ? +(window.innerHeight - panel.getBoundingClientRect().bottom).toFixed(0) : null,
      buttons: btns,
      mbKeysText: keys ? keys.textContent.trim() : null,
      mbKeysDisplay: keys ? getComputedStyle(keys).display : null,
      mbKeysFontSize: keys ? getComputedStyle(keys).fontSize : null,
    };
  });
  line(`  .mock-ov align-items=${m.ovAlignItems} display=${m.ovDisplay}`);
  line(`  .mock-panel  y=${m.panel.y} h=${m.panel.h} w=${m.panel.w} bottom=${m.panel.bottom}   viewportH=${m.vpH}`);
  line(`  DEAD SPACE below the panel = ${m.deadSpaceBelow}px = ${(100 * m.deadSpaceBelow / m.vpH).toFixed(0)}% of the screen`);
  line('  buttons:');
  m.buttons.forEach(x => line(`     ${String(x.txt).padEnd(18)} ${x.w}x${x.h} @y=${x.y}   distance from screen bottom = ${x.distFromBottom}px   [${x.cls}]`));
  line(`  .mb-keys: display=${m.mbKeysDisplay} fontSize=${m.mbKeysFontSize} text="${m.mbKeysText}"`);
  await p.screenshot({ path: `${SHOTS}/f5-mockrun-390.png` });
  await ctx.close();
}

/* ---------------- F6: SCROLLTOP FAB COLLISION ---------------- */
H('F6. SCROLL-TO-TOP FAB vs BOTTOM BAR  (lens: FAB overlaps the interviewer toggle; elementFromPoint = .scrolltop)');
{
  const { ctx, p } = await boot({});
  await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(1000);
  const m = await p.evaluate(() => {
    const fab = document.querySelector('.scrolltop');
    const tog = document.querySelector('#inttog');
    const cta = document.querySelector('.sidebar .mockcta');
    const r = e => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(0), y: +b.y.toFixed(0), w: +b.width.toFixed(0), h: +b.height.toFixed(0), bottom: +b.bottom.toFixed(0), right: +b.right.toFixed(0) }; };
    const F = r(fab), T = r(tog), C = r(cta);
    const cs = getComputedStyle(fab);
    const overlap = (a, bb) => !(a.right <= bb.x || a.x >= bb.right || a.bottom <= bb.y || a.y >= bb.bottom);
    const cx = F.x + F.w / 2, cy = F.y + F.h / 2;
    const hit = document.elementFromPoint(cx, cy);
    return {
      fabShown: fab.classList.contains('show'), fabVisible: cs.opacity, fabPointer: cs.pointerEvents,
      fab: F, inttog: T, mockcta: C,
      fabZ: cs.zIndex, togZ: getComputedStyle(tog).zIndex, fabPos: cs.position, fabBottomCss: cs.bottom, fabLeftCss: cs.left,
      overlapsBottomBar: overlap(F, C), overlapsInterviewerToggle: overlap(F, T),
      elementFromPointAtFabCentre: hit ? (hit.tagName.toLowerCase() + '.' + (hit.className || '').toString().split(' ')[0]) : null,
      togLabel: document.querySelector('.inttog-lbl')?.textContent.trim(),
    };
  });
  line(`  .scrolltop shown=${m.fabShown} opacity=${m.fabVisible} pointerEvents=${m.fabPointer}`);
  line(`  .scrolltop  pos=${m.fabPos} bottom=${m.fabBottomCss} left=${m.fabLeftCss}  rect=${JSON.stringify(m.fab)}  z=${m.fabZ}`);
  line(`  #inttog     rect=${JSON.stringify(m.inttog)}  z=${m.togZ}`);
  line(`  .mockcta    rect=${JSON.stringify(m.mockcta)}`);
  line(`  overlapsBottomBar=${m.overlapsBottomBar}   overlapsInterviewerToggle=${m.overlapsInterviewerToggle}`);
  line(`  document.elementFromPoint(FAB centre) => ${m.elementFromPointAtFabCentre}   (lens claims button.scrolltop)`);
  line(`  toggle label underneath: "${m.togLabel}"`);
  await p.screenshot({ path: `${SHOTS}/f6-scrolltop-collision-390.png` });
  await ctx.close();
}

/* ---------------- F7: COMPANION ACCORDION ---------------- */
H('F7. COMPANION ACCORDION  (lens: 45 -> 545px instant jump; content pushed to y=874, off-screen)');
{
  const { ctx, p } = await boot({});
  const m = await p.evaluate(async () => {
    const det = document.querySelector('.mcomp');
    const sum = det.querySelector('.mcomp-sum');
    const before = +det.getBoundingClientRect().height.toFixed(1);
    const cs = getComputedStyle(det);
    const frames = [];
    sum.click();
    await new Promise(res => {
      let n = 0;
      const tick = () => { frames.push(+det.getBoundingClientRect().height.toFixed(1)); if (++n < 8) requestAnimationFrame(tick); else res(); };
      requestAnimationFrame(tick);
    });
    const after = +det.getBoundingClientRect().height.toFixed(1);
    const pane = document.querySelector('.pane.on');
    const firstContent = pane?.firstElementChild;
    return {
      transition: cs.transition, before, frames, after,
      firstContentTopAfterOpen: firstContent ? +firstContent.getBoundingClientRect().top.toFixed(1) : null,
      viewportH: window.innerHeight,
      animatedOverFrames: new Set(frames).size > 1,
    };
  });
  line(`  <details.mcomp> CSS transition = "${m.transition}"`);
  line(`  height before click = ${m.before}px  ->  after = ${m.after}px   (delta ${(m.after - m.before).toFixed(0)}px)`);
  line(`  requestAnimationFrame samples after click: ${JSON.stringify(m.frames)}`);
  line(`  animated over frames? ${m.animatedOverFrames}   (false = instant snap, no transition)`);
  line(`  pane's first content element top AFTER open = y=${m.firstContentTopAfterOpen}   viewportH=${m.viewportH}  => ${m.firstContentTopAfterOpen > m.viewportH ? 'PUSHED OFF-SCREEN' : 'still on screen'}`);
  await p.screenshot({ path: `${SHOTS}/f7-companion-open-390.png` });
  await ctx.close();
}

console.log('\n\nCONSOLE/PAGE ERRORS SEEN: ' + (errs.length ? JSON.stringify([...new Set(errs)], null, 1) : 'none'));
await b.close();
