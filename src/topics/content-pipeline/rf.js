/* topics/content-pipeline/rf.js -- topic-1 (Content Pipeline) RED FLAGS data.
   Extracted from the baked RF_HTML: one lead + nine flags. Each flag is
   {bad, note, tell, fix}; only flag #9 carries a note (the rest are null). The
   invariant card chrome (the x chip &#10007;, the arrow &rarr;, the wrappers)
   lives in rfCard() in red-flags.js, NOT here. Strings are double-quoted so
   apostrophes need no escaping; all non-ASCII is HTML entities (ascii_guard).
   Offline-safe: pure data, no DOM. */
var TOPIC_CP_RF = {
  lead: "The moves that quietly tank a candidate on this topic. Each one is something a weaker answer actually says &mdash; what the interviewer hears, and the line that flips it.",
  flags: [
    {
      bad: "&ldquo;I'd query all the rows, then write them to the CSV.&rdquo;",
      note: null,
      tell: "The driver buffers the <b>entire result set</b> in memory before your code runs &mdash; OOM at a million rows. The interviewer hears <i>&ldquo;never run this at scale.&rdquo;</i>",
      fix: "Server-side cursor, 100 rows at a time, piped with backpressure &mdash; <b>constant memory</b> at any row count."
    },
    {
      bad: "&ldquo;I'll store the file, then read it back to hash it.&rdquo;",
      note: null,
      tell: "Two full disk reads, or the whole file buffered in RAM &mdash; it dies on a 500&nbsp;MB object.",
      fix: "A <b>PassThrough fork</b> &mdash; one read feeds the hash and the upload at once."
    },
    {
      bad: "&ldquo;A switch statement routes each file type to its handler.&rdquo;",
      note: null,
      tell: "Complexity grows with every new type, and each addition <b>edits the router</b> &mdash; a merge-conflict magnet that never stops touching shared code.",
      fix: "An <b>O(1) dispatch map</b>. A new type is one entry and zero router changes."
    },
    {
      bad: "&ldquo;It writes to S3 and Postgres, so the data's consistent.&rdquo;",
      note: null,
      tell: "There's <b>no atomicity across two stores</b> &mdash; a partial failure orphans objects or rows. The interviewer hears <i>&ldquo;hasn't thought about the failure path.&rdquo;</i>",
      fix: "Track created keys, <b>compensating delete</b> on failure, and a <b>reconciler</b> as the durable backstop."
    },
    {
      bad: "&ldquo;Exactly-once delivery means I won't double-process.&rdquo;",
      note: null,
      tell: "Exactly-once <i>delivery</i> doesn't exist &mdash; S3 and every queue are at-least-once. You <b>will</b> see the same file twice.",
      fix: "Idempotent <b>effects</b> &mdash; a content-hash key or a processed-marker check-and-set. Replays no-op."
    },
    {
      bad: "&ldquo;On any failure, I just retry.&rdquo;",
      note: null,
      tell: "Retrying a non-idempotent op <b>double-charges</b>; retrying a <b>poison message</b> stalls the whole lane forever.",
      fix: "Idempotency + a <b>DLQ</b> + backoff + a per-job timeout, so one bad input fails fast instead of hanging."
    },
    {
      bad: "&ldquo;Lambda per object &mdash; that's the design.&rdquo;",
      note: null,
      tell: "Defending one choice without naming <b>when it breaks</b> reads as inexperience. The interviewer wants the boundary, not loyalty.",
      fix: "Name the <b>switch condition</b> &mdash; move to SQS the moment you need retries, a DLQ, or ordering."
    },
    {
      bad: "&ldquo;A reconciler deletes any S3 key with no DB row.&rdquo;",
      note: null,
      tell: "It will delete an <b>in-flight upload</b> &mdash; object written, row not yet committed. You just corrupted a live request.",
      fix: "A grace window, or a <b>PENDING marker</b>, so the reconciler never touches in-flight work."
    },
    {
      bad: "&ldquo;&hellip;so I'd use a Lambda and an S3 trigger and&mdash;&rdquo;",
      note: "(straight into components)",
      tell: "No assumptions stated, no numbers, no ceiling named &mdash; the interviewer can't <b>see you reason</b>, only that you've memorized an architecture.",
      fix: "<b>Frame first</b> (scope + load), then design, then name the <b>resource that gives out first</b>. Reasoning visible beats architecture recited."
    }
  ]
};
