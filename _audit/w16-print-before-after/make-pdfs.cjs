'use strict';
/* ===== W-X1 review artifact: the before/after A4 PDF pair =====
 *
 * WHAT THIS PRODUCES, into this directory:
 *   <label>-content-pipeline.pdf     the flagship cram sheet, real A4
 *   <label>-consistency-models.pdf   the tallest cram sheet, real A4
 *   <label>-print-qa.pdf             the Ctrl/Cmd+P "Print Q&A" document
 *
 * IT DRIVES test/print_truth.cjs RATHER THAN RE-IMPLEMENTING IT. The gate check already opens the
 * app, switches topic, opens the sheet, emulates print media and calls page.pdf with the app's own
 * @page geometry; a second copy of that here would be a second instrument to keep in sync, and the
 * repo has paid for divergent duplicates before. This only supplies the output directory and the
 * label. Consequence worth knowing: this run also RUNS the assertions, so producing the BEFORE pair
 * exits non-zero. That is correct -- the before build is the broken one.
 *
 * HOW THE COMMITTED PAIR WAS MADE (2026-07-30, wave W-X1, branch xb/x1-print-truth):
 *
 *   BEFORE -- at base d481901, with none of the three fixes applied:
 *       npm run build
 *       node _audit/w16-print-before-after/make-pdfs.cjs before
 *     -> flagship 1 page (354,602 B), consistency-models 1 page (121,301 B); 36 assertions RED.
 *
 *   AFTER -- with styles.css / base-styles.js / print-qa.js fixed:
 *       npm run build
 *       node _audit/w16-print-before-after/make-pdfs.cjs after
 *     -> flagship 3 pages (403,453 B), consistency-models 7 pages (746,251 B); all arms PASS.
 *
 * The two cram page counts match, exactly, the isolated negative control the cross-browser audit
 * ran before any fix existed (_audit/2026-07-30-crossbrowser-audit.md, X1: control B = 3 and 7).
 */
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;
const label = (process.argv[2] || 'after').replace(/[^a-z0-9-]/gi, '');
if (!label) {
  console.error('usage: node _audit/w16-print-before-after/make-pdfs.cjs [before|after]');
  process.exit(2);
}

/* Locate Chromium the way THE GATE does -- through Playwright itself, never a hardcoded path. */
let chrome = process.env.CHROME;
if (!chrome) {
  try { chrome = require('playwright').chromium.executablePath(); } catch (e) { chrome = ''; }
}

const r = spawnSync(process.execPath,
  [path.join(ROOT, 'test', 'print_truth.cjs'), path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: Object.assign({}, process.env, { CHROME: chrome, PRINT_TRUTH_PDF_DIR: OUT, PRINT_TRUTH_LABEL: label }),
  });

console.log('\nmake-pdfs: wrote ' + label + '-*.pdf into ' + OUT);
console.log('make-pdfs: print_truth exited ' + r.status + (r.status === 0 ? '' : '  (expected non-zero for the BEFORE build)'));
process.exit(0);
