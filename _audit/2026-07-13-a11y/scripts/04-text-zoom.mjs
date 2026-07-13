/* WCAG 1.4.4 Resize Text (AA): text to 200% without loss of content or functionality.
 *
 * On a phone the real mechanism is the OS text-size setting (Android "Font
 * size", iOS Dynamic Type) / Chrome's text scaling. That is TEXT-ONLY zoom:
 * type grows, the layout box does not. Page zoom just reflows and trivially
 * passes; text-only zoom is what actually breaks apps, and it is what mobile
 * users actually have. Note the app's own .textzoom control is display:none
 * under 919px (styles.css:790) - a phone user has no in-app escape hatch.
 *
 * We emulate faithfully: multiply EVERY element's computed font-size by 2
 * (including shadow trees), which is what Chrome's text scaling does to px
 * sizes too. Then we measure LOSS.
 *
 * NEGATIVE CONTROL: run the same detector at 1x (must be quiet), then clamp a
 * container to height:10px and prove the detector flags it.
 */
import path from 'node:path';
import { launch, phone, installDeep, inkOf, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';
ensureDirs();

const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const ZOOM = `
window.__setTextZoom = function (factor) {
  const all = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      all.push(el);
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(document);
  for (const el of all) {
    if (!el.dataset) continue;
    if (el.dataset.__basefs === undefined) {
      el.dataset.__basefs = parseFloat(getComputedStyle(el).fontSize) || 16;
    }
    el.style.setProperty('font-size', (parseFloat(el.dataset.__basefs) * factor) + 'px', 'important');
  }
  return all.length;
};

/* LOSS = text cut off, controls overlapping, or content pushed off-screen. */
window.__zoomLoss = function () {
  const vw = document.documentElement.clientWidth;
  const clipped = [];
  const escaped = [];
  const walk = (root, host) => {
    for (const el of root.querySelectorAll('*')) {
      let cs; try { cs = getComputedStyle(el); } catch (e) { continue; }
      try { if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue; } catch (e) { continue; }
      // skip the 1x1 sr-only live regions: intentional, not a defect
      if (el.clientWidth <= 2 && el.clientHeight <= 2) continue;

      const clipsX = /hidden|clip/.test(cs.overflowX);
      const clipsY = /hidden|clip/.test(cs.overflowY);
      const cutX = clipsX ? el.scrollWidth - el.clientWidth : 0;
      const cutY = clipsY ? el.scrollHeight - el.clientHeight : 0;
      if ((cutX > 1 || cutY > 1) && el.textContent.trim()) {
        clipped.push({
          sel: window.__selOf(el), host: host || '(light)',
          cutX: Math.round(cutX), cutY: Math.round(cutY),
          box: el.clientWidth + 'x' + el.clientHeight, content: el.scrollWidth + 'x' + el.scrollHeight,
          text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 42),
        });
      }
      if (cs.position !== 'fixed') {
        const r = el.getBoundingClientRect();
        if (r.width >= 1 && r.right > vw + 1) {
          let inScroller = false;
          for (const a of window.__ancestors(el)) {
            let acs; try { acs = getComputedStyle(a); } catch (e) { continue; }
            if (/auto|scroll/.test(acs.overflowX)) { inScroller = true; break; }
          }
          if (!inScroller) escaped.push({ sel: window.__selOf(el), host: host || '(light)', over: Math.round(r.right - vw) });
        }
      }
      if (el.shadowRoot) walk(el.shadowRoot, (host ? host + ' >> ' : '') + el.tagName.toLowerCase());
    }
  };
  walk(document, '');

  /* overlapping CONTROLS: two targets whose boxes intersect = one is unhittable */
  const ctrls = window.__deepAll(window.__INTERACTIVE).map((r) => r.el).filter((el) => {
    try { return el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && el.getBoundingClientRect().width > 0; } catch (e) { return false; }
  });
  const overlaps = [];
  for (let i = 0; i < ctrls.length; i++) {
    for (let j = i + 1; j < ctrls.length; j++) {
      const A = ctrls[i], B = ctrls[j];
      if (A.contains(B) || B.contains(A)) continue;
      const a = A.getBoundingClientRect(), b2 = B.getBoundingClientRect();
      const ox = Math.min(a.right, b2.right) - Math.max(a.left, b2.left);
      const oy = Math.min(a.bottom, b2.bottom) - Math.max(a.top, b2.top);
      if (ox > 2 && oy > 2) {
        overlaps.push({ a: window.__selOf(A), b: window.__selOf(B), overlap: Math.round(ox) + 'x' + Math.round(oy) });
      }
    }
  }
  clipped.sort((x, y) => (y.cutX + y.cutY) - (x.cutX + x.cutY));
  return { clipped, escaped, overlaps: overlaps.slice(0, 12), nClipped: clipped.length, nEscaped: escaped.length, nOverlaps: overlaps.length };
};`;

const b = await launch();
const out = {};

for (const [vpName, vp] of Object.entries(PHONES)) {
  const p = await phone(b, vp);
  await installDeep(p);
  await p.evaluate(ZOOM);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(1000);

  console.log(`\n############ ${vp.width}x${vp.height} ############`);
  out[vpName] = {};

  for (const pane of PANES) {
    await p.evaluate((t) => document.querySelector(`.seg button[data-tab="${t}"]`)?.click(), pane);
    await p.waitForTimeout(700);

    await p.evaluate(() => window.__setTextZoom(1));
    await p.waitForTimeout(350);
    const at1 = await p.evaluate(() => window.__zoomLoss());

    const n = await p.evaluate(() => window.__setTextZoom(2));
    await p.waitForTimeout(600);
    const at2 = await p.evaluate(() => window.__zoomLoss());
    const ink = await inkOf(p, null);
    if (['walk', 'drill', 'num'].includes(pane)) {
      await p.screenshot({ path: path.join(SHOTS, `04-${vp.width}-${pane}-textzoom200.png`) });
    }
    await p.evaluate(() => window.__setTextZoom(1));
    await p.waitForTimeout(300);

    out[vpName][pane] = { at1, at2, nodes: n, ink: ink.painted };
    const d = at2.nClipped - at1.nClipped;
    console.log(`  ${pane.padEnd(6)} 1x: ${String(at1.nClipped).padStart(2)} clipped / ${at1.nOverlaps} overlaps` +
      `   ->  2x: ${String(at2.nClipped).padStart(2)} clipped (+${d}) / ${at2.nOverlaps} overlaps / ${at2.nEscaped} escape viewport`);
    for (const c of at2.clipped.slice(0, 4)) {
      console.log(`         CUT x${c.cutX} y${c.cutY}  ${c.host === '(light)' ? '' : '[' + c.host + '] '}${c.sel}  box ${c.box} < content ${c.content}   "${c.text}"`);
    }
    for (const o of at2.overlaps.slice(0, 3)) {
      console.log(`         OVERLAP ${o.overlap}px:  ${o.a}  <>  ${o.b}`);
    }
  }
  await p.context().close();
}

/* ---------------- NEGATIVE CONTROL ---------------- */
{
  const p = await phone(b, PHONES.p390);
  await installDeep(p);
  await p.evaluate(ZOOM);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(900);
  const base = await p.evaluate(() => window.__zoomLoss());
  await p.addStyleTag({ content: '.mcomp{height:10px !important;overflow:hidden !important}' });
  await p.waitForTimeout(400);
  const broken = await p.evaluate(() => window.__zoomLoss());
  const caught = broken.clipped.some((c) => c.sel.includes('mcomp'));
  console.log('\n=============== NEGATIVE CONTROL (clipping detector) ===============');
  console.log(`  baseline clipped containers      : ${base.nClipped}`);
  console.log(`  after clamping .mcomp to height:10px: ${broken.nClipped}  (caught .mcomp: ${caught})`);
  console.log('  ' + (caught && broken.nClipped > base.nClipped
    ? 'OK — the loss detector GOES RED on deliberately clipped text.'
    : '*** DETECTOR DEAD ***'));
  out.negControl = { base: base.nClipped, broken: broken.nClipped, caught };
  await p.context().close();
}
await b.close();
save('04-text-zoom.json', out);
