/* topics/authz/model.js -- topic 3 model answers. selectors[i] pairs answers[i];
   each answer = {opener, sub, beats:[{l,c,t}]} where c in frame|head|sub|risk|trade|
   close. Full spoken scripts for the 9 scenario framings. 'Name the limits' stays
   LAST. Grounded in the Invenco multi-tenant platform. 7-bit ASCII (entities+\uXXXX). */
var TOPIC_AUTHZ_MODEL = {
  selectors: ['Make it secure', 'The isolation model', 'Walk a cross-tenant leak', 'Defend the design', 'Operate it', 'Cut scope', 'One you built', 'Test it', 'Name the limits'],
  answers: [
    { opener:"\u201CHow do you keep one tenant out of another&rsquo;s data?\u201D",
      sub:"Identity from the verified token, scope injected into every query, deny-by-default.",
      beats:[
        {l:"FRAME",c:"frame",t:"The mistake is treating this as a permission check at the top of each handler &mdash; at scale someone forgets one. I make isolation a <b>property of the system</b>, not a discipline."},
        {l:"HEADLINE",c:"head",t:"Authorization is a <b>predicate the shared data layer injects into every query</b> &mdash; the tenant filter is added automatically, so a developer can&rsquo;t write an unscoped query."},
        {l:"IDENTITY",c:"sub",t:"The tenant comes from the <b>verified token</b> &mdash; a signed claim &mdash; never a header or body. It&rsquo;s trusted because forging it breaks the signature; a client-supplied tenant id is the confused-deputy attack."},
        {l:"DENY BY DEFAULT",c:"sub",t:"No tenant context <b>throws</b> &mdash; it never falls back to an unscoped query. A lost context is a loud crash, not a silent full-table leak."},
        {l:"THE OBJECT CHECK",c:"risk",t:"The predicate covers list queries; a <code>getById(id)</code> still gets an explicit <b>ownership assertion</b>, and a cross-tenant miss returns <b>404, not 403</b>. That&rsquo;s the BOLA defense &mdash; OWASP&rsquo;s number one."},
        {l:"DEPTH",c:"trade",t:"The database is the <b>backstop</b> &mdash; RLS <code>FORCE</code>d, or DynamoDB LeadingKeys &mdash; so even a raw query or an app bug can&rsquo;t cross tenants. The app prevents the mistake, the database catches the slip."},
        {l:"CLOSE",c:"close",t:"So: identity from the token, scope in every query, deny-by-default, an object check on singleton lookups, and the database as backstop. Isolation a developer can&rsquo;t forget."}
      ] },
    { opener:"\u201CDatabase per tenant, or one shared pool?\u201D",
      sub:"Silo, pool, bridge &mdash; keyed on tenant size and compliance.",
      beats:[
        {l:"FRAME",c:"frame",t:"Three models, and the choice is a <b>trade-off, not a default</b> &mdash; so I&rsquo;d name the axis before picking."},
        {l:"THE THREE",c:"head",t:"<b>Silo</b> (DB per tenant): strongest isolation, trivial per-tenant backup and delete &mdash; but N migrations and connection sprawl. <b>Pool</b> (shared tables): cheapest, one migration &mdash; but all burden on enforcement. <b>Bridge</b>: both."},
        {l:"THE AXIS",c:"sub",t:"The axis is <b>cost and agility vs isolation and compliance</b>. A pool is efficient but leans entirely on the enforcement layer; a silo is safe but operationally heavy."},
        {l:"MY DEFAULT",c:"sub",t:"For a platform with a few whales and a long tail, I&rsquo;d <b>bridge</b>: pool the long tail for cost, silo the large or regulated tenants who need their own key, dedicated backup, or a hard compliance boundary."},
        {l:"THE TELL",c:"risk",t:"The deletion asymmetry proves the point &mdash; &lsquo;delete this tenant&rsquo; is a database drop in a silo but a scoped multi-table DELETE in a pool. Any tenant with heavy right-to-erasure is a candidate to silo."},
        {l:"NO REWRITE",c:"trade",t:"The data layer resolves tenant&rarr;datasource, so moving a tenant from pool to silo is a <b>config/route change, not a rewrite</b> &mdash; which is what makes the hybrid practical."},
        {l:"CLOSE",c:"close",t:"So: bridge by default, keyed on tenant size and compliance profile &mdash; and I&rsquo;d resist declaring one model universally right."}
      ] },
    { opener:"\u201CA customer reports seeing another company&rsquo;s data. Walk me through it.\u201D",
      sub:"Contain, find the escaped scope, close the class, prove it can&rsquo;t recur.",
      beats:[
        {l:"FRAME",c:"frame",t:"This is a <b>Sev-1</b> &mdash; a confidentiality breach. First contain, then diagnose, then prove it can&rsquo;t recur. I don&rsquo;t start by guessing the cause."},
        {l:"CONTAIN",c:"head",t:"Immediately: scope the blast radius from <b>audit logs</b> (who saw what across which tenants), and if it&rsquo;s active, disable the offending path. Stop the bleeding before the forensics."},
        {l:"THE USUAL CAUSE",c:"sub",t:"Nine times in ten it&rsquo;s a <b>query that escaped the scoped layer</b> &mdash; a raw query without the tenant filter, or a <code>getById</code> that fetched by primary key and never checked ownership. The predicate was bypassed."},
        {l:"CONFIRM",c:"sub",t:"I&rsquo;d confirm from the logs and a repro: which query, which code path, was it the list predicate or the missing object-level check. Precision matters &mdash; the fix differs."},
        {l:"CLOSE IT",c:"risk",t:"Fix the immediate hole, then close the <b>class</b>: route that access through the shared layer, add the object-level check, and if RLS wasn&rsquo;t <code>FORCE</code>d, force it so the database would have caught it."},
        {l:"PROVE IT",c:"trade",t:"Then a <b>regression test that injects the foreign id</b> and asserts zero rows, gated in CI &mdash; so this exact leak fails the build forever. And a blameless postmortem on why the layer was bypassable."},
        {l:"CLOSE",c:"close",t:"So: contain from audit logs, find the escaped query, close the class not just the instance, and lock it with an adversarial test. A leak is a missing layer, not just a missing filter."}
      ] },
    { opener:"\u201CWhy inject a predicate instead of just reviewing queries carefully?\u201D",
      sub:"Because human discipline fails at scale; the system should make the mistake unwritable.",
      beats:[
        {l:"FRAME",c:"frame",t:"The alternative &mdash; &lsquo;developers add the tenant filter and we catch misses in review&rsquo; &mdash; is a <b>discipline</b>, and disciplines fail at scale. One person forgets one query, one time, and it&rsquo;s a breach."},
        {l:"THE CASE",c:"head",t:"Injecting the predicate in the shared layer makes the unscoped query <b>unwritable</b> &mdash; the developer never types the filter, so they can&rsquo;t omit it. I move the guarantee from &lsquo;remember&rsquo; to &lsquo;can&rsquo;t forget.&rsquo;"},
        {l:"VS RLS ALONE",c:"sub",t:"Why not <i>only</i> database RLS? Because I want <b>portability</b> (DynamoDB has no RLS), clearer errors, and enforcement that doesn&rsquo;t depend on every connection being configured. RLS is the backstop, not the whole plan."},
        {l:"VS PER-ENDPOINT",c:"sub",t:"Why not per-endpoint checks? They scatter the rule across hundreds of handlers &mdash; N places to get right instead of one. Centralizing it is fewer surfaces to audit and fewer places to slip."},
        {l:"THE HONEST COST",c:"risk",t:"The cost is that legitimate cross-tenant queries (admin, reporting) now need an <b>explicit, audited</b> opt-out accessor &mdash; but that&rsquo;s a feature: crossing tenants should be deliberate and logged, never the default."},
        {l:"DEPTH",c:"trade",t:"And I keep <b>both</b> layers because they fail differently &mdash; the app layer prevents the common mistake, the database catches the raw-query bypass. Defense in depth isn&rsquo;t redundancy; it&rsquo;s covering different failure modes."},
        {l:"CLOSE",c:"close",t:"So I&rsquo;d defend it as <b>making the safe path the only path</b> &mdash; the strongest security control is one that can&rsquo;t be bypassed by forgetting."}
      ] },
    { opener:"\u201CHow would you operate this in production?\u201D",
      sub:"Per-tenant metrics, audit every access, alarm on the shape of an attack.",
      beats:[
        {l:"FRAME",c:"frame",t:"Operating multi-tenant authz is two jobs: <b>detect a boundary violation</b>, and <b>keep one tenant from starving the rest</b>. Both need per-tenant visibility."},
        {l:"AUDIT",c:"head",t:"Every access is <b>logged</b> &mdash; who, which tenant, which object &mdash; and cross-tenant <i>attempts</i> are a first-class signal. The audit trail is both a detective control and the compliance artifact regulators ask for."},
        {l:"ANOMALY",c:"sub",t:"I alarm on the <b>shape of an attack</b>: a spike in 404s from one user, access to ids outside their normal range, a burst of distinct-object lookups &mdash; that&rsquo;s automated IDOR scanning."},
        {l:"NOISY NEIGHBOR",c:"sub",t:"Per-tenant <b>rate limits, quotas, and fair queuing</b>, plus <b>per-tenant metrics</b> (QPS and P99 by tenant) &mdash; without them I&rsquo;d see &lsquo;the system is slow&rsquo; and couldn&rsquo;t attribute it to tenant 42 at 10x normal."},
        {l:"THE DATABASE",c:"risk",t:"The database is the scarcest shared resource, so per-tenant <b>query timeouts and connection caps</b> keep one tenant from exhausting the pool. The whale gets its own lane."},
        {l:"INCIDENT READY",c:"trade",t:"And a <b>break-glass</b> path for support &mdash; audited, time-boxed impersonation &mdash; so &lsquo;we need to see the customer&rsquo;s data to debug&rsquo; doesn&rsquo;t become a standing super-admin role that&rsquo;s a breach waiting to happen."},
        {l:"CLOSE",c:"close",t:"So: audit everything, alarm on attack shapes, enforce per-tenant fairness with per-tenant metrics, and make cross-tenant access exceptional and observable."}
      ] },
    { opener:"\u201CYou have two weeks for an MVP. What do you cut?\u201D",
      sub:"Cut the sophistication, never the tenant predicate.",
      beats:[
        {l:"FRAME",c:"frame",t:"The rule: I cut <b>sophistication</b>, never the <b>boundary</b>. A leaked-tenant MVP isn&rsquo;t an MVP, it&rsquo;s an incident."},
        {l:"KEEP",c:"head",t:"Non-negotiable: identity from a <b>verified claim</b>, the <b>tenant predicate</b> in the data layer, <b>deny-by-default</b>, and the <b>object-level check</b> with 404s. That&rsquo;s the irreducible core of isolation."},
        {l:"CUT: MODEL",c:"sub",t:"<b>Pool everyone</b> &mdash; skip silos and per-tenant keys for now. Cheapest and fastest, and because the data layer resolves tenant&rarr;datasource, I can silo a tenant later without a rewrite."},
        {l:"CUT: RICHNESS",c:"sub",t:"<b>RBAC only</b>, a handful of roles &mdash; no ABAC, no policy engine. Add attribute rules when role explosion actually shows up, not before."},
        {l:"CUT: CACHING",c:"risk",t:"<b>No authz caching</b> &mdash; check on every request. Simpler, and it avoids the invalidation trap; I&rsquo;d only add a cache when a real hotspot appears."},
        {l:"DON&rsquo;T CUT: RLS",c:"trade",t:"I&rsquo;d still <b>FORCE RLS</b> if I&rsquo;m on Postgres &mdash; it&rsquo;s nearly free and it&rsquo;s the backstop that turns a future bug from a breach into a caught error. Cheap insurance I wouldn&rsquo;t skip."},
        {l:"CLOSE",c:"close",t:"So: pool, RBAC, no cache &mdash; but the verified claim, the predicate, deny-by-default, and the object check ship on day one. The boundary is the product."}
      ] },
    { opener:"\u201CTell me about a multi-tenant system you&rsquo;ve built.\u201D",
      sub:"Invenco: 50k+ terminals, DynamoDB, tenant as the leading key, IAM-enforced.",
      beats:[
        {l:"FRAME",c:"frame",t:"I&rsquo;ll take the multi-tenant platform at Invenco &mdash; 50,000-plus payment terminals across customers on AWS, DynamoDB, multi-tenant microservices. So I&rsquo;ve lived this, and the interesting part was pushing enforcement <b>below the app</b>."},
        {l:"THE MODEL",c:"head",t:"Tenant was the <b>leading element of the partition key</b> &mdash; <code>tenantId</code> first &mdash; so a tenant&rsquo;s items were physically grouped and every access was naturally scoped. Same instinct as a tenant-leading SQL index."},
        {l:"IAM ENFORCEMENT",c:"sub",t:"The part I&rsquo;m proud of: isolation pushed into <b>IAM</b> with <code>dynamodb:LeadingKeys</code> &mdash; a credential could only touch items whose partition key started with its tenant id. Enforcement below application code, so an app bug couldn&rsquo;t cross tenants."},
        {l:"IDENTITY",c:"sub",t:"Tenant context came from the <b>Cognito ID token&rsquo;s claim</b>, propagated via a Lambda authorizer &mdash; from the verified identity, never client input. The claim picked the scope all the way down to the IAM policy."},
        {l:"THE GOTCHA",c:"risk",t:"The subtle one: <b>Scan bypasses LeadingKeys</b>. So &lsquo;scan less&rsquo; became a real rule &mdash; lock down who can Scan, prefer Query, and treat a Scan in review as a red flag. The enforcement had a hole you had to design around."},
        {l:"WHAT I&rsquo;D CHANGE",c:"trade",t:"If I did it again I&rsquo;d invest earlier in <b>hot-partition handling</b> for the whales &mdash; a shard-suffix on the tenant key &mdash; because a large tenant on one partition hits the throughput ceiling, and retrofitting sharding is harder than designing it in."},
        {l:"CLOSE",c:"close",t:"So the value was <b>tenant-as-leading-key plus IAM enforcement</b> &mdash; isolation the application couldn&rsquo;t accidentally break &mdash; and knowing the one hole (Scan) that the model didn&rsquo;t close."}
      ] },
    { opener:"\u201CHow do you test that isolation actually holds?\u201D",
      sub:"Attack the boundary &mdash; inject the other tenant&rsquo;s id and assert zero rows.",
      beats:[
        {l:"FRAME",c:"frame",t:"Isolation is a <b>security property</b>, so the tests have to be <b>adversarial</b> &mdash; the happy path (tenant A sees A&rsquo;s data) is the easy part and passes even when the boundary is broken."},
        {l:"HEADLINE",c:"head",t:"The load-bearing test: <b>seed two tenants, query as A but hand it B&rsquo;s ids, and assert zero rows come back</b> &mdash; 404 or empty, never data. You test the exact failure you fear."},
        {l:"EVERY PATH",c:"sub",t:"I run that foreign-id injection across <b>every read path</b> &mdash; list queries, <code>getById</code>, search, exports &mdash; because the leak usually hides in the one path that fetched by primary key and forgot the ownership check."},
        {l:"IN CI",c:"sub",t:"It runs in <b>CI as a first-class gate</b> &mdash; a regression must fail the build mechanically, not get caught in review, because &lsquo;we&rsquo;ll notice&rsquo; is exactly how isolation holes ship."},
        {l:"RUNTIME TOO",c:"risk",t:"Paired with <b>runtime assertions and audit logging</b> of cross-tenant attempts &mdash; so the boundary is verified before merge and monitored after deploy. Tests catch the known; monitoring catches the unknown."},
        {l:"THE RLS CASE",c:"trade",t:"On RLS I also test that it&rsquo;s actually <b>FORCE</b>d and context is <code>SET LOCAL</code> &mdash; a test that connects as the owner and confirms the policy still applies catches the &lsquo;RLS silently skipped&rsquo; footgun."},
        {l:"CLOSE",c:"close",t:"So: adversarial foreign-id tests across every path, gated in CI, plus runtime attempt-logging. You can&rsquo;t review your way to isolation &mdash; you have to try to break it, mechanically."}
      ] },
    { opener:"\u201CWhere does this approach fall short?\u201D",
      sub:"The honest edges: stateless-token staleness, the escaped raw query, the whale.",
      beats:[
        {l:"FRAME",c:"frame",t:"A few honest limits &mdash; naming them is the point, because pretending isolation is airtight is the junior tell."},
        {l:"TOKEN STALENESS",c:"risk",t:"Stateless tokens are a <b>snapshot until expiry</b> &mdash; a revoked role or tenant change lags until refresh. I mitigate with short lifetimes and live checks on high-privilege actions, but immediate revocation and stateless verification are genuinely in tension."},
        {l:"THE ESCAPED QUERY",c:"risk",t:"The predicate only protects code that goes <b>through the layer</b>. A raw query, a new datastore, a background job that forgets context &mdash; each can bypass it. RLS backstops the database, but not every store has RLS, so the guarantee is only as good as its coverage."},
        {l:"THE WHALE",c:"trade",t:"A tenant-leading index isolates but stops <i>narrowing</i> when one tenant is most of the data &mdash; the whale needs extra targeted indexes or a silo. Isolation and query performance are related but not the same lever."},
        {l:"CACHING",c:"sub",t:"Any authz caching reintroduces a <b>staleness window</b> on revocation &mdash; I tier it by blast radius, but a cached &lsquo;allow&rsquo; is always a small risk I&rsquo;m trading for latency."},
        {l:"CLOSE",c:"close",t:"None of these are dealbreakers &mdash; they&rsquo;re the trade-offs I&rsquo;d name before being asked, and each has a mitigation I&rsquo;d put on the roadmap rather than pretend away."}
      ] }
  ]
};
