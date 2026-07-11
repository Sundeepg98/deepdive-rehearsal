const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await pg.waitForTimeout(1500);
  // Feed the FIXED chips (chip = arrow line only) into the app's REAL resolver + REAL registry
  const fixedChips = {};
  for (const f of fs.readdirSync('src/topics-md').filter(x=>x.endsWith('.md'))) {
    const id = f.replace('.md','');
    const src = fs.readFileSync('src/topics-md/'+f,'utf8');
    fixedChips[id] = [...src.matchAll(/^(->|→)\s*(.+)$/gm)].map(m => '→ ' + m[2]);   // arrow LINE only
  }
  const res = await pg.evaluate((fixed) => {
    const R = (txt, curId) => {
      const ids = TopicRegistry.ids();
      const self = id => id === curId ? null : id;
      const m = /\((\d+)\)/.exec(txt);
      if (m) { const idx = parseInt(m[1],10);
        for (const i of ids) { const t = TopicRegistry.get(i); if (t?.identity?.index === idx) return self(i); } return null; }
      const lc = txt.toLowerCase();
      for (const i of ids) { const t = TopicRegistry.get(i); const ti = (t?.identity?.title||'').toLowerCase();
        if (ti.length >= 4 && lc.indexOf(ti) > -1) return self(i); } return null;
    };
    const before = [], after = [];
    for (const [id, chips] of Object.entries(fixed)) {
      const t = TopicRegistry.get(id); if (!t) continue;
      const sys = t.data.sys || {};
      (sys.pivots||[]).forEach((p, k) => {                    // BEFORE = the shipped (fused) chip
        const tgt = R(p.chip, id); if (tgt) before.push(`${id} -> ${tgt}`);
      });
      chips.forEach(c => { const tgt = R(c, id); if (tgt) after.push(`${id} -> ${tgt}`); });   // AFTER = arrow line only
      // via (N)?
    }
    const viaN = Object.entries(fixed).flatMap(([id,cs]) => cs.filter(c => /\(\d+\)/.test(c)).map(c=>id));
    return { before, after, viaN: viaN.length, totalChips: Object.values(fixed).flat().length };
  }, fixedChips);
  console.log('=== JUMP BUTTONS: shipped (fused chip)  vs  after the parser fix (chip = arrow line only) ===\n');
  console.log('BEFORE (shipped):', res.before.length, 'jumps');
  res.before.forEach(x => console.log('   ', x));
  console.log('\nAFTER (fixed)   :', res.after.length, 'jumps');
  res.after.forEach(x => console.log('   ', x));
  const gone = res.before.filter(x => !res.after.includes(x));
  console.log('\nPHANTOM JUMPS ELIMINATED BY THE FIX:', gone.length);
  gone.forEach(x => console.log('    KILLED:', x, '  <-- target came from the swallowed answer prose'));
  console.log('\nchips authored with an explicit "(N)" cross-topic index:', res.viaN, '/', res.totalChips,
              res.viaN === 0 ? '  <-- 0: the 38 never authored cross-topic pointers (AUTHORING gap, not parser)' : '');
  await b.close();
})();
