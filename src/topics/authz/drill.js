/* topics/authz/drill.js -- topic 3 drill data. Like topic 2, uses LOCAL arrays
   AUTHZ_CARDS / AUTHZ_SPEAK so loading this bundle does NOT clobber topic 1's
   working set (cards / speakLines). publishBanks() reseeds the globals from
   TOPIC_AUTHZ_BANK on switch. AUTHZ_SPEAK[i] pairs AUTHZ_CARDS[i] (order is
   load-bearing). Grounded in the Invenco multi-tenant platform. 7-bit ASCII. */
var AUTHZ_CARDS = [
  { tier:'SDE2', signal:'Where tenant identity comes from',
    q:"In a multi-tenant API, where does the tenant id come from on each request?",
    a:"From the <b>verified token</b> &mdash; a signed claim like <code>custom:tenant_id</code> &mdash; and <b>never</b> from a header, query param, or body the client controls. The claim is trustworthy because forging it would break the token&rsquo;s signature; a client-supplied tenant id is trustworthy only if you enjoy being breached.",
    f:[
      { q:"Why is a header like X-Tenant-Id so dangerous if it&rsquo;s convenient?",
        a:"Because the client sets it, so an authenticated user of tenant A just sends <code>X-Tenant-Id: B</code> and reads B&rsquo;s data &mdash; the textbook <b>confused-deputy</b> attack, where the server becomes a deputy acting on attacker-chosen scope. The tenant must be <i>derived</i> server-side from the authenticated identity, never <i>accepted</i> from the request." },
      { q:"The token itself is client-supplied &mdash; why trust anything in it?",
        a:"You don&rsquo;t trust the token, you <b>verify</b> it: the signature is checked against the issuer&rsquo;s public key, so a tampered or forged token is rejected. Once verified, the <i>claims</i> are trustworthy because the issuer &mdash; not the client &mdash; put them there. A sealed letter and a sticky note both arrive via the client; only one is authenticated." }
    ],
    senior:"Stating flatly that tenant identity comes from a <b>verified, signed claim</b> and never from client-controlled input &mdash; and naming the confused-deputy attack as the reason &mdash; is the single most important sentence in a multi-tenant authz round." },
  { tier:'SDE2', signal:'Predicate, not a gate',
    q:"How do you make sure every query is tenant-scoped &mdash; do you check permissions in each endpoint?",
    a:"No &mdash; per-endpoint checks are a discipline that eventually fails when someone forgets one. Authorization is a <b>predicate injected into every query</b> by the shared data layer: the tenant filter is added automatically on every read and write, so a developer writes <code>findOrders()</code> and the scope is already there. You make isolation a property of the system, not a checklist.",
    f:[
      { q:"What actually does the injecting?",
        a:"A <b>data-access layer</b> the whole app goes through &mdash; an ORM extension or global scope (Prisma <code>$extends</code>, a Sequelize <code>defaultScope</code>) that reads the tenant from per-request context and appends <code>tenantId</code> to the <code>where</code> on reads and the <code>data</code> on writes. One place enforces it; business code never touches the filter." },
      { q:"Isn&rsquo;t injecting a global WHERE clause fragile &mdash; what about a query that legitimately spans tenants?",
        a:"Those are rare and <b>explicit</b>: an admin or reporting path that opts out through a separate, audited accessor &mdash; never the default one. The default is always scoped; crossing tenants is a deliberate, logged exception with its own authorization. You don&rsquo;t weaken the default to serve the one-percent case." }
    ],
    senior:"Reframing authorization from &lsquo;a check I perform&rsquo; to &lsquo;a predicate the system injects&rsquo; &mdash; so the unscoped query is something a developer <i>cannot write</i> &mdash; is the architectural insight that separates L5 from &lsquo;add a WHERE clause.&rsquo;" },
  { tier:'SDE2', signal:'Deny-by-default',
    q:"Your data layer injects the tenant filter from request context. What happens if that context is missing?",
    a:"It <b>throws</b> &mdash; it must never fall back to an unscoped query. No tenant context means &ldquo;called outside a request, or something is wrong,&rdquo; and the safe response is a loud failure, not a silent full-table read. Deny-by-default makes the leak path <i>crash</i> instead of <i>leak</i>.",
    f:[
      { q:"Why is a crash better than just returning nothing?",
        a:"Returning nothing hides a real bug &mdash; a background job that lost context silently does no work, or a path that <i>drops</i> the scope quietly returns everything. A throw surfaces the defect immediately, in tests and logs, instead of shipping a silent isolation hole. Fail loud, fail early." },
      { q:"How does this show up in Postgres RLS?",
        a:"Same principle, enforced by the engine: if RLS is <b>enabled but no policy matches</b>, Postgres returns <b>zero rows</b> &mdash; deny-by-default. You never get an accidental &lsquo;all rows&rsquo; from a missing policy; the absence of a rule means no access, which is exactly the posture you want." }
    ],
    senior:"Insisting the accessor <b>throws</b> on missing context rather than degrading to unscoped &mdash; converting a silent leak into a loud failure &mdash; is the instinct that shows you&rsquo;ve debugged a real isolation incident." },
  { tier:'SDE3', signal:'The forgotten WHERE clause',
    q:"A developer writes a raw query and forgets the tenant filter. What saves you?",
    a:"Layers, because you assume it <i>will</i> happen. The <b>shared data layer</b> injects the scope so most code never writes the filter; the layer is <b>deny-by-default</b>; the database enforces <b>RLS / LeadingKeys</b> as a backstop; and <b>isolation tests</b> seed two tenants and assert zero cross-tenant rows even when handed a foreign id. No single control &mdash; a stack, so one slip doesn&rsquo;t breach.",
    f:[
      { q:"Realistically, someone bypasses the ORM with raw SQL. Now what?",
        a:"That&rsquo;s exactly why the <b>database backstop</b> exists: with Postgres RLS <code>FORCE</code>d, even a raw query the app issues is filtered by the engine to the session&rsquo;s tenant. The raw query bypasses <i>your</i> layer, not the database&rsquo;s policy. And a review rule or lint against raw datastore access outside the repository catches it before merge." },
      { q:"How do you keep this from being wishful thinking?",
        a:"Automated <b>isolation tests</b> that inject a foreign tenant&rsquo;s id and assert the boundary holds &mdash; AWS&rsquo;s SaaS Lens explicitly recommends tests that pass in another tenant&rsquo;s id and verify zero rows come back. You test the failure you&rsquo;re afraid of, in CI, so a regression is caught mechanically rather than in production." }
    ],
    senior:"Answering &lsquo;what saves you&rsquo; with <b>defense in depth plus a test that injects a foreign id</b> &mdash; rather than &lsquo;developers should be careful&rsquo; &mdash; is what shows you treat isolation as an engineered guarantee, not a hope." },
  { tier:'SDE2', signal:'404, not 403',
    q:"An authenticated user requests a record that belongs to another tenant. What status code do you return?",
    a:"<b>404, not 403.</b> A 403 &ldquo;forbidden&rdquo; confirms the object exists &mdash; which leaks information and lets an attacker enumerate valid ids across tenants. A 404 makes a cross-tenant object indistinguishable from one that was never there. You log the attempt internally as a signal, but the response reveals nothing.",
    f:[
      { q:"Isn&rsquo;t 403 more honest per HTTP semantics?",
        a:"For a resource the user genuinely can&rsquo;t access <i>within</i> their tenant, 403 is fine. But <i>across</i> tenants, existence itself is confidential &mdash; so you deliberately return 404 to avoid confirming it. Security posture wins over strict semantics here, the same reason login says &ldquo;invalid username <i>or</i> password&rdquo; rather than &ldquo;no such user.&rdquo;" }
    ],
    senior:"Knowing that a 403 <b>leaks existence</b> across a tenant boundary &mdash; and choosing 404 as a deliberate information-hiding control while still logging internally &mdash; is a small detail that signals real security thinking." },
  { tier:'SDE3', signal:'IDOR / BOLA',
    q:"Walk me through the number-one API security risk in a multi-tenant system and how you defend it.",
    a:"<b>BOLA</b> &mdash; Broken Object-Level Authorization (OWASP API #1), the IDOR / confused-deputy attack: an authenticated user of tenant A requests <code>/orders/{id}</code> where the id belongs to tenant B. The defense is <b>object-level authorization</b> on every fetch-by-id: verify <code>resource.tenantId === ctx.tenant</code> (and ownership) server-side, return 404 on mismatch, and never treat the id as authorization &mdash; it&rsquo;s a <i>request</i>.",
    f:[
      { q:"The tenant predicate already scopes queries &mdash; doesn&rsquo;t that cover it?",
        a:"For <b>list</b> queries, yes. But a direct <code>getById(params.id)</code> where the id is client-supplied still needs an <b>explicit ownership assertion</b>, because the code may fetch by primary key first and check tenant second &mdash; or forget to. The object-level check is the belt to the predicate&rsquo;s suspenders on singleton lookups." },
      { q:"Do UUIDs fix this by making ids unguessable?",
        a:"They <b>help</b> against enumeration &mdash; you can&rsquo;t iterate <code>/orders/1,2,3</code> &mdash; but they are <b>not a substitute</b> for the authorization check. A leaked or logged UUID is still accessible without the ownership assertion. UUIDs raise the cost of discovery; only the server-side check actually enforces the boundary." }
    ],
    senior:"Naming <b>BOLA / IDOR as OWASP API #1</b>, distinguishing the list-query predicate from the singleton ownership check, and adding that UUIDs help but don&rsquo;t replace authorization &mdash; is the complete answer to the question interviewers ask most." },
  { tier:'SDE3', signal:'Silo vs pool vs bridge',
    q:"How do you decide between a database per tenant and one shared table for everyone?",
    a:"Three models. <b>Silo</b> (database per tenant): strongest isolation, trivial per-tenant backup/restore and delete, best compliance story &mdash; but operationally heavy (migrations across N databases, connection sprawl). <b>Pool</b> (shared tables, tenant_id discriminator): cheapest, easiest to migrate once &mdash; but weakest isolation, all burden on enforcement. <b>Bridge</b> (hybrid): pool the long tail, silo the whales and the compliance-bound. The axis is <b>cost/agility vs isolation/compliance</b>.",
    f:[
      { q:"Which would you actually pick for a platform with a few huge customers and a long tail of small ones?",
        a:"The <b>bridge</b>: pool the long tail for cost and single-migration agility, and silo the few large or regulated tenants who need per-tenant encryption keys, dedicated backup, or a hard compliance boundary. Same tenant&rarr;datasource resolution in the data layer, so app code doesn&rsquo;t change &mdash; you offer premium isolation to those who require it without paying silo costs for everyone." },
      { q:"How does &lsquo;delete this tenant&rsquo;s data&rsquo; differ between the two?",
        a:"In a <b>silo</b> it&rsquo;s trivial &mdash; drop that tenant&rsquo;s database. In a <b>pool</b> it&rsquo;s a carefully scoped transactional DELETE across every tenant-bearing table, driven by the shared layer so nothing is missed, plus verification. That asymmetry is itself a strong argument for siloing any tenant with heavy right-to-erasure or contractual deletion SLAs." }
    ],
    senior:"Framing silo/pool/bridge on the <b>cost-vs-isolation axis</b> and defaulting to a hybrid &mdash; pool the long tail, silo the whales &mdash; rather than declaring one universally right is the trade-off literacy a senior round is checking for." },
  { tier:'Staff', signal:'Row-Level Security done right',
    q:"You put tenant isolation in Postgres Row-Level Security. What are the ways to get it subtly wrong?",
    a:"Four classic mistakes. RLS is <b>skipped for table owners and superusers</b> by default &mdash; you must <code>FORCE ROW LEVEL SECURITY</code> and connect as a <b>non-owner</b>. You must set the tenant with <code>SET LOCAL</code> (transaction-scoped), not <code>SET</code>, or the context <b>leaks across a pooled connection</b> to the next tenant. And an enabled table with <b>no policy</b> denies all &mdash; a good default, but surprising if unplanned.",
    f:[
      { q:"Why is SET LOCAL vs SET such a big deal?",
        a:"Connection pools reuse a physical connection across requests. A plain <code>SET app.tenant</code> persists on that connection, so the <i>next</i> request &mdash; a different tenant &mdash; inherits it and reads the wrong data. <code>SET LOCAL</code> is scoped to the current transaction and reset on commit, so context can&rsquo;t bleed between tenants sharing a pooled connection. It&rsquo;s the pooling equivalent of deny-by-default." },
      { q:"If RLS is enforced by the engine, why keep the app-layer predicate at all?",
        a:"Depth and ergonomics. RLS is the <b>backstop</b> that survives an app bug or a raw query; the app-layer predicate gives you <b>portability</b> (DynamoDB has no RLS), clearer errors, and enforcement that doesn&rsquo;t depend on every connection being configured correctly. You want both: the app layer prevents the mistake, RLS catches the one that reaches the database." }
    ],
    senior:"Listing the RLS footguns &mdash; <code>FORCE</code>, non-owner connection, <code>SET LOCAL</code> not <code>SET</code>, deny-by-default on no policy &mdash; is exactly the depth that separates &lsquo;I&rsquo;ve read about RLS&rsquo; from &lsquo;I&rsquo;ve shipped it and watched context leak across a pool.&rsquo;" },
  { tier:'SDE3', signal:'DynamoDB LeadingKeys',
    q:"How do you enforce tenant isolation in DynamoDB at the IAM layer, and what&rsquo;s the gotcha?",
    a:"The <b>dynamodb:LeadingKeys</b> condition: you require <code>tenantId</code> as the <b>leading element of the partition key</b> and scope an IAM policy so a credential can only read/write items whose partition key <i>begins with</i> its tenant id. It&rsquo;s row-level access control enforced by IAM, not app code. The gotcha: <b>LeadingKeys constrains Query and GetItem, but Scan bypasses it</b> &mdash; so scan less, and lock down who can Scan.",
    f:[
      { q:"Where does the tenant id in the IAM condition come from at runtime?",
        a:"From the <b>identity</b>, not the request &mdash; e.g. the Cognito ID token&rsquo;s <code>custom:tenant_id</code> claim, surfaced to IAM via the identity pool or a Lambda authorizer, so the policy variable resolves to the authenticated tenant. Same rule as everywhere: the tenant scope is derived from verified identity, here pushed all the way down into the IAM policy guarding the table." },
      { q:"A large tenant makes one partition hot. How do you keep LeadingKeys and still spread load?",
        a:"<b>Write-sharding</b> the tenant key: suffix it (<code>TENANT#bigco-7</code>) and scatter-gather reads across the shards. The partition key still <i>leads</i> with the tenant id, so LeadingKeys still holds; you&rsquo;ve just spread one tenant across partitions to dodge the 1,000 WCU / 3,000 RCU per-partition ceiling. The shard suffix serves both isolation and hot-partition mitigation." }
    ],
    senior:"Knowing <b>LeadingKeys</b> pushes isolation into IAM, that the tenant id comes from the verified identity, and that <b>Scan bypasses it</b> (plus the write-sharding fix for hot partitions) is precisely the DynamoDB multi-tenant depth an interviewer probes for." },
  { tier:'SDE3', signal:'RBAC vs ABAC',
    q:"Roles or attributes &mdash; how do you model <i>what</i> a user can do, beyond which tenant they&rsquo;re in?",
    a:"<b>RBAC</b> assigns permissions to roles (admin, editor, viewer) and users to roles &mdash; simple, auditable, great when access maps cleanly to job functions. <b>ABAC</b> evaluates policies over attributes of the user, resource, and context (<code>department == resource.department AND time in hours</code>) &mdash; expressive, great for fine-grained or dynamic rules. Most real systems are <b>RBAC as the base, ABAC for the exceptions</b>.",
    f:[
      { q:"When does RBAC start to hurt?",
        a:"<b>Role explosion.</b> When you need &lsquo;editor, but only for the Europe region, only during business hours,&rsquo; you start minting a combinatorial number of narrow roles (<code>editor-europe-daytime</code>). That&rsquo;s the signal to move those dimensions into <b>attributes</b> &mdash; ABAC evaluates them as policy instead of encoding every combination as a distinct role. RBAC for the coarse grid, ABAC where it gets fine." },
      { q:"Where does tenant isolation fit &mdash; is it RBAC or ABAC?",
        a:"Neither, really &mdash; it&rsquo;s a <b>separate, lower layer</b>. Tenant scoping is a hard boundary applied to <i>every</i> request regardless of role; RBAC/ABAC decide what you can do <i>within</i> your tenant. You enforce the tenant predicate first (can I see this data at all?), then role/attribute checks (what may I do with it?). Conflating them is how a &lsquo;super-admin&rsquo; role accidentally crosses tenants." }
    ],
    senior:"Positioning <b>RBAC as the base and ABAC for the exceptions</b>, naming role explosion as the trigger to reach for attributes, and keeping <b>tenant isolation as a separate layer beneath both</b> is the layered authorization model a Staff interviewer wants to hear." },
  { tier:'Staff', signal:'The noisy neighbor',
    q:"In a pooled multi-tenant system, one tenant&rsquo;s traffic spikes and everyone else slows down. How do you contain it?",
    a:"<b>Fairness controls per tenant.</b> Per-tenant <b>rate limits</b> (429 with <code>Retry-After</code>), layered limits (per-tenant + per-endpoint + global), per-tenant <b>resource quotas</b> (query timeouts, connection caps), and <b>fair queuing</b> so work is scheduled proportionally rather than first-come. Auto-scaling with a ceiling absorbs the rest without a cost blowout. The goal: one tenant&rsquo;s burst can&rsquo;t consume another tenant&rsquo;s share.",
    f:[
      { q:"How do you even detect which tenant is the problem?",
        a:"<b>Per-tenant instrumentation.</b> QPS, latency percentiles (P50/P95/P99), and resource consumption <i>broken down by tenant id</i> &mdash; you compare each tenant&rsquo;s actual usage against its configured limit. Without per-tenant metrics you see &lsquo;the system is slow&rsquo; and can&rsquo;t attribute it; with them you see &lsquo;tenant 42 is at 10x its normal QPS&rsquo; and throttle precisely." },
      { q:"Rate limits protect the API tier. What protects the shared database?",
        a:"Per-tenant <b>query timeouts</b> (<code>statement_timeout</code> per tier), per-tenant <b>connection limits</b> so one tenant can&rsquo;t exhaust the pool, and <b>workload separation</b> &mdash; routing heavy analytical or automated queries away from the path serving interactive traffic. The database is the scarcest shared resource, so its fairness controls matter most; the whale gets its own lane, not the whole road." }
    ],
    senior:"Answering noisy-neighbor with <b>per-tenant limits, quotas, fair queuing, AND per-tenant metrics to detect it</b> &mdash; and separately protecting the database as the scarcest resource &mdash; is the operational-isolation depth that marks a Staff-level multi-tenant answer." },
  { tier:'SDE3', signal:'BFLA vs BOLA',
    q:"Besides object-level access, what other authorization gap bites multi-tenant APIs?",
    a:"<b>BFLA</b> &mdash; Broken <i>Function</i>-Level Authorization (OWASP API #5). BOLA is &lsquo;can this user touch this <i>object</i>&rsquo;; BFLA is &lsquo;can this user invoke this <i>function/endpoint</i> at all.&rsquo; The classic miss: an <code>/admin/*</code> route or a privileged action that checks authentication but not <b>role</b>, so any logged-in user can call it. The fix: every function checks the required role/permission, not just a valid token.",
    f:[
      { q:"Give a concrete example of a BFLA slip.",
        a:"A regular user discovers <code>POST /api/users/{id}/promote</code> or an internal admin endpoint the UI hides but the API doesn&rsquo;t protect &mdash; they call it directly and escalate. The endpoint verified they were <i>logged in</i> but never that they were an <i>admin</i>. Hiding a function in the UI is not authorizing it; the server must enforce the role on the function itself." }
    ],
    senior:"Distinguishing <b>BFLA (function-level, API #5) from BOLA (object-level, API #1)</b> &mdash; and naming &lsquo;the UI hid it but the API didn&rsquo;t protect it&rsquo; as the classic slip &mdash; shows you cover both axes of authorization, not just object ownership." },
  { tier:'SDE3', signal:'Per-company keys &amp; token trust',
    q:"You trust the tenant claim because the token is signed. Signed by what &mdash; and what if that key is compromised?",
    a:"Verified against the issuer&rsquo;s <b>public key</b>, fetched from its <b>JWKS</b> endpoint (rotated automatically). In a multi-tenant setup you may have <b>per-company issuers/keys</b>, so a token minted for company A is verified against A&rsquo;s key and can&rsquo;t be passed off as B&rsquo;s. If a signing key is compromised, you <b>rotate</b> it at the issuer &mdash; publish the new key to JWKS, retire the old &mdash; and tokens signed by the old key stop verifying.",
    f:[
      { q:"Tokens are self-contained &mdash; how do you revoke one before it expires?",
        a:"That&rsquo;s the JWT trade-off: they&rsquo;re valid until expiry because verification is offline. So you keep <b>lifetimes short</b> and pair them with <b>refresh tokens</b> you <i>can</i> revoke server-side, or maintain a small <b>denylist</b> of revoked token ids checked on sensitive operations. Immediate revocation and stateless verification are in tension; short expiry plus revocable refresh is the usual balance." },
      { q:"Why per-company keys rather than one signing key for everyone?",
        a:"<b>Blast radius.</b> One shared key means a single compromise forges tokens for <i>every</i> tenant; per-company keys scope a compromise to one tenant and let you rotate that tenant&rsquo;s key without disrupting others. It&rsquo;s the same per-tenant key-scoping discipline as the signing topic &mdash; a leaked key should blast one company, not the platform." }
    ],
    senior:"Explaining that the tenant claim is trusted via <b>JWKS-verified signatures</b>, that <b>per-company keys bound a compromise to one tenant</b>, and naming the stateless-JWT revocation tension (short expiry + revocable refresh) is the token-trust depth a senior round expects." },
  { tier:'SDE2', signal:'What belongs in the token',
    q:"What do you put in the access token&rsquo;s claims &mdash; and what do you keep out?",
    a:"In: <b>identity and authorization inputs</b> &mdash; subject (user id), tenant id, roles/scopes, issuer, expiry. Out: <b>secrets and large/volatile data</b> &mdash; no passwords, no PII you don&rsquo;t need, nothing that changes faster than the token&rsquo;s lifetime. The token is a signed, <b>readable</b> (base64, not encrypted) assertion carried on every request; treat it as public-but-tamper-proof.",
    f:[
      { q:"Roles are in the token, but a user&rsquo;s role just changed. They still have the old one &mdash; why?",
        a:"Because the token is a <b>snapshot</b> valid until expiry &mdash; the new role won&rsquo;t take effect until it&rsquo;s refreshed. That&rsquo;s the cost of stateless authorization. You mitigate with <b>short lifetimes</b> so stale claims self-heal, and for security-critical changes (a revoked admin) you check server-side state rather than trusting the token&rsquo;s cached role." }
    ],
    senior:"Knowing the token is <b>signed but readable</b> (so no secrets), that claims are a <b>snapshot until expiry</b> (so short lifetimes), and what belongs vs doesn&rsquo;t &mdash; is the fundamentals check that a shaky answer here fails." },
  { tier:'SDE3', signal:'Enforce at the gateway or the service',
    q:"Do you enforce authorization at the API gateway or inside each service?",
    a:"<b>Both, at different granularities.</b> The <b>gateway</b> does coarse, cheap checks &mdash; token is valid, not expired, right audience &mdash; and rejects junk before it reaches services. But <b>fine-grained, data-dependent authorization</b> (does <i>this</i> user own <i>this</i> object; tenant scoping on the query) must live <b>in the service</b>, next to the data, because only it knows the resource. The gateway can&rsquo;t do object-level authz without the object.",
    f:[
      { q:"Why not centralize all authorization at the gateway to keep services simple?",
        a:"Because object-level and tenant-scoped decisions <b>need the data</b> &mdash; the gateway would have to fetch the resource to check ownership, duplicating the service. And a &lsquo;trusted internal network&rsquo; assumption is exactly what <b>zero-trust</b> rejects: a service must not assume the caller was authorized upstream. Coarse at the edge, fine at the source &mdash; the service re-checks because it&rsquo;s the only layer that can." }
    ],
    senior:"Splitting <b>coarse gateway checks from fine-grained in-service authorization</b> &mdash; and grounding it in zero-trust (the service can&rsquo;t assume the edge authorized the request) &mdash; is the distributed-authz answer, versus &lsquo;the gateway handles auth.&rsquo;" },
  { tier:'SDE3', signal:'Testing the boundary',
    q:"How do you test that tenant isolation actually holds?",
    a:"With tests that <b>attack the boundary</b>: seed two tenants, run queries in tenant A&rsquo;s context, and assert <b>zero</b> of tenant B&rsquo;s rows come back &mdash; <b>even when you hand the query B&rsquo;s ids</b>. You test the exact failure you fear: a foreign id injected into every read path must return 404/empty, not data. AWS&rsquo;s SaaS Lens recommends precisely this &mdash; inject a foreign tenant id and verify the boundary.",
    f:[
      { q:"What&rsquo;s the difference between that and a normal unit test?",
        a:"A normal test checks the <b>happy path</b> &mdash; tenant A sees A&rsquo;s data. An isolation test checks the <b>adversarial path</b> &mdash; tenant A, given B&rsquo;s id, sees <i>nothing</i>. The bug you&rsquo;re hunting only appears when you actively try to cross the boundary, so the test has to try to cross it. Happy-path tests pass while the isolation hole ships." },
      { q:"Where in the pipeline does this run?",
        a:"In <b>CI</b>, as a first-class gate &mdash; because isolation is a security property, a regression must fail the build mechanically, not get caught in review. You pair it with runtime <b>assertions and audit logging</b> of cross-tenant attempts, so the boundary is verified before merge and monitored after deploy." }
    ],
    senior:"Describing an <b>adversarial isolation test</b> &mdash; inject the other tenant&rsquo;s id and assert zero rows, gated in CI &mdash; rather than a happy-path check, is the testing instinct that shows you&rsquo;ve seen isolation regressions slip through ordinary tests." },
  { tier:'Staff', signal:'Break-glass &amp; support access',
    q:"Support needs to view a customer&rsquo;s data to debug an issue &mdash; deliberately crossing the tenant boundary. How do you allow it safely?",
    a:"Through an <b>explicit, audited, time-boxed</b> path &mdash; never the normal accessor. Support uses an <b>impersonation / break-glass</b> flow: a separate privileged role, the action <b>logged with who, which tenant, and why</b>, ideally requiring <b>customer consent or a second approver</b>, and the elevated access <b>expires</b>. The boundary isn&rsquo;t removed; it&rsquo;s crossed under a spotlight, with a receipt.",
    f:[
      { q:"Why not just give support a &lsquo;super-admin&rsquo; role that sees everything?",
        a:"Because a standing cross-tenant role is a <b>permanent breach waiting to happen</b> &mdash; one compromised support account reads every customer. Break-glass makes cross-tenant access <b>exceptional and observable</b>: least privilege by default, elevation only when needed, every use audited. A role that&rsquo;s <i>always</i> dangerous versus access that&rsquo;s <i>deliberately</i> and <i>temporarily</i> granted." },
      { q:"How does this interact with compliance and the customer&rsquo;s trust?",
        a:"It&rsquo;s often a <b>contractual and regulatory</b> requirement: customers want to know their data isn&rsquo;t casually readable by the vendor. An audited break-glass trail (and optionally customer-approved access) is the evidence &mdash; you can show <i>exactly</i> when their data was accessed, by whom, and why. It turns &lsquo;trust us&rsquo; into an auditable record, which is what enterprise buyers demand." }
    ],
    senior:"Handling deliberate boundary-crossing with <b>audited, time-boxed break-glass</b> rather than a standing super-admin role &mdash; and framing it as a compliance/trust artifact &mdash; is the Staff-level answer to the &lsquo;but support needs access&rsquo; curveball." },
  { tier:'SDE3', signal:'Caching authz decisions',
    q:"Authorization checks are on every request. Do you cache them, and what breaks if you do?",
    a:"You cache the <b>inputs</b>, carefully. Roles/permissions and the tenant scope come from the token (already &lsquo;cached&rsquo; for its lifetime) or a short-TTL cache of a policy lookup &mdash; but the <b>hard part is invalidation</b>: when a user&rsquo;s role is revoked, a stale cached &lsquo;allow&rsquo; is a security hole. So caches are <b>short-lived</b>, and security-critical revocations either <b>bust the cache</b> or are checked against live state.",
    f:[
      { q:"Concretely, admin access is revoked but the decision is cached for 5 minutes. Acceptable?",
        a:"It depends on the <b>blast radius</b> of those 5 minutes. For a low-risk read, a short TTL is fine &mdash; the stale allow self-heals. For a high-privilege action (deleting data, changing billing), 5 minutes of stale admin is <b>not</b> acceptable, so those paths check live state or subscribe to a revocation event that <b>immediately</b> invalidates. You tier it: cache the cheap, verify the dangerous." }
    ],
    senior:"Recognizing that caching authz is really an <b>invalidation problem</b> &mdash; a stale &lsquo;allow&rsquo; after a revoked role is the hole &mdash; and tiering it by blast radius (short TTL for reads, live check for privileged actions) is the nuance beyond &lsquo;just cache it.&rsquo;" },
  { tier:'Staff', signal:'Right-to-erasure per tenant',
    q:"A tenant invokes their right to be forgotten. How do you delete exactly their data and prove it&rsquo;s gone?",
    a:"The mechanics depend on the model. In a <b>silo</b>, drop/restore that tenant&rsquo;s database &mdash; clean and provable. In a <b>pool</b>, a scoped transactional DELETE across <b>every</b> tenant-bearing table, driven by the shared layer so nothing is missed, then <b>verify</b> zero rows remain. Then the hard part: <b>backups, caches, search indexes, logs, and analytics copies</b> also hold the data &mdash; erasure isn&rsquo;t done until those are addressed.",
    f:[
      { q:"Backups are immutable and retained for 90 days. How do you &lsquo;delete&rsquo; from them?",
        a:"You usually <b>don&rsquo;t</b> rewrite backups &mdash; you rely on <b>retention expiry</b> (the data ages out) plus <b>crypto-shredding</b>: if the tenant&rsquo;s data is encrypted with a per-tenant key, destroying the key makes every copy &mdash; including backups &mdash; permanently unreadable. That&rsquo;s why per-tenant encryption keys aren&rsquo;t just isolation, they&rsquo;re the practical mechanism for erasure across copies you can&rsquo;t selectively edit." }
    ],
    senior:"Naming that erasure spans <b>backups, caches, indexes, and logs</b> &mdash; not just the primary table &mdash; and reaching for <b>crypto-shredding a per-tenant key</b> to handle immutable copies is the systems-and-compliance depth a Staff answer shows." },
  { tier:'SDE3', signal:'The tenant-leading index',
    q:"You scope every query with tenant_id. How do you keep those queries fast as data grows?",
    a:"Put <b>tenant_id on the leading edge of every composite index and primary key</b>, so <code>WHERE tenant_id = ? AND ...</code> hits a <b>contiguous index range</b> (leftmost-prefix) instead of scanning the table. In a clustered store like InnoDB, a short tenant-led PK keeps the tenant&rsquo;s rows physically together and secondary indexes compact. It&rsquo;s the same instinct as a DynamoDB partition key &mdash; tenant as the leading key.",
    f:[
      { q:"If I put tenant_id <i>last</i> in the index, does it still work?",
        a:"Not efficiently &mdash; leftmost-prefix means an index on <code>(created_at, tenant_id)</code> can&rsquo;t seek directly to one tenant&rsquo;s rows; it scans and filters. The tenant predicate has to be on the <b>left</b> to turn &lsquo;my tenant&rsquo;s data&rsquo; into a range seek. Column order in a composite index is not cosmetic &mdash; it decides whether the scoped query is a seek or a scan." },
      { q:"Doesn&rsquo;t a tenant-led index hurt when one tenant is 90% of the rows?",
        a:"For that whale, a tenant-led index still isolates but no longer <i>narrows</i> much &mdash; so you add secondary indexes on <code>(tenant_id, other_dimension)</code> for its common query shapes, or consider siloing it. The leading tenant column is necessary for isolation and helps the long tail; the whale needs additional targeted indexes on top. Isolation and selectivity are related but not the same lever." }
    ],
    senior:"Explaining <b>leftmost-prefix</b> &mdash; tenant_id must lead the index to make the scoped query a range seek, mirroring a DynamoDB partition key &mdash; connects the isolation predicate to query performance, which is exactly the &lsquo;how does it stay fast&rsquo; follow-up." },
  { tier:'Staff', signal:'Delegated &amp; third-party access',
    q:"A third-party app or partner integration needs to act on a tenant&rsquo;s behalf. How do you authorize that without handing over the keys?",
    a:"<b>Delegated authorization with scoped, revocable grants</b> &mdash; OAuth-style: the third party gets a token that carries the tenant, a <b>limited scope</b> (read-only, specific resources), an expiry, and is <b>independently revocable</b>. It acts <i>as</i> a constrained principal within the tenant, never with the tenant&rsquo;s full credentials. Least privilege plus revocability: the partner can do exactly what was granted, nothing more, and you can cut it off.",
    f:[
      { q:"How is this different from just giving them an API key?",
        a:"A raw API key is usually <b>coarse and long-lived</b> &mdash; often full access, hard to scope, awkward to rotate. A scoped OAuth grant is <b>narrow, expiring, per-integration, and revocable</b> without disrupting others. If a partner is breached, you revoke <i>their</i> grant and the blast radius is what you scoped it to &mdash; not the tenant&rsquo;s entire account. Keys are a blunt instrument; scoped grants are the surgical one." },
      { q:"The third party still runs your tenant&rsquo;s queries &mdash; does your isolation model change?",
        a:"No &mdash; the same tenant predicate and object-level checks apply; the third party is just <b>another principal</b> whose token carries the tenant and a <i>reduced</i> scope. Their requests flow through the identical enforcement, additionally constrained by their granted scopes. Delegation adds a <i>tighter</i> boundary inside the tenant; it never loosens the tenant boundary itself." }
    ],
    senior:"Answering delegation with <b>scoped, expiring, independently-revocable OAuth grants</b> rather than a shared API key &mdash; and noting the third party is just a reduced-scope principal inside the same isolation model &mdash; is the least-privilege maturity a Staff round rewards." },
  { tier:'Staff', signal:'Materialized authorization at scale',
    q:"How do you keep authorization fast when a permission depends on deep relationships or hierarchies &mdash; &lsquo;can this user reach this document&rsquo; through group, role, and folder inheritance &mdash; at scale?",
    a:"You don&rsquo;t recompute the graph on every request &mdash; you <b>materialize</b> the decision. Precompute the flattened &lsquo;who can access what&rsquo; into a <b>materialized view / relationship table</b> (Google&rsquo;s <b>Zanzibar</b> model: store relationship tuples and precompute reachability), so a check is a fast lookup, not a live graph traversal. The trade is the familiar one: a materialized authz view is <b>eventually consistent</b> &mdash; after a revoke it&rsquo;s stale until refreshed, so a just-removed user can briefly still pass.",
    f:[
      { q:"What&rsquo;s the danger of a stale materialized authorization view?",
        a:"A <b>stale &lsquo;allow&rsquo;</b> &mdash; the same invalidation hole as any precomputed permission: revoke a role and the view still says &lsquo;yes&rsquo; until it&rsquo;s rebuilt, so the user keeps access for the staleness window. You bound it with a short refresh (or event-driven invalidation of the affected tuples), and for high-blast-radius actions you check <i>live</i> state instead of the view &mdash; tier by consequence, exactly as with cached authz decisions." },
      { q:"When is materializing authorization worth the complexity?",
        a:"When the permission is <b>expensive to compute live</b> &mdash; deep hierarchies, cross-object relationships, millions of checks a second &mdash; and reads vastly outnumber permission changes, so precomputing amortizes the cost. For a simple role or tenant check a live predicate is fine; materialization is the answer to &lsquo;the authorization query itself is the bottleneck,&rsquo; which is why Zanzibar exists for Google-scale ReBAC and not for a CRUD app&rsquo;s tenant filter." }
    ],
    senior:"Reaching for a <b>materialized authorization view (Zanzibar-style)</b> when the permission graph is the bottleneck &mdash; and immediately naming the staleness-after-revoke trade and the tier-by-blast-radius mitigation &mdash; shows you treat authorization as a <i>data</i> problem at scale, not just a per-request check." },
  { tier:'SDE3', signal:'PCI scope as a data-class flag',
    q:"One tenant&rsquo;s data includes payment card numbers. How does that change your authorization and data handling in a multi-tenant system?",
    a:"You treat &lsquo;is this <b>cardholder data (PAN)</b>&rsquo; as a <b>data-class attribute</b> that triggers escalating controls, and you <b>minimize PCI scope progressively</b>: tokenize the PAN at the edge so a token replaces it everywhere downstream, keeping the raw PAN in a small isolated <b>vault</b> and taking the rest of the system <i>out</i> of scope. The flag drives ABAC-style enforcement &mdash; PCI-classed data gets need-to-know access, encryption, no PAN in logs, and full audit &mdash; layered on top of the tenant predicate.",
    f:[
      { q:"Why &lsquo;minimize scope&rsquo; rather than just secure everything?",
        a:"Because <b>PCI-DSS scope is the cost</b> &mdash; every system that <i>touches</i> cardholder data is in scope and must be audited, hardened, and segmented. <b>Tokenization</b> shrinks that: only the vault handles real PANs (in scope), and the token-carrying services fall <i>out</i> of scope entirely &mdash; a far smaller, cheaper, safer audit boundary. You reduce blast radius by reducing what handles the regulated data, not by compliance-hardening the whole platform." },
      { q:"How does the PCI flag interact with tenant isolation?",
        a:"It runs <i>alongside</i> the tenant predicate and usually pushes toward <b>siloing</b> the vault (or the regulated tenant) &mdash; a separate store with its own encryption keys &mdash; layered <b>beneath</b> the tenant filter, so vault access is both tenant-scoped and PCI-controlled. Tenant isolation answers &lsquo;whose data,&rsquo; the data-class flag answers &lsquo;how hardened,&rsquo; and the regulated data gets the stricter of the two." }
    ],
    senior:"Framing PCI as a <b>data-class flag that triggers escalating controls, with tokenization to progressively minimize scope</b> &mdash; raw PAN in a small isolated vault, everything else out of scope &mdash; is the payment-platform judgment (blast radius = what touches the regulated data) a round on a payments system rewards." }
,
  { tier:'SDE3', signal:'Precomputed permissions (the materialized-view story)',
    q:"Role checks were a 4-table join on every request &mdash; users to groups to roles to entities. How do you make that fast without weakening it?",
    a:"Precompute it: collapse the join into a <b>PostgreSQL materialized view</b> keyed <code>(user_id, entity_id)</code> &rarr; effective permission, refreshed on mutation. The request path becomes a <b>single indexed lookup</b> instead of a live 4-way traversal &mdash; at Invenco scale (~10,000 users, ~500 groups, ~50,000 entities) the flattened view is small enough to index trivially, and the hot path stops touching the graph.",
    f:[
      { q:"Memberships change &mdash; how stale is a check allowed to be?",
        a:"<b>REFRESH MATERIALIZED VIEW CONCURRENTLY</b> fires on mutation &mdash; grant, revoke, group change &mdash; so staleness is the refresh latency: seconds, not TTL-minutes. CONCURRENTLY needs a <b>unique index</b> on the view and swaps without locking readers; a plain REFRESH blocks reads for the rebuild. And for a <i>revoke</i> on a privileged action you don&rsquo;t wait &mdash; check live state for the dangerous write, the same blast-radius tiering as any authz cache." },
      { q:"Why a materialized view and not Redis?",
        a:"The view lives <b>inside the same engine</b> as the data it guards: transactional refresh, one consistency model, no second system to invalidate, and the planner can <b>join it</b> straight into scoped queries. Redis buys cross-service reuse but imports the classic invalidation problem plus a network hop and a second failure domain. <b>Cache</b> when many services need the answer; <b>materialize</b> when one database does." }
    ],
    senior:"Naming the <b>staleness contract</b> unprompted &mdash; refresh-on-mutation, CONCURRENTLY&rsquo;s unique-index requirement, a live check for revokes &mdash; is what separates &lsquo;I used a view&rsquo; from &lsquo;I owned the trade.&rsquo;" }
];
var AUTHZ_SPEAK = [
  "Lead with the non-negotiable: <b>'tenant identity comes from a verified, signed claim &mdash; never a header or body the client controls.'</b> Then the reason &mdash; a client-supplied tenant id is the confused-deputy attack, one request away from reading another tenant.",
  "Reframe it in one line: <b>'authorization isn&rsquo;t a check per endpoint &mdash; it&rsquo;s a predicate the data layer injects into every query.'</b> The developer can&rsquo;t forget the filter because they never write it; isolation becomes a property, not a checklist.",
  "Say the safe-failure rule out loud: <b>'no tenant context throws &mdash; it never runs unscoped.'</b> A lost context is a crash, not a full-table leak. Same posture as Postgres RLS returning zero rows when no policy matches.",
  "Answer &lsquo;what saves you&rsquo; with layers, not hope: <b>'the data layer injects the scope, it&rsquo;s deny-by-default, the database enforces RLS as a backstop, and a test injects a foreign id and asserts zero rows.'</b> You assume the mistake will happen and catch it four ways.",
  "Make it a deliberate control: <b>'cross-tenant reads return 404, not 403 &mdash; a 403 confirms the object exists.'</b> Log the attempt internally, reveal nothing externally. Same reason login says &lsquo;invalid username or password.&rsquo;",
  "Name it precisely: <b>'BOLA &mdash; OWASP API number one &mdash; an authenticated user of tenant A fetching tenant B&rsquo;s object by id.'</b> The predicate covers lists; a fetch-by-id needs an explicit ownership check, and UUIDs help but never replace it.",
  "Put it on the axis: <b>'silo for isolation and compliance, pool for cost and agility &mdash; bridge in practice: pool the long tail, silo the whales.'</b> Then the deletion asymmetry &mdash; drop a database vs a scoped multi-table DELETE &mdash; as the argument for siloing the regulated.",
  "Show you&rsquo;ve shipped RLS by naming the footguns: <b>'FORCE it, connect as a non-owner, SET LOCAL not SET, and no-policy means deny-all.'</b> The SET-vs-SET-LOCAL one &mdash; context leaking across a pooled connection &mdash; is the tell you&rsquo;ve debugged it.",
  "For DynamoDB: <b>'dynamodb:LeadingKeys scopes a credential to its own tenant&rsquo;s partition &mdash; but Scan bypasses it.'</b> Tenant id comes from the verified identity, and a hot whale gets a shard-suffix that keeps the tenant leading the key.",
  "Layer it: <b>'RBAC as the base, ABAC for the exceptions &mdash; and tenant isolation as a separate layer beneath both.'</b> Role explosion is the signal to move dimensions into attributes; the tenant predicate runs first, regardless of role.",
  "Contain the whale: <b>'per-tenant rate limits, quotas, and fair queuing &mdash; plus per-tenant metrics to even know which tenant it is.'</b> Then protect the database as the scarcest resource &mdash; per-tenant timeouts and connection caps, a lane for the heavy load.",
  "Cover the other axis: <b>'BFLA &mdash; API number five &mdash; function-level, versus BOLA&rsquo;s object-level.'</b> The classic slip is an admin endpoint the UI hides but the API doesn&rsquo;t protect: it checked you were logged in, never that you were an admin.",
  "Explain the trust root: <b>'the tenant claim is trusted because the token&rsquo;s signature verifies against the issuer&rsquo;s JWKS key &mdash; per-company keys, so a compromise blasts one tenant.'</b> Then the JWT revocation tension &mdash; short expiry plus a revocable refresh token.",
  "Get the fundamentals crisp: <b>'the token is signed but readable, so no secrets &mdash; identity, tenant, roles, expiry.'</b> And claims are a snapshot until expiry, which is why a just-changed role lags and why you keep lifetimes short.",
  "Split the layers: <b>'coarse checks at the gateway &mdash; valid token, right audience &mdash; but object-level and tenant-scoped authorization in the service, next to the data.'</b> Zero-trust: the service re-checks because it can&rsquo;t assume the edge authorized the request.",
  "Describe the adversarial test: <b>'seed two tenants, query as A with B&rsquo;s ids, assert zero rows &mdash; gated in CI.'</b> Happy-path tests pass while the isolation hole ships; you have to actively try to cross the boundary to catch the bug.",
  "Handle break-glass without a standing super-admin: <b>'support gets audited, time-boxed impersonation &mdash; who, which tenant, why &mdash; that expires.'</b> A permanent cross-tenant role is a breach waiting to happen; make crossing exceptional and observable, with a receipt for compliance.",
  "Frame caching as invalidation: <b>'a stale &ldquo;allow&rdquo; after a revoked role is the hole.'</b> So short TTLs, and tier it by blast radius &mdash; cache the cheap read, check live state for the privileged action.",
  "Make erasure honest: <b>'in a pool it&rsquo;s a scoped multi-table DELETE plus verification &mdash; but backups, caches, indexes, and logs hold it too.'</b> Crypto-shred a per-tenant key to handle the immutable copies you can&rsquo;t selectively edit.",
  "Tie isolation to speed: <b>'tenant_id leads every index, so the scoped query is a range seek, not a scan &mdash; leftmost-prefix.'</b> Same instinct as a DynamoDB partition key; put tenant last and you&rsquo;ve got a scan, not a seek.",
  "Answer delegation with least privilege: <b>'a scoped, expiring, independently-revocable OAuth grant &mdash; not a shared API key.'</b> The third party is just a reduced-scope principal inside the same tenant boundary; revoke their grant and the blast radius is only what you scoped.",
  "Answer &lsquo;the authorization query is the bottleneck&rsquo; with materialization: <b>'precompute the permission graph into a materialized view &mdash; Zanzibar-style relationship tuples &mdash; so a check is a lookup, not a live traversal.'</b> Then the staleness trade &mdash; a revoke leaves a stale &lsquo;allow&rsquo; until refresh &mdash; so tier by blast radius and live-check the privileged action.",
  "Handle regulated data as a class, not a special case: <b>'cardholder data is a data-class flag that triggers stricter controls, and you tokenize to progressively shrink PCI scope &mdash; raw PAN in a small isolated vault, everything downstream carrying a token and falling out of scope.'</b> The flag runs alongside the tenant predicate; the regulated data gets the stricter of the two."
,
  "Own the resume bullet: <b>'a 4-table join per request became one indexed lookup &mdash; a PostgreSQL materialized view over roughly 10k users, 500 groups, and 50k entities, refreshed on mutation.'</b> Then the trade unprompted: CONCURRENTLY needs a unique index, a plain refresh locks readers, and a revoke on a privileged action checks live state."
];
var TOPIC_AUTHZ_DRILL = {
  cards: AUTHZ_CARDS,
  speak: AUTHZ_SPEAK,
  tierNotes: {
    all:'<b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.',
    SDE2:'<b>Fundamentals under pressure</b> &mdash; identity from a verified claim, scope in every query, deny-by-default. The bar is &ldquo;this is real isolation, not a WHERE clause bolted on&rdquo;: show the enforcement cleanly.',
    SDE3:'<b>Depth &amp; trade-offs</b> &mdash; silo vs pool, RLS vs app-layer, RBAC vs ABAC, the confused-deputy defense. The bar is &ldquo;it depends, here&rsquo;s the switch&rdquo;: name the axis and the attack.',
    Staff:'<b>Systems judgment</b> &mdash; blast radius, noisy neighbors, break-glass, erasure across copies. The bar is &ldquo;I see the failure mode before it ships&rdquo;: name what one missing filter exposes, and the layers that bound it.'
  }
};
