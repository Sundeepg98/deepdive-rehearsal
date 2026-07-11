/* F1 corroboration: dump the ACTUAL chip text + .pa for caching vs authz, and
   determine WHICH ancestor actually clips (lens blamed .stage{overflow-x:hidden}). */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

for (const t of ['caching', 'authz']) {
  await p.goto(URL + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const d = await p.evaluate(() => {
    const sr = document.querySelector('deep-system-map').shadowRoot;
    const pv = sr.querySelector('.piv');
    const chip = pv.querySelector('.chip'), pa = pv.querySelector('.pa');
    // walk the ancestor chain (incl. across the shadow boundary) and find every clipper
    const clippers = [];
    let n = chip;
    while (n) {
      if (n.nodeType === 1 && n !== chip) {
        const cs = getComputedStyle(n);
        if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') {
          clippers.push({
            el: n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
            overflowX: cs.overflowX,
            clipsHere: Math.round(n.scrollWidth - n.clientWidth),
            clientW: n.clientWidth,
          });
        }
      }
      n = n.parentNode ? n.parentNode : (n.host || null); // hop the shadow boundary
    }
    return {
      chipText: chip.textContent.trim(),
      chipChars: chip.textContent.trim().length,
      chipW: Math.round(chip.getBoundingClientRect().width),
      paText: pa ? pa.textContent.trim() : '(NO .pa ELEMENT)',
      paChars: pa ? pa.textContent.trim().length : -1,
      clippers,
    };
  });
  console.log('\n############ TOPIC:', t, '############');
  console.log('CHIP (' + d.chipChars + ' chars, ' + d.chipW + 'px):');
  console.log('  "' + d.chipText.slice(0, 200) + (d.chipText.length > 200 ? ' …' : '') + '"');
  console.log('ANSWER BODY .pa (' + d.paChars + ' chars):');
  console.log('  "' + (d.paText.slice(0, 160) || '(((EMPTY — NOTHING RENDERS))) ') + '"');
  console.log('CLIPPING ANCESTORS (chip -> document):');
  d.clippers.forEach(c => console.log('   ', c.el.padEnd(34), 'overflow-x:', c.overflowX.padEnd(8), 'clipped here:', c.clipsHere + 'px', '(client', c.clientW + 'px)'));
  await p.screenshot({ path: SH + `f1-sys-1280-${t}.png` });
}
await b.close();
