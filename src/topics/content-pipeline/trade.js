/* topics/content-pipeline/trade.js -- Phase 1: REAL trade data (extracted from the
   former baked TRADE_HTML). decisions[].{q, opts:[{n,when}], tell}; the "pick when"
   pill is in the renderer (trade-offs.js), not data. Offline-safe; 7-bit ASCII. */
var TOPIC_CP_TRADE = {
  lead: "The design decisions an interviewer drills &mdash; each with the <b>axis</b> that picks a side. Saying the switch condition out loud is the senior move; defending one option as universally right isn't.",
  decisions: [
    { q: "Lambda per object <span class=\"vs\">vs</span> SQS + worker pool",
      opts: [{ n: "Lambda / object", when: "low or spiky volume, no ordering need, you want <b>zero ops</b> and lowest latency." }, { n: "SQS + workers", when: "you need <b>retries, a DLQ, ordering</b>, burst-smoothing, or jobs over 15&nbsp;min." }],
      tell: "Name the <b>switch condition</b>, don't defend one side." },
    { q: "Hash during upload <span class=\"vs\">vs</span> hash after store",
      opts: [{ n: "During (fork)", when: "files are large, or you just want <b>one disk read</b> &mdash; i.e. almost always." }, { n: "After / two-pass", when: "the file is tiny, or an API needs the <b>digest before</b> you can store it." }],
      tell: "The <b>PassThrough fork</b> is the only path that survives a 500&nbsp;MB object." },
    { q: "SQLite bundle <span class=\"vs\">vs</span> JSON <span class=\"vs\">vs</span> pg_dump",
      opts: [{ n: "SQLite", when: "you need <b>real FKs</b> and binary at <b>1:1</b> size in one portable file." }, { n: "JSON", when: "data is small, human-readable, with <b>no</b> binary or relations." }, { n: "pg_dump", when: "same engine both ends and you want exact fidelity &mdash; but it's <b>not portable</b>." }],
      tell: "JSON base64-bloats binary <b>~33%</b> and loses referential integrity." },
    { q: "Single PUT <span class=\"vs\">vs</span> multipart upload",
      opts: [{ n: "Single PUT", when: "objects are <b>small</b> (&lt;100&nbsp;MB) and the network is reliable." }, { n: "Multipart", when: "large objects, flaky networks, or you want <b>per-part retry</b> and resumability." }],
      tell: "Multipart resumes <b>per part</b> &mdash; pair it with a lifecycle rule to abort orphans." },
    { q: "Compensating delete <span class=\"vs\">vs</span> reconciler <span class=\"vs\">vs</span> distributed txn",
      opts: [{ n: "Compensating delete", when: "cheap cleanup of the <b>common</b> failure, in the request path." }, { n: "Reconciler", when: "you need a <b>durable backstop</b> that eventually catches every orphan." }, { n: "Distributed txn", when: "you truly need <b>cross-store atomicity</b> &mdash; rarely worth 2PC / saga cost across S3 + DB." }],
      tell: "Run delete <b>and</b> reconciler; reach for 2PC only when atomicity is non-negotiable." },
    { q: "Sync fast-path <span class=\"vs\">vs</span> async queue",
      opts: [{ n: "Sync inline", when: "interactive, small payload, <b>sub-second</b> SLA." }, { n: "Async queue", when: "heavy or bulk work where <b>eventual</b> completion is fine." }],
      tell: "Two-tier by interactivity: <b>one dispatch map, two execution venues</b>." },
    { q: "Reconciler backstop <span class=\"vs\">vs</span> transactional outbox",
      opts: [{ n: "Reconciler (heal)", when: "the two stores <b>can't share a transaction</b>, a brief orphan window is tolerable, and fewer moving parts wins &mdash; dual-write, then sweep orphans on a grace window." }, { n: "Outbox (prevent)", when: "correctness must be <b>airtight</b> and you can anchor on one DB transaction &mdash; commit the row + an event atomically, and a relay does the S3 work with retries off <b>one commit point</b>." }],
      tell: "The outbox needs a DB transaction to anchor on; the reconciler is the honest backstop for when the stores genuinely can't share one." }
  ]
};
