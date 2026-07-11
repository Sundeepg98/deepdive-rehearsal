// Do the 4 long pivot chips actually render, or does .piv{overflow:hidden} clip them?
// Measured in the real Shadow DOM, not inferred from CSS.
const path = require('path');
const { chromium } = require('playwright');
const HTML = path.resolve(process.argv[2] || 'deepdive_content_pipeline_rehearsal.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + HTML);
  await page.waitForTimeout(300);

  const out = await page.evaluate(() => {
    const REF8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];
    const res = { rows: [], ref: [] };
    const host = document.createElement('deep-system-map');
    document.body.appendChild(host);
    // give the host a realistic width -- the pane sits in the app's content column
    host.style.display = 'block';
    host.style.width = '760px';

    TopicRegistry.ids().forEach((id) => {
      const t = TopicRegistry.get(id);
      if (!t.data.sys) return;
      host.renderTopic(t.data.sys);
      const root = host.shadowRoot;
      const chips = root.querySelectorAll('.piv .chip');
      chips.forEach((c, i) => {
        const piv = c.closest('.piv');
        const sum = c.closest('summary');
        // clipped = the chip's right edge extends past the container that hides overflow
        const cr = c.getBoundingClientRect(), pr = piv.getBoundingClientRect();
        const overflowPx = Math.round(cr.right - pr.right);
        const clipped = c.scrollWidth > 0 && overflowPx > 1;
        const rec = { id, i, len: c.textContent.length, w: Math.round(cr.width),
          pivW: Math.round(pr.width), overflowPx, clipped,
          // does the QUESTION still have room? a nowrap chip starves it
          qW: Math.round(sum.querySelector('.pq').getBoundingClientRect().width) };
        if (REF8.includes(id)) res.ref.push(rec); else res.rows.push(rec);
      });
    });
    host.remove();
    return res;
  });

  const long = out.rows.filter((r) => r.len > 120);
  const clipped = out.rows.filter((r) => r.clipped);
  const refLens = out.ref.map((r) => r.len);
  const cLens = out.rows.map((r) => r.len);
  const stat = (a) => a.length ? `min ${Math.min(...a)}  max ${Math.max(...a)}  mean ${Math.round(a.reduce((x, y) => x + y, 0) / a.length)}` : 'n/a';

  console.log('PIVOT CHIP -- rendered width vs its container (.piv has overflow:hidden)\n');
  console.log('  chip text length -- THE 8   : ' + stat(refLens) + '   (n=' + refLens.length + ')');
  console.log('  chip text length -- the 38  : ' + stat(cLens) + '   (n=' + cLens.length + ')');
  console.log('\n  chips over 120 chars in the 38: ' + long.length);
  console.log('  chips VISUALLY CLIPPED in the 38: ' + clipped.length);
  console.log('  chips VISUALLY CLIPPED in the 8 : ' + out.ref.filter((r) => r.clipped).length);
  if (clipped.length) {
    console.log('\n  ' + 'topic'.padEnd(26) + 'chars'.padStart(6) + 'chipW'.padStart(7) + 'pivW'.padStart(6) + 'overflow'.padStart(10) + '   question width');
    console.log('  ' + '-'.repeat(74));
    clipped.slice(0, 8).forEach((r) => {
      console.log('  ' + (r.id + '[' + r.i + ']').padEnd(26) + String(r.len).padStart(6) + String(r.w).padStart(7)
        + String(r.pivW).padStart(6) + ('+' + r.overflowPx + 'px').padStart(10) + '   ' + r.qW + 'px');
    });
    console.log('\n  => ' + clipped.length + ' chip(s) render PAST the container that hides overflow: the tail is invisible.');
  } else {
    console.log('\n  => no chip is clipped; every chip renders inside its container.');
  }
  await browser.close();
})();
