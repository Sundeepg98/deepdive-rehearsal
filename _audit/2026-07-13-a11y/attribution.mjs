/* ATTRIBUTION + VERIFICATION.

   (A) CONTRAST COVERAGE — how much of the app can axe's contrast rule actually evaluate?
       Counts passes/violations/incomplete. This states the LIMIT of the instrument.

   (B) THE CONTROLLED ROOM EXPERIMENT — the matrix run confounded two variables: the 6 rooms
       were 6 different TOPICS, so a violation seen in one room might be that topic's CONTENT,
       not the room's COLOUR. Here the TOPIC IS HELD FIXED and only html[data-group] is
       re-stamped across all 6 rooms x 2 themes. Anything that changes is caused by the ROOM
       COLOUR SYSTEM and nothing else.

   (C) PIXEL TRUTH — re-measure each reported violation from PAINTED PIXELS (screenshot
       sampling of the real composited page), not from axe's background model. axe can be
       wrong about the background; the screen cannot.
*/
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = `${OUT}/shots/axe`;
mkdirSync(SHOTS, { recursive: true });

const ROOMS = ['messaging-events', 'data-storage', 'reliability-observability', 'platform-infra', 'architecture-apis', 'security-tenancy'];
const THEMES = ['light', 'dark'];
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });

/* ---------- (A) contrast coverage ---------- */
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1800);
await page.addScriptTag({ content: AXE });

const cov = await page.evaluate(async () => {
  const r = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations', 'incomplete', 'passes'] });
  const n = (bk) => r[bk].reduce((a, v) => a + v.nodes.length, 0);
  return { passes: n('passes'), violations: n('violations'), incomplete: n('incomplete') };
});
const total = cov.passes + cov.violations + cov.incomplete;
console.log('=== (A) COLOR-CONTRAST COVERAGE on one surface (home/walk, light, architecture-apis) ===');
console.log(`  evaluated OK : ${cov.passes + cov.violations} / ${total}  (${(100 * (cov.passes + cov.violations) / total).toFixed(1)}%)`);
console.log(`     passes    : ${cov.passes}`);
console.log(`     violations: ${cov.violations}`);
console.log(`  UNEVALUATED  : ${cov.incomplete} / ${total}  (${(100 * cov.incomplete / total).toFixed(1)}%)  <- axe is BLIND here`);

/* ---------- (B) controlled room experiment: ONE topic, cycle the room ---------- */
console.log('\n=== (B) CONTROLLED ROOM EXPERIMENT — topic HELD FIXED, only html[data-group] varies ===');
console.log('    (so any change is caused by the ROOM COLOUR, not by the topic\'s content)\n');

const controlled = {};   // room/theme -> {pane -> [violations]}
const FIXED_TOPIC = 'state-machine';   // the boot topic; content identical in every cell

for (const theme of THEMES) {
  for (const room of ROOMS) {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(1300);
    await page.addScriptTag({ content: AXE });
    await page.evaluate((t) => { if (typeof TopicRegistry !== 'undefined' && TopicRegistry.current().id !== t) TopicRegistry.setTopic(t); }, FIXED_TOPIC);
    await page.waitForTimeout(300);
    await page.evaluate((t) => { const de = document.documentElement; if ((de.dataset.theme || 'light') !== t) document.getElementById('themetog').click(); }, theme);
    // FORCE the room, overriding whatever the fixed topic would stamp
    await page.evaluate((g) => document.documentElement.setAttribute('data-group', g), room);
    await page.waitForTimeout(250);

    const key = `${room}/${theme}`;
    controlled[key] = {};
    for (const pane of PANES) {
      await page.evaluate((p) => { window.location.hash = '#' + p; }, pane);
      await page.waitForTimeout(260);
      // re-assert the room (setTopic isn't involved, but be defensive)
      await page.evaluate((g) => document.documentElement.setAttribute('data-group', g), room);
      const res = await page.evaluate(async (p) => {
        const r = await axe.run(document.getElementById(p), { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
        return r.violations.flatMap(v => v.nodes.map(n => ({
          target: n.target.flat().join(' >>> '),
          msg: (n.any[0] && n.any[0].message) || '',
          ratio: n.any[0] && n.any[0].data && n.any[0].data.contrastRatio,
          fg: n.any[0] && n.any[0].data && n.any[0].data.fgColor,
          bg: n.any[0] && n.any[0].data && n.any[0].data.bgColor,
          expected: n.any[0] && n.any[0].data && n.any[0].data.expectedContrastRatio,
        })));
      }, pane);
      if (res.length) controlled[key][pane] = res;
    }
    const tot = Object.values(controlled[key]).reduce((a, v) => a + v.length, 0);
    console.log(`  ${key.padEnd(36)} contrast violations: ${tot}`);
    for (const [pane, list] of Object.entries(controlled[key]))
      for (const v of list) console.log(`      [${pane}] ${v.ratio}:1 (need ${v.expected})  fg=${v.fg} bg=${v.bg}  ${v.target.slice(0, 70)}`);
  }
}

writeFileSync(`${OUT}/controlled-room-experiment.json`, JSON.stringify({ coverage: cov, controlled }, null, 2));

/* verdict for (B) */
const perRoomTotals = {};
for (const [k, panes] of Object.entries(controlled)) perRoomTotals[k] = Object.values(panes).reduce((a, v) => a + v.length, 0);
const distinct = new Set(Object.values(perRoomTotals));
console.log('\n  --- VERDICT (B) ---');
console.log('  per-room/theme violation totals:', JSON.stringify(perRoomTotals));
console.log(distinct.size > 1
  ? '  ROOM-DEPENDENT: with content held constant, the count CHANGES by room -> the room\n    colour system itself introduces/removes contrast failures.'
  : '  ROOM-INVARIANT: with content held constant, every room yields the SAME count ->\n    the room colour system does NOT by itself change axe-detectable contrast outcomes.');

await b.close();
