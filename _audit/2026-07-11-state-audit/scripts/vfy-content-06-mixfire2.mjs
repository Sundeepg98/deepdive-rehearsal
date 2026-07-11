/* ADVERSARIAL VERIFY (corrected): walk the REAL Mixed Fire pool to the Curveball item.
   #mxshow is HIDDEN (display:none) after reveal, not removed -> must gate on visibility. */
import { chromium } from 'playwright';
import fs from 'fs';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/vfy-content';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /start|continue|begin/i.test(x.textContent || '') && x.offsetParent !== null); if (g) g.click(); });
await p.waitForTimeout(300);

const SR = () => document.querySelector('deep-mixed-fire').shadowRoot;

async function run(topicId, label) {
  await p.evaluate(id => TopicRegistry.setTopic(id), topicId);
  await p.waitForTimeout(300);
  const pool = await p.evaluate(() => ({ curveballs: curveballPool.length, cards: _allCards.length }));
  await p.evaluate(() => { closeMix(); openMix(); });   // deterministic open, app's own fns
  await p.waitForTimeout(600);
  console.log('\n##### ' + label + ' (' + topicId + ')  curveballPool=' + pool.curveballs);

  for (let i = 0; i < 12; i++) {
    const st = await p.evaluate(() => {
      const sr = document.querySelector('deep-mixed-fire').shadowRoot;
      const body = sr.getElementById('mixbody');
      if (body.querySelector('.mx-end')) return { atEnd: true };
      const task = body.querySelector('.mx-task');
      const rc = task ? task.getBoundingClientRect() : null;
      return {
        prog: (body.querySelector('.mx-prog') || {}).textContent || '',
        kind: (body.querySelector('.mx-kind') || {}).textContent || '',
        taskExists: !!task,
        taskText: task ? task.textContent : null,
        taskRect: rc ? { x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height) } : null,
        visibleText: body.innerText || '',
        hasUndefined: (body.innerText || '').includes('undefined')
      };
    });
    if (st.atEnd) { console.log('  -> end screen'); break; }
    console.log('  ' + st.prog.padEnd(16) + ' kind=' + (st.kind || '?').padEnd(12) + ' taskText=' + JSON.stringify(st.taskText) + '  UNDEFINED-ON-SCREEN=' + st.hasUndefined);

    if (/curve/i.test(st.kind)) {
      console.log('  *** CURVEBALL. rect=' + JSON.stringify(st.taskRect));
      console.log('  *** RENDERED TEXT:\n      | ' + st.visibleText.split('\n').filter(Boolean).slice(0, 6).join('\n      | '));
      await p.screenshot({ path: SHOTS + '/MIXFIRE-curve-' + topicId + '.png' });
      if (st.taskRect && st.taskRect.h > 0) {
        await p.screenshot({ path: SHOTS + '/CROP-mixfire-' + topicId + '.png',
          clip: { x: Math.max(0, st.taskRect.x - 24), y: Math.max(0, st.taskRect.y - 110), width: Math.min(1100, st.taskRect.w + 48), height: st.taskRect.h + 140 } });
      }
      return { verdict: st.hasUndefined ? 'LITERAL "undefined" RENDERED ON SCREEN' : 'curveball clean', st };
    }
    // advance: reveal (only if visible), else grade
    const adv = await p.evaluate(() => {
      const sr = document.querySelector('deep-mixed-fire').shadowRoot;
      const show = sr.getElementById('mxshow');
      if (show && show.style.display !== 'none' && show.getBoundingClientRect().height > 0) { show.click(); return 'reveal'; }
      const g = sr.getElementById('mxg');
      if (g) { g.click(); return 'grade'; }
      return null;
    });
    if (!adv) { console.log('  no advance control'); break; }
    await p.waitForTimeout(220);
  }
  return { verdict: 'no curveball reached in pool' };
}

const md = await run('idempotency', 'COMPILED (md)');
console.log('  >>> COMPILED VERDICT: ' + md.verdict);
const or = await run('signing', 'ORIGINAL control');
console.log('  >>> ORIGINAL VERDICT: ' + or.verdict);

// sweep: how many compiled topics would render "undefined" in the mx-task slot?
const sweep = await p.evaluate(() => {
  const out = { undef: [], clean: [] };
  TopicRegistry.ids().forEach(id => {
    const cbs = TopicRegistry.get(id).data.bank.curveballs || [];
    const anyUndef = cbs.some(cb => cb.task === undefined);
    (anyUndef ? out.undef : out.clean).push(id);
  });
  return out;
});
console.log('\n=== CORPUS SWEEP: topics whose curveball(s) have task===undefined ===');
console.log('  AFFECTED (' + sweep.undef.length + '):', sweep.undef.join(', '));
console.log('  CLEAN    (' + sweep.clean.length + '):', sweep.clean.join(', '));

fs.writeFileSync(SHOTS + '/../../scripts/_vfy-mixfire2.json', JSON.stringify({ md, or, sweep }, null, 1));
await b.close();
