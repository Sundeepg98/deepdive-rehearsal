/* Is the topic name in the header really being cut off, and is the
 * "html body div (client 1 < content 76)" clipper a real defect or the
 * standard visually-hidden screen-reader region? Answer both by looking.
 */
import path from 'node:path';
import { launch, phone, installDeep, ensureDirs, SHOTS } from './lib.mjs';
ensureDirs();

const b = await launch();
for (const w of [320, 360, 390]) {
  const p = await phone(b, { width: w, height: 800 });
  await installDeep(p);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(1000);

  const d = await p.evaluate(() => {
    const cur = document.querySelector('#tncurrent');
    const cs = getComputedStyle(cur);
    const r = cur.getBoundingClientRect();

    // the 1px clipper: sr-only, or a real bug?
    const onePx = [...document.querySelectorAll('div')].filter((e) => {
      const c = getComputedStyle(e);
      return e.clientWidth <= 2 && e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(c.overflowX);
    }).map((e) => ({
      sel: window.__selOf(e),
      cw: e.clientWidth, sw: e.scrollWidth,
      w: getComputedStyle(e).width, h: getComputedStyle(e).height,
      pos: getComputedStyle(e).position, clip: getComputedStyle(e).clipPath || getComputedStyle(e).clip,
      role: e.getAttribute('role'), ariaLive: e.getAttribute('aria-live'),
      cls: e.className, text: (e.textContent || '').trim().slice(0, 40),
    }));

    return {
      topicName: {
        fullText: cur.textContent.trim(),
        clientW: cur.clientWidth, scrollW: cur.scrollWidth,
        rect: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
        textOverflow: cs.textOverflow, overflowX: cs.overflowX, whiteSpace: cs.whiteSpace,
        cutPx: cur.scrollWidth - cur.clientWidth,
        visibleFraction: +(cur.clientWidth / cur.scrollWidth).toFixed(2),
      },
      onePxClippers: onePx,
    };
  });

  console.log(`\n===== ${w}px =====`);
  console.log('  TOPIC NAME in header (#tncurrent):');
  console.log(`    full text        : "${d.topicName.fullText}"`);
  console.log(`    box ${d.topicName.rect}  clientW=${d.topicName.clientW}  contentW=${d.topicName.scrollW}  CUT ${d.topicName.cutPx}px`);
  console.log(`    text-overflow=${d.topicName.textOverflow}  overflow-x=${d.topicName.overflowX}  white-space=${d.topicName.whiteSpace}`);
  console.log(`    => only ${Math.round(d.topicName.visibleFraction * 100)}% of the topic name is visible`);
  console.log('  1px-wide clippers (sr-only, or bug?):');
  for (const o of d.onePxClippers) console.log(`    ${o.sel} w=${o.w} h=${o.h} pos=${o.pos} role=${o.role} aria-live=${o.ariaLive} class="${o.cls}" text="${o.text}"`);

  // crop the header so we can SEE it
  const hdr = await p.locator('#tntrigger').boundingBox();
  if (hdr) {
    await p.screenshot({
      path: path.join(SHOTS, `03c-${w}-header-topicname.png`),
      clip: { x: 0, y: Math.max(0, hdr.y - 12), width: w, height: Math.min(90, 800 - hdr.y) },
    });
  }
  await p.context().close();
}
await b.close();
