/* Smoke + INSTRUMENT NEGATIVE CONTROLS.
 * Before any finding: prove the instruments can go red.
 *   NC-1 ink: force body{opacity:0}. Node counter must stay high (the old bug);
 *             painted pixels must collapse to 0.
 *   NC-2 deep walk: it must find the shadow hosts a document-only walk cannot.
 */
import { launch, phone, installDeep, inkOf, ensureDirs, save, PHONES } from './lib.mjs';

ensureDirs();
const b = await launch();
const p = await phone(b, PHONES.p390);
await installDeep(p);

const boot = await p.evaluate(() => ({
  title: document.title,
  vw: innerWidth, vh: innerHeight,
  dpr: devicePixelRatio,
  touch: 'ontouchstart' in window,
  shadowHosts: [...document.querySelectorAll('*')].filter((e) => e.shadowRoot).map((e) => e.tagName.toLowerCase()),
  docOnlyInteractive: document.querySelectorAll(window.__INTERACTIVE).length,
  deepInteractive: window.__deepAll(window.__INTERACTIVE).length,
  visibleTextNodes: [...document.querySelectorAll('*')].filter((e) => {
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && e.textContent.trim();
  }).length,
}));

const inkLive = await inkOf(p, '00-smoke-live-390.png');
console.log('== BOOT (390x844, touch, dpr3) ==');
console.log(JSON.stringify(boot, null, 1));
console.log('LIVE ink:', JSON.stringify(inkLive));

/* ---- NC-1: the exact trap that certified a blank page ---- */
await p.addStyleTag({ content: 'body{opacity:0 !important}' });
await p.waitForTimeout(200);
const blank = await p.evaluate(() => ({
  visibleTextNodes: [...document.querySelectorAll('*')].filter((e) => {
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && e.textContent.trim();
  }).length,
  bodyComputedOpacity: getComputedStyle(document.body).opacity,
  aChildComputedOpacity: getComputedStyle(document.querySelector('button') || document.body).opacity,
}));
const inkBlank = await inkOf(p, '00-smoke-NEGCONTROL-blank-390.png');
console.log('\n== NC-1: body{opacity:0} (deliberately broken) ==');
console.log('node counter still says:', blank.visibleTextNodes, 'visible text nodes  <-- the lie');
console.log('body computed opacity:', blank.bodyComputedOpacity, '| a button\'s computed opacity:', blank.aChildComputedOpacity, '<-- opacity does NOT inherit');
console.log('PAINTED PIXELS:', JSON.stringify(inkBlank));
console.log(
  inkBlank.painted === 0 && inkLive.painted > 100000
    ? 'NC-1 RESULT: ink instrument GOES RED on a blank page. USABLE.'
    : 'NC-1 RESULT: *** INSTRUMENT BROKEN - it did not fail on a blank page ***'
);

save('00-smoke.json', { boot, inkLive, blank, inkBlank });
await b.close();
