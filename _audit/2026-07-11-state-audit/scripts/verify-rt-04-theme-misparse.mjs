/* MISSED-FINDING probe: tools/compiler/parse_md.mjs:407 is off-by-one.
     if (m === 'curve') return { tag:'CURVEBALL', theme: p[0].trim(), cue: prose(p.slice(1).join(' | ')) };
   The heading is "### CURVEBALL | <theme> | <cue>", so p[0] is the literal TAG token.
   The general branch (line 409) correctly does theme:p[1], cue:p.slice(2).
   => theme becomes the string "CURVEBALL" and the real theme leaks into the cue.
   Downstream: mixed-fire label (mxCurve: label = cb.theme) and the mock-run END
   screen ("Curveball this run: <b>"+mockBeats[mockCurveIdx].theme+"</b>"). */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(500);

const themes = await p.evaluate(() => {
  return TopicRegistry.ids().map(id => {
    const bank = TopicRegistry.get(id).data.bank;
    const cbs = bank.curveballs || [];
    return {
      id,
      hasCurveBeat: (bank.mockBeats || []).some(x => x.tag === 'CURVEBALL'),
      themes: cbs.map(c => c.theme),
      cue0: (cbs[0] && cbs[0].cue) ? cbs[0].cue.slice(0, 70) : null,
    };
  });
});

const bad = themes.filter(t => t.themes.includes('CURVEBALL'));
const good = themes.filter(t => !t.themes.includes('CURVEBALL'));
console.log('topics whose curveball theme === literal "CURVEBALL":', bad.length, '/', themes.length);
console.log('topics with real themes:', good.length, '->', good.map(g => g.id).join(' '));
console.log('\n--- BAD sample (theme + the cue that swallowed the real theme) ---');
bad.slice(0, 6).forEach(t => console.log('  ' + t.id.padEnd(24), 'theme=' + JSON.stringify(t.themes), '\n      cue="' + t.cue0 + '"'));
console.log('\n--- GOOD sample ---');
good.slice(0, 3).forEach(t => console.log('  ' + t.id.padEnd(24), 'themes=' + JSON.stringify(t.themes.slice(0, 4))));

// Now: what does the mock-run END screen print for a bad topic?
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(300);
await p.evaluate(() => window.openMock());
await p.waitForTimeout(400);
// click Next until the end screen
for (let i = 0; i < 4; i++) {
  await p.evaluate(() => {
    const host = document.querySelector('#mockov');
    const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
    const nx = sr && sr.getElementById('mbnext'); if (nx) nx.click();
  });
  await p.waitForTimeout(200);
}
const endTxt = await p.evaluate(() => {
  const host = document.querySelector('#mockov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
  const cv = sr && sr.querySelector('.mb-end-cv');
  return cv ? cv.textContent.trim() : '(no .mb-end-cv)';
});
console.log('\n[MOCK RUN END SCREEN, caching] .mb-end-cv =');
console.log('   "' + endTxt + '"');
await p.screenshot({ path: SHOT + 'mockrun-end-theme-CURVEBALL.png' });
console.log('\nPAGE ERRORS:', errs.length);
await b.close();
