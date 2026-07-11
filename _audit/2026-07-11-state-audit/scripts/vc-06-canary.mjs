/* rt-console VERIFY 06 — CANARY for my own instrument.
   vc-05 reported "0 exceptions thrown, incl. caught ones". That number is only
   trustworthy if the CDP pause-on-all-exceptions probe actually fires. Prove the
   instrument works by throwing-and-catching a canary INSIDE the page (the exact
   shape of the app's 59 empty `catch (e) {}` blocks) and confirming the probe sees it. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();

const consoleErrs = [];
p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });

const cdp = await ctx.newCDPSession(p);
await cdp.send('Debugger.enable');
await cdp.send('Debugger.setPauseOnExceptions', { state: 'all' });
const thrown = [];
cdp.on('Debugger.paused', async (e) => {
  if (e.reason === 'exception' || e.reason === 'promiseRejection') {
    const d = e.data || {};
    thrown.push(String(d.description || d.value || '?').split('\n')[0]);
  }
  try { await cdp.send('Debugger.resume'); } catch (_) {}
});

await p.goto(URL + '#walk', { waitUntil: 'load' });
await p.waitForTimeout(800);

console.log('baseline (real app, no canary): thrown =', thrown.length, ' consoleErrors =', consoleErrs.length);

// Fire a swallowed exception in exactly the shape the app uses: try{...}catch(e){}
await p.evaluate(() => { try { throw new Error('CANARY-SWALLOWED'); } catch (e) { /* empty catch, like the app's 59 */ } });
await p.waitForTimeout(400);

console.log('after swallowed canary       : thrown =', thrown.length, JSON.stringify(thrown));
console.log('  -> console errors from it  :', consoleErrs.length, '(a swallowed throw is INVISIBLE to page.on(console) — that is the point)');

const ok = thrown.some(t => t.includes('CANARY-SWALLOWED'));
console.log('\nINSTRUMENT VALID:', ok ? 'YES — the probe DOES see caught-and-swallowed exceptions, so vc-05\'s "0" is real' : 'NO — probe is broken, vc-05 "0" is meaningless');

await b.close();
