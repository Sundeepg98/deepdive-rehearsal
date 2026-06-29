/* topics/content-pipeline/open.js -- topic-1 data for the 30-second opener/closer
   pane (TopicPane dataKey 'open'). Two cards: [0] open -- HAS hooks (the .op-hooks
   block of 3); [1] close -- hooks:null. Strings lifted VERBATIM from the old OP_HTML
   in opener-altitude.js. The 'Reveal mine' label, the &rarr; arrow span, and the
   .op-arr / .op-tab wrappers are STATIC in renderOpenCard, NOT data. Pure data (no
   DOM APIs -- renderOpenCard lives in opener-altitude.js); 7-bit ASCII (HTML
   entities). NOTE the per-card apostrophe convention is intentionally mixed and
   lifted as-is: card[0] uses straight ' (isn't / you're / It's / Walkthrough's),
   card[1] uses &rsquo; -- and card[1]'s foot keeps its trailing <i>...</i>. */
var TOPIC_CP_OPEN = {
  cards: [
    {
      kind: "open",
      k: "Match the altitude",
      t: "The same system, said three ways",
      lead: "Interviewers open with <i>&ldquo;quickly, how does it work?&rdquo;</i> as often as <i>&ldquo;design it.&rdquo;</i> Give the altitude they asked for &mdash; the frame when they want the frame, depth when they want depth &mdash; then expand only when they pull. Say each out loud before you reveal mine.",
      items: [
        {
          n: "1",
          ht: "<b>One breath.</b> The whole system in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i>",
          a: "An event-driven ingestion pipeline: an S3 upload fires a Lambda that routes each file by type to a streaming handler &mdash; which hashes it, stores it, and records it &mdash; with a <b>reconciler</b> to mop up partial failures."
        },
        {
          n: "2",
          ht: "<b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no code.",
          a: "Operators push content to S3, which triggers the processor. It routes on file type through an <b>O(1) strategy map</b> &mdash; not a switch &mdash; so a new format is a one-line add. Each handler <b>streams the file once</b> and forks that read to hash and upload in parallel, so memory stays flat no matter the size. The catch: the object store and the database share no transaction, so I track written keys and <b>compensate on failure</b>, with a reconciler as the backstop. And since every trigger is <b>at-least-once</b>, processing is idempotent &mdash; a replay no-ops on a content-hash marker."
        }
      ],
      hooks: {
        lead: "The 30-second version names three loose threads <i>on purpose</i> &mdash; you're steering. Each is a tab you go deep on the moment they pull it:",
        items: [
          { q: "&ldquo;memory stays flat&rdquo;", d: "how the export streams a million rows without OOM", tab: "Numbers &middot; Walkthrough" },
          { q: "&ldquo;compensate &middot; reconciler&rdquo;", d: "the dual-write, and keeping two stores consistent", tab: "Trade-offs &middot; Red Flags" },
          { q: "&ldquo;at-least-once&rdquo;", d: "why exactly-once is a myth and replays stay safe", tab: "Probe Drill" }
        ]
      },
      foot: "<b>The skill isn't knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude up &mdash; the Walkthrough's nine steps &mdash; and every tab here is a deeper zoom. It's having all of them, and reading which one they want."
    },
    {
      kind: "close",
      k: "Land it",
      t: "How to close &mdash; don&rsquo;t trail off",
      lead: "When time&rsquo;s nearly up &mdash; or they ask <i>&ldquo;anything else?&rdquo;</i> &mdash; <b>don&rsquo;t just stop.</b> A proactive close is a seniority signal: summarize the shape, name what you&rsquo;d watch, hand the wheel back. Thirty seconds, unprompted. Say each out loud before you reveal mine.",
      items: [
        {
          n: "1",
          ht: "<b>Summarize in one line.</b> Re-state the spine so they remember the shape, not the detours.",
          a: "&ldquo;So &mdash; event-driven ingestion, routed by type to streaming handlers, kept consistent across two stores by a reconciler, and idempotent against replays. That&rsquo;s the core.&rdquo;"
        },
        {
          n: "2",
          ht: "<b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.",
          a: "&ldquo;In production I&rsquo;d watch three things: <b>reconciler correctness under concurrency</b>, the piece most likely to hide a race; the <b>cost curve</b>, since per-object Lambda gets pricey fast; and the <b>exactly-once illusion</b> &mdash; I&rsquo;d keep proving idempotency rather than trusting delivery.&rdquo;"
        },
        {
          n: "3",
          ht: "<b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.",
          a: "&ldquo;With more time I&rsquo;d add the <b>status API</b> for consumers and the <b>multi-region</b> story. I left out auth and the client deliberately &mdash; out of scope for the pipeline. Where would you like to go deeper?&rdquo;"
        }
      ],
      hooks: null,
      foot: "<b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs, and your named risks are the threads they&rsquo;ll pull. The tell: juniors stop when they run out of things to say; seniors stop on a <i>summary, a risk list, and an invitation.</i>"
    }
  ]
};
