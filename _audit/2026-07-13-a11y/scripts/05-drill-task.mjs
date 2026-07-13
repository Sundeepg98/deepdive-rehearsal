/* THE REAL TASK, with REAL TOUCH: pick a topic -> run a drill -> grade a card.
 *
 * Every interaction is page.tap() / locator.tap(), not el.click(). A synthetic
 * .click() ignores hit-testing and will happily "press" a button that is buried
 * under a fixed bar; a tap is delivered at coordinates and is INTERCEPTED, the
 * same way a thumb is. If a step fails here, it fails on a phone.
 *
 * Run twice: at 100% text, and at 200% text (the phone accessibility setting).
 * Then check the drill's feedback - the scoreboard - is perceivable without
 * colour, since it is the drill's ONLY feedback.
 */
import path from 'node:path';
import { launch, phone, installDeep, judge, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';
ensureDirs();

const ZOOM = `window.__setTextZoom=function(f){const a=[];const w=(r)=>{for(const e of r.querySelectorAll('*')){a.push(e);if(e.shadowRoot)w(e.shadowRoot);}};w(document);
for(const e of a){if(!e.dataset)continue;if(e.dataset.__basefs===undefined)e.dataset.__basefs=parseFloat(getComputedStyle(e).fontSize)||16;e.style.setProperty('font-size',(parseFloat(e.dataset.__basefs)*f)+'px','important');}};`;

async function runTask(b, zoomFactor) {
  const label = `${zoomFactor * 100}% text`;
  const p = await phone(b, PHONES.p390);
  await installDeep(p);
  await p.evaluate(ZOOM);
  const log = [];
  const step = async (name, fn) => {
    try { await fn(); log.push({ name, ok: true }); console.log(`   ok   ${name}`); }
    catch (e) {
      const msg = String(e.message).split('\n')[0].slice(0, 110);
      log.push({ name, ok: false, error: msg });
      console.log(`   FAIL ${name}\n          ${msg}`);
    }
  };

  console.log(`\n########## THE DRILL TASK @ ${label} ##########`);

  // 1. pick a topic with a thumb
  await step('tap a topic card in the first-run index', async () => {
    await p.locator('.ix-card').first().tap({ timeout: 6000 });
    await p.waitForTimeout(900);
  });
  if (zoomFactor !== 1) { await p.evaluate((f) => window.__setTextZoom(f), zoomFactor); await p.waitForTimeout(700); }

  // 2. reach the Probe Drill tab (it lives in a 976px-wide strip on a 390px screen)
  await step('tap the "Probe Drill" tab in the pane strip', async () => {
    const tab = p.locator('.seg button[data-tab="drill"]');
    await tab.scrollIntoViewIfNeeded();
    await tab.tap({ timeout: 6000 });
    await p.waitForTimeout(900);
  });

  // 3. work the card: Reveal answer -> ... -> judge
  const drill = () => p.locator('deep-drill').locator('#adv');
  for (let i = 0; i < 4; i++) {
    const has = await p.evaluate(() => !!document.querySelector('deep-drill').shadowRoot.querySelector('#adv'));
    if (!has) break;
    await step(`tap "${await p.evaluate(() => document.querySelector('deep-drill').shadowRoot.querySelector('#adv').textContent.trim())}"`, async () => {
      const el = drill();
      await el.scrollIntoViewIfNeeded();
      await el.tap({ timeout: 6000 });
      await p.waitForTimeout(700);
    });
  }

  // 4. must-hit checklist + the grade
  const mhp = await p.evaluate(() => document.querySelector('deep-drill').shadowRoot.querySelectorAll('.mhp-i').length);
  console.log(`   (must-hit checkboxes on this card: ${mhp})`);
  if (mhp) {
    await step('tap a "must-hit point" checkbox', async () => {
      const el = p.locator('deep-drill').locator('.mhp-i').first();
      await el.scrollIntoViewIfNeeded();
      await el.tap({ timeout: 6000 });
      await p.waitForTimeout(400);
    });
  }

  const before = await p.evaluate(() => {
    const r = document.querySelector('deep-drill').shadowRoot;
    return { got: r.querySelector('#sGot')?.textContent, shk: r.querySelector('#sShk')?.textContent, left: r.querySelector('#sLeft')?.textContent };
  });

  await step('tap the "Solid" grade button', async () => {
    const el = p.locator('deep-drill').locator('#jg');
    await el.scrollIntoViewIfNeeded();
    await el.tap({ timeout: 6000 });
    await p.waitForTimeout(800);
  });

  const after = await p.evaluate(() => {
    const r = document.querySelector('deep-drill').shadowRoot;
    return { got: r.querySelector('#sGot')?.textContent, shk: r.querySelector('#sShk')?.textContent, left: r.querySelector('#sLeft')?.textContent };
  });
  const scored = before.got !== after.got;
  console.log(`   scoreboard Solid: ${before.got} -> ${after.got}  ${scored ? '(REGISTERED)' : '*** DID NOT MOVE ***'}`);

  // measure the tap targets we actually used
  const sizes = await p.evaluate(() => {
    const r = document.querySelector('deep-drill').shadowRoot;
    const out = {};
    for (const [k, s] of [['Missed', '#jm'], ['Shaky', '#js'], ['Solid', '#jg'], ['must-hit item', '.mhp-i'], ['Reveal', '#adv']]) {
      const el = r.querySelector(s);
      if (el) out[k] = window.__tapArea(el);
    }
    return out;
  });
  console.log('   grade-control tap areas:');
  for (const [k, v] of Object.entries(sizes)) {
    if (!v) continue;
    if (v.occluded) { console.log(`     ${k.padEnd(14)} OCCLUDED (${v.reason}${v.occludedBy ? ' by ' + v.occludedBy : ''})  rect ${v.rectW}x${v.rectH}`); continue; }
    console.log(`     ${k.padEnd(14)} rect ${v.rectW}x${v.rectH}  TAP ${v.hitW}x${v.hitH}  => ${judge(v, 44)}`);
  }

  await p.screenshot({ path: path.join(SHOTS, `05-drill-task-${zoomFactor * 100}pct.png`) });
  const failed = log.filter((l) => !l.ok);
  console.log(`   RESULT: ${log.length - failed.length}/${log.length} steps completed by touch; scoreboard ${scored ? 'updated' : 'DID NOT UPDATE'}`);
  const res = { label, log, before, after, scored, sizes, failedSteps: failed.length };
  await p.context().close();
  return res;
}

const b = await launch();
const at100 = await runTask(b, 1);
const at200 = await runTask(b, 2);

/* ---- NEGATIVE CONTROL: prove tap() really is intercepted by a cover ---- */
{
  const p = await phone(b, PHONES.p390);
  await installDeep(p);
  await p.locator('.ix-card').first().tap().catch(() => {});
  await p.waitForTimeout(900);
  await p.locator('.seg button[data-tab="drill"]').tap().catch(() => {});
  await p.waitForTimeout(800);
  let baselineOk = true;
  try { await p.locator('deep-drill').locator('#adv').tap({ timeout: 4000 }); } catch (e) { baselineOk = false; }
  await p.waitForTimeout(500);
  // now bury the drill under a transparent full-screen cover and tap again
  await p.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__nc_cover';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:transparent';
    document.body.appendChild(d);
  });
  let coveredOk = true; let err = '';
  try { await p.locator('deep-drill').locator('#adv').tap({ timeout: 4000 }); }
  catch (e) { coveredOk = false; err = String(e.message).split('\n')[0].slice(0, 80); }
  console.log('\n=============== NEGATIVE CONTROL (touch really is hit-tested) ===============');
  console.log(`   tap "Reveal answer" as shipped        : ${baselineOk ? 'delivered' : 'BLOCKED'}`);
  console.log(`   tap it under a transparent full cover : ${coveredOk ? 'delivered' : 'BLOCKED'}  ${err}`);
  console.log('   ' + (baselineOk && !coveredOk
    ? 'OK — tap() is genuinely intercepted by an overlay. A passing tap is real evidence, not a forced click.'
    : '*** tap() is NOT hit-tested - the task results prove nothing ***'));
  await p.context().close();
}
await b.close();
save('05-drill-task.json', { at100, at200 });
