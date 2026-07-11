// Regression check: does the PARITY parser still satisfy every assertion the CURRENT
// gate makes (prove_md's 23 + zod validateTopic on all 38)?  Run from repo root.
import fs from 'node:fs';
import { parseMarkdown } from './parse_md.PARITY.mjs';
import { validateTopic } from '../../tools/compiler/topic-schema.mjs';

const g = {};
eval(fs.readFileSync('src/topics/notifications/identity.js', 'utf8').replace('var TOPIC_NOTIF_IDENTITY', 'g.ID'));
eval(fs.readFileSync('src/topics/notifications/walk.js', 'utf8').replace('var TOPIC_NOTIF_WALK', 'g.WALK'));
const out = parseMarkdown(fs.readFileSync('tools/compiler/samples/notifications.md', 'utf8'), { index: 5, total: 8 });

let pass = 0, fail = 0;
const eq = (n, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n); };
for (const f of ['index', 'total', 'locatorTail', 'group', 'title', 'h1', 'cramTitle', 'reportTitle', 'companionTopic', 'sub', 'thesis']) eq('identity.' + f, out.identity[f], g.ID[f]);
eq('identity.spine', out.identity.spine, g.ID.spine);
eq('identity.cmpNotes.walk', out.identity.cmpNotes.walk, g.ID.cmpNotes.walk);
eq('identity.cmpNotes.drill', out.identity.cmpNotes.drill, g.ID.cmpNotes.drill);
for (let s = 0; s < 2; s++) for (const f of ['t', 'flow', 'ins', 'deep', 'cap', 'code']) if (g.WALK.steps[s][f] !== undefined) eq(`walk.step${s + 1}.${f}`, out.views.walk.steps[s][f], g.WALK.steps[s][f]);
console.log('prove_md assertions under PARITY parser: ' + pass + ' pass, ' + fail + ' fail  (current parser: 23 pass, 0 fail)');

let ok = 0; const bad = [];
for (const f of fs.readdirSync('src/topics-md').filter((x) => x.endsWith('.md'))) {
  try { validateTopic(parseMarkdown(fs.readFileSync('src/topics-md/' + f, 'utf8')), f); ok++; }
  catch (e) { bad.push(f + ': ' + e.message.split('\n')[0]); }
}
console.log('zod validateTopic under PARITY parser: ' + ok + '/38 pass' + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
process.exit(fail === 0 && ok === 38 ? 0 : 1);
