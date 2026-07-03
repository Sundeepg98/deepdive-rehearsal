/* topics/authz/trade.js -- topic 3 trade-offs. lead + decisions[].{q, opts:[{n,when}],
   tell}. The decisions an interviewer drills on multi-tenant authorization; each names
   the switch condition, never a universal winner. 7-bit ASCII (entities + \uXXXX). */
var TOPIC_AUTHZ_TRADE = {
  lead: "Authorization is a stack of decisions, and an interviewer drills the <i>why</i> behind each. For every one the answer is &lsquo;it depends &mdash; here&rsquo;s the constraint that flips it,&rsquo; never a universal winner. Name the axis.",
  decisions: [
    { q: 'Database per tenant <span class="vs">vs</span> shared pool',
      opts: [{ n: "Silo (DB per tenant)", when: "a tenant needs a <b>hard compliance boundary</b>, its own encryption key, or trivial per-tenant backup/delete &mdash; and you can absorb migrations across N databases." }, { n: "Pool (shared tables)", when: "cost and single-migration agility dominate and you trust your <b>enforcement layer</b> &mdash; the long tail of small tenants." }, { n: "Bridge (hybrid)", when: "you have both &mdash; pool the long tail, silo the whales and the regulated. The realistic default." }],
      tell: "The axis is <b>cost/agility vs isolation/compliance</b>. Declaring one universally right is the smell; the mature answer is a hybrid keyed on tenant size and compliance profile." },
    { q: 'Row-Level Security <span class="vs">vs</span> app-layer predicate',
      opts: [{ n: "Database RLS", when: "you&rsquo;re on Postgres and want the boundary enforced by the <b>engine</b> &mdash; surviving a raw query or an app bug." }, { n: "App-layer injection", when: "you need <b>portability</b> (DynamoDB has no RLS), clearer errors, and enforcement that doesn&rsquo;t depend on every connection being configured." }],
      tell: "It&rsquo;s not either/or &mdash; the app layer <b>prevents</b> the mistake, RLS <b>catches</b> the one that reaches the database. Use both; which is primary is set by your datastore." },
    { q: 'RBAC <span class="vs">vs</span> ABAC',
      opts: [{ n: "RBAC (roles)", when: "access maps cleanly to <b>job functions</b> &mdash; simple, auditable, easy to reason about. The base for most systems." }, { n: "ABAC (attributes)", when: "rules are <b>fine-grained or dynamic</b> &mdash; region, time, resource attributes &mdash; and roles would explode into combinations." }],
      tell: "<b>RBAC as the base, ABAC for the exceptions.</b> Role explosion (<code>editor-europe-daytime</code>) is the signal to move a dimension into attributes. Both sit <i>above</i> the separate tenant-isolation layer." },
    { q: 'Authorize at the gateway <span class="vs">vs</span> in the service',
      opts: [{ n: "Gateway (coarse)", when: "the check is <b>data-independent</b> &mdash; valid token, right audience, rate limit &mdash; and you want junk rejected before it reaches services." }, { n: "In the service (fine)", when: "the decision <b>needs the data</b> &mdash; does this user own this object, tenant scoping on the query. Object-level authz can&rsquo;t live at the edge." }],
      tell: "Coarse at the edge, fine at the source. <b>Zero-trust</b> means the service re-checks regardless &mdash; it can&rsquo;t assume the gateway authorized the request." },
    { q: 'Per-request context (SET LOCAL) <span class="vs">vs</span> connection-per-tenant',
      opts: [{ n: "SET LOCAL per txn", when: "you pool connections across tenants (the norm at scale) &mdash; set the tenant transaction-scoped so it resets on commit and can&rsquo;t leak to the next request." }, { n: "Connection per tenant", when: "you have <b>few, large tenants</b> and want physical connection isolation &mdash; but it doesn&rsquo;t scale to thousands (pool sprawl)." }],
      tell: "For a pooled system, <b>SET LOCAL not SET</b> is the rule &mdash; a session-scoped SET leaks the tenant across a reused connection. Connection-per-tenant is clean but only viable for a handful of tenants." },
    { q: 'Central policy engine (OPA) <span class="vs">vs</span> in-code checks',
      opts: [{ n: "Policy engine (OPA/Cedar)", when: "policies are <b>complex, shared across services</b>, or must be audited and changed without redeploying code &mdash; externalize them as data." }, { n: "In-code checks", when: "authorization is <b>simple and local</b> &mdash; a tenant predicate and a role check &mdash; and an engine would add a network hop and operational weight for little gain." }],
      tell: "Externalize policy when it&rsquo;s <b>complex and cross-cutting</b>; keep it in code when it&rsquo;s simple. But the <b>tenant predicate</b> usually stays in the data layer either way &mdash; you don&rsquo;t want a per-row decision taking a network round-trip." },
    { q: 'Cache the authz decision <span class="vs">vs</span> check every request',
      opts: [{ n: "Cache (short TTL)", when: "the check is <b>expensive</b> (a policy lookup) and the action is <b>low-risk</b> &mdash; a stale allow self-heals when the TTL expires." }, { n: "Check live", when: "the action is <b>high-privilege</b> (delete, billing) where a stale &lsquo;allow&rsquo; after a revoked role is unacceptable &mdash; verify against current state." }],
      tell: "Caching authz is an <b>invalidation</b> problem: a stale allow after a revocation is the hole. Tier it by blast radius &mdash; cache the cheap read, check live for the dangerous write." }
  ]
};
