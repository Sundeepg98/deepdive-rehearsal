/* topics/aws-hardening/trade.js -- topic 4 trade data. decisions[].{q, opts:[{n,when}],
   tell}; the "pick when" pill is in the renderer. Grounded in the S3 firmware-storage
   reality (SSE-KMS, presigned vs CloudFront, VPC endpoints, SCP guardrails). q uses
   single quotes with unescaped class="vs". 7-bit ASCII (entities). */
var TOPIC_AWSHARD_TRADE = {
  lead: "The storage-hardening decisions an interviewer drills &mdash; each with the <b>axis</b> that picks a side. The senior move is naming what forces the choice; the tell that sinks you is defending one control as universally right, because in hardening the answer is almost always &lsquo;it depends on the blast radius you&rsquo;re bounding.&rsquo;",
  decisions: [
    { q: 'SSE-S3 <span class="vs">vs</span> SSE-KMS',
      opts: [{ n: 'SSE-S3', when: 'the data is <b>non-sensitive and non-regulated</b> &mdash; you want at-rest encryption at zero cost and no throughput ceiling, and you don&rsquo;t need an audit trail, key-level access control, or crypto-shredding.' }, { n: 'SSE-KMS', when: 'it&rsquo;s <b>firmware or tenant data</b> &mdash; you want a per-tenant key, a CloudTrail record of every Decrypt, the key policy as a second gate, and per-tenant crypto-shred on erasure.' }],
      tell: "KMS buys three things SSE-S3 can&rsquo;t &mdash; <b>audit, a key-policy gate, and crypto-shred</b>. At fleet scale, <b>S3 Bucket Keys</b> cut the per-object KMS calls so the throughput ceiling stops biting." },
    { q: 'Presigned URL <span class="vs">vs</span> CloudFront + OAC',
      opts: [{ n: 'S3 presigned URL', when: 'you want the <b>simplest</b> path &mdash; a backend with S3 creds mints a single-object, short-expiry URL in one SDK call, and you don&rsquo;t need to revoke it or cache at the edge.' }, { n: 'CloudFront + OAC + signed URLs/cookies', when: 'you need <b>revocability</b> (cut access mid-flight), <b>edge caching</b> (one firmware file, 50k devices), or a <b>WAF</b> in front &mdash; the bucket stays private, only OAC can read it.' }],
      tell: "Presigned wins on simplicity; CloudFront+OAC wins the moment you need <b>revocation or caching</b>. OAC is what keeps the bucket private while CloudFront fronts it &mdash; that&rsquo;s the constraint that flips the choice." },
    { q: 'Bucket policy <span class="vs">vs</span> IAM policy',
      opts: [{ n: 'IAM (identity) policy', when: 'it&rsquo;s <b>per-principal, same-account</b> access &mdash; &lsquo;this role can do X&rsquo; &mdash; the everyday grants that do the heavy lifting.' }, { n: 'Bucket (resource) policy', when: 'it&rsquo;s an <b>account-wide guardrail</b> (deny non-TLS, deny unencrypted PUT, restrict to an org) or <b>cross-account</b> access, which the resource policy is required for.' }],
      tell: "Same-account access needs an Allow in <i>either</i>; <b>cross-account needs an Allow in both</b>. Put org-wide denies in the bucket policy, per-role grants in IAM &mdash; they&rsquo;re different tools, not a choice." },
    { q: 'Gateway endpoint <span class="vs">vs</span> interface endpoint',
      opts: [{ n: 'Gateway VPC endpoint', when: 'it&rsquo;s <b>S3 or DynamoDB reached from inside the VPC</b> &mdash; free, route-table-based, no internet egress. The default for S3.' }, { n: 'Interface endpoint (PrivateLink)', when: 'you need <b>on-prem reach</b> (Direct Connect / VPN) or a <b>service gateway endpoints don&rsquo;t cover</b> &mdash; ENI-backed, billed per-hour and per-GB.' }],
      tell: "For S3 in-VPC, the <b>gateway endpoint</b> is the free default; you only pay for an interface endpoint when you need on-prem reach or a service it doesn&rsquo;t support." },
    { q: 'Stored secret <span class="vs">vs</span> role-based credentials',
      opts: [{ n: 'Role-based (task role / IRSA)', when: 'the target is an <b>AWS service</b> &mdash; the service gets short-lived, auto-rotated credentials with <b>nothing static to steal</b>. Always prefer this where it&rsquo;s available.' }, { n: 'Stored secret (Secrets Manager)', when: 'it&rsquo;s a secret that <b>can&rsquo;t be a role</b> &mdash; a third-party API key, a database password &mdash; fetched at runtime, with rotation enabled.' }],
      tell: "Prefer a <b>role</b> wherever AWS supports it &mdash; it eliminates the long-lived secret entirely. Secrets Manager is the fallback for what can&rsquo;t be a role, not the default." },
    { q: 'Object Lock: governance <span class="vs">vs</span> compliance mode',
      opts: [{ n: 'Governance mode', when: 'you want to <b>protect against accidental deletion</b> but keep an <b>escape hatch</b> &mdash; a specially-permissioned principal can override the lock.' }, { n: 'Compliance mode', when: 'a regulator or audit requires <b>provable, unbreakable immutability</b> &mdash; not even the account root can shorten retention or delete.' }],
      tell: "Governance for internal accident-protection; <b>compliance</b> when you must <i>prove</i> immutability. For a signed firmware artifact you may need to attest you shipped, compliance mode &mdash; less forgiving, but airtight." },
    { q: 'Single-account <span class="vs">vs</span> multi-account + SCP',
      opts: [{ n: 'Single account', when: 'you&rsquo;re <b>early or small</b> &mdash; one account&rsquo;s IAM is the boundary, and the org overhead isn&rsquo;t worth it yet.' }, { n: 'Multi-account + SCPs', when: 'you need <b>un-overridable org-wide guardrails</b> (no account can disable BPA or encryption) and <b>blast-radius isolation</b> between prod, dev, and tenants.' }],
      tell: "Multi-account with SCPs is how you <b>guarantee</b> no account can weaken a control &mdash; explicit deny wins, even over an account&rsquo;s root. The cost is org complexity; the buy is guardrails you can&rsquo;t be granted around." }
  ]
};
