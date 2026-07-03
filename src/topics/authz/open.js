/* topics/authz/open.js -- topic 3 opener/closer. Two cards: [0] open (HAS hooks),
   [1] close (hooks:null). Same shape as TOPIC_CP_OPEN. The 'Reveal mine' label, the
   arrow, and the wrappers are static in renderOpenCard. 7-bit ASCII (entities). */
var TOPIC_AUTHZ_OPEN = {
  cards: [
    {
      kind: "open",
      k: "Match the altitude",
      t: "The same access boundary, said three ways",
      lead: "Interviewers open with <i>&ldquo;quickly, how do you do multi-tenant authorization?&rdquo;</i> as often as <i>&ldquo;design it.&rdquo;</i> Give the altitude they asked for &mdash; the boundary when they want the boundary, the mechanism when they want mechanism &mdash; then expand only when they pull. Say each out loud before you reveal mine.",
      items: [
        {
          n: "1",
          ht: "<b>One breath.</b> The whole access boundary in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i>",
          a: "Multi-tenant authorization where the tenant comes from the <b>verified token</b> and the scope is a <b>predicate injected into every query</b> &mdash; deny-by-default, so a forgotten filter crashes instead of leaking, and a cross-tenant read returns 404, not 403."
        },
        {
          n: "2",
          ht: "<b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no framework name-drops.",
          a: "Identity comes from a <b>signed claim</b> in the verified token &mdash; never a client-supplied header, which would be the confused-deputy attack. Authorization isn&rsquo;t a per-endpoint check; it&rsquo;s a <b>predicate the shared data layer injects</b> into every read and write, so a developer can&rsquo;t write an unscoped query. It&rsquo;s <b>deny-by-default</b> &mdash; no tenant context throws. A fetch-by-id gets an explicit <b>ownership check</b> and returns <b>404 not 403</b> across tenants, so we don&rsquo;t leak existence &mdash; that&rsquo;s BOLA, OWASP&rsquo;s number one. And the database is the <b>backstop</b> &mdash; RLS or LeadingKeys &mdash; so an app bug still can&rsquo;t cross tenants. The genuinely hard part isn&rsquo;t the check, it&rsquo;s the <b>isolation model and the noisy neighbor</b>."
        }
      ],
      hooks: {
        lead: "The 30-second version leaves three threads loose <i>on purpose</i> &mdash; you&rsquo;re steering. Each is a tab you go deep on the moment they pull it:",
        items: [
          { q: "&ldquo;injected predicate&rdquo;", d: "the shared data layer, deny-by-default, and why per-endpoint checks fail", tab: "Walkthrough &middot; Whiteboard" },
          { q: "&ldquo;404 not 403&rdquo;", d: "BOLA / IDOR and the object-level ownership check", tab: "Probe Drill &middot; Red Flags" },
          { q: "&ldquo;isolation model&rdquo;", d: "silo vs pool vs bridge, and the noisy-neighbor problem", tab: "Trade-offs &middot; System Map" }
        ]
      },
      foot: "<b>The skill isn&rsquo;t knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude &mdash; the nine-step flow from token to audit &mdash; and the <b>isolation model</b> is the deepest zoom, where the real seniority shows. It&rsquo;s having all of them, and reading which one they want."
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
          a: "&ldquo;So &mdash; tenant from the verified token, scope injected into every query, deny-by-default, an object check with 404s, and the database as backstop. That&rsquo;s the access boundary.&rdquo;"
        },
        {
          n: "2",
          ht: "<b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.",
          a: "&ldquo;In production I&rsquo;d watch three things: the <b>isolation model</b> as tenants grow &mdash; when to silo a whale; the <b>noisy neighbor</b>, since one tenant&rsquo;s load can starve the rest; and the <b>escaped query</b> &mdash; anything that bypasses the shared layer, which is why RLS backstops it and adversarial tests gate CI.&rdquo;"
        },
        {
          n: "3",
          ht: "<b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.",
          a: "&ldquo;With more time I&rsquo;d add a <b>break-glass path</b> for support &mdash; audited, time-boxed &mdash; and per-tenant <b>encryption keys</b> for crypto-shredding on erasure. I left out the identity provider itself and delegated third-party access &mdash; out of scope for the tenant boundary. Where would you like to go deeper?&rdquo;"
        }
      ],
      hooks: null,
      foot: "<b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs. The tell: juniors stop at &ldquo;and we filter by tenant id&rdquo;; seniors name the <b>isolation model and noisy neighbor as the hard parts</b> and close on a <i>summary, a risk list, and an invitation.</i>"
    }
  ]
};
