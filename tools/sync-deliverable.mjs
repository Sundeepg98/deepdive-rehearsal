// The LAST step of `npm run build`: copy dist/index.html onto the shipped deliverable.
//
// WHY THIS EXISTS. The deliverable IS the product. It is the file that ships, the file CI
// deploys (deploy-pages.yml copies it to _site/index.html), and -- this is the part that bit
// people -- the file THE GATE measures: check_all.py:167 hands this path, not dist/, to all 16
// browser checks, and layout_static + unit_tests read it directly. 18 checks in total tell you
// about THIS file's bytes.
//
// It used to be written by exactly one command: `make build`. And `make` is not installed on
// the Windows box this repo is developed on. So the documented, working, everybody-runs-it
// `npm run build` refreshed dist/index.html and left the deliverable STALE -- which meant an
// agent could edit src/, build, open the deliverable in a browser, and measure YESTERDAY'S
// BYTES while believing it was looking at its own change. One did, for three rounds, and very
// nearly concluded its own (correct) fix was a no-op. The same staleness silently corrupted
// the gate's browser checks and the visual-regression baseline recipe.
//
// The fix is not a warning in a doc; it is removing the ability to make the mistake. After
// this step there is NO command in this repo that produces dist/index.html without also
// producing the deliverable, so the two cannot diverge.
//
// test/build_integrity.py asserts this step actually ran (dist == deliverable, byte for byte),
// so it cannot be quietly dropped from package.json without the gate going red.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist', 'index.html');
const DELIVERABLE = path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html');

if (!fs.existsSync(DIST)) {
  console.error('sync-deliverable: FAIL -- %s does not exist. Did `vite build` run?', DIST);
  process.exit(1);
}

const bytes = fs.readFileSync(DIST);

// Write to a temp file and rename, rather than copying in place. A copy interrupted halfway
// (Ctrl-C, a full disk) leaves a TRUNCATED deliverable, and a truncated single-file app fails
// every downstream check as a mystery rather than as a message. The rename is atomic, so the
// deliverable is either the old build or the new one and never half of each. The temp file
// lives in dist/ because dist/ is gitignored: a crash can strand it without dirtying the tree.
const tmp = path.join(ROOT, 'dist', '.deliverable.tmp');
fs.writeFileSync(tmp, bytes);
fs.renameSync(tmp, DELIVERABLE);

console.log('sync-deliverable: dist/index.html -> deepdive_content_pipeline_rehearsal.html (%d bytes)',
            bytes.length);
