// Is the WebGL canvas ACTUALLY drawing? (rule out a headless screenshot/compositing artifact)
// Read pixels straight off the canvas rather than trusting the page screenshot.
import { chromium } from 'playwright';

for (const [label, args] of [
  ['default headless', []],
  ['swiftshader forced', ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']],
]) {
  const b = await chromium.launch({ args });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
  await p.waitForTimeout(600);
  await p.evaluate(() => { const o = document.querySelector('#_index-overlay'); if (o) { o.classList.remove('open', 'vis'); o.style.display = 'none'; } });
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(3500);

  const r = await p.evaluate(() => {
    // the canvas lives in the deep-visual shadow root
    const dv = document.querySelector('deep-visual');
    const root = dv && dv.shadowRoot;
    const cv = root ? root.querySelector('canvas') : document.querySelector('canvas');
    if (!cv) return { err: 'no canvas found' };
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const out = {
      cssW: cv.clientWidth, cssH: cv.clientHeight, attrW: cv.width, attrH: cv.height,
      glLost: gl ? gl.isContextLost() : null,
      drawingBuf: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : null,
      renderer: null, nonBg: null,
    };
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      out.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      // read the framebuffer
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      // count pixels that differ from the modal background colour (first pixel)
      const r0 = px[0], g0 = px[1], b0 = px[2];
      let diff = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (Math.abs(px[i] - r0) > 8 || Math.abs(px[i + 1] - g0) > 8 || Math.abs(px[i + 2] - b0) > 8) diff++;
      }
      out.bgColor = [r0, g0, b0, px[3]];
      out.nonBg = +((diff / (w * h)) * 100).toFixed(2);
    }
    return out;
  });
  console.log(`[${label}]`, JSON.stringify(r));
  await b.close();
}
console.log('\n(visual-trainer CLAUDE.md records its own headless verify at 3.5% non-background pixels, floor 3%)');
