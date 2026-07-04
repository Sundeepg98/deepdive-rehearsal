/* topics/eav/model.js -- topic 6 model answers. selectors[i] pairs answers[i]; 'Name the
   limits' is LAST. answers[6] is the Invenco device-attribute-store "one you built" story.
   openers use single-backslash \u201C .. \u201D curly quotes and \u2019 / \u2014. beats carry
   c-tags frame|head|sub|risk|trade|close. 7-bit ASCII. */
var TOPIC_EAV_MODEL = {
  selectors: [
    'Design it',
    'Guarantee typing and validity',
    'Walk the pivot / reconstruction',
    'Query across attributes',
    'Defend EAV',
    'Operate it',
    'One you built',
    'Test it',
    'Name the limits'
  ],
  answers: [
    { opener:'\u201CI\u2019d model attributes as data, not schema \u2014 so a new setting is a definition row, not a migration \u2014 with a definition/value split, typed and validated on write, resolved override-over-default.\u201D',
      sub:'The whole design in one breath, then the tables.',
      beats:[
        { l:'Frame', c:'frame', t:'The problem is a config surface that grows faster than migrations: 50,000 devices, many types and firmwares, product adding settings constantly. So I move &lsquo;add a setting&rsquo; from a schema change to a data write.' },
        { l:'The two tables', c:'head', t:'A definition table &mdash; one row per attribute: name, type, default, JSON-Schema, flags. And a value table &mdash; per-entity overrides, unique on (entity, attribute), sparse. Definition is the shared contract; value holds only deviations.' },
        { l:'Resolution', c:'sub', t:'Reading a value is COALESCE(override, default) over a left join &mdash; one lookup, deterministic, and mostly resolving straight to the default because overrides are sparse.' },
        { l:'Validation', c:'sub', t:'Every write is coerced to the type and JSON-Schema-validated; a bad value is rejected at the write path, so the store never holds garbage and readers trust it.' },
        { l:'The tax', c:'risk', t:'The cost I&rsquo;d name upfront: reconstructing an entity is a pivot (N rows to one object, never N+1), and querying across attributes needs a composite partial index on the searchable ones.' },
        { l:'The trade', c:'trade', t:'EAV buys flexibility with query complexity, paid on purpose &mdash; it&rsquo;s for the sparse, variable long tail, while the hot, uniform, queried attributes belong in real columns.' },
        { l:'Land it', c:'close', t:'So: typed definitions plus sparse overrides, COALESCE resolution, validate-on-write, searchable ones indexed &mdash; and the judgment to promote hot attributes to columns.' }
      ] },
    { opener:'\u201CThe database can\u2019t type a generic value column, so I enforce typing and validity myself \u2014 at the one place every value passes through, the write path.\u201D',
      sub:'Validate-on-write: coercion plus JSON-Schema.',
      beats:[
        { l:'Frame', c:'frame', t:'Schemaless storage means the DB won&rsquo;t enforce &lsquo;positive integer&rsquo; for me &mdash; the value column is generic. So correctness is my job, and the write path is where I do it.' },
        { l:'Coerce', c:'head', t:'First, coerce the incoming value to the definition&rsquo;s data_type &mdash; the CSV&rsquo;s <code>&quot;30&quot;</code> becomes the integer 30 &mdash; so the store holds typed values, not string representations.' },
        { l:'Validate', c:'sub', t:'Then check the JSON-Schema: range, enum, required shape, the full nested structure for a json-typed attribute. Coercion gets the type; the schema gets the semantics.' },
        { l:'Reject at write', c:'sub', t:'A value that fails either &mdash; won&rsquo;t coerce, or violates the schema &mdash; is rejected with a located error, never stored as null or a raw string.' },
        { l:'Why write not read', c:'risk', t:'Write-once, read-many: a bad value written once would break every future reader. Validating on write means the invariant is &lsquo;everything here is well-formed,&rsquo; and readers do zero validation.' },
        { l:'The payoff', c:'trade', t:'Centralized correctness &mdash; one enforcement point instead of every consumer re-validating or trusting garbage. It&rsquo;s the discipline that keeps schemaless from meaning anything-goes.' },
        { l:'Close', c:'close', t:'So typing and validity are enforced in the app, on write, once &mdash; coerce to type, check the schema, reject the rest. That&rsquo;s what makes a flexible store trustworthy.' }
      ] },
    { opener:'\u201CReconstructing a whole entity from row-per-attribute storage is the EAV tax \u2014 I fetch all its value rows in one query and pivot once, never per-attribute.\u201D',
      sub:'The pivot, and the N+1 trap.',
      beats:[
        { l:'Frame', c:'frame', t:'A normal table returns a device in one row; EAV stores each attribute as its own row, so &lsquo;give me device X&rsquo;s whole config&rsquo; is N rows to reassemble into one object.' },
        { l:'One query', c:'head', t:'Fetch all of the entity&rsquo;s value rows in a single query, plus the definitions for defaults &mdash; one round trip, not one per attribute.' },
        { l:'Pivot', c:'sub', t:'Then pivot: fold the rows into a map keyed by attribute name, filling defaults for attributes with no override row. In SQL that&rsquo;s a crosstab; in the app it&rsquo;s a fold &mdash; both one round trip.' },
        { l:'The trap', c:'risk', t:'The killer is doing it per-attribute &mdash; a query per attribute is the N+1 that makes EAV slow. The rule: never loop attributes; fetch the set, pivot once.' },
        { l:'At scale', c:'sub', t:'Reconstructing many entities at once, or constantly, is where even the single-query pivot compounds &mdash; a list view of 500 devices&rsquo; full configs on every page load.' },
        { l:'The fix', c:'trade', t:'Cache the reconstructed objects with CDC-driven invalidation, so most reads never pivot. And if you&rsquo;re always reconstructing whole entities, the row model may be fighting you &mdash; a sign to denormalize or promote to columns.' },
        { l:'Close', c:'close', t:'So: one query, one pivot, cache the hot results &mdash; and read constant whole-entity reconstruction as the signal that the EAV tax is compounding.' }
      ] },
    { opener:'\u201CQuerying across attributes is EAV\u2019s weakness \u2014 I make specific attributes searchable with a composite partial index, and I know when a query has outgrown EAV.\u201D',
      sub:'Searchable index, and the multi-attribute limit.',
      beats:[
        { l:'Frame', c:'frame', t:'You can&rsquo;t cheaply index every value, and filtering by an attribute means finding a value across many rows &mdash; so searchability has to be selective, not universal.' },
        { l:'Searchable index', c:'head', t:'Mark specific attributes searchable, backed by a composite partial index on (attribute_id, value) restricted to that set. &lsquo;All devices where X = Y&rsquo; becomes a seek; the partial index stays small.' },
        { l:'Column order', c:'sub', t:'Attribute-first, because queries are always &lsquo;for this attribute, find this value&rsquo; &mdash; the same raw value means different things across attributes, so leading with attribute_id matches the access pattern.' },
        { l:'Multi-attribute', c:'risk', t:'Filtering by three attributes at once is three self-joins &mdash; indexes make each leg a seek but don&rsquo;t fix the joins. That&rsquo;s the EAV tax at its sharpest, and it gets ugly fast.' },
        { l:'The signal', c:'sub', t:'When a fixed set of attributes is queried and sorted constantly, that&rsquo;s the moment to ask whether they&rsquo;re really the variable long tail, or core dimensions that outgrew EAV.' },
        { l:'The fix', c:'trade', t:'Promote those hot, stable, queried attributes to real columns, where multi-column filtering and sorting is a normal indexed query. EAV for the tail; columns for the queried core.' },
        { l:'Close', c:'close', t:'So: opt-in searchable indexes for the queryable few, honesty that multi-attribute filtering is where EAV strains, and column-promotion when a query pattern proves hot and fixed.' }
      ] },
    { opener:'\u201CEAV isn\u2019t a default \u2014 it\u2019s a deliberate tool for the sparse, variable long tail, and I\u2019d defend it exactly where it earns its keep and concede where it doesn\u2019t.\u201D',
      sub:'When EAV is right, and when it isn\u2019t.',
      beats:[
        { l:'Frame', c:'frame', t:'The honest framing is that EAV pays a real tax &mdash; pivots, self-joins, opt-in indexing, self-enforced typing &mdash; to buy schema flexibility. So the defense is about when that trade is worth it.' },
        { l:'Where it wins', c:'head', t:'It wins for config that&rsquo;s sparse, varies by device type and firmware, gets added ad hoc, and is rarely queried across entities &mdash; where a column-per-setting means constant migrations and a table of sparse nullable columns.' },
        { l:'vs JSON column', c:'sub', t:'Over a JSON blob, EAV gives a shared typed contract per attribute, cross-entity querying, and per-attribute metadata &mdash; secret, searchable, groups. If config is just a per-device bag read whole, the blob is simpler and I&rsquo;d use it.' },
        { l:'Where it loses', c:'risk', t:'It loses for uniform, known, heavily-queried data &mdash; that wants real columns. The symptom of over-applying EAV is reimplementing a database on top of it: typing, joins, indexes you had for free.' },
        { l:'The concession', c:'sub', t:'So I&rsquo;d concede immediately that most core data is not an EAV candidate &mdash; EAV is for the long tail, and even within it, hot attributes graduate to columns.' },
        { l:'The trade', c:'trade', t:'A hybrid, not a religion: core columns for the stable, queried dimensions; EAV for the variable rest; and the discipline to keep the tax proportional to the flexibility actually used.' },
        { l:'Close', c:'close', t:'So I defend EAV as a surgical tool for the sparse and variable, not as a schema replacement &mdash; and the strongest version of the answer names its limits before the interviewer does.' }
      ] },
    { opener:'\u201COperating a flexible store safely at fleet scale is guardrails at the edges \u2014 staging with atomic promote, bounded imports, and CDC to keep derived copies in sync.\u201D',
      sub:'Staging, bulk import, change capture.',
      beats:[
        { l:'Frame', c:'frame', t:'The core is flexible; the risk is that flexibility applied carelessly at fleet scale corrupts config or floods the store. So operating it is fundamentally guardrails.' },
        { l:'Staging', c:'head', t:'Values can be written staged, then promoted atomically &mdash; the device never runs a half-applied config; it sees the old values until the promote flips the whole set at once. Same as not deploying half a release.' },
        { l:'Bulk import', c:'sub', t:'Operators set attributes across many devices via CSV, bounded on purpose &mdash; 500 rows, 5 MB &mdash; with every cell coerced and validated and a clear all-or-nothing failure. An unbounded, unvalidated CSV poisons the store in one paste.' },
        { l:'CDC', c:'sub', t:'Value changes stream out via CDC &mdash; caches, search indexes, and the device-config push subscribe to deltas instead of polling the table. The store is the source of truth; everything else is a derived copy.' },
        { l:'The default trap', c:'risk', t:'Changing a definition&rsquo;s default is a fleet-wide behavior change disguised as a one-row edit &mdash; it moves the resolved value for every non-overriding device, so it&rsquo;s staged and rolled out, not flipped globally.' },
        { l:'The trade', c:'trade', t:'Each guardrail trades a little immediacy for a lot of safety &mdash; staging over direct writes, bounded over unbounded imports, CDC over polling. Worth it once one action can touch 50,000 devices.' },
        { l:'Close', c:'close', t:'So: staging and atomic promote, bounded validated imports, CDC-fed derived copies, and treating a default change as a config deploy &mdash; flexibility at the core, discipline at the edges.' }
      ] },
    { opener:'\u201CI built the device-attribute store for our payment-terminal platform \u2014 a 3-table EAV that let product add per-device settings without a schema migration, across tens of thousands of terminals of many types.\u201D',
      sub:'The real system, and what it taught me.',
      beats:[
        { l:'The problem', c:'frame', t:'We had 50,000+ terminals across many device types and firmwares, and product constantly needed new per-device settings &mdash; timeouts, feature flags, display and network config. A column per setting meant a migration and deploy every time, and a devices table full of sparse type-specific columns.' },
        { l:'The model', c:'head', t:'So I built a 3-table EAV: a definition table (name, data_type, default, JSON-Schema, is_secret, is_searchable, group), a per-entity value table for overrides, and a group table. A new setting became a definition row &mdash; product self-served, no engineering and no deploy.' },
        { l:'Resolution &amp; validation', c:'sub', t:'Values resolved COALESCE(override, default); every write was coerced to the attribute&rsquo;s type and JSON-Schema-validated, so the generic value column never held garbage. Overrides were sparse &mdash; only terminals deviating from the default got a row.' },
        { l:'Secrets &amp; search', c:'sub', t:'Secret attributes &mdash; keys, certs &mdash; were KMS-encrypted at rest and masked at the API, write-only from outside. Attributes flagged searchable got a composite partial index on (attribute_id, value), so operators could query the fleet by an attribute without a scan.' },
        { l:'Operate', c:'sub', t:'A staging workflow (is_staged) let operators prepare config and promote atomically; bulk CSV import was bounded (500 rows, 5 MB) with per-cell coercion; and CDC replicated changes downstream so derived copies stayed in sync.' },
        { l:'What it taught me', c:'risk', t:'The hard part was never the storage &mdash; it was governance. The tax showed up as reconstruction pivots and multi-attribute queries, and the real discipline was knowing which attributes belonged in EAV and which had earned real columns.' },
        { l:'The lesson', c:'close', t:'So the win wasn&rsquo;t &lsquo;we used EAV&rsquo; &mdash; it was giving product schema-free velocity for the variable long tail while keeping typing, secrets, and querying under control, and treating column-promotion as ongoing hygiene. A hybrid, deliberately.' }
      ] },
    { opener:'\u201CTesting an attribute store is proving the invariants \u2014 validation rejects bad values, resolution is correct, secrets never leak, tenants stay isolated \u2014 not just that a value round-trips.\u201D',
      sub:'The invariants worth a test.',
      beats:[
        { l:'Frame', c:'frame', t:'The store&rsquo;s value is its guarantees &mdash; typed, validated, isolated, resolved correctly &mdash; so the tests target those invariants, because a generic value column has no compiler to catch violations.' },
        { l:'Validation', c:'head', t:'Property-style tests that bad values are rejected: wrong type, out-of-range, schema violations, uncoercible CSV cells &mdash; each rejected at write with a located error, never stored. The core invariant is &lsquo;the store never holds an invalid value.&rsquo;' },
        { l:'Resolution', c:'sub', t:'Tests that COALESCE(override, default) is correct: override present, override absent (falls to default), required-with-no-value, and that staged values are invisible to live resolution until promotion.' },
        { l:'Secrets', c:'risk', t:'An adversarial test that a secret attribute is never returned in plaintext by any read path, and is encrypted at rest &mdash; the same never-leak assertion the secret&rsquo;s threat model demands.' },
        { l:'Tenant isolation', c:'sub', t:'A cross-tenant test: fire reads and writes as tenant A and assert zero visibility into tenant B&rsquo;s values &mdash; the missing-WHERE-tenant_id class made impossible to introduce, gated in CI.' },
        { l:'The pivot', c:'trade', t:'A performance test that whole-entity reconstruction is one query, not N &mdash; asserting the N+1 hasn&rsquo;t crept back in, since it&rsquo;s the classic EAV regression.' },
        { l:'Close', c:'close', t:'So: validation rejects garbage, resolution is exhaustively correct, secrets never leak, tenants stay isolated, and reconstruction stays single-query &mdash; the invariants, not just a happy-path round trip.' }
      ] },
    { opener:'\u201CThe honest limits: EAV relocates the schema\u2019s problems rather than removing them \u2014 you trade migrations for query complexity, self-enforced typing, and a governance burden.\u201D',
      sub:'What EAV costs, said plainly.',
      beats:[
        { l:'The query tax', c:'frame', t:'The biggest limit is querying: reconstructing an entity is a pivot, and multi-attribute filtering is self-joins. EAV is structurally worse at exactly what a relational schema is best at &mdash; querying by fields.' },
        { l:'Self-enforced everything', c:'head', t:'You take on what the schema gave for free: typing, constraints, and validation are now your code on the write path. A bug there, and the generic value column happily stores garbage.' },
        { l:'The migration didn&rsquo;t vanish', c:'sub', t:'Changing an attribute&rsquo;s type or default is trivial on the definition but still needs an existing-value migration and blast-radius reasoning &mdash; the migration problem moved, it didn&rsquo;t disappear.' },
        { l:'Governance', c:'risk', t:'The subtle limit is EAV creep &mdash; the team defaulting to attributes for every field until structured, hot data hides in rows paying the full tax. Without governance, flexibility becomes a mess.' },
        { l:'When it&rsquo;s wrong', c:'sub', t:'And it&rsquo;s simply the wrong tool for uniform, known, heavily-queried data &mdash; that wants real columns, and forcing it into EAV is the anti-pattern.' },
        { l:'The mitigations', c:'trade', t:'Which is why the mitigations are the design: validate-on-write, opt-in searchable indexes, caching the pivot, and above all a hybrid model with column-promotion &mdash; keeping the tax proportional to the flexibility used.' },
        { l:'Close', c:'close', t:'So I&rsquo;d use EAV surgically for the sparse, variable long tail, name the query tax and governance burden upfront, and keep promoting hot attributes to columns &mdash; the maturity is knowing it&rsquo;s a tool with a bill, not a free lunch.' }
      ] }
  ]
};
