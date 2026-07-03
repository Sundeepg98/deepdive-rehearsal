/* topics/notifications/open.js -- topic 5 opener/closer. Two cards: [0] open (HAS hooks),
   [1] close (hooks:null). Same shape as TOPIC_CP_OPEN. The 'Reveal mine' label, the
   arrow, and the wrappers are static in renderOpenCard. 7-bit ASCII (entities). */
var TOPIC_NOTIF_OPEN = {
  cards: [
    {
      kind: "open",
      k: "Match the altitude",
      t: "The same delivery boundary, said three ways",
      lead: "Interviewers open with <i>&ldquo;quickly, how would you build notifications?&rdquo;</i> as often as <i>&ldquo;design a notification system.&rdquo;</i> Give the altitude they asked for &mdash; the boundary when they want the boundary, the mechanism when they want mechanism &mdash; then expand only when they pull. Say each out loud before you reveal mine.",
      items: [
        {
          n: "1",
          ht: "<b>One breath.</b> The whole delivery boundary in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i>",
          a: "A fan-out boundary where producers emit an event and the system <b>delivers it once</b>, on the channel the user prefers &mdash; idempotent so retries don&rsquo;t double-send, in-app as the cheap polled default, email as reach with a fallback when the in-app goes unseen."
        },
        {
          n: "2",
          ht: "<b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no service name-drops.",
          a: "Producers emit a <b>domain event</b> &mdash; notify this user of this thing &mdash; and stay channel-ignorant; the notification system owns channels, preferences, and fallback. The first thing I add, before any channel, is <b>idempotency</b>: a content-derived key checked before every send, because delivery is at-least-once and retries <i>will</i> duplicate &mdash; at-least-once plus idempotency is effectively exactly-once. I <b>resolve recipients</b> from a role against current membership, tenant-scoped, and <b>fan out</b> on their preferences. In-app is a <b>row per recipient</b> with a partial index on unread, polled every minute &mdash; cheap and always correct. Email is reach and the <b>fallback</b>: in-app first, email only if unseen, cancel the pending email if they open it. The genuinely hard parts aren&rsquo;t the channels &mdash; they&rsquo;re <b>idempotency and the smart fallback</b>."
        }
      ],
      hooks: {
        lead: "The 30-second version leaves three threads loose <i>on purpose</i> &mdash; you&rsquo;re steering. Each is a tab you go deep on the moment they pull it:",
        items: [
          { q: "&ldquo;idempotency&rdquo;", d: "the content-derived key, the dedup store, and why at-least-once needs it", tab: "Walkthrough &middot; Probe Drill" },
          { q: "&ldquo;smart fallback&rdquo;", d: "in-app first, cascade to email, cancel on open &mdash; and the scheduled cancelable send", tab: "Whiteboard &middot; Trade-offs" },
          { q: "&ldquo;polled default&rdquo;", d: "the partial unread index, poll vs push, and the read-load ceiling", tab: "System Map &middot; Numbers" }
        ]
      },
      foot: "<b>The skill isn&rsquo;t knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude &mdash; the nine-step flow from emitted event to seen notification &mdash; and <b>idempotency and fallback</b> are the deepest zoom, where the real seniority shows. It&rsquo;s having all of them, and reading which one they want."
    },
    {
      kind: "close",
      k: "Land it",
      t: "How to close &mdash; name the hard part",
      lead: "When time&rsquo;s nearly up &mdash; or they ask <i>&ldquo;anything else?&rdquo;</i> &mdash; <b>don&rsquo;t just stop.</b> A proactive close is a seniority signal: summarize the boundary, name what you&rsquo;d watch, hand the wheel back. Thirty seconds, unprompted. Say each out loud before you reveal mine.",
      items: [
        {
          n: "1",
          ht: "<b>Summarize in one line.</b> Re-state the boundary so they remember the shape, not the detours.",
          a: "&ldquo;So &mdash; producers emit events, the system fans out on preferences, delivers effectively-once via a content-derived idempotency key, uses in-app as the polled default and email as reach-and-fallback, with per-channel retries and a DLQ. That&rsquo;s the delivery boundary &mdash; a user gets each notification once, on the channel that worked.&rdquo;"
        },
        {
          n: "2",
          ht: "<b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.",
          a: "&ldquo;In production I&rsquo;d watch three things: the <b>double-send</b> &mdash; anything that bypasses the idempotency check reintroduces it, so I keep the check structural; <b>deliverability</b> &mdash; a rising bounce rate tanks sender reputation and filters <i>all</i> my mail, so I honor bounces into a suppression list; and the <b>poll-load ceiling</b> &mdash; if a surface needs real-time, fast polling is the wall, and that&rsquo;s where I&rsquo;d move to push.&rdquo;"
        },
        {
          n: "3",
          ht: "<b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.",
          a: "&ldquo;With more time I&rsquo;d add <b>digests</b> for high-volume streams and a <b>dedicated store</b> if notification writes outgrow the primary. I left out SMS and push channel specifics, and the analytics pipeline &mdash; out of scope for the core delivery path. Where would you like to go deeper?&rdquo;"
        }
      ],
      hooks: null,
      foot: "<b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs. The tell: juniors stop at &ldquo;and we send the email&rdquo;; seniors name <b>idempotency and the smart fallback as the hard parts</b> and close on a <i>summary, a risk list, and an invitation.</i>"
    }
  ]
};
