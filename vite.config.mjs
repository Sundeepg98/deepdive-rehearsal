// vite.config.mjs -- Vite build for the deepdive-rehearsal single-file deliverable.
//
// Phase 0 of the migration: reproduce build.py's output through Vite so we retire the
// hand-rolled Python build and gain watch mode + the plugin ecosystem, WITHOUT changing
// what the app renders. The concat-include plugin below is a faithful port of build.py's
// recursive `<!--@build:include RELPATH-->` resolution (same cycle guard, same
// path-traversal guard). Tailwind + the content libs layer on in later phases.

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = import.meta.dirname;
const SRC = path.join(ROOT, 'src');
const INCLUDE = /<!--@build:include\s+(.+?)\s*-->/g;

// Recursively replace include markers with partial contents (port of build.py:resolve).
function resolveIncludes(buf, stack = []) {
  if (stack.length > 20) throw new Error('include depth exceeded (cycle?): ' + stack.join(' -> '));
  return buf.replace(INCLUDE, (_m, relRaw) => {
    const rel = relRaw.trim();
    const p = path.normalize(path.join(SRC, rel));
    if (!(p === SRC || p.startsWith(SRC + path.sep))) throw new Error('include escapes src/: ' + rel);
    if (stack.includes(rel)) throw new Error('include cycle: ' + [...stack, rel].join(' -> '));
    return resolveIncludes(fs.readFileSync(p, 'utf8'), [...stack, rel]);
  });
}

// Vite plugin: resolve the include tree on index.html before Vite processes it, and make
// the dev server rebuild when any src/ file changes (this is the free "watch mode").
function concatInclude() {
  return {
    name: 'ddr-concat-include',
    transformIndexHtml: { order: 'pre', handler: (html) => resolveIncludes(html) },
    configureServer(server) {
      server.watcher.add(path.join(SRC, '**/*'));
      server.watcher.on('change', () => server.ws.send({ type: 'full-reload' }));
    },
  };
}

export default defineConfig({
  root: 'src',
  plugins: [concatInclude(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: path.join(ROOT, 'dist'),
    emptyOutDir: true,
    minify: false,              // tested & reverted: payload is content (text/code), not compressible logic; minify saves ~1.7KB and gzip already compresses whitespace (534KB either way). Not worth the tooling risk.
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
