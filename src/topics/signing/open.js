/* topics/signing/open.js -- topic 2 opener/closer. Two cards: [0] open (HAS hooks),
   [1] close (hooks:null). Same shape as TOPIC_CP_OPEN. The 'Reveal mine' label, the
   arrow, and the wrappers are static in renderOpenCard. 7-bit ASCII (entities). */
var TOPIC_SIGN_OPEN = {
  cards: [
    {
      kind: "open",
      k: "Match the altitude",
      t: "The same trust boundary, said three ways",
      lead: "Interviewers open with <i>&ldquo;quickly, how does signing work?&rdquo;</i> as often as <i>&ldquo;design it.&rdquo;</i> Give the altitude they asked for &mdash; the boundary when they want the boundary, the mechanism when they want mechanism &mdash; then expand only when they pull. Say each out loud before you reveal mine.",
      items: [
        {
          n: "1",
          ht: "<b>One breath.</b> The whole trust boundary in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i>",
          a: "A signing service that makes packages tamper-proof: the pipeline&rsquo;s hash goes to an <b>HSM</b> that returns a signature, we stamp it into the header, and the <b>device verifies it against a burned-in key before flashing</b> &mdash; rejecting anything unsigned."
        },
        {
          n: "2",
          ht: "<b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no padding schemes.",
          a: "The pipeline hands signing a <b>SHA&#8209;256 digest</b> &mdash; you sign the hash, never the whole package. The private key <b>never leaves the HSM</b>: the service sends a hash and gets back a signature, so a compromised signer can&rsquo;t exfiltrate the key. Keys are scoped <b>per tenant, per product type</b> through a four-table lookup, so a leak blasts one company, not the fleet. The signature is stamped into the header, and the real enforcer is the <b>device</b> &mdash; it verifies before it flashes and <b>rejects unsigned</b>. And the genuinely hard part isn&rsquo;t the signing, it&rsquo;s <b>key management</b>: rotation, and bounding the blast radius when a key leaks."
        }
      ],
      hooks: {
        lead: "The 30-second version leaves three threads loose <i>on purpose</i> &mdash; you&rsquo;re steering. Each is a tab you go deep on the moment they pull it:",
        items: [
          { q: "&ldquo;never leaves the HSM&rdquo;", d: "how HSMs work, and CloudHSM vs managed KMS", tab: "Trade-offs &middot; Numbers" },
          { q: "&ldquo;per-tenant keys&rdquo;", d: "the four-table key model and the blast radius it buys", tab: "System Map &middot; Red Flags" },
          { q: "&ldquo;verifies before flash&rdquo;", d: "device-side verification and how rejecting an update prevents bricking", tab: "Whiteboard &middot; Probe Drill" }
        ]
      },
      foot: "<b>The skill isn&rsquo;t knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude up &mdash; the nine-step flow &mdash; and <b>key management</b> is the deepest zoom, where the real seniority shows. It&rsquo;s having all of them, and reading which one they want."
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
          a: "&ldquo;So &mdash; sign the hash in an HSM, stamp the header, verify on the device before it flashes, keys scoped per tenant. That&rsquo;s the trust boundary.&rdquo;"
        },
        {
          n: "2",
          ht: "<b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.",
          a: "&ldquo;In production I&rsquo;d watch three things: <b>key rotation and compromise recovery</b> &mdash; the actual hard part, not the signing; the <b>downgrade surface</b>, since a signature proves authenticity, not freshness; and the <b>device verify path under an interrupted flash</b>, where A/B partitions and confirm-or-rollback earn their keep.&rdquo;"
        },
        {
          n: "3",
          ht: "<b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.",
          a: "&ldquo;With more time I&rsquo;d chain this to a <b>hardware root of trust and secure boot</b>, and add a <b>transparency log</b> for auditable signatures. I left out the OTA transport and the pipeline itself &mdash; out of scope for the signing boundary. Where would you like to go deeper?&rdquo;"
        }
      ],
      hooks: null,
      foot: "<b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs. The tell: juniors stop at &ldquo;and the device verifies it&rdquo;; seniors name <b>key management as the hard part</b> and close on a <i>summary, a risk list, and an invitation.</i>"
    }
  ]
};
