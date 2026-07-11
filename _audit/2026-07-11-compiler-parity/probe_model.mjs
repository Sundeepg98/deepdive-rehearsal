// Constructive proof: can the markdown format + parse_md.mjs express the 8's full model pane?
// Feed a 9-selector / rich-beat Model Answers section through the REAL parser.
import MarkdownIt from 'markdown-it';
import { prose } from '../../tools/compiler/prose.mjs';
const md = new MarkdownIt();

// verbatim re-authoring of content-pipeline/model.js answer #1 (7 beats, rich text) in md,
// plus 8 more selectors to hit the 8's count of 9.
const src = `## Model Answers

### Make it reliable | "How would you make this reliable?"

Production-grade = no data lost across S3+DB, and no work done twice on a retry.

- FRAME | frame | Reliability here is two guarantees: **no data lost** across the S3-and-DB boundary, and **no work done twice** on a retry. Let me take them in turn.
- HEADLINE | head | The central risk is the **dual-write** --- the DB and S3 can disagree --- so every write is idempotent and a **reconciler** is the real backstop.
- NO LOSS | sub | On the write path I track every S3 key I create; if the DB transaction fails, I delete those keys in the catch. The actual guarantee is a reconciler sweeping S3 for keys with **no DB row**.
- NO REPLAY | sub | Delivery is at-least-once, so I never lean on exactly-once. I make the effect **idempotent** --- a content-hash key with an upsert --- so a redelivered event is a no-op.
- NAME THE RISK | risk | The subtle bug is the reconciler racing an **in-flight upload**: object written, row not yet committed. I close it with an explicit **PENDING marker**.
- TRADE-OFF | trade | I add a DLQ the moment failures need inspecting --- but I wouldn't reach for distributed transactions. Idempotent writes plus a reconciler give the same guarantee far more cheaply.
- CLOSE | close | So: idempotent effects, compensating cleanup, a reconciler backstop, and explicit pending-state to kill the races --- production-grade without 2PC.

### Make it scale | "How does this scale?"

'Scale' for this pipeline is really 'which resource saturates first.'

- FRAME | frame | Let me pin the load first, then walk the chain. Code sample: \`readStream -> PassThrough\` forks one read two ways.
- CEILING | ceil | At true firehose scale I **batch through SQS or Kinesis** --- amortizing fixed costs.

### Walk a failure | "Walk me through a failure."

A concrete incident: thumbnails stop appearing, but uploads still succeed.

- FRAME | frame | Let me take a real one.

### Defend the design | "Why this design?"

Defend it on cost and how it absorbs change.

- FRAME | frame | Two axes that matter.

### Operate it | "How would you know it's healthy in production?"

Operational maturity = the pipeline tells you it's failing before a user does.

- FRAME | frame | Health isn't 'is the box up'.

### Cut scope | "What would you build first?"

Pragmatism = the thinnest thing that works.

- FRAME | frame | Scoping is a senior move.

### One you built | "Walk me through a complex system you've built."

Lead with the shape, spotlight one decision.

- FRAME | frame | Name it in one breath.

### Test it | "How would you test this pipeline?"

Testing an async, eventually-consistent system is its own design problem.

- FRAME | frame | Most candidates list unit tests and stop.

### Name the limits | "What are the limits of this design?"

Every design trades something.

- FRAME | frame | A flawless-sounding walkthrough reads as junior.
`;

// --- exact copy of parseModel from tools/compiler/parse_md.mjs:302-326 ---
function parseModel(toks) {
  const selectors = [], answers = [];
  let ans = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const raw = toks[i + 1].content; const k = raw.indexOf(' | ');
      selectors.push(prose(k === -1 ? raw : raw.slice(0, k)));
      ans = { opener: prose(k === -1 ? '' : raw.slice(k + 3)), sub: '', beats: [] }; answers.push(ans); i += 2; continue;
    }
    if (t.type === 'bullet_list_open' && ans) {
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const p = toks[j].content.split(' | ');
          ans.beats.push({ l: prose(p[0] || ''), c: (p[1] || '').trim(), t: prose(p.slice(2).join(' | ')) });
        }
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'paragraph_open' && ans && !ans.sub) { ans.sub = prose(toks[i + 1].content); i += 2; continue; }
  }
  return { selectors, answers };
}

const toks = md.parse(src, {});
// strip the h2 the way splitH2 does
const h2i = toks.findIndex(t => t.type === 'heading_open' && t.tag === 'h2');
const body = toks.slice(h2i + 3);
const out = parseModel(body);

console.log('selectors:', out.selectors.length, JSON.stringify(out.selectors));
console.log('answers  :', out.answers.length);
console.log('beats/ans:', out.answers.map(a => a.beats.length).join(','));
console.log('\n--- answer[0] as emitted ---');
console.log(JSON.stringify(out.answers[0], null, 2).slice(0, 1400));
