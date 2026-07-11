/* Final quantification across all 46 topics:
   (1) .mbeat-l label gutter (fixed 76px) -- how many lines does the label wrap to?
   (2) .msel phantom track -- how many topics render <3 model tabs? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
const ids = await p.evaluate(() => TopicRegistry.ids());

const rows = [];
for (const t of ids) {
  await p.goto(URL + '#' + t + '/model', { waitUntil: 'load' });
  await p.waitForTimeout(180);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-model-answers').shadowRoot;
    const msel = sr.querySelector('#msel');
    const labels = [...sr.querySelectorAll('.mbeat-l')].map(e => {
      const cr = e.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(e).lineHeight) || 12;
      return { chars: e.textContent.trim().length, lines: Math.round(cr.height / lh), w: Math.round(cr.width) };
    });
    return {
      tabs: msel ? msel.children.length : 0,
      tracks: msel ? getComputedStyle(msel).gridTemplateColumns.split(' ').length : 0,
      labels
    };
  });
  const worst = r.labels.reduce((m, l) => (!m || l.lines > m.lines) ? l : m, null);
  rows.push({ t, tabs: r.tabs, tracks: r.tracks, worst, n: r.labels.length });
}
await b.close();

console.log('=== (1) .mbeat-l  -- fixed 76px gutter (model-answers/logic.js:31) ===');
const bad = rows.filter(r => r.worst && r.worst.lines >= 4).sort((a, b2) => b2.worst.lines - a.worst.lines);
const ok = rows.filter(r => r.worst && r.worst.lines <= 2);
console.log(`  ${bad.length}/46 topics have a beat label wrapping to >=4 lines in the 76px gutter`);
console.log(`  ${ok.length}/46 topics keep every label to <=2 lines (as designed)`);
console.log('\n  worst offenders:');
bad.slice(0, 10).forEach(r => console.log(`    ${r.t.padEnd(26)} label=${r.worst.chars} chars -> ${r.worst.lines} lines in a ${r.worst.w}px gutter`));
console.log('\n  healthy (hand-authored) examples:');
ok.slice(0, 5).forEach(r => console.log(`    ${r.t.padEnd(26)} label=${r.worst.chars} chars -> ${r.worst.lines} line(s)`));

console.log('\n=== (2) #msel phantom grid track (repeat(3,...) hardcoded, logic.js:22) ===');
const phantom = rows.filter(r => r.tracks > r.tabs && r.tabs > 0);
console.log(`  ${phantom.length}/46 topics render fewer tabs than the 3 hardcoded grid tracks`);
const byTabs = {};
rows.forEach(r => { byTabs[r.tabs] = (byTabs[r.tabs] || 0) + 1; });
console.log('  tab-count distribution:', JSON.stringify(byTabs), '(grid always reserves 3 tracks)');
