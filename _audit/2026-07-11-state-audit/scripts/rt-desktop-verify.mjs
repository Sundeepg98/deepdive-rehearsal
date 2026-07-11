/* RE-VERIFY every candidate with animations DISABLED (reducedMotion:'reduce' -> the app's
   own @media(prefers-reduced-motion) rule sets animation-duration:.01ms) and a long settle.
   The pane entrance animation uses scale(.995)+blur, which perturbs scrollWidth mid-flight.
   Anything that survives THIS is a real static layout fact. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

const settle = async () => { await p.waitForTimeout(700); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); };

await p.goto(URL, { waitUntil: 'load' });
await settle();
const ids = await p.evaluate(() => TopicRegistry.ids());
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

console.log('=== A. .stage clipping (overflow-x:hidden) -- ALL 46 topics x 9 views, animations OFF ===');
for (const vw of [768, 1024, 1280, 1440, 1920]) {
  await p.setViewportSize({ width: vw, height: 900 });
  const hits = [];
  for (const t of ids) {
    for (const v of VIEWS) {
      await p.goto(URL + '#' + t + '/' + v, { waitUntil: 'load' });
      await p.waitForTimeout(120);
      const r = await p.evaluate(() => {
        const s = document.querySelector('.stage');
        const de = document.documentElement;
        return { stageClip: s.scrollWidth - s.clientWidth, doc: de.scrollWidth - de.clientWidth };
      });
      if (r.stageClip > 1) hits.push(`${t}/${v}(+${r.stageClip})`);
    }
  }
  console.log(`  ${String(vw).padStart(4)}px: ${hits.length}/414 (topic,view) pairs clip the stage` + (hits.length ? ' -> ' + hits.slice(0, 8).join(' ') + (hits.length > 8 ? ' ...' : '') : ''));
}

console.log('\n=== B. document-level horizontal overflow, animations OFF ===');
for (const vw of [320, 360, 400, 440, 768, 1024, 1280, 1440, 1920]) {
  await p.setViewportSize({ width: vw, height: 900 });
  await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
  await settle();
  const r = await p.evaluate(() => { const d = document.documentElement; return { sw: d.scrollWidth, cw: d.clientWidth, over: d.scrollWidth - d.clientWidth }; });
  console.log(`  ${String(vw).padStart(4)}px: scrollWidth=${r.sw} clientWidth=${r.cw} -> ${r.over > 0 ? 'OVERFLOW +' + r.over + 'px' : 'clean'}`);
}

console.log('\n=== C. deep-system-map .piv chip clip (the headline) -- animations OFF ===');
await p.setViewportSize({ width: 1280, height: 800 });
let chipTopics = 0; let worst = { t: null, over: 0 };
for (const t of ids) {
  await p.goto(URL + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(140);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-system-map').shadowRoot;
    const pivs = [...sr.querySelectorAll('.piv')];
    let mx = 0, emptyPa = 0;
    pivs.forEach(pv => {
      mx = Math.max(mx, pv.scrollWidth - pv.clientWidth);
      const pa = pv.querySelector('.pa');
      if (pa && pa.textContent.trim() === '') emptyPa++;
    });
    return { maxClip: mx, pivots: pivs.length, emptyPa };
  });
  if (r.maxClip > 1) { chipTopics++; if (r.maxClip > worst.over) worst = { t, over: r.maxClip }; }
}
console.log(`  ${chipTopics}/46 topics have a .piv clipped horizontally (worst: ${worst.t} +${worst.over}px)`);

console.log('\n=== D. empty .pa (pivot answer body lost into the chip) -- animations OFF ===');
let emptyTopics = [], totalEmpty = 0, totalPiv = 0;
for (const t of ids) {
  await p.goto(URL + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(130);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-system-map').shadowRoot;
    const pivs = [...sr.querySelectorAll('.piv')];
    let empty = 0;
    pivs.forEach(pv => { const pa = pv.querySelector('.pa'); if (!pa || pa.textContent.trim() === '') empty++; });
    return { empty, tot: pivs.length };
  });
  totalEmpty += r.empty; totalPiv += r.tot;
  if (r.empty > 0) emptyTopics.push(t + '(' + r.empty + '/' + r.tot + ')');
}
console.log(`  ${emptyTopics.length}/46 topics have >=1 pivot whose ANSWER BODY (.pa) is EMPTY`);
console.log(`  ${totalEmpty}/${totalPiv} pivot answers across the app are blank (the prose is trapped in the clipped chip)`);
console.log('  affected:', emptyTopics.slice(0, 12).join(', '), emptyTopics.length > 12 ? '...' : '');

console.log('\n=== E. .tn-current topic pill truncation -- animations OFF ===');
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await settle();
for (const vw of [1024, 1280, 1440, 1920]) {
  await p.setViewportSize({ width: vw, height: 900 });
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const e = document.getElementById('tncurrent');
    return { text: e.textContent.trim(), clientW: e.clientWidth, scrollW: e.scrollWidth, pct: Math.round(100 * e.clientWidth / e.scrollWidth) };
  });
  console.log(`  ${String(vw).padStart(4)}px: "${r.text}" -> ${r.clientW}px of ${r.scrollW}px visible (${r.pct}%)`);
}

console.log('\n=== F. span.badge (suspected false positive) ===');
for (const vw of [1160, 1440, 1920]) {
  await p.setViewportSize({ width: vw, height: 900 });
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const e = document.querySelector('span.badge');
    return e ? { clientW: e.clientWidth, scrollW: e.scrollWidth, clip: e.scrollWidth - e.clientWidth } : null;
  });
  console.log(`  ${vw}px:`, JSON.stringify(r));
}
await b.close();
