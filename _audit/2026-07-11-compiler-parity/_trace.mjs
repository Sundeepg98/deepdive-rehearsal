import MarkdownIt from 'markdown-it';
import fs from 'node:fs';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';
const md=new MarkdownIt();
const src=`### Where it sits

Client: generates the idempotency key, reuses it on every retry [*]
Network / queue: at-least-once -- duplicates and ambiguous failures happen here
Dedup store: records key -> status + response, atomic claim, TTL'd

### Pivots an interviewer rides

From "just retry" they push on delivery guarantees, concurrency, and atomicity.

#### Can you guarantee exactly-once?

-> exactly-once effect, not delivery: at-least-once + idempotent processing
Exactly-once delivery is impossible over an unreliable network; you accept duplicates.
`;
const toks=md.parse(src,{});
console.log('=== TOKEN STREAM for the AUTHORED (plain-line) form ===');
toks.forEach((t,i)=>{
  const c = t.type==='inline' ? JSON.stringify(t.content.slice(0,95)) : '';
  console.log(String(i).padStart(2), t.type.padEnd(16), (t.tag||'').padEnd(4), c);
});
console.log('\n>>> any bullet_list_open?', toks.some(t=>t.type==='bullet_list_open') ? 'YES' : '*** NO -- parseSys line 203 gate can NEVER fire ***');

// Now run the REAL parser on the REAL file
const real = parseMarkdown(fs.readFileSync('src/topics-md/idempotency.md','utf8'));
console.log('\n=== REAL parseMarkdown(idempotency.md).views.sys ===');
console.log(JSON.stringify(real.views.sys, null, 2).slice(0, 1400));
