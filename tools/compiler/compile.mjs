// tools/compiler/compile.mjs -- the driver that turns a topic SOURCE into module files, plus
// a Vite plugin so it happens at build time.
//
// Source is standard markdown (.md, the primary path) or the legacy .topic; both parse to the
// same data. Any ```mermaid step is rendered to inline SVG here (build-time) so nothing ships
// to the runtime. index/total come from the caller (the build owns the topic sequence).
//
// compileTopicsPlugin({srcDir, order, topicsDir}) compiles every <id>.md|.topic in srcDir into
// src/topics/<id>/*.js on buildStart, which the existing concat-include build then picks up --
// so a topic is authored as ONE markdown file instead of twelve hand JS files.

import fs from 'node:fs';
import path from 'node:path';
import { parseTopic } from './parse.mjs';
import { parseMarkdown } from './parse_md.mjs';
import { validateTopic } from './topic-schema.mjs';
import { emit } from './emit.mjs';
import { renderMermaid, closeMermaid } from './mermaid.mjs';

async function renderDiagrams(topic) {
  for (const v of Object.values(topic.views)) {
    // pane-level mermaid (e.g. the whiteboard diagram) -> inline SVG at build time
    if (v.mermaid !== undefined) { v.diagram = await renderMermaid(v.mermaid); delete v.mermaid; }
    // step-level mermaid (walk steps); guard paneless views -- rf/trade/... have no steps
    for (const step of v.steps || []) {
      if (step.mermaid !== undefined) { step.diagram = await renderMermaid(step.mermaid); delete step.mermaid; }
    }
  }
}

export async function compileTopic(topicPath, { index = 1, total = 1, outDir, validate = true } = {}) {
  const src = fs.readFileSync(topicPath, 'utf8');
  const topic = topicPath.endsWith('.md')
    ? parseMarkdown(src, { index, total })
    : parseTopic(src, { index, total });
  if (validate) validateTopic(topic, topic.id);
  await renderDiagrams(topic);
  const files = emit(topic);
  const dir = outDir || path.join(path.dirname(topicPath), topic.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
  return { id: topic.id, dir, files: Object.keys(files) };
}

export function compileTopicsPlugin({ srcDir, order = [], topicsDir }) {
  return {
    name: 'ddr-compile-topics',
    async buildStart() {
      if (!fs.existsSync(srcDir)) return;
      for (const f of fs.readdirSync(srcDir).filter((x) => x.endsWith('.md') || x.endsWith('.topic'))) {
        const id = path.basename(f).replace(/\.(md|topic)$/, '');
        const i = order.indexOf(id);
        await compileTopic(path.join(srcDir, f), {
          index: i === -1 ? 1 : i + 1, total: order.length || 1, outDir: path.join(topicsDir, id),
        });
      }
    },
    async buildEnd() { await closeMermaid(); },
  };
}
