import { chromium } from 'playwright';
const BUILDS = {
  BEFORE: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html',
  AFTER: 'D:/claude-workspace/deepdive-rehearsal/dist/index.html',
};
const br = await chromium.launch();
console.log('=== prefers-reduced-motion: DOES IT PAINT? ===');
console.log('(painted% = share of non-background pixels in the viewport screenshot)\n');
const dec = await (await br.newContext()).newPage(); await dec.goto('data:text/html,<body>');

for (const [build, path] of Object.entries(BUILDS)) {
  for (const vp of [{ n: 'desktop', width: 1440, height: 900 }, { n: 'mobile', width: 390, height: 844 }]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await br.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      await p.goto('file:///' + path);
      await p.waitForTimeout(2600);
      await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForTimeout(600);
      const buf = await p.screenshot();
      const stat = await dec.evaluate(async b64 => {
        const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
        const bm = await createImageBitmap(blob);
        const c = new OffscreenCanvas(bm.width, bm.height); const x = c.getContext('2d'); x.drawImage(bm, 0, 0);
        const d = x.getImageData(0, 0, bm.width, bm.height).data;
        // modal background colour = the most common pixel
        const cnt = new Map();
        for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3); cnt.set(k, (cnt.get(k) || 0) + 1); }
        let bg = null, mx = 0; for (const [k, v] of cnt) if (v > mx) { mx = v; bg = k; }
        const total = d.length / 4;
        return { uniqueColors: cnt.size, bgShare: +(mx / total * 100).toFixed(1), painted: +((1 - mx / total) * 100).toFixed(1) };
      }, buf.toString('base64'));
      const opacity = await p.evaluate(() => getComputedStyle(document.body).opacity);
      const verdict = stat.painted < 1 ? 'BLANK PAGE' : 'renders';
      console.log(`  ${build.padEnd(6)} ${vp.n.padEnd(7)} ${theme.padEnd(5)}  bodyOpacity=${String(opacity).padEnd(4)} painted=${String(stat.painted).padStart(5)}%  colors=${String(stat.uniqueColors).padStart(5)}  -> ${verdict}`);
      await ctx.close();
    }
  }
}
await br.close();
