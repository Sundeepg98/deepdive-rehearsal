/* VERIFY rt-desktop F1 (P0): "System Map pivot answers destroyed in 38/46 topics".
   INDEPENDENT re-measurement. Panes are web components w/ OPEN shadow roots
   (sys -> <deep-system-map>). Deep-link reload per topic, 1280x800, reducedMotion. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(600);
const topics = await p.evaluate(() => window.TopicRegistry.ids());
const HAND = new Set(['authz','aws-hardening','content-pipeline','desired-state','eav','iac','notifications','signing']);

const rows = [];
for (const t of topics) {
  await p.goto(URL + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(300);
  await p.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const r = await p.evaluate(() => {
    const host = document.querySelector('deep-system-map');
    if (!host || !host.shadowRoot) return { err: 'no shadow host' };
    const sr = host.shadowRoot;
    const pivs = [...sr.querySelectorAll('.piv')];
    const vw = window.innerWidth;
    return {
      curTopic: window.TopicRegistry.current()?.id,
      chipWS: pivs[0]?.querySelector('.chip') ? getComputedStyle(pivs[0].querySelector('.chip')).whiteSpace : '',
      pivOv:  pivs[0] ? getComputedStyle(pivs[0]).overflow : '',
      piv: pivs.map(pv => {
        const chip = pv.querySelector('.chip');
        const pa = pv.querySelector('.pa');
        const cr = chip ? chip.getBoundingClientRect() : null;
        const sm = pv.querySelector('summary');
        return {
          chipLen:  chip ? chip.textContent.trim().length : -1,
          chipW:    cr ? Math.round(cr.width) : -1,
          chipOverVw: cr ? Math.round(cr.right - vw) : -1,   // escapes viewport?
          paLen:    pa ? pa.textContent.trim().length : -1,
          pivClip:  Math.round(pv.scrollWidth - pv.clientWidth),
          sumClip:  sm ? Math.round(sm.scrollWidth - sm.clientWidth) : -1,
        };
      }),
      stageClip: (() => { const s = document.querySelector('.stage'); return s ? Math.round(s.scrollWidth - s.clientWidth) : -1; })(),
      docClip: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });
  rows.push({ topic: t, hand: HAND.has(t), ...r });
}

const bad = rows.filter(r => r.err);
if (bad.length) console.log('!! hosts missing on:', bad.map(r => r.topic));

let clippedTopics = [], totalPiv = 0, emptyPa = 0, mdEmpty = 0, handEmpty = 0, worst = null, escapeVw = 0;
for (const r of rows) {
  if (r.err) continue;
  let clipped = false;
  for (const pv of r.piv) {
    totalPiv++;
    if (pv.paLen === 0) { emptyPa++; r.hand ? handEmpty++ : mdEmpty++; }
    if (pv.pivClip > 0) clipped = true;
    if (pv.chipOverVw > escapeVw) escapeVw = pv.chipOverVw;
    if (!worst || pv.chipW > worst.chipW) worst = { topic: r.topic, ...pv };
  }
  if (clipped) clippedTopics.push(r.topic);
}
console.log('=== F1 INDEPENDENT VERIFY (1280x800, reducedMotion, shadow-pierced) ===');
console.log('topics scanned                    :', rows.length);
console.log('topics with >=1 clipped .piv      :', clippedTopics.length, '/', rows.length);
console.log('   markdown-compiled among them   :', clippedTopics.filter(t => !HAND.has(t)).length, '/ 38');
console.log('   hand-authored among them       :', clippedTopics.filter(t => HAND.has(t)).length, '/ 8');
console.log('total pivots app-wide             :', totalPiv);
console.log('pivots with EMPTY .pa             :', emptyPa, ' (md:', mdEmpty, '| hand:', handEmpty, ')');
console.log('worst chip                        :', JSON.stringify(worst));
console.log('max chip escape past viewport     : +' + escapeVw + 'px');
console.log('.chip computed white-space        :', rows[0].chipWS);
console.log('.piv  computed overflow           :', rows[0].pivOv);
console.log('max .stage horizontal clip        :', Math.max(...rows.map(r => r.stageClip ?? 0)));
console.log('max document horizontal clip      :', Math.max(...rows.map(r => r.docClip ?? 0)));
const c = rows.find(r => r.topic === 'caching'), a = rows.find(r => r.topic === 'authz');
console.log('\ncaching piv[0]:', JSON.stringify(c.piv[0]));
console.log('authz   piv[0]:', JSON.stringify(a.piv[0]));
console.log('\nCLEAN md topics (no clipped piv):', rows.filter(r => !r.hand && !r.piv.some(x => x.pivClip > 0)).map(r => r.topic));
console.log('CLIPPED hand-authored topics     :', clippedTopics.filter(t => HAND.has(t)));
console.log('\nempty-.pa by class: md topics w/ >=1 empty pa =',
  rows.filter(r => !r.hand && r.piv.some(x => x.paLen === 0)).length,
  '| hand topics w/ >=1 empty pa =', rows.filter(r => r.hand && r.piv.some(x => x.paLen === 0)).length);
console.log('console/page errors:', errs.length ? errs.slice(0, 3) : 'none');
writeFileSync(OUT + 'scripts/_vrt-sysmap.json', JSON.stringify(rows, null, 1));
await b.close();
