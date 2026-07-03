/* topics/aws-hardening/open.js -- topic 4 opener/closer. Two cards: [0] open (HAS hooks),
   [1] close (hooks:null). Same shape as TOPIC_CP_OPEN. The 'Reveal mine' label, the
   arrow, and the wrappers are static in renderOpenCard. 7-bit ASCII (entities). */
var TOPIC_AWSHARD_OPEN = {
  cards: [
    {
      kind: "open",
      k: "Match the altitude",
      t: "The same storage boundary, said three ways",
      lead: "Interviewers open with <i>&ldquo;quickly, how would you secure an S3 bucket?&rdquo;</i> as often as <i>&ldquo;design the storage layer.&rdquo;</i> Give the altitude they asked for &mdash; the posture when they want the posture, the controls when they want mechanism &mdash; then expand only when they pull. Say each out loud before you reveal mine.",
      items: [
        {
          n: "1",
          ht: "<b>One breath.</b> The whole storage boundary in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i>",
          a: "A private bucket where <b>nothing is public</b> (Block Public Access), <b>every credential is least-privilege</b> (scoped IAM, never <code>s3:*</code>), everything is <b>encrypted at rest and in transit</b> (SSE-KMS + deny-non-TLS), and devices download by <b>expiring presigned URL</b> &mdash; arranged so no single misconfiguration can breach the fleet."
        },
        {
          n: "2",
          ht: "<b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no service name-drops.",
          a: "The bucket is <b>private by construction</b> &mdash; Block Public Access at the account, all four settings &mdash; so no ACL or policy can ever make it public. Access is <b>least-privilege IAM</b>: one action on one prefix, because the policy <i>is</i> the blast radius of a stolen credential. At rest it&rsquo;s <b>SSE-KMS with per-tenant keys</b> &mdash; for the audit trail and crypto-shredding &mdash; plus a policy that denies unencrypted PUTs and any non-TLS request. Devices can&rsquo;t hold credentials, so the service mints a <b>presigned URL</b> &mdash; one object, short expiry &mdash; carried in the Job document. And a <b>VPC endpoint with PrincipalOrgID</b> means a compromised role can&rsquo;t exfiltrate to an outside bucket. The genuinely hard part isn&rsquo;t any one setting &mdash; it&rsquo;s <b>least privilege and defense in depth</b>, so no single slip reaches the fleet."
        }
      ],
      hooks: {
        lead: "The 30-second version leaves three threads loose <i>on purpose</i> &mdash; you&rsquo;re steering. Each is a tab you go deep on the moment they pull it:",
        items: [
          { q: "&ldquo;least-privilege IAM&rdquo;", d: "scoping the action and the resource, and why the policy is the blast radius", tab: "Walkthrough &middot; Probe Drill" },
          { q: "&ldquo;presigned URL&rdquo;", d: "the bearer-token limit, short expiry, and CloudFront when you need revocation", tab: "Whiteboard &middot; Trade-offs" },
          { q: "&ldquo;defense in depth&rdquo;", d: "the VPC endpoint perimeter, per-tenant keys, and blast-radius bounding", tab: "System Map &middot; Numbers" }
        ]
      },
      foot: "<b>The skill isn&rsquo;t knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude &mdash; the nine-step flow from stored artifact to device download &mdash; and <b>defense in depth</b> is the deepest zoom, where the real seniority shows. It&rsquo;s having all of them, and reading which one they want."
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
          a: "&ldquo;So &mdash; nothing public, least-privilege IAM, SSE-KMS with a deny-unencrypted policy, presigned URLs for delivery, and an org-locked egress path. That&rsquo;s the storage boundary &mdash; no single misconfiguration breaches it.&rdquo;"
        },
        {
          n: "2",
          ht: "<b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.",
          a: "&ldquo;In production I&rsquo;d watch three things: <b>presigned-URL leakage</b> &mdash; a bearer token you can&rsquo;t revoke, so I keep the window tight and reach for CloudFront if I need to cut access; the <b>KMS throughput ceiling</b> at full-fleet fan-out, which S3 Bucket Keys handle; and <b>hardening drift</b> &mdash; a role that accretes permissions or a setting toggled &lsquo;temporarily,&rsquo; which is why Config and Access Analyzer run continuously.&rdquo;"
        },
        {
          n: "3",
          ht: "<b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.",
          a: "&ldquo;With more time I&rsquo;d add <b>Object Lock in compliance mode</b> for provable firmware immutability and a <b>multi-account layout with SCPs</b> for org-wide guardrails. I left out the CI/CD pipeline&rsquo;s own credentials and the CloudFront edge design &mdash; out of scope for the bucket boundary itself. Where would you like to go deeper?&rdquo;"
        }
      ],
      hooks: null,
      foot: "<b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs. The tell: juniors stop at &ldquo;and we make the bucket private&rdquo;; seniors name <b>the presigned-URL limit and hardening drift as the hard parts</b> and close on a <i>summary, a risk list, and an invitation.</i>"
    }
  ]
};
