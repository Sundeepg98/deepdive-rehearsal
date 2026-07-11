// Build the VisualKit IIFE bundle + registry manifest for the app.
// Runs before vite in the npm build/dev chains. Output is generated (git-
// ignored) and gate-safe by construction: charset ascii (ascii_guard),
// plain script (syntax_check), single window global (global_collisions).
import esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'src/scripts/visuals');
mkdirSync(OUT_DIR, { recursive: true });

await esbuild.build({
  entryPoints: [resolve(ROOT, 'visual-trainer/src/kit.js')],
  bundle: true,
  format: 'iife',
  globalName: 'VisualKit',
  charset: 'ascii',
  target: 'es2018',
  minify: true,
  legalComments: 'none',
  logLevel: 'warning',
  outfile: resolve(OUT_DIR, 'kit.js'),
});

const { KIT_MANIFEST } = await import(pathToFileURL(resolve(ROOT, 'visual-trainer/src/manifest.js')).href);
writeFileSync(resolve(OUT_DIR, 'manifest.json'), JSON.stringify(KIT_MANIFEST, null, 1) + '\n');
console.log('visual kit built -> src/scripts/visuals/kit.js + manifest.json');
