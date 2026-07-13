/* (1) Size the drill's grading controls AT THE MOMENT THEY EXIST (they are
 *     replaced the instant you grade, which is why the task run measured air).
 * (2) The scoreboard is the drill's ONLY feedback and the fix claims status was
 *     moved OFF the hue channel (fill-vs-outline + a glyph) because green/amber
 *     is the red-green confusion pair. Verify that WITHOUT looking at hue:
 *     compare the tiles' relative LUMINANCE and their non-colour encoding.
 *     A green tile and an amber tile of the same luminance are the same tile to
 *     a deuteranope.
 */
import path from 'node:path';
import { launch, phone, installDeep, judge, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';
ensureDirs();

const LUM = `
window.__rgb = function (s) {
  const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
  const p = m[1].split(',').map(parseFloat);
  return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
};
window.__relLum = function (c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
window.__scoreboard = function () {
  const r = document.querySelector('deep-drill').shadowRoot;
  const pills = [...r.querySelectorAll('.pill')];
  return pills.map((el) => {
    const cs = getComputedStyle(el);
    const bg = window.__rgb(cs.backgroundColor);
    const bd = window.__rgb(cs.borderColor);
    const v = el.querySelector('.v'), l = el.querySelector('.l');
    return {
      cls: el.className,
      label: l ? l.textContent.trim() : '',
      value: v ? v.textContent.trim() : '',
      bg: cs.backgroundColor, bgLum: bg ? +window.__relLum(bg).toFixed(4) : null, bgAlpha: bg ? bg.a : null,
      border: cs.borderColor, borderWidth: cs.borderWidth,
      borderLum: bd ? +window.__relLum(bd).toFixed(4) : null,
      fontWeight: cs.fontWeight,
      boxShadow: cs.boxShadow.slice(0, 40),
      // any non-colour mark? a glyph, an icon, ::before content
      beforeContent: getComputedStyle(el, '::before').content,
      afterContent: getComputedStyle(el, '::after').content,
      textContent: el.textContent.replace(/\\s+/g, ' ').trim(),
    };
  });
};`;

const b = await launch();
const out = {};

for (const [name, dark] of [['light', false], ['dark', true]]) {
  const p = await phone(b, PHONES.p390, { colorScheme: dark ? 'dark' : 'light' });
  await installDeep(p);
  await p.evaluate(LUM);
  await p.locator('.ix-card').first().tap().catch(() => {});
  await p.waitForTimeout(900);
  if (dark) { // the app has its own theme toggle; use it
    await p.evaluate(() => document.querySelector('#toolsfab')?.click());
    await p.waitForTimeout(450);
    await p.evaluate(() => document.querySelector('#themetog')?.click());
    await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#toolsfab')?.click());
    await p.waitForTimeout(450);
  }
  await p.evaluate(() => document.querySelector('.seg button[data-tab="drill"]')?.click());
  await p.waitForTimeout(900);

  // drive the card to the judging stage so the grade buttons exist
  for (let i = 0; i < 4; i++) {
    const has = await p.evaluate(() => !!document.querySelector('deep-drill').shadowRoot.querySelector('#adv'));
    if (!has) break;
    await p.evaluate(() => document.querySelector('deep-drill').shadowRoot.querySelector('#adv').click());
    await p.waitForTimeout(500);
  }

  const grades = await p.evaluate(() => {
    const r = document.querySelector('deep-drill').shadowRoot;
    const res = {};
    for (const [k, s] of [['Missed', '#jm'], ['Shaky', '#js'], ['Solid', '#jg']]) {
      const el = r.querySelector(s);
      if (el) { el.scrollIntoView({ block: 'center' }); res[k] = window.__tapArea(el); }
    }
    const mhps = [...r.querySelectorAll('.mhp-i')];
    res['must-hit item'] = mhps.length ? window.__tapArea(mhps[0]) : null;
    res._mhpCount = mhps.length;
    return res;
  });
  await p.waitForTimeout(300);
  const grades2 = await p.evaluate(() => {
    const r = document.querySelector('deep-drill').shadowRoot;
    const res = {};
    for (const [k, s] of [['Missed', '#jm'], ['Shaky', '#js'], ['Solid', '#jg'], ['must-hit item', '.mhp-i']]) {
      const el = r.querySelector(s);
      if (el) res[k] = window.__tapArea(el);
    }
    return res;
  });

  console.log(`\n########## ${name.toUpperCase()} THEME ##########`);
  console.log('GRADE CONTROLS (the drill\'s decision point):');
  for (const [k, v] of Object.entries(grades2)) {
    if (!v || v.occluded) { console.log(`   ${k.padEnd(15)} ${v ? 'OCCLUDED (' + v.reason + ')' : 'absent'}`); continue; }
    console.log(`   ${k.padEnd(15)} rect ${String(v.rectW).padStart(5)}x${String(v.rectH).padEnd(4)}  TAP ${v.hitW}x${v.hitH}   => ${judge(v, 44)}`);
  }

  // score a few cards so the tiles carry different values
  for (const g of ['#jg', '#js']) {
    await p.evaluate((s) => document.querySelector('deep-drill').shadowRoot.querySelector(s)?.click(), g);
    await p.waitForTimeout(500);
    for (let i = 0; i < 4; i++) {
      const has = await p.evaluate(() => !!document.querySelector('deep-drill').shadowRoot.querySelector('#adv'));
      if (!has) break;
      await p.evaluate(() => document.querySelector('deep-drill').shadowRoot.querySelector('#adv').click());
      await p.waitForTimeout(350);
    }
  }
  await p.evaluate(() => document.querySelector('deep-drill').shadowRoot.querySelector('.dsc')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);

  const sb = await p.evaluate(() => window.__scoreboard());
  console.log('SCOREBOARD TILES (the drill\'s only feedback):');
  for (const t of sb) {
    console.log(`   ${t.label.padEnd(8)} value=${t.value.padEnd(3)} bg=${t.bg.padEnd(22)} lum=${String(t.bgLum).padEnd(7)} alpha=${t.bgAlpha}`);
    console.log(`   ${''.padEnd(8)} border=${t.border} (${t.borderWidth})  lum=${t.borderLum}  ::before=${t.beforeContent}  ::after=${t.afterContent}`);
  }
  const lums = sb.map((t) => t.bgLum).filter((x) => x !== null);
  const spread = lums.length ? (Math.max(...lums) - Math.min(...lums)).toFixed(4) : 'n/a';
  const alphas = sb.map((t) => t.bgAlpha);
  console.log(`   => background luminance spread across tiles: ${spread}`);
  console.log(`   => background alphas: ${JSON.stringify(alphas)}  (a FILLED tile among outlines is the non-colour cue)`);
  const glyphs = sb.map((t) => (t.beforeContent && t.beforeContent !== 'none') || (t.afterContent && t.afterContent !== 'none'));
  console.log(`   => tiles carrying a ::before/::after glyph: ${JSON.stringify(glyphs)}`);

  const box = await p.locator('deep-drill').locator('.dsc').boundingBox().catch(() => null);
  if (box) {
    await p.screenshot({ path: path.join(SHOTS, `06-scoreboard-${name}.png`),
      clip: { x: Math.max(0, box.x - 6), y: Math.max(0, box.y - 6), width: Math.min(390, box.width + 12), height: box.height + 12 } });
  }
  out[name] = { grades: grades2, mhpCount: grades._mhpCount, scoreboard: sb, lumSpread: spread };
  await p.context().close();
}
await b.close();
save('06-grade-scoreboard.json', out);
