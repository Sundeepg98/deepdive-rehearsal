/* mc-01b-landmine.mjs — IS THE LANDMINE ACTUALLY ARMED, AND IS IT ASYMMETRIC?
 *
 * Claim under test (from styles.css:199-206, the comment left by whoever fixed the blank page):
 *   "the prefers-reduced-motion block below (`*{animation:none!important}`) strips animation-name
 *    -- so the reveal never ran, body stayed at opacity:0, and the ENTIRE APP was a blank white
 *    page for every reduced-motion user, with zero console errors."
 *
 * I do not take that on faith, and I do not take on faith that it is still true. I plant the exact
 * pattern -- opacity:0 base + animation ... forwards -- on BOTH sides of the shadow boundary, under
 * prefers-reduced-motion, and decode painted pixels inside each element's box.
 *
 * PREDICTION:
 *   light DOM  -> INVISIBLE (0 painted px). styles.css:260 `*{animation:none!important}` kills the
 *                 animation-name, so the `forwards` fill never applies and opacity stays 0.
 *   shadow DOM -> VISIBLE. The light-DOM rule cannot cross the boundary, and BASE_SHEET only sets
 *                 animation-duration:.01ms -- the animation still RUNS and its `forwards` fill lands.
 *
 * If that holds, the SAME line of CSS is a blank-screen bug in one half of the app and completely
 * safe in the other, with nothing marking the difference. That is the live hazard.
 */
import * as L from './mc-lib.mjs';
import fs from 'node:fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = OUT + '/shots/motion-contrast';
const log = [];
const say = (s) => { console.log(s); log.push(s); };

/* Both probes go into NORMAL FLOW at the top of the stage — one in the light DOM, one inside the
 * walkthrough's shadow root — so neither can be occluded or clipped, and neither depends on
 * position:fixed escaping a containing block. The fill is MAGENTA (#FF00FF), a colour the app
 * never uses, so "did it paint?" is unambiguous. (A near-black fill was a mistake: --ink is
 * rgb(42,40,35), so a "dark pixel" counter matched the app's own body text.) */
const PLANT = `(() => {
  const css = '@keyframes mcReveal{from{opacity:0}to{opacity:1}}' +
              '.mc-probe{opacity:0;animation:mcReveal 300ms ease forwards;' +
              'background:#FF00FF;color:#000;font:700 18px monospace;padding:12px;height:48px;box-sizing:border-box}';
  // --- LIGHT DOM: first child of .stage ---
  const s1 = document.createElement('style'); s1.textContent = css; document.head.appendChild(s1);
  const d1 = document.createElement('div');
  d1.className = 'mc-probe'; d1.id = 'mc-light'; d1.textContent = 'LIGHT DOM PROBE';
  const stage = document.querySelector('.stage');
  stage.insertBefore(d1, stage.firstChild);
  // --- SHADOW DOM: first child of the walkthrough pane's shadow root ---
  const sr = document.querySelector('deep-walkthrough').shadowRoot;
  const s2 = document.createElement('style'); s2.textContent = css; sr.appendChild(s2);
  const d2 = document.createElement('div');
  d2.className = 'mc-probe'; d2.id = 'mc-shadow'; d2.textContent = 'SHADOW DOM PROBE';
  sr.insertBefore(d2, sr.firstChild);
  window.scrollTo(0, 0);
  document.querySelector('.stage').scrollTop = 0;
  return true;
})()`;

const READ = `(() => {
  const l = document.getElementById('mc-light');
  const s = document.querySelector('deep-walkthrough').shadowRoot.getElementById('mc-shadow');
  const rd = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { opacity: cs.opacity, animName: cs.animationName, fill: cs.animationFillMode,
             dur: cs.animationDuration, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
  };
  return { light: rd(l), shadow: rd(s) };
})()`;

/* painted pixels inside a given box, from a full-viewport screenshot */
async function paintedIn(decoder, buf, rect) {
  return decoder.evaluate(async ({ b64, rect }) => {
    const img = await window.__decode(b64);
    const d = img.data;
    const hist = new Map();
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        const p = (y * img.width + x) * 4;
        const k = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2];
        hist.set(k, (hist.get(k) || 0) + 1);
      }
    }
    // the probe is filled MAGENTA (#FF00FF) — a colour the app never uses, so this cannot be
    // confused with the app's own ink (rgb(42,40,35)) the way a "dark pixel" counter was.
    let mag = 0, tot = 0;
    for (const [k, n] of hist) {
      const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
      tot += n;
      if (r > 200 && g < 80 && b > 200) mag += n;
    }
    return { darkPx: mag, totalPx: tot, uniqueColors: hist.size };
  }, { b64: buf.toString('base64'), rect });
}

const browser = await L.launch();
const decoder = await L.makeDecoder(browser);
const rows = [];

for (const mode of ['reduce', 'no-preference']) {
  const page = await L.openApp(browser, { reducedMotion: mode });
  await L.showPane(page, 'walk');
  await page.evaluate(PLANT);
  await page.waitForTimeout(900); // far longer than the 300ms animation
  const st = await page.evaluate(READ);
  const buf = await L.shotBuf(page);
  await page.screenshot({ path: `${SHOTS}/landmine-${mode}.png`, animations: 'disabled' });
  const pl = await paintedIn(decoder, buf, st.light.rect);
  const ps = await paintedIn(decoder, buf, st.shadow.rect);

  say(`\n=== prefers-reduced-motion: ${mode} ===`);
  say(`   planted: opacity:0 base + \`animation: mcReveal 300ms ease forwards\`  (identical CSS on both sides)`);
  say(`   LIGHT  DOM: computed opacity=${st.light.opacity.padEnd(4)} animation-name=${String(st.light.animName).padEnd(9)} fill=${String(st.light.fill).padEnd(9)} dur=${st.light.dur.padEnd(7)} -> painted(dark px in its box) = ${pl.darkPx}`);
  say(`   SHADOW DOM: computed opacity=${st.shadow.opacity.padEnd(4)} animation-name=${String(st.shadow.animName).padEnd(9)} fill=${String(st.shadow.fill).padEnd(9)} dur=${st.shadow.dur.padEnd(7)} -> painted(dark px in its box) = ${ps.darkPx}`);
  const lightVisible = pl.darkPx > 200;
  const shadowVisible = ps.darkPx > 200;
  say(`   => LIGHT is ${lightVisible ? 'VISIBLE' : '*** INVISIBLE — THE LANDMINE BITES ***'};  SHADOW is ${shadowVisible ? 'VISIBLE' : '*** INVISIBLE ***'}`);
  rows.push({ mode, lightOpacity: st.light.opacity, shadowOpacity: st.shadow.opacity, lightDark: pl.darkPx, shadowDark: ps.darkPx, lightVisible, shadowVisible });
  await page.context().close();
}

say('\n================ VERDICT ================');
const r = rows.find((x) => x.mode === 'reduce');
const n = rows.find((x) => x.mode === 'no-preference');
if (!r.lightVisible && r.shadowVisible && n.lightVisible && n.shadowVisible) {
  say('CONFIRMED, and it is ASYMMETRIC.');
  say('  The identical pattern (opacity:0 + animation ... forwards):');
  say(`    - in the LIGHT DOM under reduced motion  -> computed opacity ${r.lightOpacity}, ${r.lightDark} painted px = INVISIBLE.`);
  say(`    - in a SHADOW ROOT under reduced motion  -> computed opacity ${r.shadowOpacity}, ${r.shadowDark} painted px = fine.`);
  say(`    - with motion allowed, BOTH render (${n.lightDark} / ${n.shadowDark} px).`);
  say('  styles.css:260 `*{animation:none!important}` strips animation-NAME, so `forwards` never fills.');
  say('  BASE_SHEET (base-styles.js:31) only zeroes animation-DURATION, so inside a shadow root the');
  say('  animation still runs to completion in .01ms and `forwards` lands.');
  say('  => the SAME CSS is a blank-screen bug on one side of the shadow boundary and safe on the other,');
  say('     with nothing in the codebase marking the difference. The app is currently safe only because');
  say('     every reveal happens to use `backwards`. This is the trap that already shipped once.');
} else {
  say('NOT as predicted — re-examine: ' + JSON.stringify(rows, null, 2));
}
fs.writeFileSync(OUT + '/mc-data-landmine.txt', log.join('\n'));
await browser.close();
