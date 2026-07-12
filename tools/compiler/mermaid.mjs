// tools/compiler/mermaid.mjs -- Layer C (part 3): ```mermaid -> inline SVG at BUILD time.
//
// Rich diagrams (sequence, state, branching, ER) are authored as standard ```mermaid fenced
// blocks and rendered to inline SVG here, so nothing ships to the runtime -- no mermaid.js in
// the app, just the SVG. Uses the Chromium we already have (via Playwright) to run mermaid's
// renderer once per diagram. Themed 'base' to sit closer to the app; full theming is a refine.
//
// The lightweight signature flows stay ```flow (a few spans, tiny); mermaid is only for the
// few diagrams a shorthand can't express -- keeping the offline file small.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MERMAID_JS = path.join(ROOT, 'node_modules/mermaid/dist/mermaid.min.js');

// THE FONT PINS THE GEOMETRY. Mermaid lays a diagram out by MEASURING its label text in a real DOM,
// so the SVG's viewBox / max-width are a function of whichever font actually resolves. The 'base'
// theme defaults to `"trebuchet ms", verdana, arial, sans-serif` -- Trebuchet MS exists on Windows
// and not on a stock Ubuntu runner, so each platform fell back to a different face, measured the
// same labels differently, and emitted a different SVG:
//     Windows  viewBox="0 0 1035.15625 190.6875"
//     Ubuntu   viewBox="0 0 1022.203125 186.5"
// Same source, different bytes -- so build_integrity failed in CI against a deliverable that was
// perfectly correct. Embedding the app's OWN woff2 (a base64 data: URI -- identical bytes on every
// machine) makes the measurement platform-independent, and has the happy side effect that diagrams
// are now set in the app's typeface instead of Trebuchet MS.
const FONTS_CSS = fs.readFileSync(path.join(ROOT, 'src/fonts.css'), 'utf8');
const FONT_FAMILY = '"Space Grotesk", sans-serif';

function loadChromium() {
  try { return require('playwright').chromium; }
  catch { return require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; }
}

let _browser = null;
async function browser() {
  if (_browser) return _browser;
  _browser = await loadChromium().launch({
    args: [
      '--no-sandbox', '--disable-dev-shm-usage',
      // ...AND THE HINTING PINS THE ROUNDING. Embedding the font (above) made both platforms measure
      // the SAME face, but they still disagreed in the last fraction of a pixel: Linux Chromium
      // applies full font hinting and SNAPS glyph advances to whole pixels, Windows keeps subpixel
      // precision -- so the same labels came out 1072 vs 1072.15625 wide and the SVGs still differed.
      // Disabling hinting takes advances straight from the font's own metrics, which are the same
      // bytes everywhere. This is the standard flag for reproducible headless text layout.
      '--font-render-hinting=none',
    ],
    executablePath: process.env.CHROME || undefined,
  });
  return _browser;
}

// Render one mermaid diagram to an SVG string (build-time).
export async function renderMermaid(src, id = 'm') {
  const b = await browser();
  const pg = await b.newPage();
  await pg.setContent('<!doctype html><style>' + FONTS_CSS + '</style><body></body>');
  // The font must be RESOLVED before mermaid measures anything -- a face still in flight measures
  // as the fallback, which is the very nondeterminism this exists to remove. document.fonts.load()
  // forces the fetch (a data: URI, so it is instant); document.fonts.ready awaits it.
  await pg.evaluate(async () => {
    await Promise.all(['300', '400', '600', '700'].map(
      // eslint-disable-next-line no-undef
      (w) => document.fonts.load(w + ' 16px "Space Grotesk"')));
    // eslint-disable-next-line no-undef
    await document.fonts.ready;
  });
  await pg.addScriptTag({ path: MERMAID_JS });
  const svg = await pg.evaluate(async (arg) => {
    // eslint-disable-next-line no-undef
    mermaid.initialize({ startOnLoad: false, theme: 'base', fontFamily: arg.font });
    // eslint-disable-next-line no-undef
    const out = await mermaid.render(arg.id, arg.src);
    return out.svg;
  }, { src, id, font: FONT_FAMILY });
  await pg.close();
  return svg;
}

export async function closeMermaid() { if (_browser) { await _browser.close(); _browser = null; } }
