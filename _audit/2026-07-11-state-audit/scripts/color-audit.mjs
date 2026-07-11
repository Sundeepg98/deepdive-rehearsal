import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.click('.ix-card'); await p.waitForTimeout(800);

await p.addScriptTag({ content: `
window.__lum = function(c){
  const m = c.match(/\\d+(\\.\\d+)?/g).map(Number);
  const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
  return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);
};
window.__cr = function(a,b){ const L1=window.__lum(a), L2=window.__lum(b); const hi=Math.max(L1,L2), lo=Math.min(L1,L2); return +((hi+0.05)/(lo+0.05)).toFixed(2); };
window.__hex = function(c){ const m=c.match(/\\d+(\\.\\d+)?/g).map(Number); return '#'+m.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''); };
window.__bgOf = function(el){
  let e=el;
  while(e && e!==document.documentElement){
    const bg=getComputedStyle(e).backgroundColor;
    if(bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
    e = e.parentElement || (e.getRootNode&&e.getRootNode().host);
  }
  return getComputedStyle(document.body).backgroundColor;
};`});

for (const theme of ['light', 'dark']) {
  await p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(500);
  console.log(`\n########## THEME: ${theme.toUpperCase()} ##########`);

  // A. surface separation between the 3 columns
  const surf = await p.evaluate(() => {
    const px = (s) => { const e = document.querySelector(s); const cs = getComputedStyle(e); return { bg: cs.backgroundColor, bgi: cs.backgroundImage.slice(0, 50) }; };
    const cs = getComputedStyle(document.documentElement);
    const tok = n => cs.getPropertyValue(n).trim();
    // effective painted color of the 3 columns: read the token behind them
    return {
      bodyBG: getComputedStyle(document.body).backgroundColor,
      sidebar: px('.sidebar'), stage: px('.stage'), companion: px('.companion'),
      tokens: { bg: tok('--bg'), card: tok('--card'), bd: tok('--bd'), ink: tok('--ink'), mut: tok('--mut'), mut2: tok('--mut2'), acc: tok('--acc'), accink: tok('--accink'), accbg: tok('--accbg') }
    };
  });
  console.log('SURFACES:', JSON.stringify(surf.tokens));
  console.log(' body bg     :', surf.bodyBG);
  console.log(' .sidebar    :', surf.sidebar.bgi || surf.sidebar.bg);
  console.log(' .stage      :', surf.stage.bg);
  console.log(' .companion  :', surf.companion.bgi || surf.companion.bg);

  // B. contrast of key text roles
  const contrast = await p.evaluate(() => {
    const roles = [
      ['.cmp-thesis', 'companion thesis (prose)'],
      ['.cmp-note', 'companion note'],
      ['.cmp-h', 'companion section head'],
      ['.cmp-drive', 'companion drive text'],
      ['.sidebar .seg button:not(.on) .n', 'sidebar nav sublabel'],
      ['.sidebar .seg button:not(.on) > span:first-child', 'sidebar nav label'],
      ['.mb-d', 'tools row description'],
      ['.mb-t', 'tools row title'],
      ['.stage-head .sh-kick', 'stage kicker'],
      ['.stage-head .sh-name', 'stage title'],
      ['.tn-eyebrow', 'topicnav eyebrow'],
      ['.pomodoro-phase', 'pomodoro phase'],
      ['.textzoom-lbl', 'text-size label'],
      ['.ix-c-thesis', 'index card thesis'],
      ['.ix-c-tail', 'index card tail'],
      ['.locator', 'locator chip'],
    ];
    const out = [];
    for (const [sel, name] of roles) {
      const e = document.querySelector(sel);
      if (!e) continue;
      const cs = getComputedStyle(e);
      const fg = cs.color, bg = window.__bgOf(e);
      const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight) || 400;
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      const ratio = window.__cr(fg, bg);
      const need = large ? 3 : 4.5;
      out.push({ name, sel, fs, fw, fg: window.__hex(fg), bg: window.__hex(bg), ratio, need, pass: ratio >= need });
    }
    return out;
  });
  console.log('\n CONTRAST (WCAG AA):');
  contrast.forEach(c => console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${String(c.ratio).padStart(5)}:1 (need ${c.need})  ${c.fs}px/${c.fw}  ${c.fg} on ${c.bg}  — ${c.name}`));

  // shadow-DOM roles
  await p.click('.seg button[data-tab="num"]'); await p.waitForTimeout(500);
  const sd = await p.evaluate(() => {
    const sr = document.querySelector('deep-numbers').shadowRoot;
    const out = [];
    for (const [sel, name] of [['.nrow-n', 'numbers row note'], ['.num-h', 'numbers section head'], ['.nrow-k', 'numbers row key']]) {
      const e = sr.querySelector(sel); if (!e) continue;
      const cs = getComputedStyle(e);
      out.push({ name, fs: parseFloat(cs.fontSize), fw: cs.fontWeight, fg: window.__hex(cs.color), bg: window.__hex(window.__bgOf(e)), ratio: window.__cr(cs.color, window.__bgOf(e)) });
    }
    return out;
  });
  sd.forEach(c => console.log(`  ${c.ratio >= 4.5 ? 'PASS' : 'FAIL'} ${String(c.ratio).padStart(5)}:1 (need 4.5)  ${c.fs}px/${c.fw}  ${c.fg} on ${c.bg}  — ${c.name}`));
  await p.click('.seg button[data-tab="walk"]'); await p.waitForTimeout(400);
}

// C. group-color identity system — is it used outside the index?
await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
await p.waitForTimeout(300);
const groups = await p.evaluate(() => {
  const dots = [...document.querySelectorAll('.ix-g-dot')].map(d => getComputedStyle(d).backgroundColor);
  const loc = document.querySelector('.loc-dot');
  return {
    groupDots: dots,
    locatorDot: loc ? getComputedStyle(loc).backgroundColor : null,
    // does the group colour appear anywhere in the stage / sidebar / companion chrome?
    accentUsedInStage: getComputedStyle(document.querySelector('.stage-head .sh-kick')).color,
    cmpEyebrow: getComputedStyle(document.querySelector('.cmp-eyebrow')).color,
  };
});
console.log('\n########## GROUP COLOUR IDENTITY ##########');
console.log(' 6 group dot colours :', JSON.stringify(groups.groupDots));
console.log(' locator dot (current topic group):', groups.locatorDot);
console.log(' stage kicker colour  :', groups.accentUsedInStage, '  <- generic accent, NOT the group colour');
console.log(' companion eyebrow    :', groups.cmpEyebrow, '  <- generic accent, NOT the group colour');

await b.close();
