/* topics/content-pipeline/model.js -- FOUNDATION-seeded REAL data.
   modelAnswers is pane-local (defined later in app.js order), so a thin alias would
   capture undefined -- the foundation seeds the real array directly (section 8 #3).
   The model agent makes this the canonical home + deletes answers.js in Phase 1. */
var TOPIC_CP_MODEL = {
  selectors: ['Make it reliable', 'Make it scale', 'Walk a failure', 'Defend the design', 'Operate it', 'Cut scope', 'One you built', 'Test it', 'Name the limits'],
  answers: [
  { opener:"\u201CHow would you make this reliable?\u201D",
    sub:"Production-grade = no data lost across S3+DB, and no work done twice on a retry.",
    beats:[
      {l:"FRAME",c:"frame",t:"Reliability here is two guarantees: <b>no data lost</b> across the S3-and-DB boundary, and <b>no work done twice</b> on a retry. Let me take them in turn."},
      {l:"HEADLINE",c:"head",t:"The central risk is the <b>dual-write</b> \u2014 the DB and S3 can disagree \u2014 so every write is idempotent and a <b>reconciler</b> is the real backstop."},
      {l:"NO LOSS",c:"sub",t:"On the write path I track every S3 key I create; if the DB transaction fails, I delete those keys in the catch. Best-effort cleanup can fail too, so the actual guarantee is a reconciler sweeping S3 for keys with <b>no DB row</b> and removing the orphans \u2014 eventually consistent, but correct."},
      {l:"NO REPLAY",c:"sub",t:"On the processing path, delivery is at-least-once, so I never lean on exactly-once. I make the effect <b>idempotent</b> \u2014 a content-hash key with an upsert, or a processed-marker the handler checks-and-sets first \u2014 so a redelivered event is a no-op."},
      {l:"NAME THE RISK",c:"risk",t:"The subtle bug is the reconciler racing an <b>in-flight upload</b>: object written, row not yet committed. I close it with an explicit <b>PENDING marker</b> written before the upload, so the reconciler never deletes work still in progress."},
      {l:"TRADE-OFF",c:"trade",t:"I add a DLQ the moment failures need inspecting, and retries-with-backoff for transient errors \u2014 but I wouldn\u2019t reach for distributed transactions. Idempotent writes plus a reconciler give the same guarantee far more cheaply."},
      {l:"CLOSE",c:"close",t:"So: idempotent effects, compensating cleanup, a reconciler backstop, and explicit pending-state to kill the races \u2014 production-grade without 2PC."}
    ] },
  { opener:"\u201CHow does this scale?\u201D",
    sub:"\u2018Scale\u2019 for this pipeline is really \u2018which resource saturates first.\u2019",
    beats:[
      {l:"FRAME",c:"frame",t:"Let me pin the load first, then walk the chain and name what saturates at each stage \u2014 because <b>scale here is really \u2018which resource gives out first.\u2019</b>"},
      {l:"HEADLINE",c:"head",t:"At normal volume the Lambda-per-object design is fine. Under a burst the first ceiling is <b>Lambda concurrency</b>, then the <b>DB connection pool</b>, then the <b>S3 PUT rate per prefix</b>."},
      {l:"NUMBERS",c:"sub",t:"Say 10 million objects a day \u2014 about <b>115/second</b> average, bursting past <b>1,000/second</b>. Each invocation holds a DB connection, so a thousand concurrent Lambdas blows past Postgres\u2019s connection limit. Fix: <b>RDS Proxy</b> to pool connections, or buffer through SQS so I own consumer concurrency."},
      {l:"PREFIX",c:"sub",t:"S3 caps writes per prefix, so if every key shares one prefix I throttle. I spread keys across prefixes <b>by hash</b> to parallelize, and large objects go <b>multipart</b> \u2014 a 500\u00A0MB upload becomes a hundred parallel parts, not one serial stream."},
      {l:"NAME THE RISK",c:"risk",t:"The silent killer is the <b>held cursor</b> on exports \u2014 a slow client pins a DB connection open, and enough slow readers exhaust the pool. I cap it with a statement timeout, or stream the export to S3 and hand back a presigned URL so the database is out of the read path entirely."},
      {l:"TRADE-OFF",c:"trade",t:"Lambda-per-object buys zero ops and low latency; the moment I need ordering, retries, a DLQ, or burst-smoothing, I move to <b>SQS and a worker pool</b>. That\u2019s the switch condition."},
      {l:"CEILING",c:"ceil",t:"At true firehose scale I stop processing per-object synchronously and <b>batch through SQS or Kinesis</b> \u2014 amortizing fixed costs and decoupling arrival rate from processing rate."}
    ] },
  { opener:"\u201CWalk me through a failure.\u201D",
    sub:"A concrete incident: thumbnails stop appearing, but uploads still succeed.",
    beats:[
      {l:"FRAME",c:"frame",t:"Let me take a real one: <b>thumbnails stop appearing</b> for new uploads, but the uploads themselves succeed. I\u2019ll narrate how I localize it."},
      {l:"HEADLINE",c:"head",t:"Uploads working but processing not means the break is <b>past the S3 write</b> \u2014 in event delivery or the processor \u2014 so I check the four signals: queue depth, processing latency, error rate, reconciler orphan count."},
      {l:"LOCALIZE",c:"sub",t:"Orphan count is climbing \u2014 objects with no processed row \u2014 so the processor gets events but fails to finish. Error rate is flat, ruling out crashes; latency p99 has spiked. That points at a <b>slow downstream dependency</b>, not a bug in my code."},
      {l:"ROOT CAUSE",c:"sub",t:"The image library is timing out on a new file type someone started uploading \u2014 each job hangs to its limit, then the event redelivers, piling up the queue. It\u2019s a <b>poison-message pattern</b>: one bad input stalling the lane."},
      {l:"FIX",c:"sub",t:"Immediate: a <b>DLQ</b> so poison messages stop redelivering and the lane drains. Then a guard \u2014 validate the type and cap processing time per job \u2014 so a bad input <b>fails fast</b> instead of hanging. The reconciler cleans the orphans once processing catches up."},
      {l:"NAME THE RISK",c:"risk",t:"What I\u2019d flag in the postmortem: we had <b>no per-type timeout and no DLQ</b>, so a single unsupported file could silently back up the whole pipeline. Both are now defaults."},
      {l:"CLOSE",c:"close",t:"So the discipline is: localize with the four signals, separate slow-from-failing, find the poison input, fail it fast, and let the reconciler reconcile state."}
    ] },
  { opener:"\u201CWhy this design?\u201D",
    sub:"Defend it on cost and how it absorbs change \u2014 not just whether it works.",
    beats:[
      {l:"FRAME",c:"frame",t:"Let me defend it on the two axes that matter for an ingestion pipeline: <b>operational cost</b> and <b>how it absorbs change</b> \u2014 not just whether it works."},
      {l:"HEADLINE",c:"head",t:"The spine is a <b>strategy-dispatch map</b> plus event-driven S3 triggers: O(1) routing, one handler contract, and uploads push work so nothing polls. The dispatcher\u2019s complexity stays at one forever, and a new content type is a single map entry."},
      {l:"EXTENSIBILITY",c:"sub",t:"Adding <code>.webp</code> or a video handler is one line and zero caller changes, because every handler returns the same normalized result shape. It extends <b>along its grain</b> \u2014 when transcoding needs real compute, the same map just routes to ECS instead of processing inline."},
      {l:"STREAMING",c:"sub",t:"Memory is constant regardless of file size because every byte path is streamed and backpressured \u2014 the PassThrough fork for hashing, the cursor for exports. A 5\u00A0GB object costs the same RAM as a 5\u00A0MB one. A deliberate choice, not an accident."},
      {l:"NAME THE RISK",c:"risk",t:"Where I\u2019m honest about the cost: event delivery is at-least-once and the S3-DB write is a dual-write, so I\u2019m buying simplicity and paying with <b>idempotent effects and a reconciler</b>. I\u2019d rather pay there than run two-phase commit."},
      {l:"TRADE-OFF",c:"trade",t:"And it has a clean upgrade path \u2014 Lambda-per-object now, SQS-plus-workers the moment I need retries, ordering, or a DLQ. I\u2019m not locked in; I\u2019ve named the exact threshold where I\u2019d switch."},
      {l:"CLOSE",c:"close",t:"So it\u2019s cheap to run, cheap to extend, flat in memory, and honest about its one trade-off \u2014 which is what I want from an ingestion layer."}
    ] },
  { opener:"\u201CHow would you know it\u2019s healthy in production?\u201D",
    sub:"Operational maturity = the pipeline tells you it\u2019s failing before a user does.",
    beats:[
      {l:"FRAME",c:"frame",t:"Health here isn\u2019t \u2018is the box up\u2019 \u2014 it\u2019s \u2018is work flowing and arriving correctly.\u2019 So I instrument the pipeline as a flow and define <b>healthy</b> as SLOs, not vibes."},
      {l:"HEADLINE",c:"head",t:"The dashboard is the <b>four golden signals</b> mapped to this pipeline: <b>queue depth</b> (work waiting), <b>processing latency p99</b> (upload to processed-row), <b>error rate</b> (failures / min), and the one most people miss \u2014 <b>reconciler orphan count</b>, my correctness signal."},
      {l:"THE TARGETS",c:"sub",t:"The SLIs I\u2019d commit to: <b>freshness</b> \u2014 p99 upload-to-processed under ~60\u00A0seconds \u2014 and <b>completeness</b>, the fraction of uploads that reach a terminal state. Freshness catches a <i>slow</i> pipeline; completeness catches a <i>lossy</i> one, which is the scarier failure."},
      {l:"ALERT ON",c:"sub",t:"I alert on <b>symptoms and SLO burn</b>, not raw metrics. Page on: queue depth climbing for N minutes, the freshness SLO burning, or DLQ size above zero. I do <b>not</b> page on a single failed job \u2014 retries and the DLQ absorb that. Alert on the <b>trend</b>, not the blip."},
      {l:"THE TELL",c:"risk",t:"The signal that separates levels is <b>orphan count</b>. Error rate flat but orphans climbing means objects are landing in S3 with no processed row \u2014 the pipeline is <i>silently</i> losing work while every box looks green. That\u2019s the metric I put front and center, because it\u2019s the failure a naive dashboard can\u2019t see."},
      {l:"TRACE",c:"sub",t:"For diagnosis I carry a <b>correlation id</b> \u2014 the object key \u2014 through the event, the logs, and the DB row, so one slow file is traceable across S3, the queue, and the processor without grepping by timestamp. That turns \u2018thumbnails are slow\u2019 into the exact poison input in minutes."},
      {l:"CLOSE",c:"close",t:"So: four golden signals with orphan-count as the correctness canary, SLOs on freshness and completeness, alert on burn not blips, and a correlation id that makes any one file traceable end-to-end \u2014 the pipeline tells me it\u2019s failing before a user does."}
    ] },
  { opener:"\u201CWhat would you build first?\u201D",
    sub:"Pragmatism = the thinnest thing that works, with the seams that let it grow.",
    beats:[
      {l:"FRAME",c:"frame",t:"Scoping is a senior move before it\u2019s a coding one \u2014 I\u2019d ask the two or three questions that actually <b>fork the design</b>, then build the thinnest thing that survives those answers."},
      {l:"QUESTIONS",c:"sub",t:"The questions that change what I build: <b>which content types</b> (that sizes the strategy map), <b>what volume</b> (Lambda-per-object vs a worker pool), and <b>is async acceptable</b> (whether I need a queue at all). Most other details don\u2019t move the architecture \u2014 these three do."},
      {l:"THE MVP",c:"sub",t:"Given ordinary answers, the MVP is a straight line: <b>S3 ObjectCreated \u2192 one Lambda \u2192 a single handler \u2192 a DB row.</b> One content type, processed inline, no queue, no reconciler. That ships in days and is correct for the happy path."},
      {l:"DEFER",c:"sub",t:"What I\u2019d consciously <i>not</i> build yet: the <b>DLQ</b>, <b>multipart</b>, the <b>reconciler</b>, <b>RDS Proxy</b>. Each answers a problem I don\u2019t have at MVP scale \u2014 I add the DLQ the first time a poison message bites, the reconciler when a dropped file actually hurts, the proxy when connections saturate."},
      {l:"NEVER CUT",c:"risk",t:"Two things I build from line one anyway, because cutting them means a <b>rewrite</b>, not a patch: the <b>strategy-map seam</b>, so a second content type is one entry and not a refactor \u2014 and <b>idempotency</b>, because at-least-once becomes a property of the system the moment I add a queue, and retrofitting it is brutal."},
      {l:"SEQUENCE",c:"sub",t:"So the growth path is ordered by <b>what gives out first</b>: ship inline-Lambda, add the DLQ at the first poison message, the reconciler when correctness starts to matter, SQS-and-workers when I need ordering or burst-smoothing, the proxy when the pool saturates. Every addition is triggered by a real signal, not a guess."},
      {l:"CLOSE",c:"close",t:"So: ask the three questions that fork the design, ship the straight-line MVP, defer everything that solves a problem I don\u2019t have yet \u2014 but keep the two seams that would otherwise force a rewrite. Thin, correct, and built to grow."}
    ] },
   { opener:"\u201CWalk me through a complex system you\u2019ve built.\u201D",
     sub:"A different muscle from designing on the spot \u2014 lead with the shape, spotlight one decision worth judgment, own one real failure, close on what you\u2019d change. Concrete beats abstract every time.",
     beats:[
       {l:"FRAME",c:"frame",t:"Name it in one breath before any detail: \u201CIt\u2019s an event-driven ingestion pipeline \u2014 operators drop files, it routes each by type, processes it once, and catalogs the result, with a reconciler keeping the object store and the database honest.\u201D Now they hold the shape, and everything I add hangs off it instead of piling up as a list."},
       {l:"THE DECISION",c:"head",t:"Spotlight the single call that shows judgment, not just labor, and say <i>why</i> it mattered. The strong one here is the single-read fork \u2014 <code>readStream \u2192 PassThrough \u2192 [hash | upload]</code>. The obvious version reads the object twice or buffers it, and neither survives a 500\u00A0MB file; one read forked two ways holds memory flat at any size. That one concrete detail signals I\u2019ve felt the pain, not just drawn boxes."},
       {l:"OWN A FAILURE",c:"risk",t:"Don\u2019t narrate a flawless system \u2014 it reads as junior. Pick the genuine hard part and own it. For this architecture it\u2019s the dual-write: two stores, no shared transaction, so a crash between the object upload and the row leaves an orphan. The senior move is to name how you <i>catch</i> it \u2014 a reconciler on a grace window, guarded by a <b>PENDING</b> marker so it never touches an in-flight upload. The failure plus the fix is the signal; tell the one you actually lived."},
       {l:"WHAT I\u2019D CHANGE",c:"trade",t:"Hindsight is a senior signal, so volunteer it. The honest evolution: put the queue in front from day one. Per-object Lambda is simple to ship but it\u2019s the expensive, retry-poor choice at volume \u2014 SQS buys DLQs, backpressure, and ordering. The framing that lands is naming a trade I\u2019d make <i>knowingly</i>: ship the simple thing to hit the date, but know exactly the seam I\u2019d cut over at."},
       {l:"LAND IT",c:"close",t:"Close on what it <i>does</i>, not what it is: it eats the firehose without falling over, replays are safe, and partial failures self-heal instead of paging someone at 3\u00A0a.m. Then stop \u2014 a crisp ending invites the follow-up I want, instead of trailing off into detail they didn\u2019t ask for."}
     ] },
   { opener:"\u201CHow would you test this pipeline?\u201D",
     sub:"Testing an async, eventually-consistent, multi-store system is its own design problem \u2014 the senior move is testing the failure paths, not just the happy line.",
     beats:[
       {l:"FRAME",c:"frame",t:"Most candidates list unit tests and stop. The honest framing: this is an <i>async, multi-store, eventually-consistent</i> system, so the bugs that matter live in the failure and timing paths \u2014 I test those on purpose, not just the happy line."},
       {l:"UNIT",c:"head",t:"The pure, deterministic logic gets exhaustive table-tests: each <b>strategy-map handler</b> in isolation, the <b>id-collision ladder</b> across every branch \u2014 REUSE / REMAP / REGEN / INSERT \u2014 and the <b>idempotency check</b>. Fast, total, and where most of the logic actually lives."},
       {l:"THE REAL TEST",c:"risk",t:"The dual-write is the one that counts. I stand up the real stores (LocalStack or doubles), then <b>kill the process between the S3 upload and the DB row</b> and assert the <b>reconciler heals the orphan</b> inside the grace window. The failure path <i>is</i> the test \u2014 skip it and I haven\u2019t tested the part that\u2019s actually hard."},
       {l:"ROUND-TRIP",c:"sub",t:"Export, then import into a <i>fresh</i> store and assert referential integrity: every <code>oldId\u2192newId</code> remap resolved, no dangling FK. Then a <b>schema-evolution</b> case \u2014 a file exported by the <i>old</i> format must still import, because an append-only schema is a promise I have to keep."},
       {l:"ADVERSARIAL",c:"sub",t:"The hostile set: <b>replay the same event</b> twice and assert exactly one effect (idempotency), feed a <b>poison file</b> and assert it lands in the DLQ without taking down the worker, and run a <b>large-object load test</b> asserting memory stays flat \u2014 the backpressure claim is only true once I\u2019ve measured it."},
       {l:"THE TELL",c:"close",t:"So: table-test the pure logic, but spend the real effort <b>injecting failures and races</b> \u2014 process kills, replays, poison inputs, schema drift. The level signal is testing the <i>eventually-consistent failure paths</i>; anyone can assert the happy path returns 200."}
     ] },
   { opener:"\u201CWhat would you do differently, or what are the limits of this design?\u201D",
     sub:"Every design trades something \u2014 naming the limits you shipped on purpose, each with its fix and the trigger, reads as maturity, not weakness.",
     beats:[
       {l:"FRAME",c:"frame",t:"A flawless-sounding walkthrough reads as junior. So I name the limits I shipped <i>on purpose</i> \u2014 each with its principled fix and the trigger that makes me reach for it. Knowing exactly where the bodies are buried, and saying so unprompted, is the signal."},
       {l:"THE BIGGEST GAP",c:"head",t:"The dual-write isn\u2019t atomic \u2014 two stores, no shared transaction \u2014 so the reconciler is a <i>backstop</i>, not a guarantee. The principled fix is a <b>transactional outbox</b>: commit the DB row and an outbox event in one transaction, then a relay performs the S3 work and marks the event done. Now there\u2019s a single atomic commit point, and the external write is guaranteed by the relay\u2019s retries rather than swept up after the fact. I shipped reconciler-plus-compensating-delete because the orphan window is small, self-healing, and far simpler \u2014 but the outbox is the cutover the moment correctness has to be airtight."},
       {l:"THE KNOWING TRADE",c:"trade",t:"Per-object Lambda is the other one: the simplest thing that ships, but the expensive, retry-poor choice at volume \u2014 <b>SQS + a worker pool</b> buys DLQs, backpressure, and ordering. I frame it as a trade made <i>knowingly</i> \u2014 take the simple path to hit the date, but name the exact seam I\u2019d cut over at and the metric that trips it: sustained concurrency pinned near the account ceiling."},
       {l:"THE SMALLER SMELLS",c:"sub",t:"Two more I\u2019d raise before they do. The <b>strategy map needs a code deploy</b> to add a file type \u2014 fine at low cardinality, but a config-driven plugin registry is the move once types proliferate. And the reconciler\u2019s <b>grace window is a tuned constant</b> \u2014 a smell; I\u2019d make it event-driven, aging a <code>PENDING</code> row off the upload\u2019s own timeout instead of babysitting a magic number."},
       {l:"THE TELL",c:"close",t:"The level signal is naming limits as <i>knowing trades</i>, not confessions: \u201CI shipped X aware of the seam I\u2019d cut to Y, and here\u2019s what triggers it.\u201D A design\u2019s maturity is measured by how precisely you can state its own limits \u2014 vague handwaving right there is the actual tell the interviewer is listening for."}
     ] }
]
};
