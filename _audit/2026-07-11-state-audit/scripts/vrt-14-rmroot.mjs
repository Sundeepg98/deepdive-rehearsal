/* Root-cause the reduced-motion blank paint: diff EVERY paint-relevant computed prop
   on the ancestor chain, normal vs reduce, on the SAME page. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(2000);

const PROPS = ['opacity','visibility','display','contentVisibility','filter','backdropFilter','transform','clipPath','mask','maskImage','willChange','contain','isolation','mixBlendMode','animationName','animationDuration','animationFillMode','animationIterationCount','zIndex','position','overflow','height','width'];
const snap = () => p.evaluate((PROPS) => {
  const sel = ['html','body','.app','.sidebar','.stage','.stage .pane.on','.companion'];
  const o = {};
  for (const s of sel) {
    const el = document.querySelector(s);
    if (!el) continue;
    const cs = getComputedStyle(el);
    o[s] = {};
    for (const pr of PROPS) o[s][pr] = cs[pr];
    const r = el.getBoundingClientRect();
    o[s]._rect = `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
  }
  return o;
}, PROPS);

const a = await snap();
await p.emulateMedia({ reducedMotion: 'reduce' });
await p.waitForTimeout(1200);
const c = await snap();

console.log('=== computed-style DIFF: normal -> reduce (only changed props shown) ===');
let any = false;
for (const sel of Object.keys(a)) {
  const diffs = [];
  for (const k of Object.keys(a[sel])) {
    if (a[sel][k] !== c[sel][k]) diffs.push(`   ${k}: "${a[sel][k]}"  ->  "${c[sel][k]}"`);
  }
  if (diffs.length) { any = true; console.log('\n' + sel + ':'); diffs.forEach(d => console.log(d)); }
}
if (!any) console.log('  (NO computed-style differences on any ancestor — layout/paint props identical)');

// Are there running animations that never finish?
const anims = await p.evaluate(() => document.getAnimations().map(x => ({
  name: x.animationName || (x.effect && x.effect.getKeyframes && 'kf'), playState: x.playState,
  target: x.effect && x.effect.target ? (x.effect.target.tagName + '.' + (typeof x.effect.target.className === 'string' ? x.effect.target.className.split(' ')[0] : '')) : '?',
})));
console.log('\nrunning animations under reduce:', anims.length, JSON.stringify(anims.slice(0, 6)));

// BISECT: re-enable painting by neutralising each reduce rule
const tests = [
  ['baseline (reduce, nothing patched)', ''],
  ['un-hide .stage::before/::after', '.stage::before,.stage::after{display:block!important}'],
  ['restore animation-duration', '*,*::before,*::after{animation-duration:revert!important;animation-iteration-count:revert!important}'],
  ['restore transition-duration', '*,*::before,*::after{transition-duration:revert!important}'],
  ['force everything visible/opaque', 'html,body,.app,.sidebar,.stage,.pane,.companion{opacity:1!important;visibility:visible!important;filter:none!important;content-visibility:visible!important;contain:none!important;will-change:auto!important}'],
];
for (const [label, css] of tests) {
  const handle = css ? await p.addStyleTag({ content: css }) : null;
  await p.waitForTimeout(700);
  const f = SH + 'rmroot-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png';
  await p.screenshot({ path: f });
  console.log('shot:', f);
  if (handle) await p.evaluate(h => h.remove(), handle);
}
await b.close();
