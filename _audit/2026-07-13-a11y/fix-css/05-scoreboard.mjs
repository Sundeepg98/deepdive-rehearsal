/* 05-scoreboard.mjs -- HIGH-2 (the fill dies in forced-colors) + SERIOUS-5 (the zero state is
 * below AA).
 *
 * Both live on the same three tiles, so both are measured here, on the REAL drill: the state
 * machine is DRIVEN (#adv to reveal, #jg to grade Solid), never faked by adding a class. A tile
 * whose state was stamped on by the test is a tile the test invented.
 *
 * HIGH-2. drill/logic.js calls FILL-vs-OUTLINE "the load-bearing one": SOLID is the only tile that
 * ever fills. Under forced-colors the UA forces background-color to Canvas, so the fill was
 * stripped and SOLID became pixel-identical to REVISIT -- tile-vs-tile distance 551 -> 0.
 * Measured as a COLOUR DISTANCE between the two tiles' painted backgrounds, decoded from a real
 * screenshot. getComputedStyle would happily report the authored var(--st-ok) and tell us nothing.
 *
 * SERIOUS-5. .pill.z{opacity:.62} multiplies an already-muted ink. Measured with the calibrated
 * alpha-recovery pipeline over the GLYPH CORE (00-calibrate.mjs proves it splits the AA boundary,
 * and that a naive ABSOLUTE core cut measures ZERO pixels on an element at opacity .62 -- i.e.
 * would report this exact tile as clean).
 *
 * NEGATIVE CONTROL for the fill detector: a tile that has NOT been graded must read distance ~0
 * against its neighbour. If the detector reports a fill on an ungraded board it is seeing things.
 */
import {
  launch, openApp, showPane, setTheme, setRoom, settleAnimations, makeDecoder,
  rectColor, colorDistance, measureContrast, wcagFloor, shot, ROOMS,
} from './lib.mjs';

const browser = await launch();
const decoder = await makeDecoder(browser);

/* Drive the REAL drill: reveal through every follow-up, then grade Solid. Repeat n times. */
async function gradeSolid(page, n) {
  for (let i = 0; i < n; i++) {
    for (let guard = 0; guard < 8; guard++) {
      const advanced = await page.evaluate(() => {
        const r = document.querySelector('deep-drill')?.shadowRoot;
        const adv = r?.getElementById('adv');
        if (adv) { adv.click(); return true; }
        return false;
      });
      if (!advanced) break;
      await page.waitForTimeout(120);
    }
    const graded = await page.evaluate(() => {
      const r = document.querySelector('deep-drill')?.shadowRoot;
      const jg = r?.getElementById('jg');
      if (jg) { jg.click(); return true; }
      return false;
    });
    if (!graded) return i;
    await page.waitForTimeout(220);
  }
  return n;
}

async function tileRects(page) {
  return page.evaluate(() => {
    const r = document.querySelector('deep-drill').shadowRoot;
    const grab = (sel) => {
      const el = r.querySelector(sel);
      const b = el.getBoundingClientRect();
      /* sample the tile's INTERIOR, well inside the border and clear of the glyphs:
         a horizontal band across the top padding of the tile */
      return { x: Math.round(b.left + 6), y: Math.round(b.top + 3), w: Math.round(b.width - 12), h: 4,
               cls: el.className };
    };
    return { solid: grab('.pill.g'), revisit: grab('.pill.s'), left: grab('.pill.left') };
  });
}

async function fillDistance(page, label) {
  await settleAnimations(page);
  const rects = await tileRects(page);
  const png = await page.screenshot({ animations: 'disabled' });
  const cSolid = await rectColor(decoder, png, rects.solid);
  const cRevisit = await rectColor(decoder, png, rects.revisit);
  const d = colorDistance(cSolid, cRevisit);
  return { label, cSolid, cRevisit, d, solidCls: rects.solid.cls };
}

console.log('\n============ HIGH-2: DOES THE SOLID TILE STILL FILL IN FORCED-COLORS? ============\n');
console.log('  Driving the REAL drill state machine (#adv -> #jg), never stamping a class on.\n');
console.log('  mode              state        SOLID tile bg      REVISIT tile bg    distance');
console.log('  ' + '-'.repeat(74));

const results = {};
for (const [mode, opts] of [['normal', {}], ['forced-colors', { forcedColors: 'active' }]]) {
  const page = await openApp(browser, opts);
  await showPane(page, 'drill');
  await settleAnimations(page);

  /* NEGATIVE CONTROL: ungraded board. Solid == Revisit; the detector must read ~0. */
  const zero = await fillDistance(page, 'Solid=0');
  const n = await gradeSolid(page, 3);
  const graded = await fillDistance(page, `Solid=${n}`);

  results[mode] = { zero, graded };
  for (const r of [zero, graded]) {
    console.log('  %s %s [%s] [%s] %s',
      mode.padEnd(15), r.label.padEnd(10),
      r.cSolid.join(',').padStart(13), r.cRevisit.join(',').padStart(13),
      String(r.d).padStart(8) + (r === graded ? (r.d > 60 ? '  <- FILLS' : '  <- *** DOES NOT FILL ***') : ''));
  }
  if (mode === 'forced-colors') await shot(page, 'forced-colors-scoreboard-AFTER.png');
  await page.__ctx.close();
}

const ncOk = results.normal.zero.d < 20 && results['forced-colors'].zero.d < 20;
console.log('\n  [negative control] an UNGRADED board must read distance ~0 (the detector is not');
console.log('                     hallucinating a fill): normal %s, forced-colors %s -> %s',
  results.normal.zero.d, results['forced-colors'].zero.d, ncOk ? 'OK' : '*** DETECTOR IS SEEING THINGS ***');
if (!ncOk) { console.error('\nABORT: fill detector fails its negative control.'); process.exit(2); }

const fcFills = results['forced-colors'].graded.d > 60;
console.log('\n  RESULT: normal        %s  (was 551 before -- unchanged, the design still works)', results.normal.graded.d);
console.log('          forced-colors %s  (was 0 before -- the fill was STRIPPED)  -> %s',
  results['forced-colors'].graded.d, fcFills ? 'THE FILL SURVIVES' : '*** STILL DEAD ***');

/* ---------------------------------------------------------------- SERIOUS-5 */
console.log('\n\n============ SERIOUS-5: THE DRILL SCOREBOARD ZERO STATE ============\n');
console.log('  The state EVERY user opens the drill in: Solid 0, Revisit 0.');
console.log('  Contrast decoded from PAINTED PIXELS over the glyph core (getComputedStyle returns');
console.log('  n/a on these gradients). Calibrated in 00-calibrate.mjs: FAILS 4.48, PASSES 4.54.\n');

const SPECS = [
  { label: 'pill .v (value)', sel: '.pill.z .v' },
  { label: 'pill .l (label)', sel: '.pill.z .l' },
];

let worst = 99, fails = 0, total = 0;
console.log('  room                       theme  node              text      ratio  floor  verdict');
console.log('  ' + '-'.repeat(80));
for (const room of ROOMS) {
  for (const theme of ['light', 'dark']) {
    const page = await openApp(browser, { colorScheme: theme });
    await setTheme(page, theme);
    await setRoom(page, room.topic);
    await showPane(page, 'drill');
    await settleAnimations(page);

    const res = await measureContrast(page, decoder, SPECS);
    for (const r of res) {
      if (r.min == null) continue;
      const floor = wcagFloor(r.fontSize, r.fontWeight);
      const ratio = r.median;
      const pass = ratio >= floor;
      total++; if (!pass) fails++;
      if (ratio < worst) worst = ratio;
      console.log('  %s %s %s %s %s %s   %s',
        room.group.padEnd(26), theme.padEnd(6), r.label.padEnd(17),
        ('"' + r.text.slice(0, 7) + '"').padEnd(10),
        String(ratio).padStart(6), String(floor).padStart(5),
        pass ? 'PASS' : '*** FAIL ***');
    }
    if (room.group === 'messaging-events') await shot(page, `zerostate-${theme}-AFTER.png`);
    await page.__ctx.close();
  }
}

await browser.close();
console.log('\n  %s of %s zero-state nodes clear their WCAG floor. Worst: %s', total - fails, total, worst);
const pass = fails === 0 && fcFills;
console.log('\n  VERDICT: %s\n', pass
  ? 'PASS -- the fill survives forced-colors AND every zero-state node clears AA.'
  : `FAIL -- ${fails} contrast failure(s); forced-colors fill ${fcFills ? 'ok' : 'DEAD'}`);
process.exit(pass ? 0 : 1);
