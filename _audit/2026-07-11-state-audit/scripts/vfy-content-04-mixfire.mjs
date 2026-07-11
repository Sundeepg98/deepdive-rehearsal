/* ADVERSARIAL VERIFY: drive the REAL Mixed Fire tool and walk its whole pool,
   hunting the literal "undefined" in the curveball task slot. Pierces the shadow root. */
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

// discover the mixov host + its shadow root
const disc = await p.evaluate(() => {
  const ov = document.getElementById('mixov');
  return { tag: ov ? ov.tagName : null, hasShadow: ov ? !!ov.shadowRoot : false, cls: ov ? ov.className : null };
});
console.log('mixov host:', JSON.stringify(disc));

async function run(topicId, label) {
  await p.evaluate(id => TopicRegistry.setTopic(id), topicId);
  await p.waitForTimeout(300);
  const pool = await p.evaluate(() => ({ curveballs: curveballPool.length, cards: _allCards.length }));
  console.log('\n##### ' + label + ' (' + topicId + ') curveballPool=' + pool.curveballs + ' cards=' + pool.cards);

  await p.evaluate(() => { const btn = [...document.querySelectorAll('button,a')].find(x => /mixed\s*fire/i.test(x.textContent || '')); if (btn) btn.click(); });
  await p.waitForTimeout(700);

  const items = [];
  for (let i = 0; i < 25; i++) {
    const st = await p.evaluate(() => {
      const ov = document.getElementById('mixov');
      if (!ov || !ov.classList.contains('open')) return { gone: true };
      const sr = document.querySelector('deep-mixed-fire').shadowRoot;
      const body = sr.getElementById('mixbody');
      if (!body) return { gone: true, why: 'no mixbody' };
      const kindEl = body.querySelector('.mx-kind');
      const task = body.querySelector('.mx-task');
      const qq = body.querySelector('.qq');
      const rc = task ? task.getBoundingClientRect() : null;
      return {
        prog: (body.querySelector('.mx-prog') || {}).textContent || '',
        kind: (kindEl || {}).textContent || '',
        label: (body.querySelector('.mx-label') || {}).textContent || '',
        taskExists: !!task,
        taskText: task ? task.textContent : null,
        taskRect: rc ? { x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height) } : null,
        qqText: qq ? (qq.textContent || '').slice(0, 120) : null,
        bodyVisibleText: (body.innerText || ''),
        hasUndefined: (body.innerText || '').includes('undefined'),
        atEnd: !!body.querySelector('.mx-end')
      };
    });
    if (st.gone) { console.log('  overlay closed/absent', st.why || ''); break; }
    if (st.atEnd) { console.log('  -> reached end screen'); break; }
    items.push({ prog: st.prog, kind: st.kind, taskText: st.taskText, hasUndefined: st.hasUndefined });
    console.log('  ' + st.prog.padEnd(18) + ' kind=' + (st.kind || '?').padEnd(12) + ' task=' + JSON.stringify(st.taskText) + ' undefinedOnScreen=' + st.hasUndefined);

    if (st.kind && /curve/i.test(st.kind)) {
      console.log('    *** CURVEBALL FOUND. taskRect=' + JSON.stringify(st.taskRect));
      console.log('    *** visible text:\n      ' + st.bodyVisibleText.split('\n').slice(0, 8).join('\n      '));
      await p.screenshot({ path: SHOTS + '/MIXFIRE-curveball-' + topicId + '.png' });
      if (st.taskRect && st.taskRect.h > 0) {
        await p.screenshot({ path: SHOTS + '/CROP-mixfire-task-' + topicId + '.png',
          clip: { x: Math.max(0, st.taskRect.x - 30), y: Math.max(0, st.taskRect.y - 90), width: Math.min(1000, st.taskRect.w + 60), height: st.taskRect.h + 120 } });
      }
      if (st.hasUndefined) return { verdict: 'UNDEFINED RENDERED', item: st };
      return { verdict: 'curveball rendered clean', item: st };
    }
    // advance
    const adv = await p.evaluate(() => {
      const sr = document.querySelector('deep-mixed-fire').shadowRoot;
      const show = sr.getElementById('mxshow');
      if (show) { show.click(); return 'reveal'; }
      const g = sr.getElementById('mxg');
      if (g) { g.click(); return 'grade'; }
      return null;
    });
    if (!adv) { console.log('  no advance control found'); break; }
    await p.waitForTimeout(260);
  }
  return { verdict: 'no curveball reached', items };
}

const md = await run('idempotency', 'COMPILED');
console.log('\nRESULT COMPILED:', md.verdict);
await p.evaluate(() => { const sr = document.querySelector('deep-mixed-fire').shadowRoot; const x = sr.querySelector('.mock-x,.cram-x'); if (x) x.click(); });
await p.waitForTimeout(400);
const or = await run('signing', 'ORIGINAL control');
console.log('\nRESULT ORIGINAL:', or.verdict);

fs.writeFileSync(SHOTS + '/../../scripts/_vfy-mixfire.json', JSON.stringify({ md, or }, null, 1));
await b.close();
