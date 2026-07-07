// tools/compiler/mathjax.mjs -- LaTeX math -> self-contained inline SVG at BUILD time.
//
// Same model as mermaid.mjs (Layer C): math is authored inline as $...$ and as a
// display block $$...$$ inside prose, and rendered to inline SVG *here*, so nothing
// math-related ships to the runtime -- no MathJax or KaTeX in the app, and crucially
// no web fonts. MathJax's SVG output embeds each glyph as a vector path with
// fill="currentColor" (inherits the text color) and sizes in ex units (scales with
// font-size), so a formula is a fully self-contained, offline-safe SVG -- exactly the
// property the single-file app needs, and the reason SVG output beats KaTeX's
// font-dependent HTML here.
//
// convert() is synchronous, so unlike mermaid this needs no browser and hooks
// directly into the sync prose() pipeline.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document('', {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: 'none' }), // 'none' -> every formula is standalone (no shared <defs>)
});

// Render one LaTeX string to a self-contained inline SVG string (build-time, sync).
// display=false -> inline (baseline-aligned via the SVG's own vertical-align);
// display=true  -> a centered block (the .mth-b span is display:block in CSS).
export function renderMath(latex, display) {
  const node = doc.convert(String(latex).trim(), { display: !!display });
  const svg = adaptor.innerHTML(node); // just the <svg>...</svg>, drop MathJax's container
  // Inline styles (not a CSS class) so math renders identically in the light DOM
  // (sidebar spine/thesis) and inside every shadow-DOM pane, with no stylesheet to wire.
  // The SVG already carries fill="currentColor" and its own baseline vertical-align.
  return display
    ? '<span class="mth-b" style="display:block;text-align:center;margin:0.7em 0">' + svg + '</span>'
    : '<span class="mth" style="white-space:nowrap">' + svg + '</span>';
}
