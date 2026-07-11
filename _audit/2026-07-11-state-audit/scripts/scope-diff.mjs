import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.addScriptTag({ content: `window.__t=function(r){let s='';const f=n=>{if(n.nodeType===3){s+=n.nodeValue+' ';return}if(n.nodeType!==1)return;if(getComputedStyle(n).display==='none')return;if(n.shadowRoot)n.shadowRoot.childNodes.forEach(f);n.childNodes.forEach(f)};f(r);return s.replace(/\s+/g,' ').trim()}`});
const hashes = [];
for (const i of [0, 12, 30]) {
  const open = await p.evaluate(() => !!document.querySelector('.ix-ov.open'));
  if (!open) await p.click('#idxopen');
  await p.waitForTimeout(600);
  const cards = await p.$$('.ix-card');
  const name = await cards[i].evaluate(e => e.querySelector('.ix-c-name').textContent.trim());
  await cards[i].click(); await p.waitForTimeout(900);
  await p.click('#scopeopen'); await p.waitForTimeout(1000);
  const body = await p.evaluate(() => window.__t(document.querySelector('#scopeov')));
  hashes.push({ name, len: body.length, slice: body.slice(200, 430) });
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
}
hashes.forEach(h => console.log(`\nTOPIC: ${h.name}  (scope body ${h.len} chars)\n  ...${h.slice}...`));
console.log('\nALL THREE SCOPE BODIES IDENTICAL? ->', hashes[0].slice === hashes[1].slice && hashes[1].slice === hashes[2].slice);
await b.close();
