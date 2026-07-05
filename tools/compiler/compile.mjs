// tools/compiler/compile.mjs -- the driver that turns a .topic source into module files,
// plus a Vite plugin so this happens automatically at build time.
//
// compileTopic(path, {index,total,outDir}) parses the source, emits the modules, and writes
// them to disk. index/total are provided by the caller (the build owns the topic sequence --
// see the plugin), matching the proof's signature.
//
// compileTopicsPlugin({srcDir, order}) is a Vite plugin: on buildStart it compiles every
// <id>.topic in srcDir into src/topics/<id>/*.js, computing index from the topic's position
// in `order` and total from order.length. Those generated modules are then picked up by the
// existing concat-include build exactly like hand-authored ones -- so a topic is authored as
// ONE .topic file instead of twelve hand JS files.

import fs from 'node:fs';
import path from 'node:path';
import { parseTopic } from './parse.mjs';
import { emit } from './emit.mjs';

export function compileTopic(topicPath, { index = 1, total = 1, outDir } = {}) {
  const topic = parseTopic(fs.readFileSync(topicPath, 'utf8'), { index, total });
  const files = emit(topic);
  const dir = outDir || path.join(path.dirname(topicPath), topic.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
  return { id: topic.id, dir, files: Object.keys(files) };
}

export function compileTopicsPlugin({ srcDir, order = [], topicsDir }) {
  return {
    name: 'ddr-compile-topics',
    buildStart() {
      if (!fs.existsSync(srcDir)) return;
      for (const f of fs.readdirSync(srcDir).filter((x) => x.endsWith('.topic'))) {
        const id = path.basename(f, '.topic');
        const i = order.indexOf(id);
        compileTopic(path.join(srcDir, f), {
          index: i === -1 ? 1 : i + 1,
          total: order.length || 1,
          outDir: path.join(topicsDir, id),
        });
      }
    },
  };
}
