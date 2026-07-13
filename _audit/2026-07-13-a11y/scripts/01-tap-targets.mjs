/* TAP TARGETS across every mobile surface, shadow DOM pierced, hit-tested.
 * Independently verifies the "22/59 -> 59/59" claim.
 *
 * NAVIGATION NOTE: the app boots into a full-screen topic-index overlay
 * (first run, no topic chosen). Measuring "the panes" without dismissing it
 * measures nine screens that are all sitting UNDER a z-index:1000 sheet. We
 * pick a topic with a real touch tap first.
 *
 * Two negative controls, both run every time:
 *  NC-A (can it go RED?)   shrink a passing control -> must flip PASS->FAIL.
 *  NC-B (can it go GREEN?) give a small control a ::before hit-expansion ->
 *        border box stays small, TAP AREA must grow. Proves we measure the
 *        region a finger actually gets, so we do not invent failures for
 *        controls that legitimately expand their hit region.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, phone, installDeep, judge, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';

ensureDirs();
const FLOOR = 44; // WCAG 2.5.5 AAA + Apple/Android HIG: the app's own stated floor
const AA = 24;    // WCAG 2.5.8 AA (Minimum): the legally binding one

const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const OVERLAYS = [
  ['topic-index', '#idxopen'],
  ['search', '#searchopen'],
  ['cram-sheet', '#cramopen'],
  ['session-progress', '#sessopen'],
  ['mock-run', '#mockopen'],
  ['notes', '#notesopen'],
  ['mixed-fire', '#mixopen'],
  ['gameplan', '#planopen'],
  ['scope', '#scopeopen'],
  ['print-qa', '#printqa'],
];

const drawerOpen = (p) => p.evaluate(() => !!document.querySelector('.sidebar')?.classList.contains('open'));
const overlayUp = (p) => p.evaluate(() =>
  [...document.querySelectorAll('body > div, body > *')].some((e) => {
    if (!e.className || typeof e.className !== 'string') return false;
    if (!/-ov|overlay|panel/.test(e.className + ' ' + e.id)) return false;
    try { return e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && e.getBoundingClientRect().width > 100; } catch { return false; }
  }));

async function setDrawer(p, want) {
  for (let i = 0; i < 3; i++) {
    if ((await drawerOpen(p)) === want) return true;
    await p.evaluate(() => document.querySelector('#toolsfab')?.click());
    await p.waitForTimeout(420);
  }
  return (await drawerOpen(p)) === want;
}

/** Dismiss the first-run index overlay by picking a topic with a REAL tap. */
async function pickTopic(p) {
  const card = p.locator('.ix-card').first();
  if (await card.count()) {
    await card.click({ timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(1000);
  }
  // belt and braces
  await p.evaluate(() => {
    const ov = document.querySelector('#_index-overlay');
    if (ov && ov.classList.contains('open')) document.querySelector('.ix-x')?.click();
  });
  await p.waitForTimeout(500);
}

async function collect(p, surface) {
  const t = await p.evaluate(() => window.__collectTargets());
  return t.map((x) => ({ ...x, surface, verdict: judge(x, FLOOR), verdictAA: judge(x, AA) }));
}
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n) });

const results = [];
const b = await launch();

for (const [vpName, vp] of Object.entries(PHONES)) {
  const p = await phone(b, vp);
  await installDeep(p);
  console.log(`\n--- ${vp.width}x${vp.height} ---`);

  // 1. first-run surface: the topic index overlay IS the boot screen
  results.push(...(await collect(p, `${vpName}:boot-index-overlay`)));
  await shot(p, `01-${vp.width}-boot-index-overlay.png`);

  // 2. pick a topic -> the app proper
  await pickTopic(p);
  const gone = await p.evaluate(() => !document.querySelector('#_index-overlay')?.classList.contains('open'));
  console.log(`  topic picked, index overlay dismissed: ${gone}`);
  results.push(...(await collect(p, `${vpName}:app-default-walk`)));
  await shot(p, `01-${vp.width}-app-default-walk.png`);

  // 3. tools drawer
  await setDrawer(p, true);
  results.push(...(await collect(p, `${vpName}:tools-drawer`)));
  await shot(p, `01-${vp.width}-tools-drawer.png`);

  // 4. the nine panes, measured with the drawer CLOSED (as the user reads them)
  for (const pane of PANES) {
    await setDrawer(p, true);
    const ok = await p.evaluate((t) => {
      const btn = document.querySelector(`.seg button[data-tab="${t}"]`);
      if (!btn) return false; btn.click(); return true;
    }, pane);
    if (!ok) { console.log(`  pane ${pane}: tab not found`); continue; }
    await p.waitForTimeout(800);
    await setDrawer(p, false);
    await p.waitForTimeout(350);
    const got = await collect(p, `${vpName}:pane-${pane}`);
    results.push(...got);
    await shot(p, `01-${vp.width}-pane-${pane}.png`);
    console.log(`  pane ${pane}: ${got.length} targets, ${got.filter((g) => g.verdict === 'FAIL').length} fail`);
  }

  // 5. overlays
  for (const [name, trig] of OVERLAYS) {
    await setDrawer(p, true);
    const ok = await p.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false; el.click(); return true;
    }, trig);
    if (!ok) { console.log(`  overlay ${name}: trigger ${trig} absent`); continue; }
    await p.waitForTimeout(1000);
    const got = await collect(p, `${vpName}:overlay-${name}`);
    results.push(...got);
    await shot(p, `01-${vp.width}-overlay-${name}.png`);
    console.log(`  overlay ${name}: ${got.length} targets, ${got.filter((g) => g.verdict === 'FAIL').length} fail`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  }
  await p.context().close();
}

/* =================== NEGATIVE CONTROLS =================== */
const nc = {};
{
  const p = await phone(b, PHONES.p390);
  await installDeep(p);
  await pickTopic(p);
  await setDrawer(p, true);
  const read = (sel) => p.evaluate((s) => ({ sel: s, ...window.__tapArea(document.querySelector(s)) }), sel);

  const before = await read('#idxopen');
  await p.addStyleTag({ content: '#idxopen{min-height:18px !important;height:18px !important;padding:0 !important;overflow:hidden}' });
  await p.waitForTimeout(300);
  const after = await read('#idxopen');
  nc.A = { before: { ...before, verdict: judge(before, FLOOR) }, after: { ...after, verdict: judge(after, FLOOR) } };
  await shot(p, '01-NEGCONTROL-A-shrunk-idxopen.png');
  await p.context().close();
}
{
  const p = await phone(b, PHONES.p390);
  await installDeep(p);
  await pickTopic(p);
  await p.addStyleTag({ content: '#toolsfab{min-height:16px !important;height:16px !important;width:20px !important;min-width:0 !important;padding:0 !important;font-size:0;overflow:visible}' });
  await p.waitForTimeout(300);
  const small = await p.evaluate(() => window.__tapArea(document.querySelector('#toolsfab')));
  await p.addStyleTag({ content: '#toolsfab{position:relative !important}#toolsfab::before{content:"";position:absolute;inset:-16px;display:block}' });
  await p.waitForTimeout(300);
  const expanded = await p.evaluate(() => window.__tapArea(document.querySelector('#toolsfab')));
  nc.B = { small: { ...small, verdict: judge(small, FLOOR) }, expanded: { ...expanded, verdict: judge(expanded, FLOOR) } };
  await p.context().close();
}
await b.close();

/* =================== REPORT =================== */
console.log('\n=============== NEGATIVE CONTROLS ===============');
const a = nc.A, bb = nc.B;
console.log('NC-A  shrink #idxopen ("Topic index" row, currently passing):');
console.log(`   before: rect ${a.before.rectW}x${a.before.rectH}  TAP ${a.before.hitW}x${a.before.hitH}  => ${a.before.verdict}`);
console.log(`   after : rect ${a.after.rectW}x${a.after.rectH}  TAP ${a.after.hitW}x${a.after.hitH}  => ${a.after.verdict}`);
console.log('   ' + (a.before.verdict === 'PASS' && a.after.verdict === 'FAIL'
  ? 'OK — the check GOES RED when a target really shrinks. It can fail.'
  : '*** INSTRUMENT BROKEN: did not go red ***'));
console.log('NC-B  shrink #toolsfab to 20x16, then add ::before{inset:-16px}:');
console.log(`   plain   : rect ${bb.small.rectW}x${bb.small.rectH}  TAP ${bb.small.hitW}x${bb.small.hitH}  => ${bb.small.verdict}`);
console.log(`   expanded: rect ${bb.expanded.rectW}x${bb.expanded.rectH}  TAP ${bb.expanded.hitW}x${bb.expanded.hitH}  => ${bb.expanded.verdict}`);
console.log('   ' + (bb.small.verdict === 'FAIL' && bb.expanded.hitW > bb.small.hitW && bb.expanded.hitH > bb.small.hitH
  ? 'OK — a hit-expanded target is CREDITED (border box small, tap area large).'
  : '*** hit-test not crediting ::before expansion ***'));

/* Only SEMANTIC controls count toward the WCAG tally. cursor:pointer decor is
 * reported separately (it is a different defect: an affordance that lies). */
const real = results.filter((r) => r.kind === 'semantic' && !r.occluded);
const occluded = results.filter((r) => r.occluded);
const decor = results.filter((r) => r.kind === 'pointer-only');
const fails = real.filter((r) => r.verdict === 'FAIL');
const failsAA = real.filter((r) => r.verdictAA === 'FAIL');
const bySurface = {};
for (const r of real) {
  (bySurface[r.surface] ||= { n: 0, fail: 0, failAA: 0 });
  bySurface[r.surface].n++;
  if (r.verdict === 'FAIL') bySurface[r.surface].fail++;
  if (r.verdictAA === 'FAIL') bySurface[r.surface].failAA++;
}
console.log('\n=============== PER SURFACE (44px floor) ===============');
for (const [s, v] of Object.entries(bySurface)) {
  console.log(`  ${(v.fail ? 'FAIL' : 'ok  ')} ${s.padEnd(34)} ${String(v.n - v.fail).padStart(3)}/${String(v.n).padEnd(3)} pass` + (v.failAA ? `   [${v.failAA} below even the 24px AA floor]` : ''));
}

const key = (r) => `${r.host}|${r.sel}`;
const uniq = new Map();
for (const f of fails) {
  if (!uniq.has(key(f))) uniq.set(key(f), { ...f, surfaces: new Set(), sizes: new Set() });
  const u = uniq.get(key(f));
  u.surfaces.add(f.surface);
  u.sizes.add(`${f.rectW}x${f.rectH} (tap ${f.hitW}x${f.hitH})`);
  if (f.verdictAA === 'FAIL') u.belowAA = true;
}
console.log('\n=============== TOTALS ===============');
console.log(`raw measurements       : ${results.length} across ${Object.keys(bySurface).length} surfaces, both viewports`);
console.log(`  - occluded/clipped   : ${occluded.length} (excluded: their target is not the size you can see)`);
console.log(`  - cursor:pointer decor: ${decor.length} (not real controls - reported separately)`);
console.log(`REAL CONTROLS MEASURED : ${real.length}`);
console.log(`44px floor : ${real.length - fails.length}/${real.length} pass  (${fails.length} FAIL)`);
console.log(`24px AA    : ${real.length - failsAA.length}/${real.length} pass  (${failsAA.length} FAIL)`);
console.log(`unique offending controls: ${uniq.size}`);

const decorU = new Map();
for (const d of decor) if (!decorU.has(d.sel)) decorU.set(d.sel, d);
if (decorU.size) {
  console.log('\n--- cursor:pointer, but NOT a control (affordance that lies) ---');
  for (const d of decorU.values()) console.log(`   [${d.inShadow ? d.host : 'light'}] ${d.sel}  ${d.rectW}x${d.rectH}  "${d.text}"`);
}
const occU = new Map();
for (const o of occluded) if (o.reason === 'centre-not-ours' && !occU.has(o.sel)) occU.set(o.sel, o);
if (occU.size) {
  console.log('\n--- rendered + visible, but its CENTRE is covered by something else ---');
  for (const o of occU.values()) console.log(`   [${o.inShadow ? o.host : 'light'}] ${o.sel}  ${o.rectW}x${o.rectH}  covered by: ${o.occludedBy}  "${o.text}"`);
}

const sorted = [...uniq.values()].sort((x, y) => (x.hitW * x.hitH) - (y.hitW * y.hitH));
console.log('\n=============== UNIQUE OFFENDERS (smallest tap area first) ===============');
for (const f of sorted) {
  const where = f.inShadow ? `SHADOW ${f.host}` : 'light DOM';
  console.log(`\n  [${where}]  ${f.sel}${f.belowAA ? '   *** BELOW 24px AA ***' : ''}`);
  console.log(`     "${f.text}"`);
  console.log(`     ${[...f.sizes].join(' | ')}`);
  console.log(`     surfaces: ${[...f.surfaces].join(', ')}`);
}

save('01-tap-targets.json', {
  floor: FLOOR, negativeControls: nc, bySurface,
  totals: { raw: results.length, real: real.length, occluded: occluded.length, decor: decor.length, fail44: fails.length, failAA24: failsAA.length },
  unique: sorted.map((u) => ({ ...u, surfaces: [...u.surfaces], sizes: [...u.sizes] })),
  decor: [...decorU.values()], occluded: [...occU.values()],
  results,
});
