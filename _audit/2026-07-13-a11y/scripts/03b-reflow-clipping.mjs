/* REFLOW, done properly.
 *
 * The first detector asked `documentElement.scrollWidth > innerWidth`. It
 * reported CLEAN at every width 320-430 and it COULD NOT FAIL: .stage carries
 * overflow-x:hidden (styles.css:422), so anything too wide is CLIPPED instead
 * of scrolling and the document never widens. A 900px div proved it - injected
 * into a 320px viewport, the check still said "no overflow".
 *
 * WCAG 1.4.10 has TWO halves and overflow-x:hidden only satisfies the first:
 *   - no horizontal scrolling  <- hidden satisfies this
 *   - "without loss of content or functionality"  <- hidden VIOLATES this
 * So the honest question is not "does it scroll" but "is anything being cut
 * off". We ask every clipping container: scrollWidth > clientWidth?
 *
 * NEGATIVE CONTROL: the same 900px div must now be CAUGHT.
 */
import path from 'node:path';
import { launch, phone, installDeep, ensureDirs, save, SHOTS } from './lib.mjs';

ensureDirs();
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const CLIP = `
window.__clipping = function () {
  const res = { clippers: [], escapees: [], docScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  const vw = document.documentElement.clientWidth;
  const scan = (root, hostPath) => {
    for (const el of root.querySelectorAll('*')) {
      let cs; try { cs = getComputedStyle(el); } catch (e) { continue; }
      try { if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue; } catch (e) { continue; }

      // A. containers that CLIP horizontally and have content wider than themselves
      if (/hidden|clip/.test(cs.overflowX)) {
        const cut = el.scrollWidth - el.clientWidth;
        if (cut > 1 && el.clientWidth > 0) {
          // name the widest child actually sticking out
          const r = el.getBoundingClientRect();
          let worst = null;
          for (const k of el.querySelectorAll('*')) {
            const kr = k.getBoundingClientRect();
            if (kr.width < 1) continue;
            const ov = kr.right - r.right;
            if (ov > 1 && (!worst || ov > worst.ov)) {
              worst = { ov: Math.round(ov), sel: window.__selOf(k), tag: k.tagName.toLowerCase(),
                        text: (k.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) };
            }
          }
          res.clippers.push({
            sel: window.__selOf(el), host: hostPath || '(light)',
            clientW: el.clientWidth, scrollW: el.scrollWidth, cutPx: Math.round(cut),
            overflowX: cs.overflowX, worstChild: worst,
          });
        }
      }

      // B. anything whose right edge escapes the viewport and is NOT inside a
      //    legitimate horizontal scroller (overflow-x:auto/scroll = intentional)
      if (cs.position !== 'fixed') {
        const r = el.getBoundingClientRect();
        if (r.width >= 1 && r.right > vw + 1) {
          let inScroller = false;
          for (const a of window.__ancestors(el)) {
            let acs; try { acs = getComputedStyle(a); } catch (e) { continue; }
            if (/auto|scroll/.test(acs.overflowX)) { inScroller = true; break; }
          }
          if (!inScroller) {
            res.escapees.push({ sel: window.__selOf(el), host: hostPath || '(light)',
              over: Math.round(r.right - vw), w: Math.round(r.width),
              text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 34) });
          }
        }
      }
      if (el.shadowRoot) scan(el.shadowRoot, (hostPath ? hostPath + ' >> ' : '') + el.tagName.toLowerCase());
    }
  };
  scan(document, '');
  res.escapees.sort((a, b) => b.over - a.over);
  res.clippers.sort((a, b) => b.cutPx - a.cutPx);
  return res;
};`;

const b = await launch();
const out = {};

for (const w of [320, 360, 390]) {
  const p = await phone(b, { width: w, height: 800 });
  await installDeep(p);
  await p.evaluate(CLIP);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(1000);
  console.log(`\n================= ${w}px =================`);
  out[w] = {};
  for (const pane of PANES) {
    await p.evaluate((t) => document.querySelector(`.seg button[data-tab="${t}"]`)?.click(), pane);
    await p.waitForTimeout(800);
    const c = await p.evaluate(() => window.__clipping());
    out[w][pane] = c;
    const nClip = c.clippers.length, nEsc = c.escapees.length;
    const worstCut = c.clippers[0]?.cutPx || 0;
    const flag = worstCut > 1 || nEsc > 0 ? 'LOSS' : 'ok  ';
    console.log(`  ${flag} ${pane.padEnd(6)} clipped-containers=${String(nClip).padStart(2)} (worst cut ${worstCut}px)  escapees=${nEsc}  docScroll=${c.docScroll}`);
    for (const cl of c.clippers.slice(0, 3)) {
      console.log(`         CUT ${cl.cutPx}px: ${cl.host === '(light)' ? '' : '[' + cl.host + '] '}${cl.sel}  (client ${cl.clientW} < content ${cl.scrollW})`);
      if (cl.worstChild) console.log(`              widest child sticking out +${cl.worstChild.ov}px: ${cl.worstChild.tag} "${cl.worstChild.text}"`);
    }
    for (const e of c.escapees.slice(0, 3)) {
      console.log(`         ESCAPES viewport +${e.over}px: ${e.host === '(light)' ? '' : '[' + e.host + '] '}${e.sel} "${e.text}"`);
    }
    if (worstCut > 1) await p.screenshot({ path: path.join(SHOTS, `03b-${w}-${pane}-clipped.png`) });
  }
  await p.context().close();
}

/* ---------- NEGATIVE CONTROL: the 900px div that defeated the old detector ---------- */
{
  const p = await phone(b, { width: 320, height: 800 });
  await installDeep(p);
  await p.evaluate(CLIP);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(900);
  const clean = await p.evaluate(() => window.__clipping());
  await p.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__nc_wide'; d.textContent = 'NEGATIVE CONTROL';
    d.style.cssText = 'width:900px;height:24px;background:red';
    document.querySelector('.stage')?.appendChild(d);
  });
  await p.waitForTimeout(400);
  const broken = await p.evaluate(() => window.__clipping());
  const caught = broken.clippers.some((c) => c.worstChild?.sel?.includes('__nc_wide') || c.cutPx > 500);
  console.log('\n=============== NEGATIVE CONTROL (clipping detector) ===============');
  console.log(`  OLD detector (scrollWidth): documentElement.scrollWidth grew? ${broken.docScroll}   <-- false: this is why it could not fail`);
  console.log(`  NEW detector: baseline worst cut = ${clean.clippers[0]?.cutPx || 0}px`);
  console.log(`  NEW detector: after a 900px div = ${broken.clippers[0]?.cutPx || 0}px cut on ${broken.clippers[0]?.sel}`);
  console.log('  ' + (caught ? 'OK — the clipping detector CATCHES what the scrollWidth check could not.' : '*** STILL DEAD ***'));
  await p.screenshot({ path: path.join(SHOTS, '03b-NEGCONTROL-900px-div-clipped.png') });
  out.negControl = { cleanWorst: clean.clippers[0]?.cutPx || 0, brokenWorst: broken.clippers[0]?.cutPx || 0, docScrollGrew: broken.docScroll, caught };
  await p.context().close();
}
await b.close();
save('03b-reflow-clipping.json', out);
