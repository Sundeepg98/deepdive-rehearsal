/* Why didn't aria-hidden-focus fire? And do the CLOSED overlays (aria-hidden=true, full of
   buttons) hide focusable content — a real bug — or are they display:none (fine)? */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.addScriptTag({ content: AXE });

const d = await p.evaluate(async () => {
  const out = {};
  // inject the control again and look at ALL buckets, not just violations
  const w = document.createElement('div'); w.id = '__nc4'; w.setAttribute('aria-hidden', 'true');
  const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'reachable but hidden';
  w.appendChild(btn); document.querySelector('.hdr').appendChild(w);

  const res = await axe.run(document, { runOnly: { type: 'rule', values: ['aria-hidden-focus'] } });
  out.buckets = {
    violations: res.violations.flatMap(v => v.nodes.map(n => n.target.flat().join(' '))),
    incomplete: res.incomplete.flatMap(v => v.nodes.map(n => n.target.flat().join(' '))),
    passes: res.passes.flatMap(v => v.nodes.map(n => n.target.flat().join(' '))),
    inapplicable: res.inapplicable.map(v => v.id),
  };
  out.controlVisible = { display: getComputedStyle(w).display, offsetParent: !!w.offsetParent };
  w.remove();

  // Now the REAL question: closed overlays carry aria-hidden=true. Are they display:none?
  out.closedOverlays = [...document.querySelectorAll('[role=dialog]')].map(o => {
    const cs = getComputedStyle(o);
    const btns = o.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])');
    return {
      id: o.id,
      open: o.classList.contains('open'),
      ariaHidden: o.getAttribute('aria-hidden'),
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      focusableCount: btns.length,
      // the real test: can a button inside it actually take focus?
      offsetParentNull: btns.length ? btns[0].offsetParent === null : null,
    };
  });
  return out;
});
console.log(JSON.stringify(d, null, 2));
await b.close();
