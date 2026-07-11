/* LENS: core flows — (a) is "g" (guided tour) a dead key? (b) do keys 1/2/3 grade the way the docs claim? */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();

console.log('########## (a) "g" on a CLEAN boot, no prior overlay ##########');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  console.log('  index overlay auto-open on fresh boot?', await p.evaluate(() => IndexOverlay.isOpen()));
  console.log('  any [role=dialog][aria-modal].open present?', await p.evaluate(() => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(o => o.classList.contains('open')).map(o => o.id)));
  await p.locator('body').press('g');
  await p.waitForTimeout(600);
  console.log('  press "g" with the boot index overlay open -> TourGuide.isActive():', await p.evaluate(() => TourGuide.isActive()), '(expected false: overlay suppresses global keys)');

  await p.evaluate(() => IndexOverlay.close());
  await p.waitForTimeout(600);
  console.log('\n  now closed the index overlay. open dialogs:', await p.evaluate(() => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(o => o.classList.contains('open')).map(o => o.id)));
  await p.locator('body').press('g');
  await p.waitForTimeout(800);
  const t = await p.evaluate(() => ({ active: TourGuide.isActive(), ov: !!document.getElementById('_tour-overlay'), spot: !!document.getElementById('_tour-spotlight') }));
  console.log('  press "g" with NO overlay open -> ', JSON.stringify(t), t.active ? 'OK — tour started' : '*** DEAD KEY ***');
  await p.screenshot({ path: `${SHOTS}/tour-01-after-g.png` });

  console.log('\n  direct API call TourGuide.start():');
  await p.evaluate(() => TourGuide.start());
  await p.waitForTimeout(700);
  console.log('   ->', JSON.stringify(await p.evaluate(() => ({ active: TourGuide.isActive(), ov: !!document.getElementById('_tour-overlay') }))));
  await p.screenshot({ path: `${SHOTS}/tour-02-direct-start.png` });
  await p.close();
}

console.log('\n\n########## (b) GRADE KEYS: what the shortcuts overlay says vs what the keys DO ##########');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  await p.evaluate(() => IndexOverlay.close());
  await p.waitForTimeout(400);

  const docText = await p.evaluate(() => {
    const r = document.querySelector('deep-keyboard').shadowRoot;
    const rows = [...r.querySelectorAll('.ks-row2, .ks-row')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
    return rows.filter(t => /score|grade|solid|revisit|drill/i.test(t));
  });
  console.log('  SHORTCUTS OVERLAY says:');
  docText.forEach(t => console.log('    > "' + t + '"'));

  const tourText = await p.evaluate(() => {
    // the tour's own copy for the drill step
    return 'see tour-guide.js step: "Graded follow-ups with self-assessment. Press Space to reveal, 1/2 to grade."';
  });
  console.log('  GUIDED TOUR says:');
  console.log('    > ' + tourText);

  await p.click('.seg button[data-tab="drill"]');
  await p.waitForTimeout(500);
  const btnLabels = await p.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    for (let i = 0; i < 6; i++) { const a = r.getElementById('adv'); if (!a) break; a.click(); await new Promise(z => setTimeout(z, 60)); }
    return ['jm', 'js', 'jg'].map(id => { const e = r.getElementById(id); return id + ' = ' + (e ? e.textContent.replace(/\s+/g, ' ').trim() : 'MISSING'); });
  });
  console.log('\n  THE DRILL\'S OWN BUTTONS say:');
  btnLabels.forEach(t => console.log('    > ' + t));
  await p.screenshot({ path: `${SHOTS}/gradekeys-01-buttons.png` });

  // Now press "1" — the overlay tells the user 1/2 = "Solid or Revisit".
  console.log('\n  A user reads "1/2 — Solid or Revisit" and presses "1" intending SOLID:');
  await p.locator('body').press('1');
  await p.waitForTimeout(400);
  const r1 = await p.evaluate(() => {
    const d = document.querySelector('#drill deep-drill');
    const last = d.results[d.results.length - 1];
    return { got: d.got, shk: d.shk, level: last.level, ok: last.ok, signal: last.signal };
  });
  console.log('    RESULT: level=' + r1.level + ' ok=' + r1.ok + '  -> Solid counter=' + r1.got + ', Revisit counter=' + r1.shk);
  console.log('    >>> The probe was recorded as ' + (r1.level === 1 ? 'MISSED (level 1) — the OPPOSITE of what the docs promised' : 'level ' + r1.level));
  console.log('    >>> It was ALSO added to the revisit pile: ' + JSON.stringify(await p.evaluate(() => Progress.get('content-pipeline').revisit)));

  console.log('\n  And the ONLY key that actually records SOLID is "3", which the overlay never mentions:');
  await p.evaluate(async () => { const r = document.querySelector('#drill deep-drill').shadowRoot; for (let i = 0; i < 6; i++) { const a = r.getElementById('adv'); if (!a) break; a.click(); await new Promise(z => setTimeout(z, 60)); } });
  await p.waitForTimeout(200);
  await p.locator('body').press('3');
  await p.waitForTimeout(400);
  const r3 = await p.evaluate(() => { const d = document.querySelector('#drill deep-drill'); const last = d.results[d.results.length - 1]; return { got: d.got, shk: d.shk, level: last.level, ok: last.ok }; });
  console.log('    key "3" -> level=' + r3.level + ' ok=' + r3.ok + '  Solid counter=' + r3.got);
  await p.close();
}
await b.close();
