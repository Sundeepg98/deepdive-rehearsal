/* WHY does axe say #75736d where the screen paints #6b6862?
   Two candidate explanations:
     (a) a transient entry ANIMATION — axe sampled mid-fade (ancestor opacity < 1)
     (b) axe is modelling an opacity/alpha the browser never paints
   Settle it: dump the real computed style + every ancestor's opacity (through shadow roots),
   then re-run axe at increasing settle times on the SAME element. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.addScriptTag({ content: AXE });
await page.evaluate(() => TopicRegistry.setTopic('state-machine'));
await page.evaluate(() => document.documentElement.setAttribute('data-group', 'platform-infra'));
await page.evaluate(() => { window.location.hash = '#drill'; });

/* axe at increasing settle times */
console.log('=== axe color-contrast on #drill button[data-m="quick"], by settle time ===');
for (const wait of [150, 300, 600, 1200, 2500, 5000]) {
  await page.evaluate(() => { window.location.hash = '#walk'; });
  await page.waitForTimeout(250);
  await page.evaluate(() => { window.location.hash = '#drill'; });
  await page.evaluate(() => document.documentElement.setAttribute('data-group', 'platform-infra'));
  await page.waitForTimeout(wait);
  const r = await page.evaluate(async () => {
    const res = await axe.run(document.getElementById('drill'), { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
    const hit = res.violations.flatMap(v => v.nodes).find(n => n.target.flat().join(' ').includes('data-m="quick"'));
    return hit ? { ratio: hit.any[0].data.contrastRatio, fg: hit.any[0].data.fgColor, bg: hit.any[0].data.bgColor } : null;
  });
  console.log(`  settle ${String(wait).padStart(5)}ms -> ${r ? `VIOLATION ratio=${r.ratio} fg=${r.fg} bg=${r.bg}` : 'no violation'}`);
}

/* the ground truth: what does the browser actually compute + paint? */
const truth = await page.evaluate(() => {
  const host = document.querySelector('#drill deep-drill');
  const el = host.shadowRoot.querySelector('button[data-m="quick"]');
  const cs = getComputedStyle(el);
  // walk up, crossing the shadow boundary, collecting anything that alters painted colour
  const chain = [];
  let n = el;
  while (n) {
    const s = getComputedStyle(n);
    chain.push({
      node: (n.tagName || n.nodeName) + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/).join('.') : ''),
      opacity: s.opacity, filter: s.filter, mixBlendMode: s.mixBlendMode,
      bg: s.backgroundColor, bgImage: s.backgroundImage === 'none' ? 'none' : s.backgroundImage.slice(0, 42),
      transition: s.transition === 'all 0s ease 0s' ? '' : s.transition.slice(0, 50),
      animation: s.animationName === 'none' ? '' : s.animationName,
    });
    n = n.parentElement || (n.parentNode && n.parentNode.host) || null;
  }
  return {
    color: cs.color, opacity: cs.opacity, bg: cs.backgroundColor,
    bgImage: cs.backgroundImage === 'none' ? 'none' : cs.backgroundImage.slice(0, 70),
    chain: chain.filter(c => c.opacity !== '1' || c.filter !== 'none' || c.mixBlendMode !== 'normal' || c.bgImage !== 'none' || c.animation),
    fullChainLen: chain.length,
  };
});
console.log('\n=== BROWSER GROUND TRUTH for that button ===');
console.log('  computed color   :', truth.color);
console.log('  computed opacity :', truth.opacity);
console.log('  computed bg      :', truth.bg, '| bgImage:', truth.bgImage);
console.log('  ancestors (only those altering paint):');
for (const c of truth.chain) console.log('   ', JSON.stringify(c));
await b.close();
