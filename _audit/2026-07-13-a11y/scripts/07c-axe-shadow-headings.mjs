/* Two claims I refuse to publish unverified:
 *  (1) "axe found 0 violations" is only meaningful if axe could have FAILED on
 *      the shadow content. The 17 roots are mode:'open', and axe has traversed
 *      open shadow DOM since v3 - so test it: plant an unlabelled button INSIDE
 *      deep-drill's shadow root and see whether axe raises button-name.
 *  (2) "only 1 heading in the whole app" - count h1-h6 + role=heading across
 *      light AND shadow DOM before saying it.
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

/* ---- (1) can axe fail INSIDE a shadow root? ---- */
const clean = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations.length);

const planted = await p.evaluate(() => {
  const host = document.querySelector('deep-drill');
  if (!host || !host.shadowRoot) return 'no shadow root';
  const btn = document.createElement('button');
  btn.id = '__nc_shadow_nolabel';           // NO accessible name
  btn.style.cssText = 'width:30px;height:30px';
  host.shadowRoot.appendChild(btn);
  return host.shadowRoot.mode;
});
const after = await p.evaluate(async () => await window.axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }));
const caught = after.violations.find((v) => v.id === 'button-name');
const caughtInShadow = !!caught && JSON.stringify(caught.nodes).includes('__nc_shadow_nolabel');

console.log('=============== DOES AXE SEE INSIDE THE SHADOW ROOTS? ===============');
console.log(`  deep-drill shadow mode        : ${planted}`);
console.log(`  axe violations, page as shipped: ${clean}`);
console.log(`  planted an unlabelled <button> INSIDE deep-drill's shadow root`);
console.log(`  axe raised button-name for it : ${caughtInShadow}`);
console.log('  ' + (caughtInShadow
  ? 'OK — axe DOES traverse the open shadow roots. Its 0-violation result covers them,\n       and is therefore a real result rather than a blind spot.'
  : '*** axe is BLIND to the shadow roots - its 0-violation result covers only the light DOM ***'));

/* ---- (2) headings, everywhere ---- */
await p.evaluate(() => document.querySelector('#__nc_shadow_nolabel')?.remove?.());
await p.evaluate(() => { const h = document.querySelector('deep-drill').shadowRoot.querySelector('#__nc_shadow_nolabel'); if (h) h.remove(); });

const headings = await p.evaluate(() => {
  const found = [];
  const walk = (root, host) => {
    for (const el of root.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
      let vis = true;
      try { vis = el.checkVisibility({ opacityProperty: true, visibilityProperty: true }); } catch (e) { /* keep */ }
      found.push({ tag: el.tagName.toLowerCase(), host: host || '(light)', visible: vis,
        text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) });
    }
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot, el.tagName.toLowerCase());
  };
  walk(document, '');
  // and what the app uses INSTEAD of headings for its section titles
  const fakeHeads = [...document.querySelectorAll('.mb-sec, .stage-head, .ix-g-name, .dnav-h, .mhp-h')]
    .map((e) => ({ tag: e.tagName.toLowerCase(), cls: e.className, text: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 32) }));
  return { headings: found, visible: found.filter((f) => f.visible), fakeHeads };
});
console.log('\n=============== HEADINGS (a screen reader\'s primary navigation) ===============');
console.log(`  real headings anywhere (light + all 17 shadow roots): ${headings.headings.length}, of which visible: ${headings.visible.length}`);
for (const h of headings.headings) console.log(`     <${h.tag}> [${h.host}] visible=${h.visible}  "${h.text}"`);
console.log(`  section titles rendered as NON-heading elements (so they cannot be jumped to): ${headings.fakeHeads.length}`);
for (const f of headings.fakeHeads.slice(0, 8)) console.log(`     <${f.tag} class="${String(f.cls).slice(0, 22)}">  "${f.text}"`);

/* ---- (3) landmark + live-region sanity ---- */
const lm = await p.evaluate(() => ({
  main: document.querySelectorAll('main,[role=main]').length,
  nav: document.querySelectorAll('nav,[role=navigation]').length,
  banner: document.querySelectorAll('header,[role=banner]').length,
  liveRegions: [...document.querySelectorAll('[aria-live]')].map((e) => ({ live: e.getAttribute('aria-live'), text: e.textContent.trim().slice(0, 40) })),
  segRole: document.querySelector('.seg')?.getAttribute('role'),
  segLabel: document.querySelector('.seg')?.getAttribute('aria-label'),
  tabsUseTablist: !!document.querySelector('[role=tablist]'),
  skipLink: !!document.querySelector('a[href^="#"].skip, .skip-link, [class*=skip]'),
}));
console.log('\n=============== LANDMARKS / LIVE REGIONS ===============');
console.log('  ' + JSON.stringify(lm, null, 1).replace(/\n/g, '\n  '));

await b.close();
save('07c-axe-shadow-headings.json', { axeSeesShadow: caughtInShadow, cleanViolations: clean, headings, landmarks: lm });
