/* ===================== THE SHADOW-BOUNDARY GUARD =====================
 *
 * FAILS THE BUILD when a selector in src/styles.css targets a class that ONLY EVER EXISTS INSIDE
 * A SHADOW ROOT. A light-DOM stylesheet cannot cross that boundary, so such a rule matches zero
 * nodes: it is dead code that reads as done, and it produces no error, no warning, and no visual
 * difference from a rule that works.
 *
 * WHY THIS EXISTS. This repository has shipped the identical bug FOUR times, and each time it was
 * found by a human staring at a screenshot months later, never by a test:
 *
 *   1. the v142 loading shimmer      .card:empty / .thread:empty / ...   -- never ran once
 *   2. the print page-break rules    .card / .thread / .dec / .rf        -- "Print Q&A" shipped
 *                                                                           with NO page-break
 *                                                                           control for the app's
 *                                                                           whole life
 *   3. the mobile 44px tap floor     the drill's mode switch, level filter, "Reveal answer"
 *   4. forced-colors + prefers-contrast   .card/.dec/.rf/.piv/.thread/.dgm-s -- the entire
 *                                         shipped "high-contrast support" matched ZERO nodes
 *
 * Fixes 2 and 3 were made by MOVING the rule into BASE_SHEET (base-styles.js), which all 17 shadow
 * hosts adopt. Nothing stopped the next one. This does.
 *
 * HOW IT WORKS -- and why it is not another check that cannot fail.
 *   The class list is not parsed out of the JS, guessed, or hardcoded. It is ENUMERATED FROM THE
 *   LIVE DOM: every class on every element, in the light DOM and in all 17 shadow roots, after
 *   visiting all 10 panes and opening all 10 overlays. The selector list is parsed by the BROWSER'S
 *   OWN CSS PARSER (CSSStyleSheet.replaceSync + a walk of cssRules), so @media / @supports /
 *   @container blocks and :not() are handled exactly as the browser handles them, not by a regex
 *   that approximates them.
 *
 *   A class is reported DEAD only if it was OBSERVED in a shadow root and NEVER ONCE observed in
 *   the light DOM. That asymmetry is deliberate: a class we never saw at all is NOT reported, so
 *   incomplete state coverage can only ever cause a MISS, never a false accusation.
 *
 * NEGATIVE CONTROL, run on every invocation (--selftest runs it alone):
 *   a rule targeting a known shadow-only class is injected into the parsed stylesheet, and the
 *   guard must report it. If the guard cannot see a dead rule we planted on purpose, it cannot see
 *   the ones a developer writes by accident, and it exits non-zero saying so. A check whose
 *   negative control has never been watched going red is decoration.
 *
 * Run: CHROME=<path> node test/shadow_css_guard.mjs [dist/index.html]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import path from 'path';
import B from './_boot.cjs';

const FILE = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.join(process.cwd(), 'dist', 'index.html');
const STYLES = path.join(process.cwd(), 'src', 'styles.css');

/* Panes and overlays to visit, so every class gets a chance to exist before we call it absent. */
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];
const OVERLAY_OPENERS = ['idxopen', 'searchopen', 'notesopen', 'cramopen', 'sessopen',
  'mixopen', 'planopen', 'scopeopen', 'keyopen', 'mockopen'];
/* NOT opened: #printqa (spawns a print dialog and hangs a headless run), #copylink / #starbtn /
   #themetog (actions, not overlays -- they render no new class). */

/* Classes that are legitimately absent from BOTH DOMs in every state we can reach, and which the
   guard therefore never flags anyway (it only fires on shadow>0 AND light==0). Listed for the
   reader, not consumed by the check -- an allowlist that suppressed a real finding would be the
   very thing this file exists to prevent. */

const IN_SHADOW = `
  (() => {
    const light = new Map(), shadow = new Map();
    const bump = (m, c) => m.set(c, (m.get(c) || 0) + 1);
    const roots = [];
    const collectRoots = (r) => {
      r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { roots.push(e.shadowRoot); collectRoots(e.shadowRoot); } });
    };
    collectRoots(document);
    document.querySelectorAll('*').forEach((e) => e.classList.forEach((c) => bump(light, c)));
    for (const r of roots) r.querySelectorAll('*').forEach((e) => e.classList.forEach((c) => bump(shadow, c)));
    return { light: [...light.entries()], shadow: [...shadow.entries()], shadowRoots: roots.length };
  })()
`;

async function collect(page, acc) {
  const { light, shadow, shadowRoots } = await page.evaluate(IN_SHADOW);
  for (const [c, n] of light) acc.light.set(c, (acc.light.get(c) || 0) + n);
  for (const [c, n] of shadow) acc.shadow.set(c, (acc.shadow.get(c) || 0) + n);
  acc.shadowRoots = Math.max(acc.shadowRoots, shadowRoots);
}

const b = await chromium.launch(B.launchOpts());
const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));

await B.gotoApp(page, FILE);
await B.closeIndex(page);

const acc = { light: new Map(), shadow: new Map(), shadowRoots: 0 };
await collect(page, acc);

/* every pane */
for (const p of PANES) {
  await page.evaluate((v) => window.switchTab && window.switchTab(v), p);
  await B.settle(page);
  await collect(page, acc);
}
/* every overlay */
let opened = 0;
for (const id of OVERLAY_OPENERS) {
  const did = await page.evaluate((i) => {
    const el = document.getElementById(i);
    if (!el || getComputedStyle(el).display === 'none') return false;
    el.click();
    return true;
  }, id);
  if (!did) continue;
  await B.settle(page);
  await page.waitForTimeout(160);
  await collect(page, acc);
  opened++;
  await page.keyboard.press('Escape');
  await B.settle(page);
  await page.waitForTimeout(120);
}

/* ---- parse styles.css with the BROWSER'S OWN CSS PARSER ---- */
const rawCss = readFileSync(STYLES, 'utf8').replace(/<!--[\s\S]*?-->/g, ''); /* strip @build directives */

async function classesSelectedBy(css) {
  return page.evaluate((cssText) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    const out = new Set();
    const walk = (rules) => {
      for (const r of rules) {
        if (typeof r.selectorText === 'string') {
          /* strip attribute selectors FIRST: a[href*="kimi.com/agent"] contains ".com", which a
             naive class regex would happily report as a class named "com". */
          const sel = r.selectorText.replace(/\[[^\]]*\]/g, '');
          for (const m of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) out.add(m[1]);
        }
        if (r.cssRules) walk(r.cssRules);   /* @media, @supports, @container, ... */
      }
    };
    walk(sheet.cssRules);
    return [...out];
  }, css);
}

const selected = await classesSelectedBy(rawCss);

function deadFor(selectedClasses) {
  const dead = [];
  for (const c of selectedClasses) {
    const l = acc.light.get(c) || 0;
    const s = acc.shadow.get(c) || 0;
    if (s > 0 && l === 0) dead.push({ cls: c, light: l, shadow: s });
  }
  return dead.sort((a, b) => b.shadow - a.shadow);
}

/* ---- THE NEGATIVE CONTROL: plant a rule we KNOW is dead and demand the guard sees it ---- */
const shadowOnly = [...acc.shadow.keys()].filter((c) => !acc.light.has(c));
const canary = shadowOnly[0];
const control = canary
  ? deadFor(await classesSelectedBy(rawCss + `\n.${canary}{outline:1px solid red}`)).some((d) => d.cls === canary)
  : false;

const dead = deadFor(selected);

console.log('=== SHADOW-BOUNDARY GUARD ===');
console.log('  shadow roots enumerated : %d', acc.shadowRoots);
console.log('  panes visited           : %d   overlays opened: %d', PANES.length, opened);
console.log('  distinct classes seen   : %d light, %d shadow (%d shadow-ONLY)',
  acc.light.size, acc.shadow.size, shadowOnly.length);
console.log('  classes styles.css selects: %d', selected.length);
console.log('  [negative control] plant `.%s{}` (a known shadow-only class) in styles.css -> %s',
  canary, control ? 'GUARD CATCHES IT (it can go RED)' : '*** GUARD DID NOT CATCH IT -- IT IS DEAD ***');

if (!canary || !control) {
  await B.finish(1, 'FAIL shadow_css_guard: the guard cannot detect a dead rule planted on purpose. It is decoration.');
}
if (errs.length) {
  console.log('  page errors: %s', errs.slice(0, 3).join(' | '));
  await B.finish(1, 'FAIL shadow_css_guard: the app raised page errors; class enumeration is not trustworthy.');
}

if (dead.length) {
  console.log('\n  *** %d DEAD SELECTOR%s IN src/styles.css ***', dead.length, dead.length === 1 ? '' : 'S');
  console.log('  Each targets a class that exists ONLY inside a shadow root. A light-DOM stylesheet');
  console.log('  cannot reach it, so the rule matches ZERO nodes and does nothing at all.\n');
  console.log('    class                light   shadow');
  console.log('    ' + '-'.repeat(40));
  for (const d of dead) console.log('    .%s %s %s', d.cls.padEnd(19), String(d.light).padStart(5), String(d.shadow).padStart(7));
  console.log('\n  FIX: move the rule into the component\'s shadow sheet. BASE_SHEET (base-styles.js) is');
  console.log('  adopted by all 17 shadow hosts and is where the print + tap-floor + forced-colors');
  console.log('  rules already live, for exactly this reason. A pane-exclusive class belongs in that');
  console.log('  pane\'s own styleText(). Do NOT just delete the selector unless the rule is genuinely');
  console.log('  unwanted -- it was written because someone wanted the effect.');
  await B.finish(1, `FAIL shadow_css_guard: ${dead.length} styles.css selector(s) target shadow-only classes (dead code).`);
}

await b.close();
console.log('\n  PASS: every class styles.css selects is reachable from the light DOM.');
await B.finish(0, '');
