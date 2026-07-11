// Size the missed findings: chip clipping across all 38, and HTML-injection risk in the unescaped chip.
import { chromium } from 'playwright';
import fs from 'fs';

// (a) Does any authored chip/answer contain a raw '<'? parseSys does NOT run chip through prose(),
//     and sysRenderPivot inserts it via innerHTML.
const gen = fs.readdirSync('D:/claude-workspace/deepdive-rehearsal/src/topics/_generated');
let lt = 0, chips = 0;
for (const d of gen) {
  const f = `D:/claude-workspace/deepdive-rehearsal/src/topics/_generated/${d}/sys.js`;
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/"chip":\s*"((?:[^"\\]|\\.)*)"/g)) {
    chips++;
    if (/[<>]/.test(m[1].replace(/\\u003[ce]/gi, '<'))) { lt++; console.log('CHIP WITH ANGLE BRACKET:', d, m[1].slice(0, 70)); }
  }
}
console.log(`chips scanned: ${chips}, chips containing < or >: ${lt}`);
console.log('(parse_md.mjs:225 assigns chip WITHOUT prose()/escaping; system-map.js:93 inserts via innerHTML)');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(700);

// (b) how many of the 38 markdown topics render a CLIPPED chip (scrollWidth > clientWidth)?
const LEGACY = ['content-pipeline','signing','authz','aws-hardening','notifications','eav','desired-state','iac'];
const ids = await p.evaluate(() => TopicRegistry.ids());
let clippedTopics = 0, clippedPivots = 0, totalPivots = 0, jumpTopics = 0, jumpBtns = 0;
const rows = [];
for (const id of ids) {
  if (LEGACY.includes(id)) continue;
  await p.evaluate(i => TopicRegistry.setTopic(i), id);
  await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="sys"]').click());
  await p.waitForTimeout(220);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-system-map').shadowRoot;
    const pivs = [...sr.querySelectorAll('details.piv')];
    const jumps = [...sr.querySelectorAll('.piv-jump')];
    return {
      pivots: pivs.map(d => {
        const c = d.querySelector('.chip');
        return { sw: c.scrollWidth, cw: c.clientWidth, len: c.textContent.length };
      }),
      jumps: jumps.map(j => ({ len: j.textContent.length, to: j.getAttribute('data-goto') })),
    };
  });
  const cl = r.pivots.filter(x => x.sw > x.cw + 2).length;
  totalPivots += r.pivots.length;
  clippedPivots += cl;
  if (cl) clippedTopics++;
  if (r.jumps.length) { jumpTopics++; jumpBtns += r.jumps.length; }
  rows.push({ id, clipped: cl, of: r.pivots.length, jumps: r.jumps });
}
console.log(`\n=== CHIP CLIPPING (markdown topics) ===`);
console.log(`topics with >=1 clipped chip : ${clippedTopics} / 38`);
console.log(`pivots with a clipped chip   : ${clippedPivots} / ${totalPivots}`);
console.log(`\n=== SPURIOUS JUMP BUTTONS ===`);
console.log(`markdown topics with a .piv-jump: ${jumpTopics}, total buttons: ${jumpBtns}`);
rows.filter(r => r.jumps.length).forEach(r => r.jumps.forEach(j => console.log(`  ${r.id.padEnd(20)} -> ${j.to.padEnd(16)} label=${j.len}ch`)));

// (c) do the legacy jump buttons stay sane? (control)
await p.evaluate(() => TopicRegistry.setTopic('content-pipeline'));
await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="sys"]').click());
await p.waitForTimeout(300);
const ctl = await p.evaluate(() => [...document.querySelector('deep-system-map').shadowRoot.querySelectorAll('.piv-jump')].map(j => ({ len: j.textContent.length, to: j.getAttribute('data-goto') })));
console.log(`\ncontrol (legacy content-pipeline) jump buttons: ${ctl.length}, label lengths: ${ctl.map(c => c.len).join(',')} -> ${ctl.map(c => c.to).join(',')}`);

await b.close();
