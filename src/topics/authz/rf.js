/* topics/authz/rf.js -- topic 3 RED FLAGS. One lead + nine flags. Each flag is
   {bad, note, tell, fix}; only the last carries a note. Strings double-quoted (no
   apostrophe escaping); non-ASCII is HTML entities. Offline-safe, pure data. */
var TOPIC_AUTHZ_RF = {
  lead: "The moves that quietly tank a candidate on multi-tenant authorization. This is a security round, so a weak answer gets caught fast &mdash; each of these is something a shakier candidate actually says, what the interviewer hears, and the line that flips it.",
  flags: [
    {
      bad: "&ldquo;I&rsquo;d read the tenant id from a header the client sends.&rdquo;",
      note: null,
      tell: "That&rsquo;s the <b>confused-deputy attack</b> handed to the attacker &mdash; an authenticated user of tenant A sends <code>X-Tenant-Id: B</code> and reads B&rsquo;s data. The interviewer hears <i>&ldquo;trusts client input for the security boundary.&rdquo;</i>",
      fix: "Derive the tenant from the <b>verified token</b> &mdash; a signed claim &mdash; server-side. It&rsquo;s trusted only because forging it breaks the signature; never accept it from a header, query, or body."
    },
    {
      bad: "&ldquo;Each endpoint adds a WHERE tenant_id clause.&rdquo;",
      note: null,
      tell: "A <b>discipline that fails</b> &mdash; hundreds of handlers, and one forgotten filter is a cross-tenant leak. The interviewer hears <i>&ldquo;isolation depends on every developer remembering, every time.&rdquo;</i>",
      fix: "Inject the predicate in the <b>shared data layer</b> so it&rsquo;s added automatically to every query. The developer never writes the filter, so they can&rsquo;t forget it &mdash; isolation becomes a property, not a checklist."
    },
    {
      bad: "&ldquo;For another tenant&rsquo;s record I return 403 Forbidden.&rdquo;",
      note: null,
      tell: "A 403 <b>confirms the object exists</b> &mdash; it enumerates valid ids across tenants, which is itself a leak. Subtle, but the interviewer clocks it as missing the information-disclosure angle.",
      fix: "Return <b>404, not 403</b>, across a tenant boundary &mdash; a cross-tenant object should be indistinguishable from a nonexistent one. Log the attempt internally; reveal nothing externally."
    },
    {
      bad: "&ldquo;If there&rsquo;s no tenant context, the query just runs.&rdquo;",
      note: null,
      tell: "That&rsquo;s a <b>silent full-table leak</b> waiting to happen &mdash; a lost context returns <i>everything</i>. The interviewer hears <i>&ldquo;the failure mode is a breach, not an error.&rdquo;</i>",
      fix: "<b>Deny-by-default</b>: the accessor <b>throws</b> when there&rsquo;s no tenant context &mdash; it never falls back to unscoped. A lost context is a loud crash, so the unsafe path doesn&rsquo;t exist."
    },
    {
      bad: "&ldquo;We enabled Row-Level Security, so we&rsquo;re covered.&rdquo;",
      note: null,
      tell: "RLS is <b>skipped for the table owner and superusers</b> by default &mdash; if the app connects as the owner, the policy silently does nothing. &ldquo;We enabled it&rdquo; without <code>FORCE</code> is a false sense of security.",
      fix: "<code>FORCE ROW LEVEL SECURITY</code>, connect as a <b>non-owner</b>, and set the tenant with <code>SET LOCAL</code> (not <code>SET</code>) so it can&rsquo;t leak across a pooled connection."
    },
    {
      bad: "&ldquo;LeadingKeys locks down the table, so any query is safe.&rdquo;",
      note: null,
      tell: "<b>Scan bypasses LeadingKeys</b> &mdash; the condition constrains Query and GetItem, but a Scan reads across tenants. Claiming &lsquo;any query is safe&rsquo; is the tell you haven&rsquo;t hit the gotcha in production.",
      fix: "Know the hole: <b>prefer Query, lock down who can Scan</b>, and treat a Scan in review as a red flag. LeadingKeys is enforcement with an exception you design around."
    },
    {
      bad: "&ldquo;I&rsquo;d just base64-decode the token and read the tenant.&rdquo;",
      note: null,
      tell: "Decoding <b>without verifying the signature</b> trusts a token anyone can forge &mdash; the claim is worthless unless the signature checks out. The interviewer hears <i>&ldquo;doesn&rsquo;t understand what makes a claim trustworthy.&rdquo;</i>",
      fix: "<b>Verify the signature</b> against the issuer&rsquo;s JWKS key first &mdash; a tampered or forged token is rejected. Only <i>then</i> are the claims trustworthy, because the issuer put them there."
    },
    {
      bad: "&ldquo;We tested that each tenant can see their own data.&rdquo;",
      note: null,
      tell: "That&rsquo;s the <b>happy path</b> &mdash; it passes even when the boundary is broken. The bug only shows when you actively try to cross it, so a happy-path test proves nothing about isolation.",
      fix: "Test <b>adversarially</b>: seed two tenants, query as A with B&rsquo;s ids, assert <b>zero</b> rows &mdash; gated in CI. You test the exact failure you fear, mechanically."
    },
    {
      bad: "&ldquo;Support has a super-admin role that can see every tenant.&rdquo;",
      note: "This is the one that reads as &lsquo;convenient today, breach tomorrow&rsquo; &mdash; a standing cross-tenant credential is the single account that, once compromised, exposes everyone.",
      tell: "A <b>permanent cross-tenant role is a breach waiting to happen</b> &mdash; one compromised support account reads every customer. The interviewer hears <i>&ldquo;traded the whole isolation model for a support shortcut.&rdquo;</i>",
      fix: "<b>Break-glass</b>: audited, time-boxed impersonation &mdash; who, which tenant, why &mdash; that expires, ideally with a second approver. Cross-tenant access is exceptional and observable, never standing."
    }
  ]
};
