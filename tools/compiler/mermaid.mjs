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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MERMAID_JS = path.join(ROOT, 'node_modules/mermaid/dist/mermaid.min.js');

function loadChromium() {
  try { return require('playwright').chromium; }
  catch { return require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; }
}

let _browser = null;
async function browser() {
  if (_browser) return _browser;
  _browser = await loadChromium().launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    executablePath: process.env.CHROME || undefined,
  });
  return _browser;
}

// Render one mermaid diagram to an SVG string (build-time).
export async function renderMermaid(src, id = 'm') {
  const b = await browser();
  const pg = await b.newPage();
  await pg.setContent('<!doctype html><body></body>');
  await pg.addScriptTag({ path: MERMAID_JS });
  const svg = await pg.evaluate(async (arg) => {
    // eslint-disable-next-line no-undef
    mermaid.initialize({ startOnLoad: false, theme: 'base' });
    // eslint-disable-next-line no-undef
    const out = await mermaid.render(arg.id, arg.src);
    return out.svg;
  }, { src, id });
  await pg.close();
  return svg;
}

export async function closeMermaid() { if (_browser) { await _browser.close(); _browser = null; } }
