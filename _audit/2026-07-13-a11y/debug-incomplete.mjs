/* WHY is every color-contrast check landing in `incomplete`? Get axe's own reason. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.addScriptTag({ content: AXE });

const d = await p.evaluate(async () => {
  const res = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
  const inc = res.incomplete[0];
  const reasons = {};
  const samples = [];
  for (const n of inc.nodes) {
    const msg = (n.any[0] && n.any[0].message) || '(no message)';
    reasons[msg] = (reasons[msg] || 0) + 1;
    if (samples.length < 6) samples.push({ target: n.target.flat().join(' >>> '), msg, data: n.any[0] && n.any[0].data });
  }

  // Is the STAGE/BODY carrying a background axe can't flatten?
  const probe = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e);
    return { sel, bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 80), opacity: cs.opacity, filter: cs.filter, mixBlend: cs.mixBlendMode, transform: cs.transform !== 'none' }; };
  const layers = ['html', 'body', '.stage', '.hdr', '.wrap', 'main'].map(probe).filter(Boolean);

  // What element sits on top of the h1 at its centre point? (overlap → incomplete)
  const h = document.querySelector('.hdr h1');
  const r = h.getBoundingClientRect();
  const stack = document.elementsFromPoint(r.left + 5, r.top + r.height / 2).slice(0, 6)
    .map(e => e.tagName + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : ''));

  return { totalIncomplete: inc.nodes.length, reasons, samples, layers, stackOverH1: stack };
});
console.log(JSON.stringify(d, null, 2));
await b.close();
