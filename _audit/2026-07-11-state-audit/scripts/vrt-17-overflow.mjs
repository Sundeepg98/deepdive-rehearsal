/* VERIFY F7: "document overflows horizontally at every vw < 411px; clean 411..1920.
   scrollWidth pinned at a hard 411px floor set by nav#topicnav." */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 411, height: 800 } });
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(800);

const at = async (w) => {
  await p.setViewportSize({ width: w, height: 800 });
  await p.waitForTimeout(55);
  return await p.evaluate(() => {
    const de = document.documentElement;
    return { sw: de.scrollWidth, cw: de.clientWidth, over: de.scrollWidth - de.clientWidth };
  });
};

console.log('=== F7: 1px scan 395..425 ===');
let firstClean = null;
for (let w = 395; w <= 425; w++) {
  const r = await at(w);
  if (r.over <= 0 && firstClean === null) firstClean = w;
  if ([395, 400, 405, 409, 410, 411, 412, 415, 420, 425].includes(w))
    console.log(`  vw ${w}: scrollWidth=${r.sw} clientWidth=${r.cw} overflow=${r.over > 0 ? '+' + r.over : 'CLEAN'}`);
}
console.log('  >>> FIRST CLEAN WIDTH =', firstClean, ' [lens said 411]');

console.log('\n=== F7: the lens\'s cited widths ===');
for (const w of [320, 360, 400, 410, 411]) {
  const r = await at(w);
  console.log(`  vw ${w}: scrollWidth=${r.sw}  overflow=${r.over > 0 ? '+' + r.over + 'px' : 'CLEAN'}   [lens: 320->+91, 360->+51, 400->+11, 410->+1, 411->CLEAN]`);
}

console.log('\n=== F7: sweep 411 -> 1920 (step 1) — any dirty width? ===');
let dirty = [];
for (let w = 411; w <= 1920; w++) {
  const r = await at(w);
  if (r.over > 0) dirty.push(w + '(+' + r.over + ')');
}
console.log('  widths with document overflow in [411,1920]:', dirty.length ? dirty.slice(0, 12).join(', ') : 'NONE — all clean');

console.log('\n=== F7: who sets the 411px floor? (at vw 360) ===');
await p.setViewportSize({ width: 360, height: 800 });
await p.waitForTimeout(250);
const culprits = await p.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.left < -5000) continue;                       // offscreen a11y hack
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && cs.overflowX === 'auto') continue;
      if (r.right > vw + 0.5) out.push({
        el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        w: Math.round(r.width), right: Math.round(r.right), minW: cs.minWidth, over: Math.round(r.right - vw),
      });
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(document);
  return out.sort((a, c) => c.right - a.right).slice(0, 8);
});
culprits.forEach(c => console.log(`  right=${c.right} (vw 360, over +${c.over})  ${c.el}  w=${c.w} min-width=${c.minW}`));
await b.close();
