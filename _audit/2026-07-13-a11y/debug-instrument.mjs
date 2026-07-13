/* Why did color-contrast and button-name refuse to fire? Diagnose the instrument. */
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
  const out = {};
  out.axeVersion = axe.version;
  const rules = axe.getRules();
  out.hasColorContrast = rules.some(r => r.ruleId === 'color-contrast');
  out.hasButtonName = rules.some(r => r.ruleId === 'button-name');

  // What does the themetog button actually look like?
  const bt = document.getElementById('themetog');
  out.themetog = { html: bt.outerHTML.slice(0, 200), text: bt.textContent.trim(), aria: bt.getAttribute('aria-label') };

  // Full unrestricted run — how is color-contrast classified?
  const res = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
  const cls = (bucket) => res[bucket].filter(v => v.id === 'color-contrast').reduce((n, v) => n + v.nodes.length, 0);
  out.contrast = { violations: cls('violations'), incomplete: cls('incomplete') };
  out.inapplicable = (res.inapplicable || []).map(v => v.id).filter(x => x === 'color-contrast' || x === 'button-name');
  out.allViolationIds = res.violations.map(v => `${v.id}(${v.nodes.length})`);
  out.allIncompleteIds = res.incomplete.map(v => `${v.id}(${v.nodes.length})`);

  // Is the h1 actually visible / what is it?
  const h = document.querySelector('.hdr h1');
  const cs = getComputedStyle(h);
  out.h1 = { text: h.textContent.slice(0, 40), color: cs.color, bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 60), opacity: cs.opacity, display: cs.display, visibility: cs.visibility, rect: h.getBoundingClientRect().toJSON() };

  // Does the page have an ancestor that makes axe treat everything as hidden?
  out.bodyRect = document.body.getBoundingClientRect().toJSON();
  out.htmlAttrs = [...document.documentElement.attributes].map(a => `${a.name}=${a.value}`);

  return out;
});
console.log(JSON.stringify(d, null, 2));
await b.close();
