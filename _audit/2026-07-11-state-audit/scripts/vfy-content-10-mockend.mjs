/* MISSED-FINDING HUNT: mock-run end screen renders
     'Curveball this run: <b>' + mockBeats[mockCurveIdx].theme + '</b>'
   publishBanks() sets mockCurveIdx=0 unless a beat is tagged CURVEBALL. Compiled md topics
   put their curveball under '### Extra Curveballs' (NOT in the mock sequence), so no beat
   carries tag==='CURVEBALL' -> mockCurveIdx stays 0 -> mockBeats[0].theme is undefined. */
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);
const mdIds = fs.readdirSync('D:/claude-workspace/deepdive-rehearsal/src/topics-md').filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''));

const r = await p.evaluate((mdIds) => {
  const out = [];
  TopicRegistry.ids().forEach(id => {
    const bank = TopicRegistry.get(id).data.bank;
    const beats = bank.mockBeats || [];
    let curveIdx = 0;
    for (let i = 0; i < beats.length; i++) if (beats[i].tag === 'CURVEBALL') curveIdx = i;
    const hasCurveTag = beats.some(x => x.tag === 'CURVEBALL');
    const themeRendered = beats[curveIdx] ? beats[curveIdx].theme : '(no beat)';
    out.push({
      id, isMd: mdIds.includes(id),
      beats: beats.length, tags: beats.map(x => x.tag).join(','),
      hasCurveTag, curveIdx,
      // this is the EXACT string the end screen concatenates:
      endScreenText: 'Curveball this run: ' + themeRendered + '. ' + (bank.curveballs || []).length + ' rotate in',
      rendersUndefined: String(themeRendered) === 'undefined'
    });
  });
  return out;
}, mdIds);

const MD = r.filter(x => x.isMd), OR = r.filter(x => !x.isMd);
console.log('=== MOCK-RUN END SCREEN: "Curveball this run: <theme>" ===\n');
console.log('  ORIGINALS (' + OR.length + '):');
OR.slice(0, 3).forEach(x => console.log('    ' + x.id.padEnd(18) + ' tags=[' + x.tags + '] -> "' + x.endScreenText + '"'));
console.log('\n  COMPILED (' + MD.length + '):');
MD.slice(0, 3).forEach(x => console.log('    ' + x.id.padEnd(18) + ' tags=[' + x.tags + '] -> "' + x.endScreenText + '"'));

console.log('\n  topics whose mock sequence carries a CURVEBALL-tagged beat:');
console.log('    ORIG: ' + OR.filter(x => x.hasCurveTag).length + '/' + OR.length + '   MD: ' + MD.filter(x => x.hasCurveTag).length + '/' + MD.length);
console.log('  topics whose END SCREEN renders the literal "undefined":');
console.log('    ORIG: ' + OR.filter(x => x.rendersUndefined).length + '/' + OR.length + '   MD: ' + MD.filter(x => x.rendersUndefined).length + '/' + MD.length);

// prove it in the REAL UI: run a mock to completion on a compiled topic
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /start|continue|begin/i.test(x.textContent || '') && x.offsetParent !== null); if (g) g.click(); });
await p.waitForTimeout(300);
await p.evaluate(() => TopicRegistry.setTopic('idempotency'));
await p.waitForTimeout(300);
const drove = await p.evaluate(() => {
  if (typeof openMock !== 'function') return 'no openMock';
  openMock();
  // advance through every beat to the end screen
  for (let i = 0; i < 40; i++) {
    const sr = document.querySelector('deep-mock-run') ? document.querySelector('deep-mock-run').shadowRoot : null;
    if (!sr) return 'no mock shadow root';
    if (sr.querySelector('.mb-end-cv')) break;
    const btns = [...sr.querySelectorAll('button')].filter(x => x.getBoundingClientRect().height > 0);
    const nxt = btns.find(x => /next|reveal|done|finish|end|score|got|solid/i.test(x.textContent || ''));
    if (!nxt) break;
    nxt.click();
  }
  const sr = document.querySelector('deep-mock-run').shadowRoot;
  const cv = sr.querySelector('.mb-end-cv');
  return cv ? { found: true, text: cv.textContent, html: cv.innerHTML.slice(0, 120) } : { found: false, body: (sr.getElementById('mockbody') || {}).innerText?.slice(0, 200) };
});
console.log('\n  REAL-UI mock-run end screen (idempotency):', JSON.stringify(drove, null, 1));
if (drove && drove.found) {
  await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/vfy-content/MOCKEND-idempotency.png' });
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_vfy-mockend.json', JSON.stringify({ r, drove }, null, 1));
await b.close();
