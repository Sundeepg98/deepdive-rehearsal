/* 01-shadow-boundary.mjs -- HIGH-1.
 *
 * THE CLAIM UNDER TEST: styles.css's @media(forced-colors:active) and @media(prefers-contrast:more)
 * blocks target .card/.dec/.rf/.piv/.thread/.dgm-s FROM THE LIGHT DOM, and every one of those
 * elements lives inside a shadow root -- so the rules match ZERO nodes and the shipped
 * "a11y support" is dead code.
 *
 * Two independent measurements, because either alone can lie:
 *   (1) SELECTOR REACH -- how many nodes does each selector match in the light DOM vs in the
 *       17 shadow roots? A light-DOM stylesheet can only ever style the light-DOM count.
 *   (2) RULE EFFECT -- does turning the media feature ON actually CHANGE the computed value on
 *       the real element? This is the one that cannot be argued with: a rule that "should"
 *       apply but does not move the number is dead, whatever the CSS looks like.
 *
 * NEGATIVE CONTROL: measurement (2) is only trustworthy if it can SEE a change when there is
 * one. So we also measure a control property that the light-DOM half of the SAME media block
 * genuinely does move (.seg button.on outline / .mockbtn border). If that does not move, the
 * emulation itself is not firing and every "no change" below is meaningless.
 */
import { launch, openApp, selectorReach, computedIn, settleAnimations, showPane, setTheme } from './lib.mjs';

/* every class named in the two @media blocks at styles.css:749 / :751 */
const CLASSES = ['.card', '.dec', '.rf', '.piv', '.thread', '.dgm-s', '.pill',
  '.cmp-note', '.cmp-thesis', '.sub', '.locator', '.mb-d',
  '.seg button', '.mockbtn', '.crambtn', '.tools-fab', '.inttog', '.badge'];

const browser = await launch();

console.log('\n================ HIGH-1: DOES THE A11Y CSS REACH ANYTHING? ================\n');

/* ---------- (1) SELECTOR REACH, on the surface the audit measured (walkthrough) ---------- */
{
  const page = await openApp(browser);
  await showPane(page, 'walk');
  await settleAnimations(page);
  const reach = await selectorReach(page, CLASSES);
  console.log('  (1) SELECTOR REACH -- a light-DOM stylesheet can style ONLY the "light" column.\n');
  console.log('      selector          light   shadow   a light-DOM rule targeting it...');
  console.log('      ' + '-'.repeat(72));
  for (const c of CLASSES) {
    const { light, shadow } = reach[c];
    let verdict;
    if (light === 0 && shadow > 0) verdict = '*** MATCHES NOTHING (all ' + shadow + ' are in shadow roots) ***';
    else if (light > 0 && shadow === 0) verdict = 'reaches all ' + light;
    else if (light > 0 && shadow > 0) verdict = 'reaches ' + light + ', MISSES ' + shadow + ' in shadow';
    else verdict = '(absent on this surface)';
    console.log('      %s %s %s   %s', c.padEnd(17), String(light).padStart(5), String(shadow).padStart(7), verdict);
  }
  await page.__ctx.close();
}

/* ---------- (2)+(3) RULE EFFECT -- turn the feature ON and see if the number MOVES ----------
 * EACH FAMILY IS PROBED ON THE PANE WHERE IT ACTUALLY LIVES. Probing .thread or .rf on the
 * walkthrough returns "not present", which is not evidence of anything -- and quietly counting a
 * not-present probe as a pass is exactly how a check stops being able to fail. */
const PROBES = [
  { label: '.card border', pane: 'walk', sel: '.card', prop: 'border-top-width', half: 'SHADOW' },
  { label: '.thread border', pane: 'drill', sel: '.thread', prop: 'border-top-width', half: 'SHADOW' },
  { label: '.rf border', pane: 'rf', sel: '.rf', prop: 'border-top-width', half: 'SHADOW' },
  /* .dec's TOP edge is its 3px accent -- probe a HAIRLINE side, or you measure the accent (which
     is meant to hold at 3px) and read a working rule as dead. */
  { label: '.dec border', pane: 'trade', sel: '.dec', prop: 'border-bottom-width', half: 'SHADOW' },
  { label: '.piv border', pane: 'sys', sel: '.piv', prop: 'border-top-width', half: 'SHADOW' },
  /* THE SPECIFICITY HALF. `.arc-h .sub` (0,2,0) and `.dnav-h .sub` (0,2,0) both outrank a bare
     `.sub` (0,1,0) -- which is why the old rule was dead even where it could reach. Only an
     !important in the shadow sheet moves these. */
  { label: '.arc-h .sub color', pane: 'walk', sel: '.arc-h .sub', prop: 'color', half: 'SHADOW (specificity)' },
  { label: '.dnav-h .sub color', pane: 'drill', sel: '.dnav-h .sub', prop: 'color', half: 'SHADOW (specificity)' },
  { label: '.dgm-s color', pane: 'wb', sel: '.dgm-s', prop: 'color', half: 'SHADOW' },
  /* THE ACCENT EDGES MUST NOT GET THINNER. .dec's 3px top accent and .rf's 3px left accent are
     the only at-a-glance difference between a trade-off card and a red-flag card. A blanket
     border-width:2px shaved them; assert they hold. */
  { label: '.dec top accent', pane: 'trade', sel: '.dec', prop: 'border-top-width', half: 'SHADOW (accent)', hold: '3px' },
  { label: '.rf left accent', pane: 'rf', sel: '.rf', prop: 'border-left-width', half: 'SHADOW (accent)', hold: '3px' },
  /* THE NEGATIVE CONTROLS: the LIGHT half of the same blocks, known to work. If THESE do not
     move, the emulation is not firing and every "no change" above is void.
     Each control is aimed at the property ITS OWN block sets -- prefers-contrast gives
     .seg button.on an OUTLINE, forced-colors gives it a BORDER. Probing the wrong property
     reports a live rule as dead, which is how you talk yourself out of a real result. */
  { label: '.seg btn.on outline', pane: 'walk', sel: '.seg button.on', prop: 'outline-width', half: 'LIGHT (control)', only: 'pc' },
  { label: '.seg btn.on border', pane: 'walk', sel: '.seg button.on', prop: 'border-top-width', half: 'LIGHT (control)', only: 'fc' },
  { label: '.mockbtn border', pane: 'walk', sel: '.mockbtn', prop: 'border-top-width', half: 'LIGHT (control)' },
];

async function ruleEffect(which, title, offOpts, onOpts, extraControl) {
  const off = await openApp(browser, offOpts);
  const on = await openApp(browser, onOpts);
  console.log('\n      %s', title);
  console.log('      probe                    half                     OFF             ON     moved?');
  console.log('      ' + '-'.repeat(82));
  let controlMoved = false, shadowMoved = 0, shadowTotal = 0, notPresent = 0, accentThinned = 0;
  for (const p of PROBES) {
    if (p.only && p.only !== which) continue;
    await showPane(off, p.pane); await settleAnimations(off);
    await showPane(on, p.pane); await settleAnimations(on);
    const a = await computedIn(off, p.sel, [p.prop]);
    const b = await computedIn(on, p.sel, [p.prop]);
    if (!a.found || !b.found) {
      notPresent++;
      console.log('      %s %s  *** NOT PRESENT on "%s" -- probe proves nothing ***', p.label.padEnd(23), p.half.padEnd(21), p.pane);
      continue;
    }
    const va = a[p.prop], vb = b[p.prop];
    const moved = va !== vb;
    if (p.half.startsWith('LIGHT (control)') && moved) controlMoved = true;
    if (p.half === 'SHADOW') { shadowTotal++; if (moved) shadowMoved++; }

    let note = moved ? 'YES' : 'no  <-- DEAD RULE';
    if (p.hold) {
      /* an ACCENT must not shrink. forced-colors deliberately flattens every edge to a uniform
         CanvasText box (hue carries nothing there), so only prefers-contrast has to hold it. */
      if (which === 'pc') {
        const held = parseFloat(vb) >= parseFloat(p.hold);
        if (!held) accentThinned++;
        note = held ? 'held at ' + vb + '  (must be >= ' + p.hold + ')'
                    : '*** THINNED ' + va + ' -> ' + vb + ' UNDER prefers-contrast ***';
      } else {
        note = 'flattened to ' + vb + ' (correct in forced-colors)';
      }
    }
    console.log('      %s %s %s %s   %s', p.label.padEnd(23), p.half.padEnd(21),
      String(va).slice(0, 14).padStart(14), String(vb).slice(0, 14).padStart(14), note);
  }
  const ctl = extraControl ? await extraControl(off, on) : { ok: controlMoved, note: '' };
  console.log('\n      [negative control] %s', ctl.note || ('the LIGHT half of the same block moved: ' + (controlMoved ? 'YES' : 'NO')));
  const emuOk = controlMoved && (ctl.ok !== false);
  console.log('                         => emulation is %s', emuOk ? 'REAL -- a "no" above is a DEAD RULE, not a dead instrument' : '*** NOT FIRING -- ALL READINGS VOID ***');
  if (!emuOk) { console.error('\nABORT: emulation not firing.'); process.exit(2); }
  console.log('      [result]           SHADOW rules that took effect: %s of %s   (not present: %s, accents thinned: %s)',
    shadowMoved, shadowTotal, notPresent, accentThinned);
  await off.__ctx.close(); await on.__ctx.close();
  return { shadowMoved, shadowTotal, notPresent, accentThinned };
}

console.log('\n  (2)(3) RULE EFFECT -- turn the media feature ON and see if the number MOVES.');

const pc = await ruleEffect('pc', '@media (prefers-contrast: more)', { contrast: 'no-preference' }, { contrast: 'more' });

const fc = await ruleEffect('fc', '@media (forced-colors: active)', { forcedColors: 'none' }, { forcedColors: 'active' },
  async (off, on) => {
    /* forced-colors must genuinely SUBSTITUTE system colours, not merely flip a media query */
    const bodyA = await off.evaluate(() => getComputedStyle(document.body).color);
    const bodyB = await on.evaluate(() => getComputedStyle(document.body).color);
    const ctaA = await computedIn(off, '.mockbtn', ['background-image']);
    const ctaB = await computedIn(on, '.mockbtn', ['background-image']);
    const real = bodyA !== bodyB && ctaA['background-image'] !== ctaB['background-image'];
    return {
      ok: real,
      note: 'forced-colors genuinely substitutes system colours:\n' +
            '                         body color      ' + bodyA + ' -> ' + bodyB + '\n' +
            '                         .mockbtn bg-img ' + String(ctaA['background-image']).slice(0, 28) + '... -> ' + ctaB['background-image'],
    };
  });

/* ---------- (4) WHICH SHEET WINS? adopted vs the shadow root's own <style> ---------- */
/* topic-protocol.js does:  root.adoptedStyleSheets = this.sheets();
 *                          root.innerHTML = '<style>'+this.styleText()+'</style>' + skeleton
 * Per CSSOM the adopted sheets cascade AFTER the shadow root's own <style>, so at EQUAL
 * specificity BASE_SHEET BEATS DRILL_STYLE. That decides where each fix has to go, so it is
 * measured, not assumed. */
{
  const page = await openApp(browser);
  await showPane(page, 'drill'); await settleAnimations(page);
  const order = await page.evaluate(() => {
    const host = document.querySelector('deep-drill');
    if (!host || !host.shadowRoot) return { err: 'no deep-drill shadow root' };
    const r = host.shadowRoot;
    /* plant the SAME selector at the SAME specificity in both sheets and see which colour wins */
    const own = r.querySelector('style');
    own.textContent += '\n#__probe{color:rgb(1,1,1)}';
    const adopted = new CSSStyleSheet();
    adopted.replaceSync('#__probe{color:rgb(2,2,2)}');
    r.adoptedStyleSheets = [...r.adoptedStyleSheets, adopted];
    const d = document.createElement('div');
    d.id = '__probe'; d.textContent = 'x';
    r.appendChild(d);
    const won = getComputedStyle(d).color;
    d.remove();
    r.adoptedStyleSheets = r.adoptedStyleSheets.slice(0, -1);
    return {
      won,
      winner: won === 'rgb(2, 2, 2)' ? 'ADOPTED sheet (BASE_SHEET) wins ties'
            : won === 'rgb(1, 1, 1)' ? 'the shadow root <style> (DRILL_STYLE) wins ties'
            : 'inconclusive: ' + won,
      adoptedCount: r.adoptedStyleSheets.length,
      ownStyleTags: r.querySelectorAll('style').length,
    };
  });
  console.log('\n  (4) CASCADE ORDER inside a shadow root (decides WHERE each fix must go):');
  console.log('      deep-drill: %s adopted sheet(s) + %s own <style>', order.adoptedCount, order.ownStyleTags);
  console.log('      at EQUAL specificity -> %s', order.winner);
  await page.__ctx.close();
}

await browser.close();
const ok = pc.shadowMoved === pc.shadowTotal && fc.shadowMoved === fc.shadowTotal
  && pc.notPresent === 0 && fc.notPresent === 0
  && pc.accentThinned === 0 && fc.accentThinned === 0;
console.log('\n  VERDICT: %s\n', ok
  ? `PASS -- every shadow-DOM a11y rule TAKES EFFECT (prefers-contrast ${pc.shadowMoved}/${pc.shadowTotal}, forced-colors ${fc.shadowMoved}/${fc.shadowTotal}) and no accent edge was thinned.`
  : `FAIL -- prefers-contrast ${pc.shadowMoved}/${pc.shadowTotal}, forced-colors ${fc.shadowMoved}/${fc.shadowTotal}, not-present ${pc.notPresent + fc.notPresent}, accents thinned ${pc.accentThinned + fc.accentThinned}`);
process.exit(ok ? 0 : 1);
