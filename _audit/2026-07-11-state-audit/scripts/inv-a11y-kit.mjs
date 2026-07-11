// Verify (via Chrome's OWN accessibility tree, not inference) whether the kit's
// range sliders expose an accessible name, and whether the canvas has any.
import { chromium } from 'playwright';
import fs from 'fs';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-rt-visual-trainer';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.keyboard.press('Escape').catch(() => {});
await p.evaluate(() => {
  const it = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals'));
  if (it) it.click();
});
await p.waitForTimeout(700);
await p.evaluate(() => window.goView('viz'));
await p.waitForTimeout(1500);

const cdp = await ctx.newCDPSession(p);
await cdp.send('Accessibility.enable');
const { nodes } = await cdp.send('Accessibility.getFullAXTree');

const sliders = nodes.filter((n) => n.role && n.role.value === 'slider').map((n) => ({
  role: n.role.value,
  name: n.name ? n.name.value : '(NO NAME)',
  nameLen: n.name ? n.name.value.length : 0,
  value: n.value ? n.value.value : null,
}));
const canvases = nodes.filter((n) => n.role && /canvas|Canvas/i.test(n.role.value)).map((n) => ({
  role: n.role.value, name: n.name ? n.name.value : '(NO NAME)',
}));

// DOM-level corroboration
const dom = await p.evaluate(() => {
  const sr = document.querySelector('deep-visual').shadowRoot;
  const c = sr.querySelector('canvas');
  return {
    ranges: [...sr.querySelectorAll('input[type=range]')].map((i) => ({
      id: i.id || '(none)', ariaLabel: i.getAttribute('aria-label') || '(none)',
      ariaLabelledby: i.getAttribute('aria-labelledby') || '(none)',
      wrappedInLabel: !!i.closest('label'),
      siblingLabelHasFor: (() => { const l = i.parentElement.querySelector('label'); return l ? (l.getAttribute('for') || '(none)') : '(no label)'; })(),
      labelText: (() => { const l = i.parentElement.querySelector('label'); return l ? l.textContent.trim() : null; })(),
    })),
    canvas: { role: c.getAttribute('role') || '(none)', ariaLabel: c.getAttribute('aria-label') || '(none)', innerHTML: c.innerHTML.length },
  };
});

// evidence: the canvas element alone, as shipped (a 2px strip)
const box = await p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.floor(r.width), height: Math.max(1, Math.ceil(r.height)) };
});
await p.screenshot({ path: `${SHOTS}/F-canvas-only-ASSHIPPED-2px.png`, clip: box });

const out = { axSliders: sliders, axCanvases: canvases, dom, canvasClipBox: box };
console.log(JSON.stringify(out, null, 2));
fs.writeFileSync(SHOTS + '/../../scripts/inv-a11y-kit.json', JSON.stringify(out, null, 2));
await b.close();
