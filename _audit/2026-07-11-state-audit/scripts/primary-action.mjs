import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.click('.ix-card'); await p.waitForTimeout(800);

const want = { walk: /next/i, drill: /reveal/i, wb: /^reveal$/i, open: /reveal/i };
console.log('=== THE "ADVANCE / REVEAL" ACTION — one verb, N treatments ===');
for (const [tab, re] of Object.entries(want)) {
  await p.click(`.seg button[data-tab="${tab}"]`); await p.waitForTimeout(700);
  const r = await p.evaluate(({ tab, src }) => {
    const rx = new RegExp(src, 'i');
    const sr = document.querySelector(`.pane#${tab} > *`).shadowRoot;
    const btns = [...sr.querySelectorAll('button')].filter(x => rx.test(x.textContent.trim()) && !x.disabled);
    if (!btns.length) return null;
    const e = btns[0], cs = getComputedStyle(e), rc = e.getBoundingClientRect();
    return { text: e.textContent.trim(), w: Math.round(rc.width), h: Math.round(rc.height),
      fs: cs.fontSize, fw: cs.fontWeight, color: cs.color,
      bg: (cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 42) : cs.backgroundColor),
      border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderTopLeftRadius,
      shadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 34), area: Math.round(rc.width * rc.height) };
  }, { tab, src: re.source });
  if (r) console.log(`\n [${tab}] "${r.text}"\n   ${r.w}x${r.h}px (area ${r.area}px2)  font ${r.fs}/${r.fw}  fg ${r.color}\n   bg ${r.bg}\n   border ${r.border}  radius ${r.radius}  shadow ${r.shadow}`);
}
// the sidebar's competing CTA + the topic title
const rail = await p.evaluate(() => {
  const m = document.querySelector('.mockbtn'), h = document.querySelector('.side-id h1'), sh = document.querySelector('.stage-head .sh-name');
  const g = e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), area: Math.round(r.width*r.height), fs: c.fontSize, fw: c.fontWeight, bg: (c.backgroundImage!=='none'?c.backgroundImage.slice(0,44):c.backgroundColor), fill: c.webkitTextFillColor, anim: c.animationName, shadow: c.boxShadow.slice(0,30) }; };
  return { mockCTA: g(m), sidebarTopicH1: g(h), stageTitle: g(sh) };
});
console.log('\n=== COMPETING FOCAL POINTS ===');
console.log(' sidebar Mock CTA   :', JSON.stringify(rail.mockCTA));
console.log(' sidebar topic H1   :', JSON.stringify(rail.sidebarTopicH1));
console.log(' STAGE page title   :', JSON.stringify(rail.stageTitle));
await b.close();
