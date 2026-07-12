import { chromium } from 'playwright';
import fs from 'fs';
const BUILDS = {
  BEFORE: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html',
  AFTER: 'D:/claude-workspace/deepdive-rehearsal/dist/index.html',
};

// deep walker: descends into shadow roots. NOTE: page.evaluate(string) needs an EXPRESSION,
// so the whole probe is one IIFE with deepAll declared inside it.
const DEEP = `(() => {
  const deepAll = (root, out) => { out = out || [];
    root.querySelectorAll('*').forEach(n => { out.push(n); if (n.shadowRoot) deepAll(n.shadowRoot, out); });
    return out;
  };`;

const br = await chromium.launch();
const report = [];
for (const [build, path] of Object.entries(BUILDS)) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('file:///' + path); await p.waitForTimeout(2200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // go to the drill pane of the default topic
  await p.evaluate(() => { location.hash = '#content-pipeline/drill'; });
  await p.waitForTimeout(1400);

  for (const theme of ['light', 'dark']) {
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(400);
    const r = await p.evaluate(DEEP + `
      const els = deepAll(document);
      const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none' && +s.opacity>0.01; };
      const interactive = e => /^(BUTTON|A|INPUT|SELECT|SUMMARY|TEXTAREA)$/.test(e.tagName) || e.getAttribute('role')==='button' || e.hasAttribute('data-tab') || e.hasAttribute('data-topic');
      const small = [];
      els.filter(e => interactive(e) && vis(e)).forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.height < 44 || r.width < 44) small.push({ tag: e.tagName, id: e.id||'', cls: (e.className||'').toString().split(' ')[0], w: Math.round(r.width), h: Math.round(r.height), txt: (e.innerText||'').trim().slice(0,20) });
      });
      // does the drill QUESTION render inside the viewport, above the sticky bar?
      const q = els.find(e => /Export a 1,000,000-row CSV/i.test(e.textContent||'') && e.children.length===0);
      let question = null;
      if (q) { const r = q.getBoundingClientRect();
        // find the sticky bottom bar
        const bars = els.filter(e => { const s=getComputedStyle(e); const rr=e.getBoundingClientRect(); return (s.position==='fixed'||s.position==='sticky') && rr.bottom>=window.innerHeight-4 && rr.height>30 && rr.width>200 && vis(e); });
        const barTop = bars.length ? Math.min(...bars.map(b=>b.getBoundingClientRect().top)) : window.innerHeight;
        question = { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, barTop: Math.round(barTop),
                     fullyVisible: r.top>=0 && r.bottom <= barTop, occludedByBar: r.bottom > barTop, offscreen: r.top > window.innerHeight };
      }
      return { totalInteractive: els.filter(e=>interactive(e)&&vis(e)).length, smallCount: small.length, small: small.slice(0,12),
               overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth+1,
               scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
               question, deepNodes: els.length };
    })()`);
    report.push({ build, theme, ...r });
    await p.screenshot({ path: `D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/shots/drillQ_mobile_${theme}_${build}.png` });
  }
  await ctx.close();
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/mobile2.json', JSON.stringify(report, null, 2));
console.log('=== MOBILE 390x844, drill pane, SHADOW-DOM PIERCED ===\n');
report.forEach(r => {
  console.log(`--- ${r.build} / ${r.theme} --- (deep nodes: ${r.deepNodes})`);
  console.log(`  horizontal overflow : ${r.overflowX ? 'YES ' + r.scrollW + '>' + r.clientW : 'no'}`);
  console.log(`  interactive elements: ${r.totalInteractive}, under 44px: ${r.smallCount}`);
  if (r.question) {
    const q = r.question;
    console.log(`  DRILL QUESTION      : top=${q.top} bottom=${q.bottom} stickyBarTop=${q.barTop} vh=${q.vh}`);
    console.log(`                      -> ${q.fullyVisible ? 'FULLY VISIBLE' : (q.offscreen ? 'OFF-SCREEN' : (q.occludedByBar ? 'OCCLUDED BY STICKY BAR' : '?'))}`);
  } else console.log('  DRILL QUESTION      : not found in DOM');
  if (r.small.length) console.log('  worst taps: ' + r.small.slice(0, 5).map(s => `${s.tag}${s.id ? '#' + s.id : '.' + s.cls}(${s.w}x${s.h})`).join(' '));
  console.log('');
});
await br.close();
