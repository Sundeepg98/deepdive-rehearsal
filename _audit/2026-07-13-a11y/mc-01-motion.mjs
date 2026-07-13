/* mc-01-motion.mjs — REDUCED MOTION.
 *
 * The app was a COMPLETELY BLANK PAGE under prefers-reduced-motion. The audit that missed it
 * counted text nodes. This counts PAINTED PIXELS, in all 6 rooms x both themes, and then goes
 * hunting for anything else whose VISIBILITY depends on an animation reaching its end state.
 *
 * Instruments (all proven able to go red in mc-00-calibrate.mjs):
 *   1. paintedPixels     — decoded framebuffer. 0 on a blank page.
 *   2. effectiveOpacity  — ancestor-chain opacity PRODUCT, crossing shadow boundaries. This is
 *                          the thing getComputedStyle(el).opacity does NOT give you: opacity:0
 *                          on <body> leaves every descendant reporting opacity "1".
 *   3. animation-name    — confirms the `*{animation:none!important}` landmine is still armed,
 *                          so anything that depends on an animation end-state WILL be caught.
 */
import * as L from './mc-lib.mjs';
import fs from 'node:fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = OUT + '/shots/motion-contrast';
fs.mkdirSync(SHOTS, { recursive: true });
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const rows = [];

/* Ancestor-chain effective opacity, crossing shadow boundaries. */
const SCAN = `(() => {
  const bad = [];
  const eff = (el) => {
    let o = 1, n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none') return { o: 0, why: 'display:none@' + n.tagName.toLowerCase() };
      if (cs.visibility === 'hidden') return { o: 0, why: 'visibility:hidden@' + n.tagName.toLowerCase() };
      o *= parseFloat(cs.opacity);
      if (o === 0) return { o: 0, why: 'opacity:0@' + n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') };
      const root = n.getRootNode();
      n = n.parentElement || (root instanceof ShadowRoot ? root.host : null);
    }
    return { o, why: null };
  };
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      const t = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
      if (!t) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const e = eff(el);
      if (e.o < 0.02) bad.push({ tag: el.tagName.toLowerCase(), cls: el.className && el.className.toString().slice(0,40), why: e.why, text: (el.textContent||'').trim().slice(0,30) });
    }
  };
  walk(document);
  return bad;
})()`;

const ANIM = `(() => {
  const out = { animated: 0, names: {}, bodyOpacity: getComputedStyle(document.body).opacity,
                bodyAnim: getComputedStyle(document.body).animationName,
                bodyFill: getComputedStyle(document.body).animationFillMode };
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      const n = getComputedStyle(el).animationName;
      if (n && n !== 'none') { out.animated++; out.names[n] = (out.names[n]||0)+1; }
    }
  };
  walk(document);
  return out;
})()`;

const browser = await L.launch();
const decoder = await L.makeDecoder(browser);

/* ============ 0. THE ONBOARDING OVERLAY — measure the APP, not the panel over it ============ */
say('=== 0. FIRST-RUN ONBOARDING OVERLAY (must be dismissed before anything is measured) ===\n');
{
  const ob = await L.openApp(browser, { reducedMotion: 'reduce', keepOnboarding: true });
  const st = await ob.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    const cs = ov && getComputedStyle(ov);
    return { cls: ov?.className, opacity: cs?.opacity, backdrop: cs?.backdropFilter, anim: cs?.animationName, trans: cs?.transitionDuration };
  });
  const pOb = await L.paintedPixels(decoder, await L.shotBuf(ob));
  await ob.screenshot({ path: `${SHOTS}/reduce-onboarding-open.png`, animations: 'disabled' });
  say(`   on load, with NO interaction: #_index-overlay = "${st.cls}"  opacity=${st.opacity}  backdrop-filter=${st.backdrop}`);
  say(`   index-overlay.js:427 auto-opens it whenever there is no saved progress — i.e. on EVERY fresh profile.`);
  say(`   painted=${pOb.painted.toLocaleString()} — but those pixels are THE ONBOARDING PANEL, and the app behind it is`);
  say(`   BLURRED by backdrop-filter. Measuring here would certify the overlay, not the app.`);

  const t0 = Date.now();
  await ob.keyboard.press('Escape');
  let closed = null;
  for (let i = 0; i < 40; i++) {
    if (!(await ob.evaluate(() => !!document.getElementById('_index-overlay')?.classList.contains('open')))) { closed = Date.now() - t0; break; }
    await ob.waitForTimeout(50);
  }
  say(`   Escape closes it under reduced motion after ${closed === null ? 'NEVER *** STUCK ***' : closed + 'ms'} (its close path is a 220ms setTimeout, not animationend — motion-safe).`);
  if (closed === null) rows.push({ kind: 'onboarding-stuck' });
  const pAfter = await L.paintedPixels(decoder, await L.shotBuf(ob));
  await ob.screenshot({ path: `${SHOTS}/reduce-onboarding-dismissed.png`, animations: 'disabled' });
  say(`   after dismiss: painted=${pAfter.painted.toLocaleString()} — THIS is the app. Everything below measures this state.\n`);
  await ob.context().close();
}

/* ============ 1. THE BLANK-PAGE CHECK: 6 ROOMS x 2 THEMES, PAINTED PIXELS ============ */
say('=== 1. REDUCED MOTION — PAINTED PIXELS, 6 ROOMS x 2 THEMES (onboarding dismissed) ===\n');
say('   room                        theme  painted(reduce)  painted(normal)  delta   naiveNodes  verdict');

const page = await L.openApp(browser, { reducedMotion: 'reduce' });
const pageN = await L.openApp(browser, { reducedMotion: 'no-preference' });

for (const { group, topic } of L.ROOMS) {
  for (const theme of L.THEMES) {
    await L.setRoom(page, topic); await L.setTheme(page, theme);
    await L.setRoom(pageN, topic); await L.setTheme(pageN, theme);
    await page.waitForTimeout(400); await pageN.waitForTimeout(900); // let normal-mode anims finish

    const bufR = await L.shotBuf(page);
    const bufN = await L.shotBuf(pageN);
    const pr = await L.paintedPixels(decoder, bufR);
    const pn = await L.paintedPixels(decoder, bufN);
    const nodes = await L.naiveVisibleNodeCount(page);
    await page.screenshot({ path: `${SHOTS}/reduce-${group}-${theme}.png`, animations: 'disabled' });

    const dPct = +(100 * (pr.painted - pn.painted) / Math.max(1, pn.painted)).toFixed(1);
    // reduced-motion must paint, and must paint essentially as much as normal
    const ok = pr.painted > 100000 && Math.abs(dPct) < 6;
    if (!ok) rows.push({ kind: 'motion', group, theme, pr: pr.painted, pn: pn.painted, dPct });
    say(`   ${group.padEnd(27)} ${theme.padEnd(6)} ${pr.painted.toString().padStart(9)} ${pn.painted.toString().padStart(16)} ${(dPct >= 0 ? '+' : '') + dPct}%${' '.repeat(Math.max(0, 6 - String(dPct).length))} ${String(nodes).padStart(6)}      ${ok ? 'RENDERS' : '*** BLANK/DEGRADED ***'}`);
  }
}

/* ============ 2. THE LANDMINE: is it still armed, and is the fail-safe holding? ============ */
say('\n=== 2. THE LANDMINE (`*{animation:none!important}`) — armed? and is the body fail-safe holding? ===\n');
const animR = await page.evaluate(ANIM);
const animN = await pageN.evaluate(ANIM);
say(`   normal  : elements with a running animation-name = ${animN.animated}  ${JSON.stringify(animN.names)}`);
say(`             body{opacity=${animN.bodyOpacity}, animation-name=${animN.bodyAnim}, fill=${animN.bodyFill}}`);
say(`   reduce  : elements with a running animation-name = ${animR.animated}  ${JSON.stringify(animR.names)}`);
say(`             body{opacity=${animR.bodyOpacity}, animation-name=${animR.bodyAnim}, fill=${animR.bodyFill}}`);
say('');
say(`   The landmine IS still armed in the LIGHT DOM: styles.css:260 \`*{animation:none!important}\` strips`);
say(`   animation-NAME, so a "forwards" fill can never apply. body survives only because its base state is`);
say(`   opacity:1 + fill "backwards" (styles.css:207). Put opacity:0 + "forwards" back and the app is blank again.`);
say('');
say(`   But note WHICH animations still run under reduce: ${JSON.stringify(animR.names)} — these are SHADOW-DOM`);
say(`   (insIn = walkthrough/logic.js:39, discIn = shared-sheets.js:76). The light-DOM \`animation:none\` rule`);
say(`   CANNOT cross the shadow boundary, and BASE_SHEET (base-styles.js:31) only zeroes the DURATION, not the`);
say(`   name — so inside a shadow root the animation still RUNS (in .01ms) and a "forwards" fill still lands.`);
say(`   => the two halves of this app have OPPOSITE reduced-motion semantics. See mc-01b-landmine.mjs.`);
const landmineOk = animR.bodyOpacity === '1';
say(`   body fail-safe: ${landmineOk ? 'HOLDING' : '*** BROKEN — APP IS BLANK ***'}`);
if (!landmineOk) rows.push({ kind: 'landmine-body', detail: JSON.stringify(animR) });

/* ============ 3. HUNT: anything ELSE that only becomes visible via an animation ============ */
say('\n=== 3. HUNT — content whose VISIBILITY depends on an animation end-state ===\n');
say('   (effective opacity = ancestor-chain PRODUCT, across shadow boundaries — the thing a');
say('    getComputedStyle(el).opacity check cannot see)\n');
let hunted = 0;
for (const pane of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz']) {
  await L.showPane(page, pane);
  await L.showPane(pageN, pane);
  await page.waitForTimeout(350); await pageN.waitForTimeout(750);

  const badR = await page.evaluate(SCAN);
  const badN = await pageN.evaluate(SCAN);
  const keyN = new Set(badN.map((b) => b.tag + '|' + b.cls + '|' + b.text));
  // invisible under reduce but visible normally == depends on an animation to appear
  const onlyReduce = badR.filter((b) => !keyN.has(b.tag + '|' + b.cls + '|' + b.text));

  const bufR = await L.shotBuf(page);
  const pr = await L.paintedPixels(decoder, bufR);
  await page.screenshot({ path: `${SHOTS}/reduce-pane-${pane}.png`, animations: 'disabled' });

  const flag = onlyReduce.length > 0 || pr.painted < 60000;
  if (flag) { hunted++; rows.push({ kind: 'pane', pane, painted: pr.painted, onlyReduce: onlyReduce.slice(0, 5) }); }
  say(`   pane ${pane.padEnd(6)} painted=${String(pr.painted).padStart(7)}  invisible-only-under-reduce: ${onlyReduce.length}  ${flag ? '*** ' + JSON.stringify(onlyReduce.slice(0, 3)) : 'clean'}`);
}
say(`\n   -> ${hunted === 0 ? 'NO element in any of the 10 panes becomes invisible under reduced motion.' : hunted + ' pane(s) flagged.'}`);

/* ============ 4. THE EXIT ANIMATIONS — a transition that never completes ============ */
say('\n=== 4. EXIT ANIMATIONS — `forwards` fills that reduced motion strips (ovbgout / ovpanout) ===\n');
say('   styles.css:596-7 close the overlays with animation:...forwards, and mock-run/logic.js:25');
say('   waits on `animationend` to set display:none. Reduced motion sets animation-name:none, so');
say('   animationend NEVER FIRES. Does the overlay still close? (there is a 500ms setTimeout fallback)\n');
for (const [label, openBtn] of [['mock', '#mockopen'], ['cram', '#cramopen']]) {
  await L.showPane(page, 'walk');
  await page.click(openBtn);
  await page.waitForTimeout(400);
  const opened = await page.evaluate((l) => {
    const ov = document.querySelector(l === 'mock' ? '.mock-ov' : '.cram-ov');
    return ov ? { open: ov.classList.contains('open'), opacity: getComputedStyle(ov).opacity, anim: getComputedStyle(ov).animationName } : null;
  }, label);
  await page.screenshot({ path: `${SHOTS}/reduce-overlay-${label}-open.png`, animations: 'disabled' });

  // close it the way a user does: Escape
  const t0 = Date.now();
  await page.keyboard.press('Escape');
  let closedAt = null;
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate((l) => {
      const ov = document.querySelector(l === 'mock' ? '.mock-ov' : '.cram-ov');
      return ov ? { open: ov.classList.contains('open'), closing: ov.classList.contains('closing') } : null;
    }, label);
    if (st && !st.open) { closedAt = Date.now() - t0; break; }
    await page.waitForTimeout(50);
  }
  const stuck = closedAt === null;
  say(`   ${label.padEnd(5)} opened=${JSON.stringify(opened)}`);
  say(`   ${label.padEnd(5)} closed after ${stuck ? 'NEVER (>2000ms) *** STUCK ***' : closedAt + 'ms'} ${closedAt > 300 ? '  <-- the exit animation is dead; only the 500ms setTimeout fallback closes it' : ''}`);
  if (stuck) rows.push({ kind: 'overlay-stuck', label });
  else if (closedAt > 300) rows.push({ kind: 'overlay-slow', label, closedAt });
  await page.waitForTimeout(200);
}

/* ============ 5. PER-RUN NEGATIVE CONTROL ============ */
say('\n=== 5. NEGATIVE CONTROL (re-proved in situ) ===\n');
await L.showPane(page, 'walk');
const before = await L.paintedPixels(decoder, await L.shotBuf(page));
const nodesBefore = await L.naiveVisibleNodeCount(page);
await page.addStyleTag({ content: 'body{opacity:0!important}' });
await page.waitForTimeout(250);
const after = await L.paintedPixels(decoder, await L.shotBuf(page));
const nodesAfter = await L.naiveVisibleNodeCount(page);
const scanAfter = await page.evaluate(SCAN);
say(`   painted           : ${before.painted.toLocaleString()}  ->  ${after.painted.toLocaleString()}`);
say(`   naive node count  : ${nodesBefore}  ->  ${nodesAfter}   <-- UNCHANGED on a blank page. This is the trap.`);
say(`   effectiveOpacity  : flags ${scanAfter.length} elements as invisible (why: ${scanAfter[0]?.why})`);
const ncOk = after.painted === 0 && nodesAfter > 100 && scanAfter.length > 100;
say(`   NC ${ncOk ? 'PASS — the painted-pixel + effective-opacity instruments both go red where the node counter cannot.' : 'FAIL'}`);
if (!ncOk) rows.push({ kind: 'nc-fail' });

say('\n================ SUMMARY ================');
say(rows.length === 0
  ? 'No reduced-motion rendering failures. All 6 rooms x 2 themes paint; no element in any of the\n10 panes depends on an animation to become visible; both overlays still close.'
  : 'FINDINGS:\n' + JSON.stringify(rows, null, 2));
say('\npage errors (reduce): ' + JSON.stringify(page.__errors.slice(0, 5)));

fs.writeFileSync(OUT + '/mc-data-motion.txt', log.join('\n'));
await browser.close();
