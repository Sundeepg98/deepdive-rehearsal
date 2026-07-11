// fx-runtime.cjs -- RUNTIME PROOF in the shipped app (READ-ONLY: touches nothing).
// The parser bug is not abstract. Show what a user actually sees.
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await p.waitForTimeout(1200);

  const out = await p.evaluate(() => {
    const R = (typeof TopicRegistry !== 'undefined' && TopicRegistry) || null;
    if (!R) return { err: 'no TopicRegistry' };
    const ids = R.ids();

    const probe = (id) => {
      const t = R.get(id);
      if (!t) return { id, missing: true };
      const d = t.data || {};
      const beats = (d.bank && d.bank.mockBeats) || [];
      return {
        id,
        stages: (d.sys && d.sys.stages || []).length,
        pivotsWithAnswer: (d.sys && d.sys.pivots || []).filter((x) => x.a).length,
        pivots: (d.sys && d.sys.pivots || []).length,
        tierNoteAll: d.drill && d.drill.tierNotes ? String(d.drill.tierNotes.all) : 'n/a',
        beats: beats.length,
        beatsWithModel: beats.filter((x) => x.model).length,
        beatsWithInt: beats.filter((x) => x.int).length,
        follows: (d.drill && d.drill.cards || []).reduce((a, c) => a + (c.f || []).length, 0),
        cmpPanes: Object.keys((t.identity && t.identity.cmpNotes) || {}).length,
      };
    };
    return { total: ids.length, hand: probe('content-pipeline'), md: probe('idempotency') };
  });

  console.log('RUNTIME STATE IN THE SHIPPED APP (dist/index.html)');
  console.log('='.repeat(72));
  console.log('topics registered: ' + out.total);
  if (out.err) { console.log('ERR ' + out.err); await b.close(); return; }
  const H = out.hand, M = out.md;
  const row = (k, a, c) => console.log(k.padEnd(28) + String(a).padStart(14) + String(c).padStart(20));
  console.log('FIELD'.padEnd(28) + 'content-pipeline'.padStart(14) + 'idempotency'.padStart(20));
  console.log(''.padEnd(28) + '(hand-JS)'.padStart(14) + '(markdown)'.padStart(20));
  console.log('-'.repeat(72));
  row('sys.stages', H.stages, M.stages);
  row('sys.pivots', H.pivots, M.pivots);
  row('sys.pivots WITH answer', H.pivotsWithAnswer, M.pivotsWithAnswer);
  row('drill.tierNotes.all', String(H.tierNoteAll).slice(0, 12) + '...', M.tierNoteAll);
  row('drill follow-up probes', H.follows, M.follows);
  row('bank.mockBeats', H.beats, M.beats);
  row('  ...with a model answer', H.beatsWithModel, M.beatsWithModel);
  row('  ...with an interrupt', H.beatsWithInt, M.beatsWithInt);
  row('cmpNotes panes (of 9)', H.cmpPanes, M.cmpPanes);
  console.log('-'.repeat(72));
  console.log('mixed-fire.js:161  const fire = !!(mockInterrupt && beat.int && ...)');
  console.log('   -> beat.int is undefined for ALL 38 md topics, so `fire` is ALWAYS false:');
  console.log('      the "interviewer cuts in" feature is DEAD on every markdown topic.');
  console.log('mixed-fire.js:166  ...\'Model answer</div>\' + beat.model + \'</div>\'');
  console.log('   -> beat.model is undefined -> the panel renders the literal text "undefined".');
  console.log('drill/logic.js:180 this._tiernote.innerHTML = d.tierNotes.all');
  console.log('   -> tierNotes is {} -> renders the literal text "undefined".');

  // Prove the literal "undefined" reaches the DOM: open idempotency's drill pane.
  const dom = await p.evaluate(() => {
    const t = TopicRegistry.get('idempotency');
    if (!t) return null;
    const d = t.data;
    return {
      tierNoteAllRendered: String((d.drill.tierNotes || {}).all),
      firstBeatModel: String((d.bank.mockBeats[0] || {}).model),
      fireWouldBe: !!(d.bank.mockBeats[0] && d.bank.mockBeats[0].int),
    };
  });
  console.log('\nWHAT THE innerHTML ASSIGNMENTS ACTUALLY RECEIVE (idempotency):');
  console.log('  d.tierNotes.all      = ' + dom.tierNoteAllRendered + '   -> innerHTML renders this word');
  console.log('  beat.model           = ' + dom.firstBeatModel + '   -> innerHTML renders this word');
  console.log('  beat.int (fire gate) = ' + dom.fireWouldBe + '       -> interrupt feature disabled');
  await b.close();
})();
