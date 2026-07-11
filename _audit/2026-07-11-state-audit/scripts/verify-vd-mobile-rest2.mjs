import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';
const b = await chromium.launch();

const DEEP = `
  const __deepAll=(sel,root=document)=>{const out=[...root.querySelectorAll(sel)];const walk=(r)=>{for(const e of r.querySelectorAll('*')){if(e.shadowRoot){out.push(...e.shadowRoot.querySelectorAll(sel));walk(e.shadowRoot);}}};walk(root);return out;};
  const __deepOne=(sel)=>__deepAll(sel)[0]||null;
`;

async function boot({ w = 390, h = 844, dismissHome = true, dark = false, fresh = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  if (dark) { await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await p.waitForTimeout(400); }
  if (dismissHome) { const x = await p.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p.waitForTimeout(500); } }
  return { ctx, p };
}
const line = s => console.log(s);
const H = t => console.log('\n\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));

/* ---------------- F5 REDO: MOCK RUN, SHADOW-PIERCED + RUN STARTED ---------------- */
H('F5 (REDO). MOCK RUN — shadow-pierced, run actually STARTED');
{
  const { ctx, p } = await boot({});
  await p.click('#mockopen'); await p.waitForTimeout(900);
  const pre = await p.evaluate(`(()=>{${DEEP}
    const host=document.querySelector('deep-mock-run');
    const panel=__deepOne('.mock-panel');
    const btns=__deepAll('.mock-panel button, .mb-rev, .mb-next, .mb-start').map(e=>({cls:e.className,txt:e.textContent.trim().slice(0,22),w:+e.getBoundingClientRect().width.toFixed(0),h:+e.getBoundingClientRect().height.toFixed(0),y:+e.getBoundingClientRect().y.toFixed(0)}));
    return { hasHost:!!host, panelInShadow: !!(host&&host.shadowRoot&&host.shadowRoot.querySelector('.mock-panel')), buttons:btns.filter(x=>x.w>0) };
  })()`);
  line('  deep-mock-run host exists: ' + pre.hasHost + ' | .mock-panel inside its shadow root: ' + pre.panelInShadow);
  line('  buttons on the OPENING screen: ' + JSON.stringify(pre.buttons));

  // start the run
  const started = await p.evaluate(`(()=>{${DEEP}
    const cands=__deepAll('.mock-panel button, .mock-panel .mockbtn');
    const start=cands.find(e=>/start|begin|run|go/i.test(e.textContent));
    if(start){ start.click(); return start.textContent.trim().slice(0,30); } return null;
  })()`);
  line('  clicked start control: ' + JSON.stringify(started));
  await p.waitForTimeout(1200);

  const m = await p.evaluate(`(()=>{${DEEP}
    const ov=document.querySelector('.mock-ov.open')||__deepOne('.mock-ov.open');
    const panel=__deepOne('.mock-panel');
    const r=e=>{const b=e.getBoundingClientRect();return{y:+b.y.toFixed(0),h:+b.height.toFixed(0),w:+b.width.toFixed(0),bottom:+b.bottom.toFixed(0)};};
    const btns=__deepAll('button').filter(e=>e.getBoundingClientRect().width>0 && e.closest && (e.closest('.mock-panel')|| e.getRootNode().host)).map(e=>({cls:e.className,txt:e.textContent.trim().slice(0,20),...r(e),distFromBottom:+(window.innerHeight-e.getBoundingClientRect().bottom).toFixed(0)}));
    const keys=__deepOne('.mb-keys');
    const rev=__deepOne('.mb-rev'), next=__deepOne('.mb-next');
    return {
      ovAlign: ov?getComputedStyle(ov).alignItems:null,
      panel: panel?r(panel):null,
      vpH: window.innerHeight,
      deadBelow: panel? +(window.innerHeight-panel.getBoundingClientRect().bottom).toFixed(0):null,
      mbRev: rev?{...r(rev),txt:rev.textContent.trim(),distFromBottom:+(window.innerHeight-rev.getBoundingClientRect().bottom).toFixed(0)}:null,
      mbNext: next?{...r(next),txt:next.textContent.trim(),distFromBottom:+(window.innerHeight-next.getBoundingClientRect().bottom).toFixed(0)}:null,
      keys: keys?{display:getComputedStyle(keys).display,fontSize:getComputedStyle(keys).fontSize,text:keys.textContent.trim()}:null,
      allButtons: btns,
    };
  })()`);
  line('\n  AFTER START:');
  line('  .mock-ov align-items = ' + m.ovAlign);
  line('  .mock-panel = ' + JSON.stringify(m.panel) + '  viewportH=' + m.vpH);
  line('  DEAD SPACE below panel = ' + m.deadBelow + 'px = ' + (100 * m.deadBelow / m.vpH).toFixed(0) + '%');
  line('  .mb-rev  = ' + JSON.stringify(m.mbRev));
  line('  .mb-next = ' + JSON.stringify(m.mbNext));
  line('  .mb-keys = ' + JSON.stringify(m.keys) + '   <-- lens: 11px kbd hint shown on touch');
  await p.screenshot({ path: `${SHOTS}/f5-mockrun-STARTED-390.png` });
  await ctx.close();
}

/* ---------------- F8: TOUCH TARGETS (shadow-pierced) ---------------- */
H('F8. TOUCH TARGETS < 44px  (lens: 216 sub-44px; .wb-rev/.wb-got/.wb-miss 67x28 x27; .op-rev 28; .piv-jump 30; #_focus-toggle 60x20)');
{
  const { ctx, p } = await boot({});
  const views = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
  const agg = {};
  let total = 0;
  for (const v of views) {
    await p.evaluate(view => { window.Router && window.Router.navigate(view); }, v);
    await p.waitForTimeout(700);
    const r = await p.evaluate(`(()=>{${DEEP}
      const els=__deepAll('button, a[href], input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])');
      const out=[];
      for(const e of els){ const b=e.getBoundingClientRect(); if(b.width===0||b.height===0) continue;
        const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none') continue;
        if(b.height<44||b.width<44){ const key=(e.className&&e.className.toString().split(' ')[0])||e.id||e.tagName.toLowerCase();
          out.push({k:key, w:+b.width.toFixed(1), h:+b.height.toFixed(1), fs:cs.fontSize, txt:e.textContent.trim().slice(0,16)}); } }
      return out;
    })()`);
    total += r.length;
    for (const x of r) { const key = x.k; if (!agg[key]) agg[key] = { n: 0, w: x.w, h: x.h, fs: x.fs, txt: x.txt }; agg[key].n++; }
    if (v === 'wb') { await p.screenshot({ path: `${SHOTS}/f8-wb-buttons-390.png` }); }
  }
  line(`  TOTAL sub-44px interactive elements counted across the 9 panes (visits summed) = ${total}   [lens claims 216]`);
  line('  clusters (by first class), sorted by count:');
  Object.entries(agg).sort((a, b) => b[1].n - a[1].n).slice(0, 22)
    .forEach(([k, v2]) => line(`     ${String(v2.n).padStart(3)}x  ${k.padEnd(22)} ${String(v2.w).padStart(6)} x ${String(v2.h).padStart(5)}  fs=${String(v2.fs).padEnd(7)} "${v2.txt}"`));

  // spot-check the lens's named elements
  const spot = await p.evaluate(`(()=>{${DEEP}
    const g=sel=>{const e=__deepOne(sel); if(!e) return null; const b=e.getBoundingClientRect(); const cs=getComputedStyle(e);
      return {sel, w:+b.width.toFixed(1), h:+b.height.toFixed(1), fs:cs.fontSize, count:__deepAll(sel).length};};
    return [g('.tools-fab'), g('#_focus-toggle'), g('.crambtn')].filter(Boolean);
  })()`);
  line('\n  spot-checks (current pane):');
  spot.forEach(s => line(`     ${s.sel.padEnd(18)} ${s.w} x ${s.h}  fs=${s.fs}  (n=${s.count} in doc)`));

  // wb pane precise
  await p.evaluate(() => window.Router.navigate('wb')); await p.waitForTimeout(800);
  const wb = await p.evaluate(`(()=>{${DEEP}
    const g=sel=>__deepAll(sel).map(e=>{const b=e.getBoundingClientRect();return {w:+b.width.toFixed(1),h:+b.height.toFixed(1),fs:getComputedStyle(e).fontSize,txt:e.textContent.trim()};});
    return {rev:g('.wb-rev'),got:g('.wb-got'),miss:g('.wb-miss')};
  })()`);
  line('\n  Whiteboard pane primary controls (the whole interaction surface):');
  line('     .wb-rev  n=' + wb.rev.length + '  ' + JSON.stringify(wb.rev[0]));
  line('     .wb-got  n=' + wb.got.length + '  ' + JSON.stringify(wb.got[0]));
  line('     .wb-miss n=' + wb.miss.length + '  ' + JSON.stringify(wb.miss[0]));
  await ctx.close();
}

/* ---------------- F9: HOME .ix-cross CLIP ---------------- */
H('F9. HOME SCREEN .ix-cross CLIP  (lens: clientHeight 28 vs scrollHeight 43, overflow:hidden)');
{
  const { ctx, p } = await boot({ dismissHome: false });
  const m = await p.evaluate(() => {
    const c = document.querySelector('.ix-cross');
    if (!c) return { missing: true };
    const cs = getComputedStyle(c);
    const b = c.getBoundingClientRect();
    const panel = document.querySelector('.ix-panel');
    const reset = [...document.querySelectorAll('.ix-panel button')].find(e => /reset/i.test(e.textContent));
    return {
      homeAutoOpened: !!document.querySelector('.ix-ov.open'),
      clientHeight: c.clientHeight, scrollHeight: c.scrollHeight, overflow: cs.overflow, height: cs.height,
      clippedPx: c.scrollHeight - c.clientHeight,
      rect: { w: +b.width.toFixed(1), h: +b.height.toFixed(1) },
      text: c.textContent.trim().slice(0, 70),
      panelRect: panel ? { w: +panel.getBoundingClientRect().width.toFixed(0), h: +panel.getBoundingClientRect().height.toFixed(0) } : null,
      resetBtn: reset ? { txt: reset.textContent.trim().slice(0, 30), distFromBottom: +(window.innerHeight - reset.getBoundingClientRect().bottom).toFixed(0) } : null,
    };
  });
  line('  home auto-opened on fresh load: ' + m.homeAutoOpened);
  line('  .ix-cross clientHeight=' + m.clientHeight + ' scrollHeight=' + m.scrollHeight + ' => ' + m.clippedPx + 'px of text HIDDEN (overflow:' + m.overflow + ', css height:' + m.height + ')');
  line('  .ix-cross text: "' + m.text + '"');
  line('  .ix-panel: ' + JSON.stringify(m.panelRect));
  line('  destructive "Reset" button: ' + JSON.stringify(m.resetBtn));
  await p.locator('.ix-cross').screenshot({ path: `${SHOTS}/f9-ixcross-clip.png` }).catch(() => { });
  await p.screenshot({ path: `${SHOTS}/f9-home-390.png` });
  await ctx.close();
}

/* ---------------- F10: DARK ELEVATION ---------------- */
H('F10. DARK MODE ELEVATION on the two mobile-only surfaces');
{
  const { ctx, p } = await boot({ dark: true });
  await p.click('#toolsfab'); await p.waitForTimeout(700);
  const m = await p.evaluate(() => {
    const g = s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return { sel: s, boxShadow: cs.boxShadow, background: cs.backgroundColor, border: cs.border }; };
    return {
      theme: document.documentElement.dataset.theme,
      pageBg: getComputedStyle(document.body).backgroundColor,
      mockbar: g('.sidebar .mockbar'), mockcta: g('.sidebar .mockcta'),
      mockPanel: g('.mock-panel'), cramPanel: g('.cram-panel'),
      toolsBd: g('.tools-bd'),
    };
  });
  line('  theme=' + m.theme + '  page bg=' + m.pageBg);
  line('  .sidebar .mockbar (tools sheet, MOBILE-ONLY):');
  line('     box-shadow: ' + m.mockbar.boxShadow);
  line('     background : ' + m.mockbar.background);
  line('  .sidebar .mockcta (bottom bar, MOBILE-ONLY):');
  line('     box-shadow: ' + m.mockcta.boxShadow);
  line('  .mock-panel (overlay, gets the dark-elevation rule at styles.css:269):');
  line('     box-shadow: ' + (m.mockPanel ? m.mockPanel.boxShadow : 'n/a'));
  line('  .tools-bd backdrop: ' + (m.toolsBd ? m.toolsBd.background : 'n/a'));
  await p.screenshot({ path: `${SHOTS}/f10-tools-dark-390.png` });
  await ctx.close();
}

/* ---------------- F11 + F12 + F13 + F14 + F15 ---------------- */
H('F11. NUMBERS PANE INPUTS  (lens: 15px font -> iOS auto-zoom; 40px tall; no inputmode)');
{
  const { ctx, p } = await boot({});
  await p.evaluate(() => window.Router.navigate('num')); await p.waitForTimeout(900);
  const m = await p.evaluate(`(()=>{${DEEP}
    return __deepAll('input').map(e=>{const b=e.getBoundingClientRect();const cs=getComputedStyle(e);
      return {type:e.type, inputmode:e.getAttribute('inputmode')||'(none)', h:+b.height.toFixed(0), w:+b.width.toFixed(0), fs:cs.fontSize, value:e.value};});
  })()`);
  m.forEach(i => line('  ' + JSON.stringify(i)));
  line('  => iOS Safari auto-zooms any focused input with font-size < 16px. Count under 16px: ' + m.filter(i => parseFloat(i.fs) < 16).length + '/' + m.length);
  await ctx.close();
}

H('F12. CHROME TYPOGRAPHY');
{
  const { ctx, p } = await boot({});
  const m = await p.evaluate(`(()=>{${DEEP}
    const g=s=>{const e=__deepOne(s); if(!e) return [s,'MISSING']; const cs=getComputedStyle(e); return [s, cs.fontSize, cs.fontWeight];};
    return [g('.sh-kick'),g('.mb-sec'),g('#_focus-toggle'),g('.locator'),g('.mcomp-cue'),g('.inttog-lbl'),g('.mockbtn'),g('.crambtn .mb-t'),g('.crambtn .mb-d'),g('.card p'),g('.tn-current')];
  })()`);
  m.forEach(x => line('  ' + String(x[0]).padEnd(18) + ' font-size=' + String(x[1]).padEnd(9) + ' weight=' + (x[2] || '')));
  await ctx.close();
}

H('F13. ALWAYS-ON ANIMATIONS');
{
  const { ctx, p } = await boot({});
  const m = await p.evaluate(() => {
    const g = (s, pe) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e, pe); return { sel: s + (pe || ''), animation: cs.animation, willChange: cs.willChange, w: cs.width, h: cs.height }; };
    return [g('.stage', '::before'), g('.stage', '::after'), g('.stage-head', '::before'), g('.dots i.on', null)].filter(Boolean);
  });
  m.forEach(x => line('  ' + x.sel.padEnd(20) + ' animation="' + x.animation + '"  will-change=' + x.willChange + '  size=' + x.w + 'x' + x.h));
  line('  NOTE: box-shadow cannot be GPU-composited -> repaints on the main thread every frame, forever.');
  await ctx.close();
}

H('F14. BOTTOM BAR COMPOSITION');
{
  const { ctx, p } = await boot({});
  const m = await p.evaluate(() => {
    const cta = document.querySelector('.sidebar .mockcta');
    const b = cta.getBoundingClientRect();
    return {
      height: +b.height.toFixed(0), pctOfViewport: +(100 * b.height / window.innerHeight).toFixed(1),
      children: [...cta.children].map(e => { const r = e.getBoundingClientRect(); return { id: e.id, cls: e.className, w: +r.width.toFixed(0), h: +r.height.toFixed(0) }; }),
    };
  });
  line('  .mockcta height=' + m.height + 'px = ' + m.pctOfViewport + '% of the viewport');
  m.children.forEach(c => line('     ' + String('#' + c.id).padEnd(12) + ' .' + String(c.cls).padEnd(12) + ' ' + c.w + ' x ' + c.h));
  await ctx.close();
}

H('F15. POLISH — .arc-t clip / model grid orphan / tab strip bg');
{
  const { ctx, p } = await boot({});
  const arc = await p.evaluate(`(()=>{${DEEP}
    const els=__deepAll('.arc-t');
    return els.map(e=>{const b=e.getBoundingClientRect(); const par=e.parentElement.getBoundingClientRect();
      return {txt:e.textContent.trim().slice(0,24), right:+b.right.toFixed(1), parentRight:+par.right.toFixed(1), overflowPx:+(b.right-par.right).toFixed(1), parentOverflow:getComputedStyle(e.parentElement).overflow};})
      .filter(x=>x.overflowPx>0);
  })()`);
  line('  .arc-t labels overflowing their parent (walkthrough flow grid): ' + (arc.length ? JSON.stringify(arc, null, 1) : 'NONE'));

  await p.evaluate(() => window.Router.navigate('model')); await p.waitForTimeout(800);
  const model = await p.evaluate(`(()=>{${DEEP}
    const grid=__deepOne('.ma-grid')||__deepOne('.model-grid');
    const chips=__deepAll('.ma-chip, .model-chip, .ma-q');
    let g=null;
    if(chips.length){ const par=chips[0].parentElement; const cs=getComputedStyle(par);
      g={cls:par.className, cols:cs.gridTemplateColumns, display:cs.display, n:chips.length}; }
    return {grid:!!grid, chipInfo:g, chipTexts:chips.slice(0,12).map(c=>c.textContent.trim().slice(0,22))};
  })()`);
  line('  Model Answers chip grid: ' + JSON.stringify(model.chipInfo));
  line('    chips (' + model.chipTexts.length + '): ' + JSON.stringify(model.chipTexts));

  const seg = await p.evaluate(() => {
    const s = document.querySelector('.sidebar .seg'); const cs = getComputedStyle(s);
    return { background: cs.backgroundColor, backdropFilter: cs.backdropFilter, scrollWidth: s.scrollWidth, clientWidth: s.clientWidth, pageBg: getComputedStyle(document.body).backgroundColor, tabs: s.querySelectorAll('button').length };
  });
  line('  tab strip: background=' + seg.background + ' backdrop-filter=' + seg.backdropFilter);
  line('             page bg  =' + seg.pageBg + '   (same colour => content is guillotined at the edge, no surface separation)');
  line('             scrollWidth=' + seg.scrollWidth + ' vs clientWidth=' + seg.clientWidth + ' => ' + (seg.scrollWidth / seg.clientWidth).toFixed(1) + ' screens of tabs, ' + seg.tabs + ' tabs');
  await p.screenshot({ path: `${SHOTS}/f15-model-390.png` });
  await ctx.close();
}

await b.close();
