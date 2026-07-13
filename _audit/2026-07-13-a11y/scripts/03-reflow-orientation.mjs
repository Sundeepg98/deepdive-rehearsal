/* WCAG 1.4.10 Reflow (AA): content at 320 CSS px with no horizontal scrolling.
 * WCAG 1.3.4 Orientation (AA): usable in landscape.
 * Sweep 320..430 and name every element that pokes past the viewport.
 *
 * NEGATIVE CONTROL: inject a 900px-wide box and prove the detector goes red.
 */
import path from 'node:path';
import { launch, phone, installDeep, inkOf, ensureDirs, save, SHOTS } from './lib.mjs';

ensureDirs();

const OVERFLOW = `
window.__overflow = function () {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const offenders = [];
  const walk = (root, hostPath) => {
    for (const el of root.querySelectorAll('*')) {
      let cs; try { cs = getComputedStyle(el); } catch (e) { continue; }
      if (cs.position === 'fixed') continue;            // fixed chrome cannot scroll the doc
      if (!el.checkVisibility || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1) continue;
      const over = Math.round(r.right - vw);
      if (over > 1) {
        // an element inside its own horizontal scroller is fine - the SCROLLER is the target
        let inScroller = false;
        for (const a of window.__ancestors(el)) {
          let acs; try { acs = getComputedStyle(a); } catch (e) { continue; }
          if (/auto|scroll/.test(acs.overflowX)) { inScroller = true; break; }
        }
        offenders.push({
          sel: window.__selOf(el), host: hostPath || '(light)',
          right: Math.round(r.right), over, w: Math.round(r.width),
          inScroller,
          text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30),
        });
      }
      if (el.shadowRoot) walk(el.shadowRoot, (hostPath ? hostPath + ' >> ' : '') + el.tagName.toLowerCase());
    }
  };
  walk(document, '');
  return {
    vw,
    docScrollW: de.scrollWidth,
    bodyScrollW: document.body.scrollWidth,
    horizontalScroll: de.scrollWidth > vw + 1,
    overshoot: de.scrollWidth - vw,
    offenders: offenders.filter((o) => !o.inScroller).sort((a, b) => b.over - a.over).slice(0, 12),
    offendersInScrollers: offenders.filter((o) => o.inScroller).length,
  };
};`;

const b = await launch();
const out = { reflow: {}, orientation: {} };

/* ---------------- REFLOW SWEEP 320..430 ---------------- */
console.log('=============== WCAG 1.4.10 REFLOW SWEEP ===============');
for (const w of [320, 340, 360, 375, 390, 412, 430]) {
  const p = await phone(b, { width: w, height: 800 });
  await installDeep(p);
  await p.evaluate(OVERFLOW);
  // measure BOTH states: the first-run index overlay, and the app proper
  const atBoot = await p.evaluate(() => window.__overflow());
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(900);
  const atApp = await p.evaluate(() => window.__overflow());
  // and with the tools sheet open
  await p.evaluate(() => document.querySelector('#toolsfab')?.click());
  await p.waitForTimeout(500);
  const atTools = await p.evaluate(() => window.__overflow());
  await p.evaluate(() => document.querySelector('#toolsfab')?.click());
  await p.waitForTimeout(400);

  const worst = [atBoot, atApp, atTools].reduce((a, c) => (c.overshoot > a.overshoot ? c : a));
  const bad = worst.horizontalScroll;
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${String(w).padStart(3)}px  docScrollW=${worst.docScrollW} (vw ${worst.vw})  overshoot=${worst.overshoot}px` +
    `   [boot ${atBoot.overshoot} | app ${atApp.overshoot} | tools ${atTools.overshoot}]`);
  if (bad) for (const o of worst.offenders) console.log(`         +${o.over}px  ${o.host === '(light)' ? '' : '[' + o.host + '] '}${o.sel}  (w=${o.w})  "${o.text}"`);
  out.reflow[w] = { atBoot, atApp, atTools };
  if (w === 320) await p.screenshot({ path: path.join(SHOTS, '03-reflow-320.png'), fullPage: false });
  await p.context().close();
}

/* ---------------- NEGATIVE CONTROL ---------------- */
{
  const p = await phone(b, { width: 320, height: 800 });
  await installDeep(p);
  await p.evaluate(OVERFLOW);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(800);
  const clean = await p.evaluate(() => window.__overflow());
  await p.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__nc_wide';
    d.style.cssText = 'width:900px;height:20px;background:red';
    document.querySelector('.stage')?.appendChild(d);
  });
  await p.waitForTimeout(300);
  const broken = await p.evaluate(() => window.__overflow());
  console.log('\n=============== NEGATIVE CONTROL (reflow detector) ===============');
  console.log(`  as shipped @320px    : horizontalScroll=${clean.horizontalScroll}  overshoot=${clean.overshoot}px`);
  console.log(`  + a 900px-wide div   : horizontalScroll=${broken.horizontalScroll}  overshoot=${broken.overshoot}px  offender=${broken.offenders[0]?.sel}`);
  console.log('  ' + (!clean.horizontalScroll && broken.horizontalScroll
    ? 'OK — the reflow detector GOES RED on real overflow. A clean result means clean.'
    : broken.horizontalScroll ? 'detector fires (baseline already dirty)' : '*** DETECTOR DEAD ***'));
  out.negControl = { clean, broken };
  await p.context().close();
}

/* ---------------- ORIENTATION: landscape ---------------- */
console.log('\n=============== WCAG 1.3.4 ORIENTATION (landscape) ===============');
for (const [name, vp] of [['844x390 (iPhone landscape)', { width: 844, height: 390 }], ['640x360 (Android landscape)', { width: 640, height: 360 }]]) {
  const p = await phone(b, vp);
  await installDeep(p);
  await p.evaluate(OVERFLOW);
  const ink0 = await inkOf(p, `03-landscape-${vp.width}x${vp.height}-boot.png`);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(1000);
  const ov = await p.evaluate(() => window.__overflow());
  const ink = await inkOf(p, `03-landscape-${vp.width}x${vp.height}-app.png`);
  // can we still reach the tools + run a drill?
  const reach = await p.evaluate(() => {
    const fab = document.querySelector('#toolsfab');
    const r = fab?.getBoundingClientRect();
    return {
      toolsFabOnScreen: !!r && r.top >= 0 && r.bottom <= innerHeight && r.width > 0,
      toolsFabRect: r ? `${Math.round(r.width)}x${Math.round(r.height)} @y=${Math.round(r.top)}` : null,
      segVisible: !!document.querySelector('.seg')?.checkVisibility(),
      stageH: Math.round(document.querySelector('.stage')?.getBoundingClientRect().height || 0),
      viewportH: innerHeight,
    };
  });
  // open the tools sheet in landscape: does it fit?
  await p.evaluate(() => document.querySelector('#toolsfab')?.click());
  await p.waitForTimeout(600);
  const sheet = await p.evaluate(() => {
    const mb = document.querySelector('.sidebar .mockbar');
    const r = mb.getBoundingClientRect();
    const cs = getComputedStyle(mb);
    const kids = [...mb.querySelectorAll('button')];
    const off = kids.filter((k) => { const kr = k.getBoundingClientRect(); return kr.bottom > innerHeight + 1 || kr.top < -1; });
    return {
      rect: `${Math.round(r.width)}x${Math.round(r.height)} @y=${Math.round(r.top)}`,
      maxHeight: cs.maxHeight, overflowY: cs.overflowY,
      viewportH: innerHeight,
      sheetTallerThanViewport: r.height > innerHeight,
      buttonsOutsideViewport: off.length, totalButtons: kids.length,
      scrollable: mb.scrollHeight > mb.clientHeight,
    };
  });
  await p.screenshot({ path: path.join(SHOTS, `03-landscape-${vp.width}x${vp.height}-tools-open.png`) });
  const inkTools = await inkOf(p, null);
  console.log(`\n  ${name}`);
  console.log(`    ink boot=${ink0.painted}  app=${ink.painted}  (0 = blank page)`);
  console.log(`    horizontal scroll: ${ov.horizontalScroll ? 'FAIL overshoot ' + ov.overshoot + 'px' : 'ok'}`);
  console.log(`    reach: ${JSON.stringify(reach)}`);
  console.log(`    tools sheet: ${JSON.stringify(sheet)}`);
  out.orientation[name] = { ov, reach, sheet, ink: ink.painted, inkTools: inkTools.painted };
  await p.context().close();
}

await b.close();
save('03-reflow-orientation.json', out);
