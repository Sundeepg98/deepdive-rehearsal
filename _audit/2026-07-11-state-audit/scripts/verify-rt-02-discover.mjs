/* Discover the REAL selectors for: mock run, mixed fire, cram, scope, drill.
   Never guess — dump what actually exists. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(500);

const d = await p.evaluate(() => {
  const out = {};
  out.overlayIds = [...document.querySelectorAll('[id]')]
    .filter(e => /ov$/i.test(e.id) || e.getAttribute('role') === 'dialog')
    .map(e => e.id + ' role=' + (e.getAttribute('role') || '-') + ' cls=' + e.className);
  out.globalFns = ['openMock', 'openMix', 'openCram', 'openScope', 'startMix', 'openSession']
    .map(f => f + '=' + typeof window[f]);
  // buttons that plausibly launch tools
  out.toolButtons = [...document.querySelectorAll('button')]
    .map(e => ({ id: e.id, cls: e.className, txt: (e.textContent || '').trim().slice(0, 46) }))
    .filter(x => /mock|mixed|cram|scope|fire|session/i.test(x.txt + x.id + x.cls))
    .slice(0, 25);
  out.customEls = [...new Set([...document.querySelectorAll('*')]
    .map(e => e.tagName.toLowerCase()).filter(t => t.startsWith('deep-')))];
  // where do cram / scope bodies live?
  const cram = document.querySelector('deep-cram');
  const scope = document.querySelector('deep-scope');
  out.cram = cram ? { hasShadow: !!cram.shadowRoot, parentOv: cram.closest('[id]')?.id } : null;
  out.scope = scope ? { hasShadow: !!scope.shadowRoot, parentOv: cram.closest('[id]')?.id } : null;
  out.cramTitleEl = !!document.querySelector('.cram-title');
  return out;
});
console.log(JSON.stringify(d, null, 1));
await b.close();
