/* topics/authz/wb.js -- topic 3 whiteboard. steps:[{c,a}x9]; diagram = the .dgm
   inner; foot; sub + okVerdict carry the step-count copy as data. Rebuilds the
   access boundary from memory. Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_AUTHZ_WB = {
  steps: [
    {c:'Entry &mdash; where the tenant identity comes from on a request.', a:'The <b>verified token</b> &mdash; the authorizer checks its signature and reads the tenant from a <b>signed claim</b> (<code>custom:tenant_id</code>), never a header. Trusted because forging it breaks the signature.'},
    {c:'Context &mdash; how the tenant reaches the data layer.', a:'Stored once in <b>per-request context</b> (<code>AsyncLocalStorage</code>); it propagates through every async call, so a repository three levels deep reads <code>getStore().tenant</code> without it being passed.'},
    {c:'The predicate &mdash; what enforcement actually looks like.', a:'The shared data layer <b>injects</b> <code>WHERE tenant_id = ctx.tenant</code> into every read and write. A developer writes <code>findOrders()</code>; the scope is already there &mdash; they can&rsquo;t forget it.'},
    {c:'Deny-by-default &mdash; what happens with no context.', a:'The accessor <b>throws</b> &mdash; never an unscoped query. No context is a loud crash, not a silent full-table read. The unsafe path doesn&rsquo;t exist.'},
    {c:'Object-level check &mdash; the fetch-by-id case.', a:'A <code>getById(id)</code> gets an explicit <code>resource.tenant === ctx.tenant</code> (+ ownership) assertion, because the id came from the client. This is the <b>BOLA</b> defense &mdash; the predicate alone doesn&rsquo;t cover singleton lookups.'},
    {c:'The cross-tenant response &mdash; the status code.', a:'<b>404, not 403</b> &mdash; a 403 confirms the object exists. Log the attempt internally as a signal; reveal nothing externally. (The one people get backwards.)'},
    {c:'The database backstop &mdash; defense in depth.', a:'<b>RLS FORCE</b> (Postgres) or <b>dynamodb:LeadingKeys</b> (DynamoDB) enforces the boundary in the engine, so even a raw query or an app bug can&rsquo;t cross tenants. (Scan bypasses LeadingKeys.)'},
    {c:'Noisy neighbor &mdash; the pooled-resource risk.', a:'<b>Per-tenant rate limits, quotas, fair queuing</b> &mdash; plus per-tenant metrics to detect it. One tenant&rsquo;s burst can&rsquo;t starve another&rsquo;s share; the whale gets its own lane, not the whole road.'},
    {c:'Isolation model &mdash; silo vs pool, and the blast radius.', a:'<b>Bridge</b>: pool the long tail, silo the whales and the compliance-bound. One missing filter in a pool exposes <i>every</i> other tenant &mdash; which is exactly why enforcement is layered.'}
  ],
  diagram: `
          <div class="dgm-node"><div class="dgm-t">request + token</div><div class="dgm-s">token carried on every call &middot; tenant is a SIGNED claim, not a header</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">authorizer verifies the signature (JWKS)</span></div>
          <div class="dgm-node"><div class="dgm-t">extract tenant claim</div><div class="dgm-s"><code>custom:tenant_id</code> from the verified token &middot; never client input</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">put in per-request context</span></div>
          <div class="dgm-node"><div class="dgm-t">tenant context &middot; <span class="dgm-em">AsyncLocalStorage</span></div><div class="dgm-s">propagates through every async call in the request</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">every query flows through the shared data layer</span></div>
          <div class="dgm-node dgm-fork"><div class="dgm-t">data layer &middot; <span class="dgm-em">injects the predicate</span></div><div class="dgm-branches"><span class="dgm-br">&rarr; WHERE tenant_id = ctx.tenant</span><span class="dgm-br">&rarr; no context? throw</span></div><div class="dgm-s">deny-by-default &middot; the unscoped query is unreachable</div></div>
          <div class="dgm-note">&mdash;&mdash;&mdash; access boundary: request carries <b>identity</b> &middot; data layer holds the <b>scope</b> &mdash;&mdash;&mdash;</div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">fetch-by-id? add the object-level check</span></div>
          <div class="dgm-node dgm-recon"><div class="dgm-t">object-level authz + DB backstop</div><div class="dgm-s">resource.tenant === ctx.tenant? &mdash; else <b>404</b> (not 403) &middot; RLS FORCE / LeadingKeys enforces it in the engine too</div></div>
          <div class="dgm-foot">owned + in-tenant &rarr; allow &middot; cross-tenant &rarr; 404 &middot; no context &rarr; throw &middot; enforced at every layer</div>
        `,
  foot: "<b>The one people forget:</b> the predicate scopes <i>list</i> queries, but a <code>getById(id)</code> still needs a separate <b>ownership check</b> &mdash; the id came from the client. Skip it and you&rsquo;ve left BOLA, OWASP&rsquo;s #1, wide open. Volunteering the object-level check unprompted is the tell you&rsquo;ve defended a real multi-tenant API, not just read about one.",
  sub: "For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run the access boundary on a whiteboard.",
  okVerdict: "<b>All nine cold.</b> You can rebuild the enforcement chain on a whiteboard from memory \u2014 the authorization round is yours to lose, not to pass."
};
