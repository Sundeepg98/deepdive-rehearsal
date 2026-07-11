---
id: content-pipeline
prefix: CP
group: architecture-apis
title: Content Pipeline
h1: Content Pipeline
locatorTail: ingestion layer
index: 1
cramTitle: Content Pipeline
reportTitle: Content Pipeline
companionTopic: Content Pipeline
---

## Thesis

A file-processing service, taken apart the way an interviewer actually scores it &mdash; beat by beat, with the follow-ups they ask.

## Sub

<b>Mechanics</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where this sits in the whole system, and the pivots an interviewer rides into the next topic.

## Spine

- A frozen strategy map keeps dispatch <b>O(1)</b> &mdash; never a switch statement.
- One <b>PassThrough</b> fork hashes <i>and</i> uploads on a single read of the file.
- At-least-once delivery <b>+</b> idempotent work <b>=</b> exactly-once effect.
- Name the ceiling before you hit it &mdash; Lambda gives way to <b>SQS</b> past ~1,000/s.

## Companion Notes

### walk

Walkthrough

The dispatch flow, one step at a time — the mechanics you narrate before anyone cuts in.

Say the fork out loud — “one read, two sinks.” That single-read line is what they remember.

### drill

Probe Drill

Twenty graded follow-ups — the ones that separate a passing SDE2 from a Staff signal.

Commit to an answer before you reveal — saying it beats reading it. That’s the rep.

### wb

Whiteboard

Rebuild the whole pipeline from memory — nine cues, nothing in front of you.

Draw the boxes from memory first, then check — recall is the test, not recognition.

### sys

System Map

Zoom out to the six stages — and the exact points an interviewer pivots.

Lead with the flow, not the boxes — “upload lands, dispatch routes, sinks fan out.”

### trade

Trade-offs

The decisions they drill — each with the switch condition that picks a side.

Always say “pick when” — name the condition that flips the choice, not just the options.

### model

Model Answers

Full spoken scripts — the beats, in order, the way you’d actually say them.

Steal the frame, not the words — headline first, then the one risk you’d name.

### num

Numbers

Back-of-envelope the load — and know which number trips which ceiling.

Lead with the peak, not the average — ~1,157/s is the number that sets the ceiling.

### rf

Red Flags

What sinks the round — the anti-patterns, and what to say instead.

Name what the interviewer hears, not just the mistake — that’s the senior tell.

### open

30-Second

The opener and the close — matched to the altitude the question is asked at.

Match the altitude — open at the contract, not the code, and land on the one risk.

## Walk

### Strategy dispatch

```flow
n[processUpload(key,bucket)] -> n[extname(key)] -> p[strategiesext] -> t[handler] / a[skip]
```

A frozen object literal, not a switch. Lookup is <b>O(1)</b>; every handler shares one <code>(key,bucket) &rarr; Result</code> contract, so the dispatcher's cyclomatic complexity stays <b>1</b> forever.

The <code>Result</code> shape is normalized &mdash; image, video, font all return <code>{thumbnailKey, metadata, status}</code> &mdash; so the caller's PATCH-status logic is format-agnostic. Adding <code>.webp</code> is one map entry and zero caller changes.

### Single-read fork

```flow
n[createReadStream] -> p[PassThrough] -> t[hash.update] -> r[s3.upload] -> n[Promise.all]
```

One disk read, forked two ways. Buffer is <code>highWaterMark</code> (16&nbsp;KB) &mdash; never the file. When S3 lags, <code>write()</code> returns <b>false</b> and the source <b>pauses</b>, so RAM is flat at 500&nbsp;MB or 5&nbsp;GB.

```js
const pass = new PassThrough();
const hash = createHash('sha256');
pass.on('data', c => hash.update(c));      // consumer 1 (CPU)
const up = s3.upload({ Bucket, Key, ==Body: pass== }); // consumer 2 (net)
createReadStream(path).==pipe(pass)==;           // ONE disk read
await up.promise();                        // pipe() handles backpressure
const digest = hash.digest('hex');
```

<code>pipe()</code> wires the pause/resume; the <code>data</code>-event hash rides the same buffer. Two consumers, one read.

### Cursor export

```flow
p[QueryStream(batch 100)] -> n[csv-stringify] -> t[res]
```

<code>DECLARE CURSOR</code>, 100 rows at a time, piped to the socket. A full TCP window backpressures the transform, which backpressures the cursor &mdash; Postgres fetches only as fast as the client drains. <b>Constant memory</b> at 1K or 10M rows.

Without the cursor, the pg driver buffers the <b>entire</b> result set in JS before your code runs &mdash; that's the OOM. The cursor turns one giant allocation into a stream of 100-row pages the GC reclaims between batches.

### Import conflict ladder

```flow
n[row] -> t[id+co? REUSE] -> a[name+ver? REMAP] -> r[id taken? REGEN] -> t[else INSERT]
```

Strict precedence. Checking <code>name+version</code> <b>before</b> id-collision means a re-import <b>de-dupes</b> (REMAP) instead of forking a new uuid (REGEN). Every REMAP/REGEN records <code>oldId&rarr;newId</code>, then rewrites child FKs before insert.

```js
const idMap = new Map();
for (const row of incoming) {
  if (await match(row.id, row.company)) reuse(row.id);
  else if (await match(row.name, row.version))
       idMap.set(row.id, existing.id);   // REMAP (de-dupe)
  else if (await idExists(row.id))
       idMap.set(row.id, uuid());        // REGEN (fork)
  else insert(row.id);                  // INSERT
}
for (const ch of children)               // FK cascade
  ch.parent_id = idMap.get(ch.parent_id) ?? ch.parent_id;
```

<code>name+version</code> is checked before id-collision &mdash; that ordering is what makes a re-import REMAP instead of fork.

### Hash + multipart

```flow
t[sha256 streaming] . n[&lt;5MB Put] / r[&ge;5MB multipart]
```

The digest is content-deterministic, so the <b>key is the hash</b> &mdash; identical bytes converge on one object (dedup). A failed multipart leaves orphan parts; an S3 lifecycle rule aborts incomplete uploads.

Multipart also gives retry-per-part and parallel upload: a 500&nbsp;MB blob goes as 100&times;5&nbsp;MB parts, and a transient failure retries one part &mdash; not the whole object.

### S3 event routing

```flow
n[ObjectCreated] -> p[prefix -> Lambda] -> n[per-record] -> t[PROCESSED] / r[ERROR]
```

Uploads push work; nothing polls. Delivery is <b>at-least-once</b> &rarr; processing must be idempotent (hash key). And prefixes can't overlap &mdash; you can't later split <code>uploads/</code> into <code>uploads/images/</code>.

The handler decodes the key first &mdash; S3 URL-encodes spaces as <code>+</code>. Skip that and <code>"my file.bin"</code> becomes <code>"my+file.bin"</code>, the DB lookup misses, and you get a silent no-match bug.

### Reconciler sweep

```flow
n[scheduled sweep] -> p[list S3 keys] -> a[no DB row?] -> t[past grace?] -> r[delete orphan]
```

The dual-write's real backstop. A scheduled job lists S3, finds keys with <b>no DB row</b>, and deletes the orphans &mdash; but only those past a grace window (or without a PENDING marker), so it <b>never touches an in-flight upload</b>.

```js
const GRACE = 3600e3;                  // 1h > write
for await (const o of listKeys(bucket)) {
  if (fresh(o, GRACE)) continue; // in-flight
  const row = await db.findByKey(o.Key);
  if (!row) await s3.==deleteObject==(o.Key); // orphan
}
```

The grace window (or a PENDING marker) is the one line that stops the reconciler deleting in-flight uploads.

### Idempotent processing

```flow
n[event (&ge;1&times;)] -> p[conditional put marker] -> a[exists? skip] / t[else process]
```

S3 delivery is <b>at-least-once</b>, so the same event can arrive twice. A conditional put on a content-hash marker is a check-and-set: the first delivery wins and processes; a redelivery sees the marker and <b>no-ops</b>. The effect is idempotent even though delivery isn't.

```js
const marker = "processed#" + hash; // dedup key
try {
  await ddb.==put==({ Item: { pk: marker },
    ConditionExpression: "attribute_not_exists(pk)" });
} catch (e) {
  if (e.name === "ConditionalCheckFailed...") return; // done
  throw e;
}
await process(object); // once per event
```

The conditional put <i>is</i> the lock &mdash; first writer wins the key; redeliveries fail the condition and skip.

### Observability hooks

```flow
n[each stage] -> p[emit 4 signals] -> t[page on SLA breach] / a[log the rest]
```

You can't operate what you can't see. Every stage emits the <b>four signals</b> that localize an incident &mdash; queue depth, p99 latency, error/DLQ rate, reconciler orphan count &mdash; and you <b>page only on what users feel</b> (SLA breach, DLQ growth), logging the self-healing rest.

```js
metrics.==gauge==("queue.depth", await queue.size());
metrics.==histogram==("process.latency_ms", elapsed); // p99
metrics.==count==("process.error", err ? 1 : 0);
metrics.==gauge==("reconciler.orphans", orphanCount);
// page on: dlq.depth > 0 sustained, or event.age > SLA
```

Alarm on symptoms users feel; transient spikes that self-heal via retry are log-only, or you drown in false pages.

### Model Script

- Frame it before diving | "Before I trace it &mdash; I'll assume single region, files up to ~500&nbsp;MB, and that downstream consumers need the result within a few seconds. Stop me if any of that's off."
- Headline in one breath | "At a high level: the object lands in S3, that fires a trigger, I hash and validate it <b>while it streams</b>, write the metadata transactionally, then fan it out to the processors &mdash; built so memory stays flat no matter the file size."
- Walk the path | "Concretely &mdash; the upload completes to S3 and emits an event. My handler opens a read stream and forks it through a <b>PassThrough</b>: one branch computes the SHA&#8209;256, the other feeds the processor, so I never buffer the whole file or read it twice. Once I have the hash and size, I write the row &mdash; key, hash, status &mdash; to the metadata DB."
- Name the risk yourself | "The thing I'd flag without being asked is the <b>dual&#8209;write</b>: the object is already in S3, but if the DB write fails I've got an orphan. The compensating delete covers the common case, but the real backstop is a <b>reconciler</b> that sweeps S3 for keys with no committed row. I wouldn't claim the delete alone is safe."
- Name the trade-off line | "For dispatch I'd run a Lambda per object at this volume &mdash; the simplest thing that works. The moment I need retries, ordering, or a DLQ, I'd put <b>SQS</b> in front and make the processors consumers. That's the line I'd move on, and I'd say so before they ask."
- Be honest about the ceiling | "This holds to low thousands of objects a minute. Past that the metadata DB is the bottleneck &mdash; I'd shard by tenant or key&#8209;prefix and move fully onto SQS&#8209;fronted consumers. I'd call that out as the next redesign rather than pretend it scales forever."
- Interviewer: Interviewer: "What if two uploads race on the same key?"
- Absorb the follow-up | "S3 is last&#8209;writer&#8209;wins on the object, so the bytes are fine &mdash; but my metadata could interleave. I'd make the DB write <b>idempotent on the key</b> with a conditional put, so the second writer updates cleanly or no&#8209;ops. And if ordering genuinely matters to the business, that's one more reason to move to a queue with a per&#8209;key partition."

## Drill

- all | <b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.
- SDE2 | <b>Fundamentals under pressure</b> &mdash; memory model, I/O, idempotent writes. The bar is &ldquo;this won&rsquo;t fall over&rdquo;: show the mechanics cleanly.
- SDE3 | <b>Depth &amp; trade-offs</b> &mdash; consistency, schema evolution, the hidden bill. The bar is &ldquo;it depends, here&rsquo;s the switch&rdquo;: never a one-size answer.
- Staff | <b>Systems judgment</b> &mdash; irreversibility, blast radius, the exactly-once illusion. The bar is &ldquo;I see the failure mode before it ships&rdquo;: name what breaks and name the backstop.

### SDE2 | Memory model under streaming

Export a 1,000,000-row CSV without OOM. How?

Server-side cursor (<code>pg-query-stream</code>, batch 100) piped to the response. Backpressure throttles the cursor to the client's drain rate, so memory is <b>constant</b> regardless of row count.

Follow: What sets the batch size &mdash; why 100, not 1 or 100,000?
It's fetch granularity, not the memory ceiling. <b>batch=1</b> is a round-trip per row (crawls); <b>batch=100,000</b> holds a huge fetch buffer in RAM and stalls in bursts. 100 amortizes round-trips while staying tiny.

Follow: The client is on slow 3G and stops reading mid-download. What is your server doing right now?
TCP window fills &rarr; <code>res.write()</code> returns false &rarr; transform stops &rarr; cursor stops &rarr; Postgres holds the cursor <b>open and idle</b>, pinning a connection. A slow-reader can exhaust the pool (slowloris). Fix: statement timeout, or stream to S3 + presigned URL.

Senior: Saying memory is constant <b>because of backpressure</b> &mdash; not just "I'd stream it" &mdash; is the senior tell. Bonus for naming the held-cursor connection risk before being asked.

Speak: Open with the headline: <b>'I'd stream it with a server-side cursor so memory stays constant'</b> &mdash; then the backpressure, then flag the slow-reader connection risk.

### SDE3 | Cross-store consistency

Import writes to Postgres AND S3. The DB write fails. What happens?

<b>Dual-write hole:</b> the DB transaction rolls back, but the S3 objects don't &mdash; they're orphaned. Fix: track every created key, delete them in the <code>catch</code>.

Follow: Your compensating delete <i>also</i> fails &mdash; S3 is throttling. Now what?
Don't block the user request on best-effort cleanup. Record orphan keys to a durable cleanup queue and retry async with backoff. The real backstop is a <b>reconciler</b> sweeping S3 keys with no DB row.

Follow: Make the whole import idempotent so a retry is always safe.
Content-hash keys (same bytes = same key &rarr; re-upload is a no-op), a DB <b>upsert</b> on a deterministic key, and the ladder's <code>name+version</code> REMAP to block duplicate logical rows. A retried import <b>converges</b>.

Follow: Is there a way to make the two writes atomic instead of reconciling after the fact?
Yes &mdash; the <b>transactional outbox</b>, and reaching for it is the senior move because it kills the race instead of healing it. The DB write and an <b>outbox-event</b> row commit in <b>one transaction</b> &mdash; either both land or neither does, so there&rsquo;s never a window where Postgres and S3 disagree. A separate <b>relay</b> reads the outbox and does the S3 work with <b>retries</b>, marking each event done. You&rsquo;ve collapsed a two-store dual-write into a <b>single atomic commit point</b> plus an idempotent relay. The catch: it needs a transactional store to anchor on &mdash; when the two stores genuinely can&rsquo;t share a transaction, the reconciler is the honest backstop. So I&rsquo;d frame it as <b>outbox to prevent, reconciler to heal</b>, and name which one the constraints allow.

Senior: Volunteering the <b>reconciler as the real backstop</b> &mdash; not just the catch-block delete &mdash; shows you've operated this in production, not only designed it on a whiteboard.

Speak: Lead with the failure: <b>'The risk here is a dual-write &mdash; the DB rolls back but S3 doesn't'</b> &mdash; then the compensating delete, then the reconciler as the real backstop.

### SDE2 | I/O &amp; concurrency reasoning

Why hash the file <i>while</i> uploading instead of after it's stored?

A <code>PassThrough</code> forks <b>one</b> read into hash + upload. Hashing after = 2&times; disk reads; buffering-then-both = the whole file in RAM. The fork is the only option that survives a 500&nbsp;MB package.

Follow: Some S3 APIs want Content-MD5 / length up front &mdash; but you don't know the hash until the stream ends. Tension?
That's why <b>multipart</b> exists &mdash; no total length or whole-object hash needed up front; parts stream and S3 assembles. If an API truly needs the digest first, you must buffer or two-pass &mdash; the precise trade you're avoiding.

Follow: Two uploads of identical bytes race and compute the same key. What happens?
On S3, last-write-wins on the same key &mdash; harmless, since content is identical. The contention point is the <b>DB dedup row</b>: <code>ON CONFLICT</code> on the hash so both converge to one row.

Senior: Surfacing the <b>Content-MD5 tension yourself</b>, before being asked, signals you know exactly where the streaming abstraction leaks.

Speak: State the constraint first: <b>'I hash during the upload because reading twice or buffering won't survive 500MB'</b> &mdash; then describe the PassThrough fork.

### Staff | Architecture trade-offs &amp; scaling ceilings

Why a Lambda per object instead of SQS + a worker pool?

Zero ops and low latency at this volume. <b>Switch condition:</b> move to SQS the moment you need retries, a DLQ, or ordering. Naming the switch condition is what scores.

Follow: S3 delivers the event twice (at-least-once). Walk me through preventing a double-processed file.
Idempotent processing: a content-hash key + upsert, or a <b>processed-marker</b> (a DynamoDB conditional put on the key) the handler checks first. Never rely on exactly-once delivery.

Follow: 10,000 objects land in one second. What breaks first, and what's your ceiling?
<b>Lambda concurrency</b> throttles first &rarr; events retry / DLQ. Then the <b>DB pool</b> and <b>S3 PUT rate per prefix</b> saturate. Ceilings: concurrency (RDS Proxy / queue), connections, per-prefix rate (spread keys). At firehose scale, buffer through SQS/Kinesis.

Senior: Giving the <b>switch condition</b> &mdash; the exact threshold where you'd move to SQS &mdash; instead of defending one choice is the senior move. Naming concrete ceilings seals it.

Speak: Don't defend a choice &mdash; give the rule: <b>'Lambda-per-object for this volume; I'd move to SQS the moment I need retries, a DLQ, or ordering.'</b>

### SDE2 | Data modeling &amp; idempotent import

Why ship the export as a SQLite bundle instead of JSON?

SQLite keeps <b>real foreign keys</b> and stores BLOBs at <b>1:1</b> size. JSON base64-bloats binary ~33% and loses referential integrity &mdash; you'd rebuild the graph by hand on import.

Follow: On import, ids collide with existing rows. Your algorithm?
The 4-tier ladder: <code>id+company</code> REUSE, <code>name+version</code> REMAP, <code>id-taken</code> REGEN, else INSERT &mdash; record <code>oldId&rarr;newId</code> and rewrite child FKs before insert.

Follow: Why check name+version BEFORE the id-collision rule?
So a re-import <b>de-dupes</b> (REMAP to existing) instead of forking a new uuid (REGEN). Swap the order and every re-import silently <b>doubles</b> your data.

Senior: Explaining <b>why</b> name+version is checked first &mdash; the de-dupe-vs-fork consequence &mdash; is what separates "I wrote an importer" from "I designed one."

Speak: Anchor on the why: <b>'SQLite over JSON because I need real foreign keys and 1:1 BLOBs'</b> &mdash; bring out the conflict ladder only if pushed.

### Staff | Irreversible-decision foresight

You set the S3 trigger prefix to <code>uploads/</code>. What's the future risk?

S3 notifications <b>forbid overlapping prefixes</b>, so you can't later split <code>uploads/</code> into <code>uploads/images/</code> without reconfiguring everything. One-way door &mdash; design the taxonomy before the first trigger ships.

Follow: You're forced to add per-type routing later anyway. How, without re-architecting?
Move routing out of <b>S3 config</b> (rigid) into <b>code</b>: one trigger on <code>uploads/</code>, dispatch inside the Lambda by key sub-prefix or metadata &mdash; or fan out (Lambda &rarr; an SQS queue per type). Flexibility lives in code, not the bucket.

Senior: Calling it a <b>one-way door</b> and pre-deciding the taxonomy shows you reason about <b>irreversibility</b> &mdash; a staff-level instinct most candidates skip.

Speak: Name the shape out loud: <b>'This is a one-way door &mdash; overlapping prefixes are forbidden, so I'd settle the taxonomy up front.'</b>

### EXTEND | Design adaptability

Product wants live video <i>transcoding</i> added (not just thumbnails). How does your pipeline change?

Transcoding is long-running and CPU/GPU-heavy &mdash; it doesn't belong on Lambda (15-min cap, no GPU). Keep the <b>strategy-dispatch pattern</b>: add a video handler, but instead of processing inline it <b>enqueues a job</b> to ECS / MediaConvert. The S3 event still triggers; the handler fans out and the status flow gains a PROCESSING &rarr; TRANSCODED state.

Follow: Now a live-preview feature needs that content processed in under 2 seconds. What changes?
The async S3-event path is eventual &mdash; too slow. Add a <b>synchronous fast-path</b>: small previews process inline in the request and skip the queue; heavy/bulk stays async. Two-tier by interactivity. Cache by content hash so repeat previews are instant.

Follow: How do you keep ONE codebase serving both the fast sync path and the heavy async path?
The dispatch map stays the single entry point; the handler branches on a <b>size/mode flag</b> &mdash; inline for small+interactive, enqueue for large+bulk. Same contract, same handlers; only the execution venue differs. The strategy pattern earning its keep.

Senior: Extending the design <b>along its grain</b> &mdash; preserving the dispatch pattern while moving heavy work to the right compute, rather than bolting on a parallel system &mdash; plus naming the sync/async two-tier split, is the senior instinct.

Speak: Frame it as extending along the grain: <b>'I keep the dispatch pattern and move transcoding to ECS / MediaConvert'</b> &mdash; then the sync/async two-tier.

### SDE3 | Security boundary &amp; least-privilege

A client's upload credential leaks. What can an attacker do, and how do you shrink the blast radius?

A broad credential reads the whole bucket and overwrites anything. Shrink it with a <b>presigned URL</b> scoped to one key + a short TTL (minutes) &mdash; a leaked URL is then one upload, not the bucket. The processing role is separate and read-only on the upload prefix.

Follow: A presigned URL still lets anyone holding it upload until it expires. Tighten it further.
Bake conditions into the policy: <code>Content-Length-Range</code> caps size, <code>Content-Type</code> pins the format, a per-user key prefix isolates tenants. The URL becomes a <b>single-purpose token</b> &mdash; one file, one size, one type, one place.

Follow: A malicious upload (zip bomb, polyglot) reaches a processor. Stop it taking down the fleet.
Validate before processing, not at upload: cap decompressed size, check magic bytes against the claimed type, and run processing in an <b>isolated, resource-capped sandbox</b> (separate function/container with memory + time limits) so one bad object can't take the fleet down.

Senior: Turning a credential into a <b>single-purpose token</b> with size/type/prefix conditions &mdash; and sandboxing untrusted input &mdash; is the containment instinct senior interviewers probe for.

Speak: Frame the blast radius first: <b>'a leaked broad credential reads the whole bucket'</b> &mdash; then scope it down: presigned URL, one key, short TTL, size/type conditions. Sandbox untrusted input.

### SDE3 | Observability &amp; operability

It's 3 AM, the pipeline is 'slow,' and you have no logs in front of you. What four signals do you wish you'd instrumented?

<b>Queue depth / event age</b> (is work piling up?), <b>processing latency p99</b> (are jobs individually slow?), <b>error + DLQ rate</b> (are things failing?), and <b>reconciler orphan count</b> (is the dual-write leaking?). Those four localize almost any incident to a stage.

Follow: Queue depth is climbing but error rate is flat. What does that tell you?
Not failures &mdash; <b>throughput</b>. Consumers can't keep up with arrival rate: either a downstream dependency slowed (raising per-job latency) or concurrency is throttled. You scale consumers or fix the slow dependency &mdash; chasing errors finds nothing.

Follow: What's the one thing you page a human for, versus just log?
Page on <b>sustained DLQ growth</b> or <b>event age past SLA</b> &mdash; those mean work is silently not getting done. Transient spikes that self-heal via retry are log-only; paging on them is alert fatigue. Alert on <i>symptoms users feel</i>, not every internal hiccup.

Senior: Choosing the <b>four signals that localize an incident</b> and splitting page-worthy (SLA breach, DLQ growth) from log-only (self-healing retries) shows you've carried a pager, not just shipped features.

Speak: Answer in four signals, not prose: <b>'queue depth, p99 latency, DLQ rate, reconciler orphan count'</b> &mdash; then split page-worthy (SLA breach) from log-only (self-healing retries).

### Staff | The exactly-once illusion

A processor pulls a message, does the work, then crashes <i>before</i> deleting it. It redelivers. How do you avoid doing the work twice?

You can't buy exactly-once <b>delivery</b> &mdash; you engineer idempotent <b>effects</b>. Make the write a no-op on replay: a <b>processed-marker</b> (conditional put on the content/message key) the handler checks-and-sets first, so the second delivery sees 'already done' and acks without re-running.

Follow: The side effect can't be made idempotent &mdash; it charges a card / sends an email. Now what?
Put it behind an <b>idempotency key</b> the downstream honors (Stripe-style): same key, same charge, executed once. If the downstream can't dedupe, use a <b>transactional outbox</b> &mdash; record intent atomically with the state change, then a relay delivers with dedup downstream.

Follow: Where do you store the marker so the check and the work don't themselves race?
They must commit <b>atomically</b> or the check is a TOCTOU bug. Either the marker lives in the same DB transaction as the write (one commit), or the conditional put <i>is</i> the lock &mdash; first writer wins the key, losers back off. The marker can never be a separate best-effort call.

Follow: The marker table grows forever &mdash; one row per message ever processed. You want to expire old markers, but won&rsquo;t that let a late redelivery slip through and double-process?
Yes &mdash; and that&rsquo;s the real tradeoff, not a detail. I TTL the markers to a window <b>longer than the maximum redelivery horizon</b> &mdash; the queue&rsquo;s retention plus its visibility-timeout ceiling &mdash; so anything that could still redeliver still finds its marker. Past that horizon a redelivery is effectively impossible, so expiring is safe. For effects that are <b>catastrophic to repeat</b> &mdash; a charge &mdash; I don&rsquo;t TTL at all: keep the key permanently, and if storage is the worry, age cold keys into a cheaper tier or a bloom filter for the &lsquo;definitely seen&rsquo; check. The point: marker retention is a <b>correctness</b> parameter, not a cleanup job &mdash; you size it against the redelivery window, never shorter.

Senior: Naming that exactly-once <b>delivery</b> is impossible and you build idempotent <b>effects</b> instead &mdash; plus the atomic check-and-set so the marker doesn't itself race &mdash; is the distributed-systems maturity Staff rounds dig for.

Speak: Reframe the premise out loud: <b>'exactly-once delivery is impossible &mdash; I build idempotent effects'</b> &mdash; then the check-and-set marker, committed atomically with the work.

### SDE3 | Large-object transfer mechanics

A 500&nbsp;MB upload fails at 80% over flaky mobile. Does the user restart from zero?

Not with <b>multipart upload</b>: the file is split into parts (e.g. 8&nbsp;MB), each uploaded and ack'd independently, so a failed part retries alone. The client resumes by re-sending only the missing parts; S3 assembles on <code>CompleteMultipartUpload</code>.

Follow: The upload is abandoned at 80% and never completed. What's in your bucket, and what does it cost?
Uncompleted multipart uploads leave <b>orphaned parts</b> &mdash; they consume storage but don't show in normal listings, so it's a silent bill. Fix: an <b>S3 lifecycle rule</b> to abort incomplete multipart uploads after N days. A classic cost leak.

Follow: Does your S3 trigger fire per part or once &mdash; and why does it matter?
Once &mdash; <code>s3:ObjectCreated:CompleteMultipartUpload</code> fires on assembly, not per part, so the handler sees one complete object, not 60 fragments. Subscribe to the complete event or you'll process partial garbage.

Senior: Knowing multipart resumes <b>per part</b>, that abandoned uploads silently bill via orphaned parts (lifecycle rule to abort), and that the trigger fires once on completion &mdash; these specifics separate 'used S3' from 'operated S3 at scale.'

Speak: Lead with the mechanism: <b>'multipart resumes per part, so they re-upload only what failed'</b> &mdash; then the orphaned-parts bill leak and the lifecycle abort rule.

### Staff | Reconciler correctness under concurrency

Your reconciler deletes S3 keys with no DB row. An upload is <i>in flight</i> &mdash; object written, row not yet committed. Walk me through the bug and the fix.

<b>Race:</b> the reconciler sees an object with no row and deletes a perfectly good in-flight upload. First fix is a <b>grace period</b> &mdash; only reconcile objects older than, say, an hour (longer than any legitimate write window), so in-flight uploads are never eligible.

Follow: A grace period is a guess. Make the reconciler correct, not just probably-correct.
Make intent explicit: write a <b>pending marker</b> (a PENDING row, or an object tag) <i>before</i> the upload, flip to COMMITTED after. The reconciler deletes only objects with <b>no marker at all</b> &mdash; never a PENDING one. Correctness stops depending on a timing guess.

Follow: The reconciler itself races a writer: reads 'no row,' writer commits, reconciler deletes. Still broken?
Yes &mdash; a TOCTOU window. Close it with a <b>conditional delete</b> that re-checks for the row inside the delete, or have the writer claim the key first (PENDING) so the reconciler acts on an unambiguous marker, not a snapshot it may have read stale.

Follow: To spread load, your reconciler checks &lsquo;is there a row?&rsquo; against a <b>read replica</b>. What goes wrong?
It deletes live data. A replica lags the primary, so &lsquo;no row&rsquo; can mean &lsquo;the row committed but hasn&rsquo;t replicated yet&rsquo; &mdash; the reconciler reads stale, sees an orphan that isn&rsquo;t one, and deletes an object whose record exists on the primary. The fix: the <i>delete decision</i> must read from the <b>primary</b>, or a read guaranteed to reflect committed writes &mdash; never a lagging replica. It can list candidate keys off a replica for cheapness, but it has to confirm against authoritative state before deleting. The rule worth saying out loud: a <b>destructive action can never be driven by an eventually-consistent read</b>.

Senior: Spotting that the naive reconciler <b>deletes in-flight uploads</b>, rejecting the grace-period guess for an explicit <b>PENDING marker</b>, then closing the reconciler's own TOCTOU window &mdash; that layered correctness reasoning is the Staff-level depth this whole pipeline is built to probe.

Speak: Name the bug out loud: <b>'the naive reconciler deletes in-flight uploads'</b> &mdash; reject the grace-period guess, use an explicit PENDING marker, then close the TOCTOU window.

### SDE3 | Cost modeling & the hidden bill

This pipeline processes 10M files a day. Where does the AWS bill actually go &mdash; and what's the line item that surprises people?

Not compute &mdash; <b>S3 requests and data transfer</b>. At 10M/day, PUTs alone run ~$50/day ($0.005 per 1K); GETs on every read, plus cross-AZ transfer when compute and bucket disagree on region, dwarf the Lambda-seconds. The surprise line is <b>NAT Gateway data processing</b> &mdash; a VPC Lambda reaching S3 without a gateway endpoint pays per-GB on top.

Follow: Halve the cost without dropping a file. First move?
An <b>S3 gateway VPC endpoint</b> &mdash; it's free, and it removes NAT and transfer charges for bucket traffic entirely. Then batch small files so you issue fewer PUTs, and add lifecycle rules to tier cold objects to S3-IA / Glacier. Compute is rarely the lever.

Follow: Lambda vs Fargate for this &mdash; when does the cost curve flip?
Lambda wins for <b>spiky, short, sub-second</b> work &mdash; you pay nothing idle. It flips to Fargate / ECS when invocations run long or go <b>sustained and high-volume</b>: past roughly one continuous vCPU of steady load, always-on Fargate beats per-ms Lambda. Duration &times; frequency is the deciding product.

Senior: Naming <b>requests and transfer</b> &mdash; not compute &mdash; as the real bill, and reaching for a <b>gateway endpoint</b> before micro-optimizing code, shows you've read an actual AWS invoice. Knowing the Lambda&rarr;Fargate flip point seals it.

Speak: Redirect from compute to the real bill: <b>'at this scale it's S3 requests and transfer, not Lambda-seconds'</b> &mdash; then the free gateway endpoint, then the Lambda-to-Fargate flip point.

### SDE3 | Format & schema evolution

Your export is a CSV other teams' importers consume. You need to add a column. How do you ship it without breaking them?

<b>Append-only, never reorder.</b> Add the new column at the <b>end</b>, optional with a sane default &mdash; positional importers keep working, header-based ones pick it up. Breakage comes from <b>inserting or renaming</b> columns, which shifts every downstream index.

Follow: An old importer must keep running for a year, but new consumers need a nested structure CSV can't express. Now what?
<b>Version the format &mdash; don't mutate one.</b> Emit a <code>v2</code> (JSON / Parquet) alongside the frozen <code>v1</code> CSV; a <b>version field or path</b> selects the reader. Expand-then-contract: dual-publish, migrate consumers, retire v1 once its usage hits zero.

Follow: How do you know when it's actually safe to retire v1?
You don't guess &mdash; you <b>instrument it</b>. Emit a metric per format version on read, or track last-access per consumer. Retire v1 only after its read count has been zero for a full cycle. Schema retirement is a data-driven call, not a calendar one.

Senior: Separating a <b>backward-compatible append</b> from a breaking reorder, escalating to <b>versioned formats with expand / contract</b> instead of mutating in place, and gating retirement on <b>measured usage</b> &mdash; that's how schema changes ship safely in production.

Speak: Lead with the compat rule: <b>'append at the end, optional with a default &mdash; never reorder or rename'</b> &mdash; then versioned formats, expand-then-contract, retired on measured usage.

### Staff | Backpressure through a forked stream

In the handler, one read forks to hash and S3 upload. Hashing is instant; the upload is slow. What happens to the pipe &mdash; and to memory?

The fork runs at the speed of its <b>slowest consumer</b>. The <code>PassThrough</code> feeding S3 fills to its <code>highWaterMark</code>, stops draining, and that backpressure propagates <b>back through the tee</b> to the source read &mdash; so the fast hash branch is throttled to the upload's pace. Memory stays bounded at the buffer size; unread chunks do <b>not</b> pile up.

Follow: Someone 'fixes' the slowness by unpiping S3 and pushing chunks to it in a manual loop. What did they just break?
They <b>defeated backpressure</b>. A manual <code>.write()</code> that ignores the <b>false</b> return value buffers unboundedly &mdash; the slow branch silently accumulates the whole file in RAM. The return-value contract <i>is</i> the flow control; bypassing it is how streaming OOMs come back.

Follow: Two branches, very different speeds. One shared highWaterMark, or different ones?
Independent buffers, tuned per branch. The slow S3 branch may want a <b>larger</b> highWaterMark to keep the pipe full across network jitter; the instant hash branch needs almost none. One global value either starves the network branch or wastes RAM on the fast one &mdash; match the buffer to each consumer's latency.

Senior: Explaining that a fork runs at its <b>slowest consumer</b> and that backpressure propagates <i>back through the tee</i> to throttle the fast branch &mdash; then catching that a manual <code>.write()</code> defeats the flow-control contract &mdash; is the stream-internals depth most candidates only hand-wave.

Speak: Say what governs the fork: <b>'it runs at the slowest consumer &mdash; backpressure propagates back and throttles the fast branch'</b> &mdash; then that a manual .write() ignoring the false return is how OOM creeps back.

### Staff | Data deletion &amp; the right to be forgotten

A user invokes their right to be forgotten &mdash; purge everything tied to their content. Walk me through it across this pipeline.

<b>Deletion is its own pipeline, not a single DELETE.</b> It spans the dual store &mdash; the S3 object <i>and</i> the catalog row &mdash; so it carries the same orphan risk as the dual-write, handled the same way: a tombstone, a tracked compensating delete, the reconciler as backstop. The hard part is everything <i>downstream</i> of the primary stores &mdash; replicas, caches, search indexes, and the genuinely hard one, <b>backups</b>, which you cannot surgically edit.

Follow: You cannot DELETE a row out of an immutable backup. So how is the user actually 'forgotten'?
<b>Crypto-shredding.</b> Encrypt each user's content under a per-user key; deletion drops the key, so the backed-up ciphertext is unrecoverable without ever touching the backup. The honest alternative is a bounded <b>retention window</b> &mdash; backups age out in N days, so you commit to 'gone from live systems now, gone from backups within N days.' Both are defensible; claiming you surgically delete from a backup is not.

Follow: Your reconciler deletes S3 keys with no DB row. Deletion removes the row first &mdash; does the reconciler fight you, or quietly do your job?
That is exactly why deletion cannot lean on a side effect. I make it explicit: a <b>tombstone</b> the reconciler reads, so a deleted object is a coordinated state, not an accidental orphan it happens to clean up. A compliance guarantee resting on reconciler timing is how you fail an audit &mdash; the deletion path owns the delete end to end and emits a <b>proof-of-deletion</b> record.

Senior: The level signal is treating deletion with the <b>same rigor as the write path</b> &mdash; dual-delete with compensation, an explicit tombstone the reconciler honors, an auditable proof record &mdash; plus an honest answer for backups (crypto-shred or retention) rather than hand-waving. Most candidates say 'delete the row' and miss that deletion is a pipeline, that backups are the hard part, and that a compliance promise cannot rest on a reconciler's timing.

Speak: Reframe it as a pipeline, not a DELETE: <b>'forgetting a user spans both stores, plus replicas, caches, and backups'</b> &mdash; dual-delete with a tombstone the reconciler honors, then the honest backups answer: crypto-shred the per-user key, or commit to a retention window.

### SDE3 | Multi-tenant fairness

A shared pipeline serves many tenants, and one just queued ten million files in a single burst. Every other tenant&rsquo;s work is now stuck behind it. How do you stop one tenant from starving the others?

The root cause is a <b>single shared FIFO</b> &mdash; a FIFO is never fair under burst, so one tenant&rsquo;s flood owns the queue. The fix is <b>fair scheduling</b>, not a bigger queue: partition the work by a <b>tenant key</b> and have workers dequeue <b>round-robin (or weighted) across tenants</b> so no one backlog blocks another, plus a <b>per-tenant rate limit</b> &mdash; a token bucket per tenant &mdash; that throttles any single tenant to a fair share and buffers the excess instead of letting it block. Fairness is a <i>scheduling</i> property you build in, not something a FIFO hands you.

Follow: A physical queue per tenant, for thousands of tenants?
No &mdash; the isolation is <i>logical</i>. One queue <b>partitioned by tenant key</b> (Kafka partitions, or a tenant attribute on the message), and the <b>consumer</b> does the fair part: it dequeues round-robin across tenant keys and caps per-tenant in-flight work. The scheduling discipline lives in the consumer, not in thousands of physical queues &mdash; that&rsquo;s fairness that scales.

Follow: And the burst that&rsquo;s already stuck right now?
Triage first: lift the offending batch onto a <b>separate low-priority lane</b> so everyone else drains immediately, then let it catch up at a throttled rate. Isolate the noisy tenant now, fix the structure so it can&rsquo;t recur.

Senior: The tell is naming fairness as a <b>scheduling discipline in the consumer</b> &mdash; partition by tenant key, round-robin, rate-limit each &mdash; rather than reaching for a bigger queue or a queue-per-customer. Juniors scale the queue; seniors schedule across tenants.

Speak: Lead with the diagnosis, not the fix: <b>&lsquo;a single shared FIFO is never fair under burst.&rsquo;</b> Then the fix in one breath &mdash; partition by tenant key, round-robin across tenants, rate-limit each &mdash; and land on the line that scores: fairness is a scheduling discipline in the consumer, not a bigger queue.

### Staff | Blast radius when down

Your pipeline has been down for two hours and on-call is asking whether the device fleet is broken. What&rsquo;s the actual blast radius?

The senior move is separating &lsquo;the pipeline is down&rsquo; from &lsquo;the system is broken&rsquo; &mdash; they aren&rsquo;t the same, and saying why is the answer. Downstream is a <b>pull plus desired-state</b> model: devices run on their <b>last-reconciled state</b>, so an outage never touches what&rsquo;s already deployed &mdash; the fleet keeps running on its last-known-good config. Inbound work isn&rsquo;t lost either: uploads land in <b>durable storage</b> and the queue holds the events, so changes are <b>delayed, not dropped</b>, and drain when the pipeline recovers. So the real blast radius is bounded to one thing &mdash; <i>config changes stop propagating</i>. Nothing in flight is lost, nothing already live breaks. That&rsquo;s the line between an availability blip and an outage.

Follow: What WOULD make it a real outage, then?
A device needing a <b>fresh</b> config it has never seen &mdash; a brand-new device onboarding, or an urgent <b>security rotation</b> that has to reach the fleet <i>now</i>. For those, &lsquo;delayed&rsquo; is &lsquo;broken.&rsquo; So I name the exception: steady-state is fine, but time-critical pushes are the part of the blast radius that actually hurts &mdash; and that&rsquo;s what the SLO should be written against, not the average case.

Follow: How do you stop the queue overflowing during a two-hour outage?
The queue is durable and sized for backlog, so two hours of inbound buffers fine &mdash; that&rsquo;s the whole point of decoupling. The real risk is <b>recovery</b>: the pipeline comes back to a thundering backlog, so I drain at a <b>controlled rate</b> (bounded worker concurrency, not all-at-once) to keep recovery from hammering the downstream stores. Absorb during the outage, drain deliberately after.

Senior: The tell is refusing the premise &mdash; &lsquo;down&rsquo; is not &lsquo;broken.&rsquo; A senior bounds the blast radius (steady-state keeps running, changes delayed not lost), names the one exception that genuinely hurts (time-critical pushes), and treats recovery as its own problem. Juniors say &lsquo;it&rsquo;s down, everything&rsquo;s broken&rsquo;; seniors scope the damage.

Speak: Refuse the premise first: <b>&lsquo;down is not broken.&rsquo;</b> Then bound it &mdash; the fleet runs on last-reconciled state, changes are delayed not lost &mdash; name the one exception that hurts (a time-critical push to a device that needs a fresh config), and treat the recovery backlog as its own problem. Scoping the damage, instead of catastrophizing, is the senior move.

### SDE3 | Testing &amp; confidence under failure

How would you test this pipeline? Specifically &mdash; how do you gain confidence it&rsquo;s correct under <b>failure and concurrency</b>, not just the happy path?

The happy-path tests are the easy part &mdash; the bugs live in redelivery, partial failure, and concurrency, so that&rsquo;s where the testing has to aim. I&rsquo;d layer it: <b>unit</b> on the pure logic (the extension&rarr;handler dispatch, the idempotency-key derivation, the oldId&rarr;newId FK remap); <b>integration</b> against real storage and a real DB or localstack for the full upload&rarr;record path; and a <b>contract test on the strategy map itself</b> &mdash; assert every registered extension has a handler and every handler is registered, because that map drifting is exactly how an unknown type starts silently skipping. But the part that earns confidence is testing the <i>hard</i> properties. Fire the <b>same event twice, then N times concurrently</b>, and assert exactly one record and one set of derived artifacts &mdash; that&rsquo;s the test most teams skip and the one at-least-once delivery will eventually break in production. Then <b>fault injection</b>: kill the worker mid-handler, after the hash but before the DB write, and assert the retry converges to a clean state with no orphaned object. And run the <b>reconciler concurrently with live writes</b> over a seeded-inconsistent state, asserting it converges without double-deleting. The honest part: you can&rsquo;t test &lsquo;exactly once&rsquo; into existence &mdash; so I test the guarantees that are actually real, <b>idempotency and convergence</b>, and use fault injection plus invariant assertions for the rest.

Follow: What&rsquo;s the one test most teams skip that catches the most bugs?
The <b>concurrent-duplicate</b> test &mdash; deliver the same event many times in parallel and assert a single record and a single set of side effects. Sequential redelivery is easy; the <i>race</i> &mdash; two workers on the same key at once &mdash; is where the idempotency check has a check-then-act gap, and at-least-once delivery guarantees you hit it eventually. If I write only one hard test, it&rsquo;s that one.

Follow: How do you keep the reconciler test from being flaky?
Make it <b>deterministic</b>: inject the clock and the &lsquo;in-flight vs orphaned&rsquo; boundary so the decision is decidable instead of a race against wall-clock. Seed exact states &mdash; object-without-row, row-without-object &mdash; and assert convergence. For the concurrent case I drive a controlled interleaving, or run it many times under randomized scheduling and assert <b>invariants</b> (never double-delete, never drop a live object) rather than one exact trace. Test the property, not the output.

Senior: The tell is aiming the tests at failure and concurrency rather than the happy path &mdash; plus the maturity to say out loud that some properties (exactly-once) can&rsquo;t be unit-tested, so you verify the weaker-but-real ones, idempotency and convergence, with fault injection and invariant assertions. Juniors recite the test pyramid; seniors name the <i>specific</i> hard test &mdash; the concurrent duplicate &mdash; and how they make non-determinism testable.

Speak: Refuse the happy path first: the bugs live in redelivery, partial failure, and concurrency, so that&rsquo;s where the tests aim. Layer it &mdash; unit on the pure logic, integration on the full upload-to-record path, and a contract test on the strategy map so it can&rsquo;t silently drift. Then the test that earns confidence: fire the <b>same event N times concurrently</b> and assert exactly one record &mdash; the one most teams skip and the one at-least-once eventually breaks. Add fault injection, kill the worker mid-handler and assert the retry converges clean, and run the reconciler against live writes. Honest close: you can&rsquo;t test exactly-once into existence, so you test idempotency and convergence and assert invariants for the rest.

### Staff | Shipping a change to a live pipeline

You need to ship a change to this pipeline &mdash; say a new field in the import format, or a change to how a handler writes records &mdash; while it&rsquo;s processing live traffic. How do you roll it out without downtime or corrupting data?

The insight that drives everything: in a rolling deploy, <b>old and new workers run at the same time</b> against the same queue, so for a window both versions are processing the same events. That kills the naive &lsquo;just deploy v2&rsquo; &mdash; v2 can&rsquo;t emit anything v1 can&rsquo;t handle, or v1 chokes on v2&rsquo;s output mid-rollout. So I treat it as <b>expand, migrate, contract</b>: first deploy a version that <i>tolerates both</i> shapes &mdash; the reader ignores unknown fields and defaults missing ones, so it&rsquo;s backward- and forward-compatible; only once every worker can read the new shape do I flip the <b>writer</b> to emit it; and dropping the old path is a <i>third</i> deploy, after nothing produces the old shape anymore. For risk I <b>canary</b> &mdash; route one worker or a small slice of traffic to the new version, watch the error rate and the <i>derived-artifact correctness</i>, then ramp. And the change stays <b>idempotent and replay-safe</b>, so a worker picking up a half-processed event across the deploy converges instead of double-writing. The honest part is the <b>rollback asymmetry</b>: rolling back code is instant, but if v2 already <i>wrote</i> data v1 can&rsquo;t read &mdash; or wrote it wrong &mdash; a code rollback doesn&rsquo;t undo that. So the data change is forward-compatible by design, and anything destructive sits behind a <b>flag I can flip without a deploy</b>.

Follow: Why not just deploy v2 everywhere at once?
Because the queue holds in-flight events and workers don&rsquo;t cut over atomically &mdash; even a fast deploy has a window where old and new coexist, and any consumer lag widens it. If v2 writes a record shape v1 doesn&rsquo;t understand, v1 errors on &mdash; or silently mishandles &mdash; every event it picks up in that window. Expand/contract removes the assumption that there&rsquo;s ever a clean instant where only one version runs.

Follow: The canary looks clean, you ramp to 100%, and an hour later you find it was writing a subtly wrong field. Now what?
Code rollback stops the bleeding but doesn&rsquo;t fix the hour of bad records &mdash; that&rsquo;s the asymmetry. So flip the writer back (or kill the flag), then run a <b>targeted backfill</b> over just the affected window, which I can scope because records are timestamped and the change is identifiable. That&rsquo;s exactly why the pipeline keeps enough provenance to ask &lsquo;everything written by v2 between T1 and T2,&rsquo; and why an irreversible write worries me more than a reversible one.

Senior: The tell is knowing a rolling deploy means old and new run <i>concurrently</i>, so changes must be backward- and forward-compatible &mdash; expand, migrate, contract, never big-bang &mdash; and being honest that <b>rolling back code is not rolling back data</b>. Juniors say &lsquo;canary then ramp&rsquo;; seniors design the change so both versions coexist safely and so a bad write is <i>findable and reversible</i>, because the data is the part you can&rsquo;t just redeploy.

Speak: The trap is &lsquo;just deploy v2&rsquo; &mdash; in a rolling deploy, old and new workers run at the same time on the same queue, so for a window both versions touch the same events. So go <b>expand, migrate, contract</b>: first ship a version that tolerates both shapes, then flip the writer to the new one, then remove the old path in a third deploy. Canary a small slice, watch error rate and artifact correctness, then ramp. And say the honest part out loud: rolling back code is instant, but if the bad version already wrote bad data, a code rollback doesn&rsquo;t fix it &mdash; so the data change is forward-compatible by design and destructive steps sit behind a flag. The senior move is making both versions coexist safely and making a bad write findable and reversible.

### SDE3 | Compressing the export

That 1,000,000-row CSV is ~400&nbsp;MB on the wire, and the terminals pulling it are on metered links. How do you cut the transfer?

<b>Compress the stream, don&rsquo;t buffer-then-compress.</b> Pipe the cursor through the CSV transform, then through <code>zlib.createGzip()</code>, then to the response with <code>Content-Encoding: gzip</code> &mdash; so the gzip runs <i>inside</i> the same backpressured pipeline and memory stays constant. CSV is highly compressible (repeated delimiters, low-cardinality columns), so 400&nbsp;MB routinely drops to 30&ndash;50&nbsp;MB. The cost is server CPU; the win is bandwidth, transfer time, and &mdash; for an S3-staged export &mdash; storage and egress. You compress <i>as you stream</i>, never gzip a 400&nbsp;MB buffer you first built in RAM.

Follow: Gzip is CPU. When is compressing actually the wrong call?
When the client can&rsquo;t decompress, when the payload is small enough that the round-trip saving is noise, or when you&rsquo;re CPU-bound and bandwidth-rich &mdash; then the compression tax costs more than it saves. It&rsquo;s also wrong on <i>already-compressed</i> or high-entropy content (a column of random UUIDs, binary blobs) where gzip spends CPU for near-zero gain. The rule: compress high-volume, high-redundancy, bandwidth-constrained transfers; skip it when the data is incompressible or the link is already fast and the CPU isn&rsquo;t spare. A big low-cardinality CSV over metered mobile is squarely worth it.

Follow: You stage the export to S3 first, then hand out a presigned URL. Do you gzip before or after the upload?
<b>Before</b> &mdash; store the object already-gzipped (<code>export.csv.gz</code>), so you pay compression once at write time and every download is small. Set the object&rsquo;s <code>Content-Encoding: gzip</code> so a browser client transparently inflates it, or hand the <code>.gz</code> to a device that inflates explicitly. Compressing after &mdash; letting a CDN or the client compress on the fly &mdash; re-pays CPU per download and doesn&rsquo;t shrink what&rsquo;s stored. Compress once at the source of truth, serve the small object many times: the same reason you don&rsquo;t re-render a cached artifact on every read.

Senior: Piping the cursor through <code>gzip</code> <i>inside</i> the backpressured stream (constant memory, <code>Content-Encoding: gzip</code>) rather than compressing a buffered blob &mdash; and knowing when compression is the wrong call (incompressible data, CPU-bound) and to compress-once at the S3 source &mdash; is the transfer-optimization depth a senior round rewards.

Speak: Lead with the mechanism, not the idea: <b>'pipe the cursor through gzip inside the same backpressured stream, Content-Encoding: gzip'</b> &mdash; so memory stays constant and a 400&nbsp;MB CSV drops to 30&ndash;50&nbsp;MB. Then the honest boundary: skip compression on incompressible data or when you're CPU-bound, and compress <i>once</i> at the S3 source rather than per download.

### SDE3 | Resumable export

The export streams for four minutes. At row 800,000 the terminal&rsquo;s connection drops. Does it re-download the whole file, or can it resume?

A plain streaming response <b>restarts from zero</b> &mdash; the cursor was tied to that connection, so a drop means re-run. To make it resumable you <b>decouple the export from the delivery</b>: stage the export to S3 as an object, then hand out a presigned URL, and S3 serves it with <b>HTTP Range support</b> &mdash; the client re-requests <code>Range: bytes=N-</code> and resumes from where it stopped. For a live (non-staged) stream you&rsquo;d instead need a <b>resume token</b> &mdash; checkpoint the last-emitted primary key, and on reconnect continue <i>after</i> that key, which works precisely because the source read is an <b>ordered keyset</b>, not an OFFSET. The staged-object-plus-Range path is simpler and the one I&rsquo;d reach for.

Follow: Why is the presigned-S3 path usually better than a resume token on the live stream?
Because it makes resumption <b>S3&rsquo;s problem, not yours</b>: Range requests, retries, and partial delivery are built in and battle-tested, and the export is computed <i>once</i> into a stable object instead of re-running the query on every reconnect. A live resume token means re-issuing <code>WHERE id &gt; last_key</code> each time &mdash; correct only if the ordering is stable and nothing shifts the keyset under you &mdash; and it pins a DB connection for the whole slow download. Staging decouples &lsquo;produce the data&rsquo; from &lsquo;deliver the bytes,&rsquo; which is why it&rsquo;s the pattern for anything big and slow. You trade a little storage and latency-to-first-byte for robust, connection-independent delivery.

Follow: A resume token keyed on the last primary key &mdash; what breaks it, and how do you keep it correct?
It breaks if the result set isn&rsquo;t <b>stably ordered</b>. Order by an immutable, unique key (the primary key), not a mutable column, so &lsquo;after key X&rsquo; is well-defined and can&rsquo;t skip or repeat rows. Rows inserted <i>after</i> the checkpoint with a higher key show up on resume (usually fine &mdash; the export reflects a moving table); a truly point-in-time export instead needs a <b>snapshot</b> &mdash; a repeatable-read transaction or an as-of timestamp &mdash; rather than a naive resume. The token is only as consistent as the ordering and isolation behind it, which is exactly why staging a snapshot into S3 sidesteps the whole class of problems.

Senior: Recognizing that a plain streamed export restarts from zero, and that resumption means <b>decoupling produce-from-deliver</b> &mdash; stage to S3 and let Range requests handle resume, or checkpoint an <i>ordered keyset</i> for a live token &mdash; plus the consistency caveat (stable ordering / snapshot isolation) is the delivery-robustness thinking that separates a senior answer from &lsquo;the user just retries.&rsquo;

Speak: Refuse the naive answer first: <b>'a plain streamed export restarts from zero &mdash; the cursor died with the connection.'</b> Then the fix: stage to S3 and let presigned Range requests handle resume, or checkpoint an <i>ordered keyset</i> for a live resume token. Land on the caveat that scores &mdash; a resume token is only as correct as its ordering and isolation, which is why staging a snapshot sidesteps the problem.

## Whiteboard

For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run this system on a whiteboard.

### Entry box &mdash; the handler signature and what fires it.

<code>processUpload(key, bucket)</code> &mdash; the Lambda / API handler, triggered by the S3 <b>ObjectCreated</b> event.

### Routing &mdash; how a file type picks its handler.

<code>extname(key)</code> &rarr; the <code>strategies</code> map (jpg, mp4, ttf, bin, zip&hellip;). An <b>O(1) lookup</b>, never a switch.

### The branch for an unrecognized type.

unknown ext &rarr; <code>skip</code> (a logged no-op); a match &rarr; the format handler.

### Inside a handler &mdash; the single-read data flow.

<code>readStream &rarr; PassThrough &rarr; [hash | s3.upload] &rarr; Promise.all</code>. <b>One disk read</b>, forked two ways.

### The export path, and its memory property.

<code>cursor(batch 100) &rarr; csv &rarr; res</code>, the backpressure loop drawn back from socket to cursor &mdash; <b>constant memory</b> at any row count.

### The import path &mdash; the id-collision algorithm.

The 4-tier ladder &mdash; <b>REUSE / REMAP / REGEN / INSERT</b> &mdash; plus the <code>oldId&rarr;newId</code> FK remap applied before each child insert.

### The dual-write caveat, and its fix.

Two stores, no shared txn &rarr; track the S3 keys, <b>compensating-delete</b> on rollback. (The one people forget.)

### The backstop for orphans &mdash; and its one guard.

A <b>reconciler</b> sweeps S3 for keys with no DB row &rarr; delete &mdash; but only past a grace window / <b>PENDING</b> marker, so it never touches an in-flight upload.

### How a redelivered event avoids double work.

At-least-once delivery &rarr; a <b>processed-marker</b> (conditional put on the content hash). A replay sees it and no-ops &mdash; the effect is idempotent.

```html

          <div class="dgm-node"><div class="dgm-t">operator &rarr; S3 bucket</div><div class="dgm-s">the upload lands as an object</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">S3 <code>ObjectCreated</code> event</span></div>
          <div class="dgm-node"><div class="dgm-t"><code>processUpload(key, bucket)</code></div><div class="dgm-s">Lambda / handler entry</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl"><code>extname</code> &rarr; strategies map &middot; O(1)</span></div>
          <div class="dgm-node"><div class="dgm-t">format handler</div><div class="dgm-s">jpg &middot; mp4 &middot; ttf &middot; bin &mdash; unknown ext &rarr; <i>skip</i></div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl"><code>readStream</code></span></div>
          <div class="dgm-node dgm-fork"><div class="dgm-t">PassThrough &middot; <span class="dgm-em">one read</span></div><div class="dgm-branches"><span class="dgm-br">&rarr; hash</span><span class="dgm-br">&rarr; s3.upload</span></div><div class="dgm-s"><code>Promise.all</code> &mdash; forked, single read</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">persist across two stores</span></div>
          <div class="dgm-stores"><div class="dgm-node dgm-store"><div class="dgm-t">DB record</div><div class="dgm-s">catalog row</div></div><div class="dgm-link">&harr;</div><div class="dgm-node dgm-store"><div class="dgm-t">S3 blob</div><div class="dgm-s">object bytes</div></div></div>
          <div class="dgm-note">no shared transaction &rarr; track keys + <b>compensating-delete</b> on rollback</div>
          <div class="dgm-conn dgm-up"><span class="dgm-v">&#9650;</span><span class="dgm-lbl">backstops the two stores</span></div>
          <div class="dgm-node dgm-recon"><div class="dgm-t">reconciler</div><div class="dgm-s">sweeps orphans past a grace window / <b>PENDING</b> marker &mdash; never touches an in-flight upload</div></div>
          <div class="dgm-foot">redelivered event &rarr; <b>processed-marker</b> (conditional put) &rarr; replay no-ops &middot; idempotent</div>
        
```

Foot: <b>The one people forget:</b> step 7. Two stores, no shared transaction &mdash; if you don't volunteer the compensating S3 delete, the interviewer knows you've only read about this, not shipped it.

Verdict: <b>All nine cold.</b> You can rebuild this system on a whiteboard from memory \u2014 the design round is yours to lose, not to pass.

## System

The content pipeline is the <b>ingestion layer</b>. Knowing the stages on either side of it &mdash; and being able to walk the whole chain &mdash; is what turns a component answer into a system answer.

### Where this pipeline lives

- Operator upload: content / config pushed to S3
- Content pipeline: process &middot; hash &middot; store &middot; bundle &middot; export [*]
- Cryptographic signing: HSM signs the package; devices reject unsigned
- Desired-state reconciliation: compute per-device target, render templates, detect drift
- Deployment: push to devices in maintenance windows, batched
- Device fetch + report: device pulls, applies, reports reported_hash

### Interviewer pivot points

The questions that bridge out of this topic. Each one leads into another deep-dive &mdash; tap to see the connecting answer.

#### The content is processed &mdash; now it must be tamper-proof on the device

-> Signing (2)

The pipeline's output feeds the <b>signing</b> stage: the processed package hash goes to the HSM, which returns a signature stamped into the header. Devices verify it and reject unsigned packages. The pipeline produces the artifact; signing makes it trustable.

#### Tenants see different content &mdash; how is that access isolated?

-> Authz (3)

Every pipeline read/write is <b>tenant-scoped</b>: the JWT tenant claim becomes a query predicate, so processing and exports only ever touch one tenant's objects. Visibility and signing keys are provisioned per company &mdash; that's the authz topic.

#### Per-device attributes drive what gets rendered &mdash; where do they live?

-> EAV (6)

Custom per-device values come from the <b>EAV</b> store (definition + override, resolved by COALESCE). Those values are what the desired-state templates interpolate before hashing &mdash; the pipeline and reconciler both read them.

#### How does a device know it has the right content, and that it applied it?

-> Desired-state (7)

That's the <b>three-hash model</b>: desired (what it should have) vs deployed (what we sent) vs reported (what the device confirms). The pipeline's output hash becomes part of the desired hash; the reconciler closes the loop.

#### A 10,000-row import finishes &mdash; how do operators find out?

-> Notifications (5)

Completion fans out through the <b>dual-channel notification</b> system: an in-app row (polled) plus an optional email (SES, per-tenant sender). Decoupled, so a failed email never blocks the import's success path.

#### All this runs on AWS &mdash; how is the infrastructure itself locked down?

-> AWS hardening (4)

The pipeline's blast radius is an AWS-security problem: the processor runs on a <b>least-privilege execution role</b> &mdash; read one bucket prefix, write one table, nothing else &mdash; the bucket has <b>Block Public Access</b> on with <b>SSE</b> at rest, and traffic to S3 and the DB rides <b>VPC endpoints</b> so it never touches the public internet. Uploads arrive through presigned URLs scoped to one key with a short TTL. That whole hardening posture is its own topic.

#### All this infra &mdash; S3, Lambda, the queue, the IAM roles &mdash; how is it defined and deployed repeatably?

-> IaC (8)

Declaratively, as <b>infrastructure as code</b> &mdash; Terraform or CDK &mdash; so the bucket, functions, roles, and event wiring are versioned and reproducible instead of click-ops. And there's a clean parallel worth naming: <b>IaC drift detection is to infrastructure what the reconciler is to data</b> &mdash; both compare a declared desired state against reality and converge it. Drawing that symmetry is a senior move.

## Trade-offs

The design decisions an interviewer drills &mdash; each with the <b>axis</b> that picks a side. Saying the switch condition out loud is the senior move; defending one option as universally right isn't.

### Lambda per object vs SQS + worker pool

- Lambda / object: low or spiky volume, no ordering need, you want <b>zero ops</b> and lowest latency.
- SQS + workers: you need <b>retries, a DLQ, ordering</b>, burst-smoothing, or jobs over 15&nbsp;min.

Name the <b>switch condition</b>, don't defend one side.

### Hash during upload vs hash after store

- During (fork): files are large, or you just want <b>one disk read</b> &mdash; i.e. almost always.
- After / two-pass: the file is tiny, or an API needs the <b>digest before</b> you can store it.

The <b>PassThrough fork</b> is the only path that survives a 500&nbsp;MB object.

### SQLite bundle vs JSON vs pg_dump

- SQLite: you need <b>real FKs</b> and binary at <b>1:1</b> size in one portable file.
- JSON: data is small, human-readable, with <b>no</b> binary or relations.
- pg_dump: same engine both ends and you want exact fidelity &mdash; but it's <b>not portable</b>.

JSON base64-bloats binary <b>~33%</b> and loses referential integrity.

### Single PUT vs multipart upload

- Single PUT: objects are <b>small</b> (&lt;100&nbsp;MB) and the network is reliable.
- Multipart: large objects, flaky networks, or you want <b>per-part retry</b> and resumability.

Multipart resumes <b>per part</b> &mdash; pair it with a lifecycle rule to abort orphans.

### Compensating delete vs reconciler vs distributed txn

- Compensating delete: cheap cleanup of the <b>common</b> failure, in the request path.
- Reconciler: you need a <b>durable backstop</b> that eventually catches every orphan.
- Distributed txn: you truly need <b>cross-store atomicity</b> &mdash; rarely worth 2PC / saga cost across S3 + DB.

Run delete <b>and</b> reconciler; reach for 2PC only when atomicity is non-negotiable.

### Sync fast-path vs async queue

- Sync inline: interactive, small payload, <b>sub-second</b> SLA.
- Async queue: heavy or bulk work where <b>eventual</b> completion is fine.

Two-tier by interactivity: <b>one dispatch map, two execution venues</b>.

### Reconciler backstop vs transactional outbox

- Reconciler (heal): the two stores <b>can't share a transaction</b>, a brief orphan window is tolerable, and fewer moving parts wins &mdash; dual-write, then sweep orphans on a grace window.
- Outbox (prevent): correctness must be <b>airtight</b> and you can anchor on one DB transaction &mdash; commit the row + an event atomically, and a relay does the S3 work with retries off <b>one commit point</b>.

The outbox needs a DB transaction to anchor on; the reconciler is the honest backstop for when the stores genuinely can't share one.

## Model Answers

### Make it reliable | “How would you make this reliable?”

Production-grade = no data lost across S3+DB, and no work done twice on a retry.

- FRAME | frame | Reliability here is two guarantees: <b>no data lost</b> across the S3-and-DB boundary, and <b>no work done twice</b> on a retry. Let me take them in turn.
- HEADLINE | head | The central risk is the <b>dual-write</b> — the DB and S3 can disagree — so every write is idempotent and a <b>reconciler</b> is the real backstop.
- NO LOSS | sub | On the write path I track every S3 key I create; if the DB transaction fails, I delete those keys in the catch. Best-effort cleanup can fail too, so the actual guarantee is a reconciler sweeping S3 for keys with <b>no DB row</b> and removing the orphans — eventually consistent, but correct.
- NO REPLAY | sub | On the processing path, delivery is at-least-once, so I never lean on exactly-once. I make the effect <b>idempotent</b> — a content-hash key with an upsert, or a processed-marker the handler checks-and-sets first — so a redelivered event is a no-op.
- NAME THE RISK | risk | The subtle bug is the reconciler racing an <b>in-flight upload</b>: object written, row not yet committed. I close it with an explicit <b>PENDING marker</b> written before the upload, so the reconciler never deletes work still in progress.
- TRADE-OFF | trade | I add a DLQ the moment failures need inspecting, and retries-with-backoff for transient errors — but I wouldn’t reach for distributed transactions. Idempotent writes plus a reconciler give the same guarantee far more cheaply.
- CLOSE | close | So: idempotent effects, compensating cleanup, a reconciler backstop, and explicit pending-state to kill the races — production-grade without 2PC.

### Make it scale | “How does this scale?”

‘Scale’ for this pipeline is really ‘which resource saturates first.’

- FRAME | frame | Let me pin the load first, then walk the chain and name what saturates at each stage — because <b>scale here is really ‘which resource gives out first.’</b>
- HEADLINE | head | At normal volume the Lambda-per-object design is fine. Under a burst the first ceiling is <b>Lambda concurrency</b>, then the <b>DB connection pool</b>, then the <b>S3 PUT rate per prefix</b>.
- NUMBERS | sub | Say 10 million objects a day — about <b>115/second</b> average, bursting past <b>1,000/second</b>. Each invocation holds a DB connection, so a thousand concurrent Lambdas blows past Postgres’s connection limit. Fix: <b>RDS Proxy</b> to pool connections, or buffer through SQS so I own consumer concurrency.
- PREFIX | sub | S3 caps writes per prefix, so if every key shares one prefix I throttle. I spread keys across prefixes <b>by hash</b> to parallelize, and large objects go <b>multipart</b> — a 500 MB upload becomes a hundred parallel parts, not one serial stream.
- NAME THE RISK | risk | The silent killer is the <b>held cursor</b> on exports — a slow client pins a DB connection open, and enough slow readers exhaust the pool. I cap it with a statement timeout, or stream the export to S3 and hand back a presigned URL so the database is out of the read path entirely.
- TRADE-OFF | trade | Lambda-per-object buys zero ops and low latency; the moment I need ordering, retries, a DLQ, or burst-smoothing, I move to <b>SQS and a worker pool</b>. That’s the switch condition.
- CEILING | ceil | At true firehose scale I stop processing per-object synchronously and <b>batch through SQS or Kinesis</b> — amortizing fixed costs and decoupling arrival rate from processing rate.

### Walk a failure | “Walk me through a failure.”

A concrete incident: thumbnails stop appearing, but uploads still succeed.

- FRAME | frame | Let me take a real one: <b>thumbnails stop appearing</b> for new uploads, but the uploads themselves succeed. I’ll narrate how I localize it.
- HEADLINE | head | Uploads working but processing not means the break is <b>past the S3 write</b> — in event delivery or the processor — so I check the four signals: queue depth, processing latency, error rate, reconciler orphan count.
- LOCALIZE | sub | Orphan count is climbing — objects with no processed row — so the processor gets events but fails to finish. Error rate is flat, ruling out crashes; latency p99 has spiked. That points at a <b>slow downstream dependency</b>, not a bug in my code.
- ROOT CAUSE | sub | The image library is timing out on a new file type someone started uploading — each job hangs to its limit, then the event redelivers, piling up the queue. It’s a <b>poison-message pattern</b>: one bad input stalling the lane.
- FIX | sub | Immediate: a <b>DLQ</b> so poison messages stop redelivering and the lane drains. Then a guard — validate the type and cap processing time per job — so a bad input <b>fails fast</b> instead of hanging. The reconciler cleans the orphans once processing catches up.
- NAME THE RISK | risk | What I’d flag in the postmortem: we had <b>no per-type timeout and no DLQ</b>, so a single unsupported file could silently back up the whole pipeline. Both are now defaults.
- CLOSE | close | So the discipline is: localize with the four signals, separate slow-from-failing, find the poison input, fail it fast, and let the reconciler reconcile state.

### Defend the design | “Why this design?”

Defend it on cost and how it absorbs change — not just whether it works.

- FRAME | frame | Let me defend it on the two axes that matter for an ingestion pipeline: <b>operational cost</b> and <b>how it absorbs change</b> — not just whether it works.
- HEADLINE | head | The spine is a <b>strategy-dispatch map</b> plus event-driven S3 triggers: O(1) routing, one handler contract, and uploads push work so nothing polls. The dispatcher’s complexity stays at one forever, and a new content type is a single map entry.
- EXTENSIBILITY | sub | Adding <code>.webp</code> or a video handler is one line and zero caller changes, because every handler returns the same normalized result shape. It extends <b>along its grain</b> — when transcoding needs real compute, the same map just routes to ECS instead of processing inline.
- STREAMING | sub | Memory is constant regardless of file size because every byte path is streamed and backpressured — the PassThrough fork for hashing, the cursor for exports. A 5 GB object costs the same RAM as a 5 MB one. A deliberate choice, not an accident.
- NAME THE RISK | risk | Where I’m honest about the cost: event delivery is at-least-once and the S3-DB write is a dual-write, so I’m buying simplicity and paying with <b>idempotent effects and a reconciler</b>. I’d rather pay there than run two-phase commit.
- TRADE-OFF | trade | And it has a clean upgrade path — Lambda-per-object now, SQS-plus-workers the moment I need retries, ordering, or a DLQ. I’m not locked in; I’ve named the exact threshold where I’d switch.
- CLOSE | close | So it’s cheap to run, cheap to extend, flat in memory, and honest about its one trade-off — which is what I want from an ingestion layer.

### Operate it | “How would you know it’s healthy in production?”

Operational maturity = the pipeline tells you it’s failing before a user does.

- FRAME | frame | Health here isn’t ‘is the box up’ — it’s ‘is work flowing and arriving correctly.’ So I instrument the pipeline as a flow and define <b>healthy</b> as SLOs, not vibes.
- HEADLINE | head | The dashboard is the <b>four golden signals</b> mapped to this pipeline: <b>queue depth</b> (work waiting), <b>processing latency p99</b> (upload to processed-row), <b>error rate</b> (failures / min), and the one most people miss — <b>reconciler orphan count</b>, my correctness signal.
- THE TARGETS | sub | The SLIs I’d commit to: <b>freshness</b> — p99 upload-to-processed under ~60 seconds — and <b>completeness</b>, the fraction of uploads that reach a terminal state. Freshness catches a <i>slow</i> pipeline; completeness catches a <i>lossy</i> one, which is the scarier failure.
- ALERT ON | sub | I alert on <b>symptoms and SLO burn</b>, not raw metrics. Page on: queue depth climbing for N minutes, the freshness SLO burning, or DLQ size above zero. I do <b>not</b> page on a single failed job — retries and the DLQ absorb that. Alert on the <b>trend</b>, not the blip.
- THE TELL | risk | The signal that separates levels is <b>orphan count</b>. Error rate flat but orphans climbing means objects are landing in S3 with no processed row — the pipeline is <i>silently</i> losing work while every box looks green. That’s the metric I put front and center, because it’s the failure a naive dashboard can’t see.
- TRACE | sub | For diagnosis I carry a <b>correlation id</b> — the object key — through the event, the logs, and the DB row, so one slow file is traceable across S3, the queue, and the processor without grepping by timestamp. That turns ‘thumbnails are slow’ into the exact poison input in minutes.
- CLOSE | close | So: four golden signals with orphan-count as the correctness canary, SLOs on freshness and completeness, alert on burn not blips, and a correlation id that makes any one file traceable end-to-end — the pipeline tells me it’s failing before a user does.

### Cut scope | “What would you build first?”

Pragmatism = the thinnest thing that works, with the seams that let it grow.

- FRAME | frame | Scoping is a senior move before it’s a coding one — I’d ask the two or three questions that actually <b>fork the design</b>, then build the thinnest thing that survives those answers.
- QUESTIONS | sub | The questions that change what I build: <b>which content types</b> (that sizes the strategy map), <b>what volume</b> (Lambda-per-object vs a worker pool), and <b>is async acceptable</b> (whether I need a queue at all). Most other details don’t move the architecture — these three do.
- THE MVP | sub | Given ordinary answers, the MVP is a straight line: <b>S3 ObjectCreated → one Lambda → a single handler → a DB row.</b> One content type, processed inline, no queue, no reconciler. That ships in days and is correct for the happy path.
- DEFER | sub | What I’d consciously <i>not</i> build yet: the <b>DLQ</b>, <b>multipart</b>, the <b>reconciler</b>, <b>RDS Proxy</b>. Each answers a problem I don’t have at MVP scale — I add the DLQ the first time a poison message bites, the reconciler when a dropped file actually hurts, the proxy when connections saturate.
- NEVER CUT | risk | Two things I build from line one anyway, because cutting them means a <b>rewrite</b>, not a patch: the <b>strategy-map seam</b>, so a second content type is one entry and not a refactor — and <b>idempotency</b>, because at-least-once becomes a property of the system the moment I add a queue, and retrofitting it is brutal.
- SEQUENCE | sub | So the growth path is ordered by <b>what gives out first</b>: ship inline-Lambda, add the DLQ at the first poison message, the reconciler when correctness starts to matter, SQS-and-workers when I need ordering or burst-smoothing, the proxy when the pool saturates. Every addition is triggered by a real signal, not a guess.
- CLOSE | close | So: ask the three questions that fork the design, ship the straight-line MVP, defer everything that solves a problem I don’t have yet — but keep the two seams that would otherwise force a rewrite. Thin, correct, and built to grow.

### One you built | “Walk me through a complex system you’ve built.”

A different muscle from designing on the spot — lead with the shape, spotlight one decision worth judgment, own one real failure, close on what you’d change. Concrete beats abstract every time.

- FRAME | frame | Name it in one breath before any detail: “It’s an event-driven ingestion pipeline — operators drop files, it routes each by type, processes it once, and catalogs the result, with a reconciler keeping the object store and the database honest.” Now they hold the shape, and everything I add hangs off it instead of piling up as a list.
- THE DECISION | head | Spotlight the single call that shows judgment, not just labor, and say <i>why</i> it mattered. The strong one here is the single-read fork — <code>readStream → PassThrough → [hash | upload]</code>. The obvious version reads the object twice or buffers it, and neither survives a 500 MB file; one read forked two ways holds memory flat at any size. That one concrete detail signals I’ve felt the pain, not just drawn boxes.
- OWN A FAILURE | risk | Don’t narrate a flawless system — it reads as junior. Pick the genuine hard part and own it. For this architecture it’s the dual-write: two stores, no shared transaction, so a crash between the object upload and the row leaves an orphan. The senior move is to name how you <i>catch</i> it — a reconciler on a grace window, guarded by a <b>PENDING</b> marker so it never touches an in-flight upload. The failure plus the fix is the signal; tell the one you actually lived.
- WHAT I’D CHANGE | trade | Hindsight is a senior signal, so volunteer it. The honest evolution: put the queue in front from day one. Per-object Lambda is simple to ship but it’s the expensive, retry-poor choice at volume — SQS buys DLQs, backpressure, and ordering. The framing that lands is naming a trade I’d make <i>knowingly</i>: ship the simple thing to hit the date, but know exactly the seam I’d cut over at.
- LAND IT | close | Close on what it <i>does</i>, not what it is: it eats the firehose without falling over, replays are safe, and partial failures self-heal instead of paging someone at 3 a.m. Then stop — a crisp ending invites the follow-up I want, instead of trailing off into detail they didn’t ask for.

### Test it | “How would you test this pipeline?”

Testing an async, eventually-consistent, multi-store system is its own design problem — the senior move is testing the failure paths, not just the happy line.

- FRAME | frame | Most candidates list unit tests and stop. The honest framing: this is an <i>async, multi-store, eventually-consistent</i> system, so the bugs that matter live in the failure and timing paths — I test those on purpose, not just the happy line.
- UNIT | head | The pure, deterministic logic gets exhaustive table-tests: each <b>strategy-map handler</b> in isolation, the <b>id-collision ladder</b> across every branch — REUSE / REMAP / REGEN / INSERT — and the <b>idempotency check</b>. Fast, total, and where most of the logic actually lives.
- THE REAL TEST | risk | The dual-write is the one that counts. I stand up the real stores (LocalStack or doubles), then <b>kill the process between the S3 upload and the DB row</b> and assert the <b>reconciler heals the orphan</b> inside the grace window. The failure path <i>is</i> the test — skip it and I haven’t tested the part that’s actually hard.
- ROUND-TRIP | sub | Export, then import into a <i>fresh</i> store and assert referential integrity: every <code>oldId→newId</code> remap resolved, no dangling FK. Then a <b>schema-evolution</b> case — a file exported by the <i>old</i> format must still import, because an append-only schema is a promise I have to keep.
- ADVERSARIAL | sub | The hostile set: <b>replay the same event</b> twice and assert exactly one effect (idempotency), feed a <b>poison file</b> and assert it lands in the DLQ without taking down the worker, and run a <b>large-object load test</b> asserting memory stays flat — the backpressure claim is only true once I’ve measured it.
- THE TELL | close | So: table-test the pure logic, but spend the real effort <b>injecting failures and races</b> — process kills, replays, poison inputs, schema drift. The level signal is testing the <i>eventually-consistent failure paths</i>; anyone can assert the happy path returns 200.

### Name the limits | “What would you do differently, or what are the limits of this design?”

Every design trades something — naming the limits you shipped on purpose, each with its fix and the trigger, reads as maturity, not weakness.

- FRAME | frame | A flawless-sounding walkthrough reads as junior. So I name the limits I shipped <i>on purpose</i> — each with its principled fix and the trigger that makes me reach for it. Knowing exactly where the bodies are buried, and saying so unprompted, is the signal.
- THE BIGGEST GAP | head | The dual-write isn’t atomic — two stores, no shared transaction — so the reconciler is a <i>backstop</i>, not a guarantee. The principled fix is a <b>transactional outbox</b>: commit the DB row and an outbox event in one transaction, then a relay performs the S3 work and marks the event done. Now there’s a single atomic commit point, and the external write is guaranteed by the relay’s retries rather than swept up after the fact. I shipped reconciler-plus-compensating-delete because the orphan window is small, self-healing, and far simpler — but the outbox is the cutover the moment correctness has to be airtight.
- THE KNOWING TRADE | trade | Per-object Lambda is the other one: the simplest thing that ships, but the expensive, retry-poor choice at volume — <b>SQS + a worker pool</b> buys DLQs, backpressure, and ordering. I frame it as a trade made <i>knowingly</i> — take the simple path to hit the date, but name the exact seam I’d cut over at and the metric that trips it: sustained concurrency pinned near the account ceiling.
- THE SMALLER SMELLS | sub | Two more I’d raise before they do. The <b>strategy map needs a code deploy</b> to add a file type — fine at low cardinality, but a config-driven plugin registry is the move once types proliferate. And the reconciler’s <b>grace window is a tuned constant</b> — a smell; I’d make it event-driven, aging a <code>PENDING</code> row off the upload’s own timeout instead of babysitting a magic number.
- THE TELL | close | The level signal is naming limits as <i>knowing trades</i>, not confessions: “I shipped X aware of the seam I’d cut to Y, and here’s what triggers it.” A design’s maturity is measured by how precisely you can state its own limits — vague handwaving right there is the actual tell the interviewer is listening for.

## Numbers

The estimation an interviewer makes you do at the whiteboard. State your assumptions and the <b>ceilings fall out of the arithmetic</b> &mdash; adjust any input and the math recomputes.

The number you say isn't the point &mdash; the <b>ceiling</b> it reveals is. Concurrency past 1,000 says &lsquo;buffer through SQS&rsquo;; connections past the pool say &lsquo;RDS Proxy.&rsquo;

- n_obj | Objects / day | 10000000 | 0
- n_size | Avg size (MB) | 2 | 0 | 0.1
- n_proc | Processing (sec) | 2 | 0 | 0.1
- n_peak | Peak : average | 10 | 1

```js
function (vals, fmt) {
    var perDay = vals.n_obj, sizeMB = vals.n_size, procS = vals.n_proc, peakR = vals.n_peak;
    var avg = perDay / 86400, peak = avg * peakR, conc = peak * procS, conn = conc;
    var stDay = perDay * sizeMB / 1e6, stYr = stDay * 365, puts = perDay, putCost = puts / 1000 * 0.005;
    return [
      { k: 'Average throughput', v: fmt.n(avg), u: '/s', n: 'objects/day \u00F7 86,400 seconds', over: false },
      { k: 'Peak throughput', v: fmt.n(peak), u: '/s', n: 'average \u00D7 ' + fmt.n(peakR) + ' peak ratio', over: false },
      { k: 'Lambda concurrency at peak', v: fmt.n(conc), u: '', n: conc > 1000 ? 'exceeds the 1,000 default \u2014 RDS Proxy, or buffer through SQS' : 'peak/s \u00D7 processing time \u2014 within the 1,000 default', over: conc > 1000 },
      { k: 'DB connections at peak', v: fmt.n(conn), u: '', n: conn > 100 ? 'far past a Postgres pool (~100) \u2014 needs RDS Proxy or a queue' : '\u2248 one connection per invocation \u2014 a pool can hold this', over: conn > 100 },
      { k: 'Storage written / day', v: fmt.tb(stDay).split(' ')[0], u: fmt.tb(stDay).split(' ')[1], n: fmt.tb(stYr) + ' per year of raw objects', over: false },
      { k: 'S3 PUTs / day', v: fmt.n(puts), u: '', n: '\u2248 $' + putCost.toFixed(2) + '/day in PUT requests alone', over: false }
    ];
  }
```

## Red Flags

The moves that quietly tank a candidate on this topic. Each one is something a weaker answer actually says &mdash; what the interviewer hears, and the line that flips it.

### &ldquo;I'd query all the rows, then write them to the CSV.&rdquo;

The driver buffers the <b>entire result set</b> in memory before your code runs &mdash; OOM at a million rows. The interviewer hears <i>&ldquo;never run this at scale.&rdquo;</i>

Server-side cursor, 100 rows at a time, piped with backpressure &mdash; <b>constant memory</b> at any row count.

### &ldquo;I'll store the file, then read it back to hash it.&rdquo;

Two full disk reads, or the whole file buffered in RAM &mdash; it dies on a 500&nbsp;MB object.

A <b>PassThrough fork</b> &mdash; one read feeds the hash and the upload at once.

### &ldquo;A switch statement routes each file type to its handler.&rdquo;

Complexity grows with every new type, and each addition <b>edits the router</b> &mdash; a merge-conflict magnet that never stops touching shared code.

An <b>O(1) dispatch map</b>. A new type is one entry and zero router changes.

### &ldquo;It writes to S3 and Postgres, so the data's consistent.&rdquo;

There's <b>no atomicity across two stores</b> &mdash; a partial failure orphans objects or rows. The interviewer hears <i>&ldquo;hasn't thought about the failure path.&rdquo;</i>

Track created keys, <b>compensating delete</b> on failure, and a <b>reconciler</b> as the durable backstop.

### &ldquo;Exactly-once delivery means I won't double-process.&rdquo;

Exactly-once <i>delivery</i> doesn't exist &mdash; S3 and every queue are at-least-once. You <b>will</b> see the same file twice.

Idempotent <b>effects</b> &mdash; a content-hash key or a processed-marker check-and-set. Replays no-op.

### &ldquo;On any failure, I just retry.&rdquo;

Retrying a non-idempotent op <b>double-charges</b>; retrying a <b>poison message</b> stalls the whole lane forever.

Idempotency + a <b>DLQ</b> + backoff + a per-job timeout, so one bad input fails fast instead of hanging.

### &ldquo;Lambda per object &mdash; that's the design.&rdquo;

Defending one choice without naming <b>when it breaks</b> reads as inexperience. The interviewer wants the boundary, not loyalty.

Name the <b>switch condition</b> &mdash; move to SQS the moment you need retries, a DLQ, or ordering.

### &ldquo;A reconciler deletes any S3 key with no DB row.&rdquo;

It will delete an <b>in-flight upload</b> &mdash; object written, row not yet committed. You just corrupted a live request.

A grace window, or a <b>PENDING marker</b>, so the reconciler never touches in-flight work.

### &ldquo;&hellip;so I'd use a Lambda and an S3 trigger and&mdash;&rdquo;

No assumptions stated, no numbers, no ceiling named &mdash; the interviewer can't <b>see you reason</b>, only that you've memorized an architecture.

<b>Frame first</b> (scope + load), then design, then name the <b>resource that gives out first</b>. Reasoning visible beats architecture recited.

Note: (straight into components)

## Opener

### Match the altitude | The same system, said three ways

Interviewers open with <i>&ldquo;quickly, how does it work?&rdquo;</i> as often as <i>&ldquo;design it.&rdquo;</i> Give the altitude they asked for &mdash; the frame when they want the frame, depth when they want depth &mdash; then expand only when they pull. Say each out loud before you reveal mine.

#### <b>One breath.</b> The whole system in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i>

An event-driven ingestion pipeline: an S3 upload fires a Lambda that routes each file by type to a streaming handler &mdash; which hashes it, stores it, and records it &mdash; with a <b>reconciler</b> to mop up partial failures.

#### <b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no code.

Operators push content to S3, which triggers the processor. It routes on file type through an <b>O(1) strategy map</b> &mdash; not a switch &mdash; so a new format is a one-line add. Each handler <b>streams the file once</b> and forks that read to hash and upload in parallel, so memory stays flat no matter the size. The catch: the object store and the database share no transaction, so I track written keys and <b>compensate on failure</b>, with a reconciler as the backstop. And since every trigger is <b>at-least-once</b>, processing is idempotent &mdash; a replay no-ops on a content-hash marker.

##### Hooks

The 30-second version names three loose threads <i>on purpose</i> &mdash; you're steering. Each is a tab you go deep on the moment they pull it:

- &ldquo;memory stays flat&rdquo; | how the export streams a million rows without OOM | Numbers &middot; Walkthrough
- &ldquo;compensate &middot; reconciler&rdquo; | the dual-write, and keeping two stores consistent | Trade-offs &middot; Red Flags
- &ldquo;at-least-once&rdquo; | why exactly-once is a myth and replays stay safe | Probe Drill

Foot: <b>The skill isn't knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude up &mdash; the Walkthrough's nine steps &mdash; and every tab here is a deeper zoom. It's having all of them, and reading which one they want.

### Land it | How to close &mdash; don&rsquo;t trail off

When time&rsquo;s nearly up &mdash; or they ask <i>&ldquo;anything else?&rdquo;</i> &mdash; <b>don&rsquo;t just stop.</b> A proactive close is a seniority signal: summarize the shape, name what you&rsquo;d watch, hand the wheel back. Thirty seconds, unprompted. Say each out loud before you reveal mine.

#### <b>Summarize in one line.</b> Re-state the spine so they remember the shape, not the detours.

&ldquo;So &mdash; event-driven ingestion, routed by type to streaming handlers, kept consistent across two stores by a reconciler, and idempotent against replays. That&rsquo;s the core.&rdquo;

#### <b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.

&ldquo;In production I&rsquo;d watch three things: <b>reconciler correctness under concurrency</b>, the piece most likely to hide a race; the <b>cost curve</b>, since per-object Lambda gets pricey fast; and the <b>exactly-once illusion</b> &mdash; I&rsquo;d keep proving idempotency rather than trusting delivery.&rdquo;

#### <b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.

&ldquo;With more time I&rsquo;d add the <b>status API</b> for consumers and the <b>multi-region</b> story. I left out auth and the client deliberately &mdash; out of scope for the pipeline. Where would you like to go deeper?&rdquo;

Foot: <b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs, and your named risks are the threads they&rsquo;ll pull. The tell: juniors stop when they run out of things to say; seniors stop on a <i>summary, a risk list, and an invitation.</i>

## Bank

### FRAME | &ldquo;Design the content pipeline &mdash; start wherever you like.&rdquo;

Task: Frame the scope in one line, then give your one-sentence version.

Model: <b>Frame:</b> operators push files to S3; the system processes, stores, and catalogs them, and serves bulk export / import. <b>One-liner:</b> an event-driven ingestion pipeline &mdash; an S3 upload fires a Lambda that routes each file by type to a streaming handler that hashes, stores, and records it, with a reconciler for partial failures.

Int: Before you go on &mdash; why event-driven at all? Why not just do the work inside the upload request?
It decouples upload latency from processing &mdash; the PUT returns the moment S3 has the bytes, and the pipeline scales on its own clock. Doing it inline ties the user&rsquo;s request to the slowest handler and welds two failure domains together. The trade I&rsquo;d name out loud: you inherit eventual consistency and surface processing errors out-of-band, not in the response.

Int2: OK, event-driven. But a user uploads and immediately wants to see the result &mdash; your async pipeline hasn&rsquo;t run yet. What do they see?
A first-class <b>processing state</b>: the upload returns instantly, the record reads <code>PROCESSING</code>, and the UI polls or subscribes for the terminal state. I never block the upload on the work, but I make the in-flight state visible so they&rsquo;re not staring at a missing file. If they need the result <i>now</i>, that&rsquo;s the argument for a synchronous fast-path on small inputs &mdash; two tiers by interactivity.

### STRUCTURE | &ldquo;Walk me through it.&rdquo;

Task: Talk the whole flow, entry to backstop &mdash; no code, just the spine.

Model: Entry handler &rarr; extension routes through an <b>O(1) strategy map</b> &rarr; each handler streams the file once, forking that read to hash + S3 upload &rarr; record in the DB. Export streams via a server-side cursor at <b>constant memory</b>; import runs the REUSE / REMAP / REGEN / INSERT ladder with an oldId&rarr;newId FK remap. The dual-write has no shared transaction &rarr; compensate on failure, with a <b>reconciler</b> backstop. Replays are idempotent via a processed-marker.

Int: A type you&rsquo;ve never seen lands &mdash; someone uploads a <b>.heic</b>. What happens?
The extension misses the strategy map and hits the default branch: a logged <b>skip</b>, a no-op, never a throw that poisons the batch. Adding support is one map entry plus a handler &mdash; the dispatcher never changes. That&rsquo;s the whole reason it&rsquo;s a map and not a switch: open for extension, closed for modification.

### SCALE | &ldquo;10,000 objects land in one second. What breaks first?&rdquo;

Task: Name the first ceiling, then the fix &mdash; don&rsquo;t hand-wave &lsquo;it scales.&rsquo;

Model: <b>Lambda concurrency</b> throttles first &rarr; events retry / DLQ. Then the <b>DB pool</b> and the <b>S3 PUT-per-prefix</b> rate. Fixes: RDS Proxy or a queue for concurrency, spread key prefixes for PUT rate. At firehose scale, buffer through SQS / Kinesis and drain at a controlled rate.

Int: You said Lambda. At ~1,150 invocations a second, what saturates <i>first</i> &mdash; be specific.
Lambda&rsquo;s account concurrency ceiling &mdash; default ~1,000 &mdash; throttles before anything else, so events retry and spill to the DLQ. Behind it the DB connection pool goes next (hence RDS Proxy), then S3&rsquo;s per-prefix PUT rate. Name the order: concurrency, connections, prefix throughput &mdash; and put SQS in front so a burst queues instead of throttling.

Int2: You put SQS in front. Now the queue is two million messages deep and climbing. What&rsquo;s actually wrong, and what do you do?
A growing queue means arrival rate is beating processing rate. First I split the cause: a <b>poison message</b> stalling a consumer, or genuine under-provisioning? Poison &rarr; the DLQ and redrive isolate it. Throughput &rarr; scale consumers and check downstream, because the real floor is usually the DB or a third-party call, not the consumer. A queue is a shock absorber, not a fix &mdash; a permanently growing one means the floor is set too low.

### FAILURE | &ldquo;The DB write fails after S3 already succeeded. Now what?&rdquo;

Task: Walk the failure path, then the guarantee that makes a retry safe.

Model: <b>Dual-write hole:</b> the object is orphaned. Track written keys, compensating-delete in the catch. If cleanup also fails, queue it for async retry &mdash; the durable backstop is a <b>reconciler</b> sweeping keys with no DB row, guarded by a <b>PENDING marker</b> so it never deletes an in-flight upload.

Int: Your compensating delete fails too &mdash; the catch block itself throws. Now what?
Then compensation was never the guarantee &mdash; it&rsquo;s best-effort. The durable backstop is the <b>reconciler</b>: it sweeps S3 for keys with no DB row and removes them, past a grace window so it never touches an in-flight upload. The failed delete just becomes one more orphan the sweep catches &mdash; that&rsquo;s why I volunteer it: the happy-path cleanup is the optimization, the sweep is the contract.

Int2: Your reconciler is about to delete an object that a slow, still-in-flight upload will write a DB row for. You&rsquo;d be corrupting a valid upload. How do you stop that?
That&rsquo;s the entire reason for the <b>grace window</b> and the <b>PENDING marker</b>. The sweep only deletes keys older than the window with no DB row <i>and</i> no marker &mdash; an in-flight upload writes PENDING first, so the sweep skips it. The window has to exceed the slowest legitimate upload. And I&rsquo;d run the sweep <b>dry-run first</b>, alarming on what it <i>would</i> delete, before it&rsquo;s ever allowed to delete for real.

### CURVEBALL | Exactly-once | &ldquo;Guarantee exactly-once processing.&rdquo;

Task: Reframe the premise out loud, then give the real mechanism.

Model: Exactly-once <i>delivery</i> doesn&rsquo;t exist &mdash; S3 and queues are at-least-once. I build idempotent <b>effects</b>: a content-hash key or a processed-marker (a conditional put) the handler checks first, committed atomically with the work. A redelivered event no-ops.

Int: Fine, idempotent effects. But two workers race on the same new file at the same instant &mdash; both check the marker, both see nothing. Then what?
The check-and-write has to be <b>atomic</b>, not two steps. The processed-marker is a conditional put / unique-key insert &mdash; the first writer wins, the second&rsquo;s conditional fails and it no-ops. If I checked, then wrote, separately, the race you describe double-processes; the atomicity of the marker is exactly what closes it.

### CLOSE | &ldquo;Sum it up &mdash; and what would you watch in prod?&rdquo;

Task: Two-sentence close, then the one metric you&rsquo;d alarm on.

Model: It&rsquo;s a streaming, event-driven pipeline that stays constant-memory at any scale and self-heals partial failures through compensation plus a reconciler. In prod I&rsquo;d watch the <b>reconciler&rsquo;s orphan count</b> &mdash; a rising trend means the compensation path is failing silently, the early warning for the whole dual-write design.

Int: You&rsquo;ve got a week, not a month. Cut one thing you described to ship &mdash; what goes?
The reconciler comes out first &mdash; I keep the compensating delete, alarm hard on any write that misses its catch, accept a small <i>monitored</i> orphan risk, and add the sweep next sprint. What I would <i>not</i> cut is the idempotent marker or the single-read streaming &mdash; those are load-bearing for correctness and memory, not nice-to-haves. Knowing which is which is the answer.

### Extra Curveballs

### CURVEBALL | Security | &ldquo;A user uploads a file crafted to crash your image library &mdash; or a zip bomb. How do you keep one bad upload from taking down the pipeline?&rdquo;

Task: Name the defenses in layers, then the one that contains an input that slips through.

Model: Layered. The <b>strategy map is already an allowlist</b> &mdash; an unrecognized type skips, never executes. I cap object size at the gateway, validate type by <b>content, not extension</b>, and never run uploaded bytes &mdash; handlers parse, they don&rsquo;t exec. The processor runs <b>sandboxed with least-privilege IAM</b>, so a library exploit can&rsquo;t reach anything around it.

Int: A file that&rsquo;s <i>valid</i> by every check still hangs your library forever &mdash; CPU pinned, the worker stuck. Now what?
That&rsquo;s a <b>poison message</b>, and the containment is a hard <b>per-job timeout and resource cap</b> &mdash; the job fails fast instead of pinning the lane, the event redelivers, and after N attempts the <b>DLQ</b> isolates it so it stops cycling. One pathological input degrades one message, never the pipeline. The timeout is the contract; validation just lowers how often you hit it.

### CURVEBALL | Cost | &ldquo;Finance says this pipeline&rsquo;s AWS bill doubled last month. Where&rsquo;s the money, and how do you cut it?&rdquo;

Task: Profile before optimizing, then name the single biggest lever.

Model: First I&rsquo;d <b>profile, not guess</b> &mdash; Cost Explorer broken out by service. The usual drivers here: <b>Lambda invocations</b> (one per object adds up fast), <b>S3 requests and storage</b>, and <b>data transfer</b>. Levers: lifecycle cold objects to cheaper tiers or Glacier, right-size Lambda memory &mdash; and the big one, at high volume <b>per-object Lambda is the expensive choice</b>; batching through SQS amortizes the fixed invocation overhead.

Int: Give me the single biggest lever &mdash; and why it&rsquo;s counterintuitive.
<b>Batch the processing.</b> The per-object, one-Lambda-per-file design that&rsquo;s so clean at low volume is exactly what&rsquo;s costly at firehose scale &mdash; you pay fixed invocation and connection-setup overhead millions of times over. Buffering through SQS or Kinesis and draining in batches spreads that overhead across many files at once. It&rsquo;s the same switch condition as scaling: the elegant low-volume design and the cheap high-volume design are <i>different designs</i>, and naming where they diverge is the point.

### CURVEBALL | Backfill | &ldquo;You shipped a new thumbnail size. Now you need to reprocess all 10 million existing objects. How?&rdquo;

Task: Reprocess at scale without melting live traffic &mdash; and say why retry is safe.

Model: A <b>backfill job</b> that enumerates existing keys and re-enqueues them through the <i>same</i> pipeline &mdash; I don&rsquo;t write a second one. Two musts: <b>rate-limit</b> the backfill so it can&rsquo;t starve live ingestion, and lean on the work already being <b>idempotent</b> &mdash; re-processing a file is a no-op-or-overwrite, so a retry, or an overlap with a live upload, can&rsquo;t corrupt anything.

Int: The backfill is now fighting live uploads for Lambda concurrency and the DB pool, and live traffic is slowing. How do you isolate them?
<b>Separate the lanes.</b> The backfill gets its own queue with <b>reserved, capped concurrency</b>, so it can never take more than its slice and live ingestion keeps its headroom. I run it low-priority, drain slowly, and watch the live <b>freshness SLO</b> &mdash; if it dips, the backfill throttles further. The principle: a bulk job and interactive traffic must never share an unbounded resource pool &mdash; partition the concurrency so one can&rsquo;t starve the other.

### CURVEBALL | Ordering | &ldquo;These files must be processed in the order they were uploaded &mdash; but S3 events don&rsquo;t guarantee order. How?&rdquo;

Task: Reconcile unordered delivery with an ordering need &mdash; and question whether you need it.

Model: First I&rsquo;d <b>challenge the requirement</b> &mdash; true global ordering is expensive, and usually you only need <b>per-key or per-tenant</b> order. If it&rsquo;s real: S3 &rarr; <b>SQS FIFO</b> with a message group per ordering key serializes within a key while staying parallel across keys. Or stamp a <b>sequence number at upload</b> and let the processor order by it, rejecting stale writes. I wouldn&rsquo;t serialize the whole pipeline for a need that&rsquo;s narrower than it first sounds.

Int: FIFO caps throughput per message group, and your one hot key needs both strict order <i>and</i> high volume. Now what?
That&rsquo;s a real tension &mdash; strict order and high parallelism on a single key fight each other. I&rsquo;d push on whether per-event order is truly needed or just <b>eventual correctness</b>: a <b>version number with last-writer-wins</b> gives convergence without serializing, so events process in parallel and the highest version wins. If order is genuinely non-negotiable, that hot key is a throughput ceiling you design around &mdash; shard it if the semantics allow, or accept the FIFO group&rsquo;s rate as the limit. Saying out loud that you can&rsquo;t have both is the senior move.

### CURVEBALL | Multi-region | &ldquo;This runs in one region. The business now needs it to survive a full region outage with near-zero data loss. What changes?&rdquo;

Task: Name what goes cross-region, the consistency you can actually promise, and the honest RPO.

Model: Both stores replicate cross-region: <b>S3 Cross-Region Replication</b> for the blobs, and the catalog moves to a multi-region database &mdash; a promoted read-replica for active-passive, or <b>global tables / Aurora Global</b> for active-active. Uploads process in whichever region they land in; replication carries <i>both</i> the object and its row to the standby, so it stays warm. The <b>reconciler runs per region</b>, scoped to that region&rsquo;s own writes so the two don&rsquo;t fight over replicated keys. Failover is a routing flip to the already-warm standby.

Int: Near-zero data loss across regions &mdash; can you actually guarantee zero RPO?
No, and saying so is the senior move. <b>Replication is asynchronous</b>, so the honest RPO is the replication lag &mdash; seconds, not zero. True zero-RPO needs <b>synchronous cross-region writes</b>, and that latency is usually a worse deal than the few seconds of exposure. So I name the number I can hit (single-digit-second RPO), the consistency model (<b>eventual</b> across regions, with last-writer-wins on conflicts for active-active), and let the business decide if that window is acceptable &mdash; rather than pretending a distributed system can be both consistent and partition-tolerant for free.

### CURVEBALL | Silent failure | &ldquo;An operator swears they uploaded a file two hours ago, but it never landed in the catalog &mdash; and no error ever reached them. Walk me through finding out why.&rdquo;

Task: Trace one item&rsquo;s journey and name where you&rsquo;d look, in order &mdash; plus the silent-failure suspects.

Model: The failure is silent, so I trace a single key through every stage rather than stare at dashboards &mdash; the object key <i>is</i> my correlation id. <b>One:</b> did the <b>S3 event</b> even fire? Confirm the object is in the bucket and ObjectCreated was emitted &mdash; if the prefix/suffix filter didn&rsquo;t match, no event was ever sent. <b>Two:</b> did the <b>consumer run?</b> Grep the logs for that key &mdash; nothing means it was never picked up. <b>Three:</b> did it <b>skip silently?</b> An unknown extension hits the strategy-map default and is dropped on purpose &mdash; the single most common cause of &lsquo;no error, no result.&rsquo; <b>Four:</b> is it in the <b>DLQ?</b> It errored, retried, and parked &mdash; a real error that never surfaced to the operator. <b>Five:</b> is it an <b>orphan?</b> The S3 upload succeeded but the row write didn&rsquo;t &mdash; object present, catalog row absent, reconciler hasn&rsquo;t swept yet. Five suspects, one key, checked in order.

Int: There&rsquo;s nothing in your logs at all for that key. Now what?
Then the event never reached my code, so I stop grepping handler logs &mdash; the problem is <i>upstream</i> of everything I own. Either the <b>S3 notification isn&rsquo;t configured</b> on that bucket/prefix, the operator uploaded to the <b>wrong bucket or prefix</b>, or the ObjectCreated <b>filter excluded</b> the key. &lsquo;No logs anywhere&rsquo; is itself the signal &mdash; it points past my processing tier to the event wiring, so I verify the bucket they actually used and its notification config instead of hunting for a bug in code that never ran.

### CURVEBALL | Deploy under load | &ldquo;There&rsquo;s a bug in the parsing logic and you need to ship the fix now &mdash; but there are fifty thousand messages in flight and more landing every second. Roll it out without dropping or double-processing a single one.&rdquo;

Task: Name what makes the rollout safe, and the one property the pipeline already needs for it to work.

Model: The deploy is safe for the same reason the pipeline is reliable: the work lives in a <b>durable queue</b>, not in the workers &mdash; so I can replace workers without losing a message. It&rsquo;s a <b>rolling deploy</b>: stand up new-version workers, then <b>drain</b> the old ones (stop pulling, let in-flight messages finish, then terminate), so nothing is dropped mid-process. The property that makes it <i>actually</i> safe is <b>idempotency</b> &mdash; during the cutover both versions run for a moment and a message can be redelivered across it, so the processed-marker (a conditional put) is what stops a double-process. And I <b>canary</b> it: roll to a small slice of workers first, watch error rate and DLQ depth, then roll forward or back. Rollback is safe by that same idempotency &mdash; re-running a message is harmless.

Int: You rolled out, and the new version is erroring on messages the <i>old</i> path enqueued. Now what?
That&rsquo;s a <b>backward-compatibility break</b> &mdash; the new code can&rsquo;t parse the shape the old code wrote, and the queue is full of old-shape messages. Roll the workers back immediately; nothing&rsquo;s lost because the queue held everything. Then make the change <b>additive</b>: the new code has to handle <i>both</i> shapes &mdash; a version field or tolerant parsing &mdash; deploy that, and only drop the old-shape path once no old messages remain. The lesson is that a consumer deploy <i>is</i> a contract change, and contracts stay backward-compatible because the queue still holds messages written before the deploy.

### Frames

- &ldquo;Users upload files; we process them, store them, and serve bulk import and export. Design the backend.&rdquo;
- &ldquo;Walk me through the architecture behind file upload, processing, and bulk data transfer.&rdquo;
- &ldquo;Design an ingestion pipeline &mdash; uploads come in, get processed by type, stored, and cataloged.&rdquo;
