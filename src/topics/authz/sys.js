/* topics/authz/sys.js -- topic 3 system-map data. intro = the .sm-intro copy;
   stages = the request-to-data chain with AUTHORIZATION as cur:true ("you are
   here"); pivots = the 7 interviewer bridge points OUT of authz (to identity,
   per-company keys/signing, AWS hardening, the data layer, noisy-neighbor, data
   lifecycle, IaC); heads = the two card headings + pivot subhead. 7-bit ASCII. */
var TOPIC_AUTHZ_SYS = {
  intro: "Authorization is the <b>access boundary</b>. Identity proves <i>who</i> you are; authorization decides <i>what</i> you can touch &mdash; and in a multi-tenant system that means keeping one tenant entirely out of another&rsquo;s data. Knowing what sits on either side &mdash; the identity that feeds it, the data layer that enforces it &mdash; and being able to walk the chain from token to row is what turns a &lsquo;check permissions&rsquo; answer into a systems answer.",
  stages: [
    { n: 'Identity provider', d: 'authenticates the user &middot; mints a signed token with the tenant claim' },
    { n: 'Gateway / edge', d: 'coarse checks &middot; valid token, audience, rate limit' },
    { n: 'Tenant authorization', d: 'verify claim &middot; inject predicate &middot; object-level check', cur: true },
    { n: 'Data access layer', d: 'the tenant predicate applied to every query &middot; deny-by-default' },
    { n: 'Database', d: 'RLS / LeadingKeys backstop &middot; tenant-leading index' },
    { n: 'Audit + anomaly', d: 'log every access &middot; flag cross-tenant attempts and id-scanning' }
  ],
  pivots: [
    { q: "Where does the tenant claim come from &mdash; who mints and signs the token?", chip: "\u2192 Identity / tokens",
      a: "From the <b>identity provider</b> (Cognito, an OIDC issuer): the user authenticates, and the provider mints a <b>signed token</b> carrying the tenant claim. Authorization <i>consumes</i> that token &mdash; it verifies the signature and trusts the claim &mdash; but never mints it. The provider proves <i>who</i>; authorization decides <i>what</i>. Get the identity layer wrong and everything downstream trusts a lie." },
    { q: "The token is signed with per-company keys &mdash; how are those managed and rotated?", chip: "\u2192 Package signing (2)",
      a: "The same <b>per-tenant key discipline</b> as the signing topic: each company&rsquo;s tokens are signed with its own key, verified against its <b>JWKS</b> entry, and a compromised key is <b>rotated</b> at the issuer &mdash; publish the new, retire the old. Scoping keys per company means a compromise blasts one tenant, not the platform. It&rsquo;s signing&rsquo;s blast-radius argument applied to identity." },
    { q: "The tenant scope is enforced in the database too &mdash; how is that infrastructure locked down?", chip: "\u2192 AWS hardening (4)",
      a: "The database backstop &mdash; <b>RLS</b>, or <b>dynamodb:LeadingKeys</b> tied to the identity &mdash; is part of a least-privilege posture: the app&rsquo;s role can touch only its tenant&rsquo;s data, connections are scoped, secrets are managed. That whole &lsquo;the credential can do exactly what it needs and no more&rsquo; stance is the AWS-hardening topic; authorization is one consumer of it." },
    { q: "Where does the tenant-scoped data actually live, and how does the scope stay fast?", chip: "\u2192 Data layer / storage",
      a: "The predicate lands on the <b>data layer</b>: <code>tenant_id</code> leads every index so the scoped query is a range seek, and the store (Postgres RLS, or DynamoDB partition keys) enforces the boundary. Authorization decides the scope; the data layer makes it both <i>enforced</i> and <i>efficient</i>. The isolation model &mdash; silo vs pool &mdash; is a storage decision as much as a security one." },
    { q: "One tenant&rsquo;s traffic spikes &mdash; how do you keep it from starving the others?", chip: "\u2192 Noisy-neighbor / limits",
      a: "<b>Per-tenant fairness</b>: rate limits, quotas, fair queuing, and per-tenant metrics to attribute load. Isolation isn&rsquo;t only about <i>data</i> &mdash; it&rsquo;s about <i>resources</i> too. A pooled system where one tenant can consume another&rsquo;s share has failed isolation just as surely as one that leaks rows. The whale gets its own lane, not the whole road." },
    { q: "A tenant asks to be deleted &mdash; how does that ripple through the system?", chip: "\u2192 Data lifecycle / compliance",
      a: "Right-to-erasure crosses every copy: the primary tables (a scoped DELETE in a pool, drop-database in a silo), plus <b>backups, caches, indexes, and logs</b>. Crypto-shredding a <b>per-tenant key</b> handles the immutable copies. Authorization&rsquo;s tenant boundary is what makes &lsquo;exactly this tenant&rsquo;s data&rsquo; addressable in the first place &mdash; deletion is isolation run in reverse." },
    { q: "All of this &mdash; roles, policies, RLS, key scoping &mdash; how is it defined repeatably?", chip: "\u2192 IaC (8)",
      a: "Declaratively, as <b>infrastructure as code</b>: the IAM policies, the RLS setup, the per-tenant key wiring, the role scoping &mdash; versioned and reproducible, not click-ops. Authorization rules <i>are</i> security-critical configuration, so they belong in reviewed, rollback-able code. Who can touch what should never be a setting someone changed by hand in a console." }
  ],
  heads: {
    whereHead: "Where the access boundary sits",
    pivHead: "Interviewer pivot points",
    pivSub: "The questions that bridge out of authorization. Each one leads into another deep-dive &mdash; tap to see the connecting answer."
  }
};
