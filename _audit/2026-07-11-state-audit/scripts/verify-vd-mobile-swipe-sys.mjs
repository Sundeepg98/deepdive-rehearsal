import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900);
const x = await p.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p.waitForTimeout(400); }

async function swipe(y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 330, y }] });
  for (const xx of [250, 160, 70]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: xx, y: y + 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
  return p.evaluate(() => location.hash);
}
const hash = () => p.evaluate(() => location.hash);

await p.evaluate(() => window.Router.navigate('sys'));
await p.waitForTimeout(800);
console.log('parked on:', await hash());

// What is under the touch point at various heights on the System Map pane?
const probes = await p.evaluate(() => {
  const out = [];
  for (const y of [420, 500, 600, 700, 760]) {
    const el = document.elementFromPoint(330, y);
    let chain = null, node = el;
    while (node) { if (node.matches && node.matches('.chain, .dgm')) { chain = node.className; break; } node = node.parentElement || (node.getRootNode && node.getRootNode().host); }
    out.push({ y, el: el ? el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0] : null, blockedBy: chain });
  }
  return out;
});
console.log('\nwhat is under the swipe start point (x=330) on #sys:');
probes.forEach(pr => console.log(`   y=${String(pr.y).padStart(3)}  element=${String(pr.el).padEnd(26)} inside .chain/.dgm? ${pr.blockedBy || 'no'}`));

console.log('\nswipe attempts from #sys at different y:');
for (const y of [420, 500, 600, 700, 760]) {
  await p.evaluate(() => window.Router.navigate('sys'));
  await p.waitForTimeout(600);
  const after = await swipe(y);
  console.log(`   swipe at y=${String(y).padStart(3)}  ->  ${after}   ${after.includes('sys') ? '[BLOCKED - did not navigate]' : '[navigated OK]'}`);
}
await b.close();
