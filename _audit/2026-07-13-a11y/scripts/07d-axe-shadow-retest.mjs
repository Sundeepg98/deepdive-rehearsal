/* RETEST. The previous control planted an unlabelled button inside deep-drill's
 * shadow root while the WALKTHROUGH pane was showing - deep-drill was hidden, and
 * axe rightly ignores hidden elements. That control proved nothing; it did not
 * prove axe is blind.
 *
 * Redo it honestly: plant the button in the shadow root of the pane that is
 * ACTUALLY ON SCREEN, and plant a matching one in the light DOM as the control's
 * control. If axe catches the light one and misses the shadow one, axe is blind.
 * If it catches both, axe's 0-violation result is real and covers the shadow half.
 */
import fs from 'node:fs';
import { launch, phone, installDeep, ensureDirs, save, PHONES } from './lib.mjs';
ensureDirs();

const AXE = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const b = await launch();
const p = await phone(b, PHONES.p390);
await installDeep(p);
await p.locator('.ix-card').first().tap().catch(() => {});
await p.waitForTimeout(1000);
await p.evaluate(AXE);

// make sure we are ON the drill pane, so deep-drill is genuinely rendered
await p.evaluate(() => document.querySelector('.seg button[data-tab="drill"]')?.click());
await p.waitForTimeout(1000);

const state = await p.evaluate(() => {
  const host = document.querySelector('deep-drill');
  const r = host.getBoundingClientRect();
  return { visible: host.checkVisibility({ opacityProperty: true, visibilityProperty: true }), rect: `${Math.round(r.width)}x${Math.round(r.height)}`, mode: host.shadowRoot.mode };
});
console.log('=============== AXE vs OPEN SHADOW DOM (valid control this time) ===============');
console.log(`  deep-drill on screen: ${state.visible}, box ${state.rect}, shadow mode: ${state.mode}`);

const before = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations.length);
console.log(`  axe violations, page as shipped: ${before}`);

// plant TWO unlabelled buttons: one in the light DOM, one in the VISIBLE shadow root
await p.evaluate(() => {
  const mk = (id) => { const btn = document.createElement('button'); btn.id = id; btn.style.cssText = 'width:40px;height:40px;display:block'; return btn; };
  document.querySelector('.stage').appendChild(mk('__nc_light_nolabel'));
  const root = document.querySelector('deep-drill').shadowRoot;
  root.querySelector('#dwrap')?.appendChild(mk('__nc_shadow_nolabel'));
});
await p.waitForTimeout(400);

const seen = await p.evaluate(() => {
  const l = document.querySelector('#__nc_light_nolabel');
  const s = document.querySelector('deep-drill').shadowRoot.querySelector('#__nc_shadow_nolabel');
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { rendered: r.width > 0 && r.height > 0, visible: e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) }; };
  return { light: box(l), shadow: box(s) };
});
console.log(`  planted light-DOM button  : ${JSON.stringify(seen.light)}`);
console.log(`  planted shadow-DOM button : ${JSON.stringify(seen.shadow)}`);

const res = await p.evaluate(async () => await window.axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }));
const bn = res.violations.find((v) => v.id === 'button-name');
const dump = JSON.stringify(bn ? bn.nodes : []);
const caughtLight = dump.includes('__nc_light_nolabel');
const caughtShadow = dump.includes('__nc_shadow_nolabel');

console.log(`\n  axe raised button-name          : ${!!bn} (${bn ? bn.nodes.length : 0} nodes)`);
console.log(`  ...caught the LIGHT-DOM button  : ${caughtLight}`);
console.log(`  ...caught the SHADOW-DOM button : ${caughtShadow}`);
if (bn) for (const n of bn.nodes) console.log(`       target: ${JSON.stringify(n.target)}`);

console.log('');
if (caughtLight && caughtShadow) {
  console.log('  VERDICT: axe DOES traverse the open shadow roots. Its 0-violation result on the');
  console.log('           shipped page is a REAL result covering both halves of the app.');
} else if (caughtLight && !caughtShadow) {
  console.log('  VERDICT: axe is BLIND to the shadow roots. Its 0-violation result covers only the');
  console.log('           light DOM - and ~40% of this app\'s controls live in shadow roots.');
  console.log('           "axe is clean" would be a SIXTH check that cannot fail.');
} else {
  console.log('  VERDICT: axe did not even catch the light-DOM button - the harness is wrong.');
}
await b.close();
save('07d-axe-shadow-retest.json', { before, seen, caughtLight, caughtShadow, nodes: bn ? bn.nodes.map((n) => n.target) : [] });
