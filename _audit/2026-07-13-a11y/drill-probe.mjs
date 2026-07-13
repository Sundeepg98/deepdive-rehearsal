/* My grading clicks aren't landing (3x 'js' -> Revisit still 0). Before I can say ANYTHING
   about the non-zero Revisit tile I have to actually drive the drill. Dump its real state
   machine: which buttons exist at each step, and what each click does to the counts. */
import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2200);
await page.evaluate(() => document.querySelectorAll('[role=dialog].open,.ix-ov.open').forEach(o => o.classList.remove('open', 'vis')));
await page.evaluate(() => { window.location.hash = '#drill'; });
await page.waitForTimeout(900);

const state = () => page.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const vis = el => { const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && el.offsetParent !== null; };
  return {
    counts: { solid: r.getElementById('sGot')?.textContent, revisit: r.getElementById('sShk')?.textContent, left: r.getElementById('sLeft')?.textContent },
    buttons: [...r.querySelectorAll('button')].filter(vis).map(x => ({ id: x.id || '(no id)', cls: x.className, text: x.textContent.trim().slice(0, 26) })),
    judgeExists: { jm: !!r.getElementById('jm'), js: !!r.getElementById('js'), jg: !!r.getElementById('jg'), adv: !!r.getElementById('adv') },
    advText: r.getElementById('adv')?.textContent.trim(),
  };
});

console.log('=== STEP 0: drill just opened ===');
console.log(JSON.stringify(await state(), null, 2));

const click = async (id) => { await page.evaluate((i) => document.querySelector('#drill deep-drill').shadowRoot.getElementById(i)?.click(), id); await page.waitForTimeout(500); };

console.log('\n=== click #adv (1st) ===');
await click('adv');
console.log(JSON.stringify(await state(), null, 2));

console.log('\n=== click #js (shaky/revisit) ===');
await click('js');
console.log(JSON.stringify(await state(), null, 2));

console.log('\n=== click #adv then #js again ===');
await click('adv');
await click('js');
console.log(JSON.stringify(await state(), null, 2));
await b.close();
