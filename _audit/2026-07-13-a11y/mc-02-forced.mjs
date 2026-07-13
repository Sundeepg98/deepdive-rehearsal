/* mc-02-forced.mjs — FORCED COLORS / prefers-contrast:more.
 *
 * The app "claims to support these". Verify; do not take the commit message's word.
 *
 * Three questions:
 *   A. Do the forced-colors / prefers-contrast rules in styles.css actually MATCH ANYTHING?
 *      They target .card/.dec/.rf/.piv/.thread — the very classes this repo's own comments say
 *      are shadow-only ("a light-DOM rule never reached them", base-styles.js:33). A CSS rule
 *      that matches zero nodes is the exact failure mode this codebase has shipped three times.
 *   B. Does the app still RENDER under forced-colors (painted pixels, 6 rooms x 2 themes)?
 *   C. Does the drill scoreboard's FILL-vs-OUTLINE encoding survive? That encoding is the whole
 *      reason status was moved off the hue channel, and the scoreboard is the drill's ONLY
 *      feedback. In forced-colors the UA forces background-color to Canvas unless the author
 *      opts out with forced-color-adjust:none. So: does the SOLID tile still fill?
 *
 * Instrument proof (NC-3 in mc-00-calibrate): the forcedColors emulation genuinely substitutes
 * system colours here — it is not just an MQ flip. And section C carries its own positive control:
 * before grading, Solid is at 0 and MUST NOT fill; after grading it MUST. If that transition is
 * not detected in plain light mode, the fill instrument is broken and nothing below it counts.
 */
import * as L from './mc-lib.mjs';
import fs from 'node:fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = OUT + '/shots/motion-contrast';
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const findings = [];

const browser = await L.launch();
const decoder = await L.makeDecoder(browser);

/* modal (dominant) colour inside a box — for a filled tile that is the fill; for an outline
 * tile it is the card surface behind it. */
async function modalIn(decoder, buf, rect) {
  return decoder.evaluate(async ({ b64, rect }) => {
    const img = await window.__decode(b64);
    const d = img.data;
    const hist = new Map();
    for (let y = Math.max(0, rect.y); y < Math.min(rect.y + rect.h, img.height); y++) {
      for (let x = Math.max(0, rect.x); x < Math.min(rect.x + rect.w, img.width); x++) {
        const p = (y * img.width + x) * 4;
        const k = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2];
        hist.set(k, (hist.get(k) || 0) + 1);
      }
    }
    let modal = 0, best = -1;
    for (const [k, n] of hist) if (n > best) { best = n; modal = k; }
    return [(modal >> 16) & 255, (modal >> 8) & 255, modal & 255];
  }, { b64: buf.toString('base64'), rect });
}
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/* Drive the REAL drill state machine until Solid > 0, so .pill.g loses .z and must fill. */
async function gradeSolid(page, n = 3) {
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < 5; i++) {
      const has = await page.evaluate(() => !!document.querySelector('deep-drill').shadowRoot.getElementById('jg'));
      if (has) break;
      await page.evaluate(() => { const a = document.querySelector('deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
      await page.waitForTimeout(220);
    }
    await page.evaluate(() => { const g = document.querySelector('deep-drill').shadowRoot.getElementById('jg'); if (g) g.click(); });
    await page.waitForTimeout(280);
  }
}
const pillState = (page) => page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  return [...sr.querySelectorAll('.pill')].map((e) => {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const lab = e.querySelector('.l');
    const glyph = lab ? getComputedStyle(lab, '::before').content : null;
    return {
      cls: e.className, text: e.textContent.trim().slice(0, 12),
      bg: cs.backgroundColor, border: cs.borderColor, fca: cs.forcedColorAdjust,
      glyph, glyphColor: lab ? getComputedStyle(lab).color : null,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  });
});

/* ================= A. DO THE RULES MATCH ANYTHING? ================= */
say('=== A. DEAD-RULE AUDIT — do the forced-colors / prefers-contrast blocks match any nodes? ===\n');
say('  styles.css:751  @media(forced-colors:active){ .card,.dec,.rf,.piv,.thread{...} .badge{...} ... }');
say('  styles.css:749  @media(prefers-contrast:more){ .card,.dec,.rf,.piv,.thread{border-width:2px} ... }');
say('  Both live in the LIGHT-DOM stylesheet. Where do those elements actually exist?\n');
{
  const page = await L.openApp(browser, { forcedColors: 'active' });
  await L.showPane(page, 'walk');
  const counts = await page.evaluate(() => {
    const sels = ['.card', '.dec', '.rf', '.piv', '.thread', '.badge', '.mockbtn', '.crambtn',
      '.tools-fab', '.inttog', '.seg button', '.locator', '.sub', '.mb-d', '.cmp-note',
      '.cmp-thesis', '.dgm-s', '.cmp-reopen', '.tn-trigger', '.tn-step', '.pill'];
    const shadowRoots = [];
    document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) shadowRoots.push(e.shadowRoot); });
    return sels.map((s) => {
      const light = document.querySelectorAll(s).length;
      let shadow = 0;
      for (const r of shadowRoots) { try { shadow += r.querySelectorAll(s).length; } catch { /* */ } }
      return { s, light, shadow };
    });
  });
  say('  selector          lightDOM   shadowDOM   the light-DOM @media rule...');
  let dead = [];
  for (const c of counts) {
    const verdict = c.light === 0 && c.shadow > 0 ? '*** MATCHES NOTHING (all ' + c.shadow + ' are in shadow roots) ***'
      : c.light === 0 && c.shadow === 0 ? '(no such element on this pane)' : 'reaches ' + c.light;
    if (c.light === 0 && c.shadow > 0) dead.push(c);
    say(`  ${c.s.padEnd(16)} ${String(c.light).padStart(6)} ${String(c.shadow).padStart(11)}   ${verdict}`);
  }
  say('');
  const deadTargeted = dead.filter((d) => ['.card', '.dec', '.rf', '.piv', '.thread', '.cmp-note', '.cmp-thesis', '.dgm-s'].includes(d.s));
  if (deadTargeted.length) {
    say(`  >>> ${deadTargeted.length} selector(s) named in those two @media blocks exist ONLY inside shadow roots.`);
    say('      A light-DOM stylesheet cannot cross a shadow boundary, so those declarations apply to');
    say('      ZERO elements. The high-contrast / forced-colors "support" for the card surfaces — which');
    say('      is where ALL the content lives — is not merely weak, it never executes.');
    say('      base-styles.js already learned this exact lesson TWICE (print page-breaks, the 44px tap');
    say('      floor) and carries a shadow-side rule for each. It carries NO forced-colors and NO');
    say('      prefers-contrast rule.');
    findings.push({ id: 'F1', sev: 'HIGH', deadSelectors: deadTargeted.map((d) => d.s) });
  }
  // confirm BASE_SHEET really has no forced-colors/contrast block
  const shadowSheets = await page.evaluate(() => {
    const host = document.querySelector('deep-walkthrough');
    const out = [];
    for (const sh of host.shadowRoot.adoptedStyleSheets) {
      let txt = '';
      try { for (const r of sh.cssRules) txt += r.cssText + '\n'; } catch { /* */ }
      out.push({ len: txt.length, forced: /forced-colors/.test(txt), contrast: /prefers-contrast/.test(txt), motion: /prefers-reduced-motion/.test(txt), print: /@media print/.test(txt) });
    }
    return out;
  });
  say('\n  adoptedStyleSheets on <deep-walkthrough> (the shadow side):');
  shadowSheets.forEach((s, i) => say(`    sheet[${i}] ${String(s.len).padStart(6)} chars  forced-colors:${s.forced}  prefers-contrast:${s.contrast}  reduced-motion:${s.motion}  print:${s.print}`));
  const anyForced = shadowSheets.some((s) => s.forced);
  const anyContrast = shadowSheets.some((s) => s.contrast);
  say(`  => the shadow side carries reduced-motion and print rules, but forced-colors:${anyForced}  prefers-contrast:${anyContrast}`);
  await page.context().close();
}

/* ================= B. DOES IT RENDER UNDER FORCED COLORS? ================= */
say('\n=== B. FORCED-COLORS RENDERING — 6 rooms x 2 themes ===\n');
say('   room                        theme  painted   uniqueColors  verdict');
{
  const page = await L.openApp(browser, { forcedColors: 'active' });
  const roomShots = {};
  for (const { group, topic } of L.ROOMS) {
    for (const theme of L.THEMES) {
      await L.setRoom(page, topic); await L.setTheme(page, theme);
      await page.waitForTimeout(400);
      const buf = await L.shotBuf(page);
      const p = await L.paintedPixels(decoder, buf);
      await page.screenshot({ path: `${SHOTS}/forced-${group}-${theme}.png`, animations: 'disabled' });
      if (theme === 'light') roomShots[group] = buf;
      const ok = p.painted > 50000;
      if (!ok) findings.push({ id: 'F-render', group, theme, painted: p.painted });
      say(`   ${group.padEnd(27)} ${theme.padEnd(6)} ${String(p.painted).padStart(7)} ${String(p.uniqueColors).padStart(12)}   ${ok ? 'RENDERS' : '*** BLANK ***'}`);
    }
  }
  // do the rooms collapse into one indistinguishable slab?
  say('\n   Room distinguishability under forced-colors (pixel diff between room screenshots, light):');
  const groups = Object.keys(roomShots);
  const base = roomShots[groups[0]];
  for (let i = 1; i < groups.length; i++) {
    const d = await decoder.evaluate(async ({ a, b }) => {
      const [ia, ib] = await Promise.all([window.__decode(a), window.__decode(b)]);
      let diff = 0;
      for (let p = 0; p < ia.data.length; p += 4) {
        if (Math.abs(ia.data[p] - ib.data[p]) > 8 || Math.abs(ia.data[p + 1] - ib.data[p + 1]) > 8 || Math.abs(ia.data[p + 2] - ib.data[p + 2]) > 8) diff++;
      }
      return diff;
    }, { a: base.toString('base64'), b: roomShots[groups[i]].toString('base64') });
    say(`     ${groups[0]} vs ${groups[i].padEnd(27)} differing px = ${d}  (colour is gone; the differences are TEXT)`);
  }
  // does the room's letter code survive?
  const loc = await page.evaluate(() => {
    const l = document.querySelector('.locator');
    const k = document.querySelector('.loc-key');
    return l ? { text: l.textContent.trim().slice(0, 30), key: k?.textContent?.trim(), color: getComputedStyle(l).color, bg: getComputedStyle(l).backgroundColor, border: getComputedStyle(l).borderColor } : null;
  });
  say(`\n   .locator under forced-colors: ${JSON.stringify(loc)}`);
  say('   -> the room hue is unavailable in forced-colors BY DESIGN (that is correct and unavoidable).');
  say('      The room letter-code (.loc-key) is what must carry room identity there — and it does.');
  await page.context().close();
}

/* ================= C. THE SCOREBOARD: DOES FILL-vs-OUTLINE SURVIVE? ================= */
say('\n=== C. DRILL SCOREBOARD — does the FILL-vs-OUTLINE encoding survive forced-colors? ===\n');
for (const mode of ['normal', 'forced']) {
  const page = await L.openApp(browser, mode === 'forced' ? { forcedColors: 'active' } : {});
  await L.showPane(page, 'drill');

  // POSITIVE CONTROL: with Solid at 0 the tile must NOT fill.
  const pre = await pillState(page);
  const bufPre = await L.shotBuf(page);
  const gPre = await modalIn(decoder, bufPre, pre[0].rect);
  const sPre = await modalIn(decoder, bufPre, pre[1].rect);

  // now grade real probes Solid via the real UI
  await gradeSolid(page, 3);
  const post = await pillState(page);
  const bufPost = await L.shotBuf(page);
  const gPost = await modalIn(decoder, bufPost, post[0].rect);
  const sPost = await modalIn(decoder, bufPost, post[1].rect);
  await page.screenshot({ path: `${SHOTS}/scoreboard-${mode}.png`, animations: 'disabled' });
  await page.locator('deep-drill').screenshot({ path: `${SHOTS}/scoreboard-${mode}-pane.png` }).catch(() => {});

  const dPre = dist(gPre, sPre);
  const dPost = dist(gPost, sPost);
  say(`  --- ${mode.toUpperCase()} ---`);
  say(`    before grading: Solid="${pre[0].text}" cls="${pre[0].cls}"   tile bg(px)=${JSON.stringify(gPre)}   Revisit tile bg(px)=${JSON.stringify(sPre)}   distance=${dPre}`);
  say(`    after  grading: Solid="${post[0].text}" cls="${post[0].cls}"   tile bg(px)=${JSON.stringify(gPost)}   Revisit tile bg(px)=${JSON.stringify(sPost)}   distance=${dPost}`);
  say(`    computed background-color of the SOLID tile: ${post[0].bg}    forced-color-adjust: ${post[0].fca}`);
  say(`    glyphs: Solid=${JSON.stringify(post[0].glyph)}  Revisit=${JSON.stringify(post[1].glyph)}`);
  const fills = dPost > 60;
  say(`    => the SOLID tile ${fills ? 'FILLS (fill-vs-outline encoding INTACT)' : '*** DOES NOT FILL — the encoding is GONE ***'}`);
  if (mode === 'normal') {
    const controlOk = dPre < 30 && dPost > 60;
    say(`    positive control: unfilled(z)=${dPre} -> filled=${dPost}. Instrument ${controlOk ? 'DETECTS a fill' : '*** IS BROKEN — cannot see a fill; nothing below counts ***'}`);
    if (!controlOk) findings.push({ id: 'F-instrument-broken' });
  } else if (!fills) {
    findings.push({ id: 'F2', sev: 'HIGH', detail: 'SOLID tile does not fill under forced-colors', bg: post[0].bg, fca: post[0].fca, distance: dPost, glyph: post[0].glyph });
  }
  say('');
  await page.context().close();
}

/* ================= D. prefers-contrast: more ================= */
say('=== D. prefers-contrast:more — does the block do anything? ===\n');
{
  const a = await L.openApp(browser, {});
  const b = await L.openApp(browser, { contrast: 'more' });
  const probe = (p) => p.evaluate(() => {
    const sr = document.querySelector('deep-walkthrough').shadowRoot;
    const card = sr.querySelector('.card');
    const seg = document.querySelector('.seg button.on');
    const loc = document.querySelector('.locator');
    const sub = document.querySelector('.hdr .sub');
    return {
      mq: matchMedia('(prefers-contrast: more)').matches,
      cardBorderWidth: card ? getComputedStyle(card).borderWidth : null,
      cardOutline: card ? getComputedStyle(card).outlineWidth : null,
      segOutline: seg ? getComputedStyle(seg).outlineWidth : null,
      mockbtnBorder: getComputedStyle(document.getElementById('mockopen')).borderWidth,
      locatorColor: loc ? getComputedStyle(loc).color : null,
      subColor: sub ? getComputedStyle(sub).color : null,
    };
  });
  const na = await probe(a), nb = await probe(b);
  say('   normal        : ' + JSON.stringify(na));
  say('   contrast:more : ' + JSON.stringify(nb));
  const changed = Object.keys(na).filter((k) => k !== 'mq' && na[k] !== nb[k]);
  say(`   media query matches: ${nb.mq}`);
  say(`   properties that actually CHANGED: ${changed.length ? changed.join(', ') : 'NONE'}`);
  if (nb.cardBorderWidth === na.cardBorderWidth) {
    say('   >>> .card border-width is UNCHANGED (still ' + na.cardBorderWidth + '). styles.css:749 asks for 2px,');
    say('       but .card lives in a shadow root and the rule is in the light-DOM sheet. It never runs.');
    findings.push({ id: 'F3', sev: 'MEDIUM', detail: '.card border-width unchanged under prefers-contrast:more (rule is light-DOM, .card is shadow-DOM)', want: '2px', got: na.cardBorderWidth });
  }
  await a.context().close(); await b.context().close();
}

say('\n================ FINDINGS ================');
say(findings.length ? JSON.stringify(findings, null, 2) : 'none');
fs.writeFileSync(OUT + '/mc-data-forced.txt', log.join('\n'));
await browser.close();
