// Runs the REAL compiler validation (compile.mjs -> validateVisual) against crafted
// ## Visual configs. Zero tracked files touched: we mirror the directory shape
// validateVisual expects (srcDir/../scripts/visuals/manifest.json) inside _audit,
// copying the REAL manifest. CONTROLS included to prove the validator is truly wired.
import fs from 'node:fs';
import path from 'node:path';
import { compileTopic } from '../../../tools/compiler/compile.mjs';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const SB = path.join(ROOT, '_audit/2026-07-11-state-audit/_vprobe');
const MD = path.join(SB, 'topics-md');
const MAN = path.join(SB, 'scripts/visuals');
fs.rmSync(SB, { recursive: true, force: true });
fs.mkdirSync(MD, { recursive: true }); fs.mkdirSync(MAN, { recursive: true });
// the REAL, unmodified manifest
fs.copyFileSync(path.join(ROOT, 'src/scripts/visuals/manifest.json'), path.join(MAN, 'manifest.json'));

const topicMd = (visualJson) => `---
id: probe-topic
prefix: PT
title: Probe Topic
---

## Visual

\`\`\`json
${JSON.stringify(visualJson, null, 2)}
\`\`\`
`;

const CASES = [
  ['CONTROL-A: unknown mode (MUST be rejected)', { mode: 'no-such-mode', params: { lanes: 6 } }],
  ['CONTROL-B: unknown param KEY (MUST be rejected)', { mode: 'queue-flow', params: { bogusKey: 1 } }],
  ['CONTROL-C: unknown story set key (MUST be rejected)', { mode: 'queue-flow', params: { lanes: 6 }, stories: [{ name: 'x', steps: [{ t: 0, set: { nope: 1 } }] }] }],
  ['CASE-1: lanes is a STRING, manifest declares "int"', { mode: 'queue-flow', params: { lanes: 'six', rate: 120, sinks: 3, capacity: 30 } }],
  ['CASE-2: sinks=12 (scene hardcodes 9 consumer meshes)', { mode: 'queue-flow', params: { lanes: 12, rate: 200, sinks: 12, capacity: 30 } }],
  ['CASE-3: lanes NEGATIVE', { mode: 'queue-flow', params: { lanes: -5, rate: 120, sinks: 3, capacity: 30 } }],
  ['CASE-4: rate is a string', { mode: 'queue-flow', params: { lanes: 6, rate: 'fast' } }],
];

for (const [label, cfg] of CASES) {
  const f = path.join(MD, 'probe-topic.md');
  fs.writeFileSync(f, topicMd(cfg));
  let verdict;
  try {
    await compileTopic(f, { index: 1, total: 1, outDir: path.join(SB, 'out'), validate: false });
    verdict = 'ACCEPTED (compiled clean)';
  } catch (e) {
    verdict = 'REJECTED -> ' + e.message.slice(0, 95);
  }
  console.log((label + ' ').padEnd(52, '.') + ' ' + verdict);
}
fs.rmSync(SB, { recursive: true, force: true });
process.exit(0);
