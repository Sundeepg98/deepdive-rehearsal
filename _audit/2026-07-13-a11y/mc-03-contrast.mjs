/* mc-03-contrast.mjs — CONTRAST, PIXEL-DECODED, BACKGROUND LOCAL TO EACH GLYPH.
 *
 * Two ways to get this wrong, both of which this pipeline avoids by construction:
 *   1. getComputedStyle(el).backgroundColor returns "rgba(0,0,0,0)" on the gradient CTAs and
 *      backgroundImage returns a useless literal string. A tool that reads those learns NOTHING.
 *   2. "Worst background pixel anywhere in the button" is not a contrast metric. It samples pixels
 *      no glyph ever touches (gradient extremes, inset highlights, the 1px border) and manufactured
 *      six bogus ~3.1:1 failures on buttons that are demonstrably fine.
 * Instead: recover per-pixel glyph coverage analytically (black-render minus white-render), and read
 * the background from a transparent-text render AT THE SAME PIXEL. Contrast is then evaluated only
 * on the glyph CORE, against the background actually beneath it.
 *
 * Calibrated in mc-00-calibrate.mjs: exact on solid swatches (delta <= 0.004), exact on a
 * gradient-painted background, brackets a varying gradient, correctly FAILS #777-on-white (4.48)
 * while PASSING #767676-on-white (4.54), and independently reproduces the repo's own claimed
 * 6.18 / 9.17 for --st-ok straight from pixels.
 *
 * Sweep: every text-bearing element in the viewport (light DOM + all 17 shadow roots),
 * 6 rooms x 2 themes, on the default walkthrough view + the drill scoreboard.
 */
import * as L from './mc-lib.mjs';
import fs from 'node:fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = OUT + '/shots/motion-contrast';
const log = [];
const say = (s) => { console.log(s); log.push(s); };

/* Named surfaces first (so they get the readable label), then a catch-all sweep of every
 * remaining text-bearing element. collectTargets skips anything already claimed. */
const SPECS = [
  { sel: '#mockopen', label: 'CTA mockbtn (gradient)' },
  { sel: '.crambtn', label: 'CTA crambtn' },
  { sel: '.tools-fab', label: 'CTA tools-fab' },
  { sel: '.inttog', label: 'CTA inttog' },
  { sel: '.revset-b', label: 'CTA revset-b' },
  { sel: '.locator', label: 'locator' },
  { sel: '.loc-key', label: 'locator key' },
  { sel: '.badge', label: 'badge' },
  { sel: '.hdr h1', label: 'h1' },
  { sel: '.hdr .sub', label: 'subtitle' },
  { sel: '.kbd-hint', label: 'kbd-hint' },
  { sel: '.seg button', label: 'pane tab' },
  { sel: '.mb-d', label: 'tool desc' },
  { sel: '.tn-trigger', label: 'topic nav' },
  { sel: '.step-k', label: 'step kicker' },
  { sel: '.step-t', label: 'step title' },
  { sel: '.step-sub', label: 'step sub' },
  { sel: '.pill .v', label: 'scoreboard value' },
  { sel: '.pill .l', label: 'scoreboard label' },
  { sel: '*', label: 'auto' },
];

const browser = await L.launch();
const decoder = await L.makeDecoder(browser);

async function measure(page, tag) {
  const targets = await L.collectTargets(page, SPECS);
  const N = await L.shotBuf(page);
  await L.forceTargetColor(page, 'transparent'); const T = await L.shotBuf(page);
  await L.forceTargetColor(page, '#000000'); const A = await L.shotBuf(page);
  await L.forceTargetColor(page, '#ffffff'); const B = await L.shotBuf(page);
  await L.forceTargetColor(page, null);
  const res = await L.analyzeContrast(decoder, { N, T, A, B, targets });
  await page.evaluate(() => {
    const roots = [document];
    document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) roots.push(e.shadowRoot); });
    roots.forEach((r) => r.querySelectorAll('[data-mc-target]').forEach((e) => {
      ['data-mc-target', 'data-mc-oc', 'data-mc-ocp', 'data-mc-of', 'data-mc-ofp'].forEach((a) => e.removeAttribute(a));
    }));
  });
  return res.filter((r) => r.min !== null && r.corePx >= 12);
}

const all = [];
const page = await L.openApp(browser, {});

/* GUARD: the force/restore cycle must leave the page byte-identical. An earlier version did not
 * (it deleted the app's own inline colour on the sidebar "Focus" chip), and the sweep then
 * reported an element the instrument itself had broken. Assert it, every run, before trusting
 * a single number below. */
{
  await L.showPane(page, 'walk');
  await page.waitForTimeout(500);
  const snap = () => page.evaluate(() => {
    const roots = [document];
    document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) roots.push(e.shadowRoot); });
    const o = [];
    for (const r of roots) r.querySelectorAll('[data-mc-target]').forEach((el) => o.push(el.getAttribute('data-mc-target') + '=' + getComputedStyle(el).color));
    return o.join('|');
  });
  await L.collectTargets(page, SPECS);
  const b4 = await snap();
  await L.forceTargetColor(page, 'transparent');
  await L.forceTargetColor(page, '#000000');
  await L.forceTargetColor(page, '#ffffff');
  await L.forceTargetColor(page, null);
  await page.waitForTimeout(200);
  const aft = await snap();
  const clean = b4 === aft;
  say(`[guard] force/restore cycle leaves the page unchanged: ${clean ? 'YES' : '*** NO — INSTRUMENT CORRUPTS THE PAGE, ABORTING ***'}`);
  if (!clean) {
    const B = b4.split('|'), A = aft.split('|');
    B.forEach((x, i) => { if (x !== A[i]) say(`   drift: ${x}  ->  ${A[i]}`); });
    process.exit(1);
  }
  await page.evaluate(() => {
    const roots = [document];
    document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) roots.push(e.shadowRoot); });
    roots.forEach((r) => r.querySelectorAll('[data-mc-target]').forEach((e) => {
      ['data-mc-target', 'data-mc-oc', 'data-mc-ocp', 'data-mc-of', 'data-mc-ofp'].forEach((a) => e.removeAttribute(a));
    }));
  });
}

for (const { group, topic } of L.ROOMS) {
  for (const theme of L.THEMES) {
    await L.setRoom(page, topic);
    await L.setTheme(page, theme);
    for (const pane of ['walk', 'drill']) {
      await L.showPane(page, pane);
      await page.waitForTimeout(600);
      const res = await measure(page, `${group}-${theme}-${pane}`);
      for (const r of res) {
        r.group = group; r.theme = theme; r.pane = pane;
        r.floor = L.wcagFloor(r.fontSize, r.fontWeight);
        r.pass = r.min >= r.floor;
        all.push(r);
      }
    }
  }
}
await page.screenshot({ path: `${SHOTS}/contrast-last-state.png`, animations: 'disabled' });

/* ---------------------------------------------------------------- report */
const name = (r) => (r.host ? r.host + '::' : '') + r.tag + (r.cls ? '.' + r.cls.split(' ').filter(Boolean).join('.') : '');
const fails = all.filter((r) => !r.pass && !r.disabled);
const exempt = all.filter((r) => !r.pass && r.disabled);

say('\n=== CONTRAST SWEEP — 6 rooms x 2 themes, walk + drill panes ===\n');
say(`   measured ${all.length} text elements (light DOM + shadow roots), all backgrounds decoded LOCAL to the glyph.`);
say(`   ${fails.length} below their WCAG AA floor.`);
say(`   ${exempt.length} more are below floor but are DISABLED controls — WCAG 1.4.3 exempts inactive components, so they are NOT counted as failures.\n`);

say('--- THE FULL BAND, by surface (min ratio observed across all 12 room x theme states) ---\n');
const byLabel = {};
for (const r of all) {
  const k = r.label === 'auto' ? name(r) : r.label;
  (byLabel[k] ||= []).push(r);
}
const entries = Object.entries(byLabel).map(([k, rs]) => {
  const mins = rs.map((r) => r.min);
  const worst = rs.reduce((a, b) => (a.min <= b.min ? a : b));
  return { k, lo: Math.min(...mins), hi: Math.max(...mins), n: rs.length, floor: worst.floor, worst, dis: rs.every((r) => r.disabled), nFail: rs.filter((r) => !r.pass && !r.disabled).length };
}).sort((a, b) => a.lo - b.lo);

say('   surface                                     band(min..max)   floor  n   worst state                         status');
for (const e of entries.slice(0, 36)) {
  const st = `${e.worst.group}/${e.worst.theme}`;
  const status = e.dis ? 'disabled (exempt)' : e.nFail ? '*** ' + e.nFail + ' FAIL' : 'pass';
  say(`   ${e.k.slice(0, 42).padEnd(43)} ${String(e.lo).padStart(5)} .. ${String(e.hi).padEnd(6)} ${String(e.floor).padStart(4)}  ${String(e.n).padStart(2)}  ${st.padEnd(34)} ${status}`);
}

say('\n--- EVERY FAILURE (below WCAG AA, excluding disabled controls) — deduped to element x state ---\n');
const seen = new Set();
const uniq = fails.sort((a, b) => a.min - b.min).filter((r) => {
  const k = name(r) + '|' + r.text + '|' + r.group + '|' + r.theme;
  if (seen.has(k)) return false; seen.add(k); return true;
});
if (!uniq.length) say('   none.');
else {
  say('   ratio  floor  size/wt    room / theme                        element                                text');
  for (const r of uniq) {
    say(`   ${String(r.min).padStart(5)}  ${String(r.floor).padStart(4)}  ${String(r.fontSize).padStart(4)}px/${String(r.fontWeight).padEnd(3)} ${(r.group + ' / ' + r.theme).padEnd(35)} ${name(r).slice(0, 36).padEnd(37)} "${r.text.slice(0, 24)}"`);
  }
}
say('\n--- BELOW FLOOR BUT WCAG-EXEMPT (disabled / inactive controls) ---\n');
const dseen = new Set();
for (const r of exempt.sort((a, b) => a.min - b.min)) {
  const k = name(r) + '|' + r.text;
  if (dseen.has(k)) continue; dseen.add(k);
  say(`   ${String(r.min).padStart(5)}  ${name(r).slice(0, 36).padEnd(37)} "${r.text.slice(0, 24)}"  (disabled — not a violation)`);
}

/* the known thin spot, tracked explicitly across all 12 states */
say('\n--- #mockopen (the gradient CTA; brief flags a known thin spot at ~4.77 light) ---\n');
say('   room                        theme   min    p05    median  max    floor  verdict');
for (const r of all.filter((x) => x.label === 'CTA mockbtn (gradient)')) {
  say(`   ${r.group.padEnd(27)} ${r.theme.padEnd(6)} ${String(r.min).padStart(5)}  ${String(r.p05).padStart(5)}  ${String(r.median).padStart(6)}  ${String(r.max).padStart(5)}  ${String(r.floor).padStart(4)}   ${r.pass ? 'pass' : '*** FAIL'}`);
}

const summary = { measured: all.length, failures: fails.length, byState: {} };
for (const r of fails) {
  const k = r.group + '/' + r.theme;
  (summary.byState[k] ||= []).push({ el: name(r), ratio: r.min, floor: r.floor, text: r.text });
}
fs.writeFileSync(OUT + '/mc-data-contrast.json', JSON.stringify({ summary, all }, null, 2));
fs.writeFileSync(OUT + '/mc-data-contrast.txt', log.join('\n'));
await browser.close();
