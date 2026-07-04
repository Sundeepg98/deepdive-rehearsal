/* topics/eav/rf.js -- topic 6 red flags. flags[] each {bad (the quoted misstep), note
   (null except the LAST), tell (why it sinks the round), fix (what to say instead)}.
   Entities only, no backslash escapes. 7-bit ASCII. */
var TOPIC_EAV_RF = {
  lead:'The moves that quietly tank an attribute-store round &mdash; each is a real thing candidates say, why it reads as a no-hire, and the sentence that turns it around.',
  flags:[
    { bad:'&ldquo;Just put all the device config in one EAV table &mdash; it&rsquo;s flexible, so it&rsquo;s the obvious choice.&rdquo;',
      note:null,
      tell:'This is EAV as a <b>default</b>, and it&rsquo;s the fastest route to a no-hire on a data-modeling question. It says you reach for maximum flexibility without weighing the tax &mdash; pivots, self-joins, self-enforced typing &mdash; that you pay whether or not you use the flexibility.',
      fix:'Frame EAV as a deliberate tool for the <b>sparse, variable long tail</b>, and say what <i>doesn&rsquo;t</i> belong in it: uniform, known, queried data wants real columns. &lsquo;A hybrid, not a religion&rsquo; is the line that flips this from red to green.' },
    { bad:'&ldquo;The value column is just text &mdash; we store whatever string comes in.&rdquo;',
      note:null,
      tell:'Stringly-typed storage breaks silently and forever: <code>&quot;9&quot; &gt; &quot;10&quot;</code> lexicographically, range filters go wrong, <code>&quot;30&quot;</code> and <code>&quot;30 &quot;</code> are different values, and the searchable index is meaningless. It signals you haven&rsquo;t thought about how the values get compared or queried.',
      fix:'<b>Coerce to the attribute&rsquo;s type on write</b> &mdash; store the integer 30, the boolean, the parsed JSON &mdash; so comparison, sorting, and indexing behave. The definition&rsquo;s data_type is the source of truth; a value that can&rsquo;t coerce is rejected, not stringified.' },
    { bad:'&ldquo;We don&rsquo;t validate on write &mdash; whatever&rsquo;s in there, the reader can check.&rdquo;',
      note:null,
      tell:'Validate-on-read is the schemaless anti-pattern. A bad value written once breaks <i>every</i> future reader, the check is duplicated across consumers (and forgotten by one), and garbage accumulates in the table. The generic value column has no compiler &mdash; deferring validation means never really doing it.',
      fix:'<b>Validate at the write path, once</b>: coerce to type, check the JSON-Schema (range, enum, shape), reject bad values with a located error. The invariant becomes &lsquo;everything in the store is well-formed,&rsquo; and readers trust it &mdash; write-once, read-many.' },
    { bad:'&ldquo;To load a device&rsquo;s config, we loop its attributes and query each one.&rdquo;',
      note:null,
      tell:'That&rsquo;s the <b>N+1</b> that makes EAV notorious &mdash; a query per attribute, so reconstructing one entity is dozens of round trips and a list of entities is thousands. It&rsquo;s the single most common EAV performance failure, and interviewers listen for it specifically.',
      fix:'<b>Fetch all the entity&rsquo;s value rows in one query and pivot once</b> &mdash; never loop attributes. For a list view, fetch every entity&rsquo;s rows in one query and pivot in memory, and cache the hot reconstructions with CDC-driven invalidation.' },
    { bad:'&ldquo;To find every device where an attribute equals a value, we scan the value table.&rdquo;',
      note:null,
      tell:'A full scan of entity_value per cross-fleet query doesn&rsquo;t scale &mdash; it reads millions of rows to answer &lsquo;which devices have X = Y.&rsquo; It shows you know EAV can store anything, but not that querying it needs deliberate indexing.',
      fix:'Mark the queried attributes <b>searchable</b> and back them with a <b>composite partial index on (attribute_id, value)</b>. The query becomes a seek; the partial index stays small because you index only the searchable few, not every value row.' },
    { bad:'&ldquo;An API key is just another attribute &mdash; same table, same value column, plaintext.&rdquo;',
      note:null,
      tell:'Storing a credential like a timeout is a real security failure. A database dump leaks every secret, and any read path returns the plaintext to whoever calls it. A secret&rsquo;s threat model &mdash; at rest and in use &mdash; is nothing like a config flag&rsquo;s.',
      fix:'Flag it <code>is_secret</code> and route it down a protected path: <b>KMS-encrypted at rest</b> (per-tenant key) and <b>masked at the API</b> &mdash; write-only from outside, decrypted only by the authorized systems that use it. Encryption covers the dump; masking covers the leaking read.' },
    { bad:'&ldquo;Operators upload a CSV and we import all of it, however big.&rdquo;',
      note:null,
      tell:'An unbounded, unvalidated import is how you poison the store or run away in one paste &mdash; a multi-million-row job that locks tables, or a file of malformed values written straight in. It treats a user-supplied file as trusted, which it never is.',
      fix:'<b>Bound the import</b> (row and size caps &mdash; 500 rows, 5 MB) and <b>coerce and validate every cell</b> per its attribute&rsquo;s definition, with a clear all-or-nothing (or itemized) failure. Large changes run as many bounded, reviewable batches, not one giant transaction.' },
    { bad:'&ldquo;Changing the default? That&rsquo;s a one-row update on the definition &mdash; trivial.&rdquo;',
      note:null,
      tell:'The edit is one row; the <b>effect</b> is on every device resolving to that default &mdash; potentially the whole fleet. Calling it trivial shows you&rsquo;re thinking about the write, not the blast radius: a default change is a fleet-wide behavior change disguised as a data edit.',
      fix:'Treat a default change like a <b>config deploy</b>: know the blast radius (every non-overriding entity), <b>stage and roll it out</b> (canary, watch, expand) rather than flipping globally, and consider explicit overrides for devices that need the old value. And expect it to mass-invalidate caches &mdash; re-warm or stagger.' },
    { bad:'&ldquo;We never use real columns &mdash; everything is an attribute, even the fields we filter and sort on constantly.&rdquo;',
      note:'This is the subtle one &mdash; and the deepest signal of all, because it looks like consistency but is actually <b>EAV creep</b>: structured, hot data modeled as attributes, paying the full tax for flexibility it never uses.',
      tell:'When the attributes you query and sort by <i>every</i> request live in EAV, you&rsquo;ve reimplemented a relational database on top of it &mdash; self-joins for what a WHERE clause should do, indexes and caches to make rows behave like columns. The flexibility is unused; the tax is fully paid.',
      fix:'<b>Promote hot, stable, queried attributes to real columns</b>, and reserve EAV for the sparse, variable long tail. Govern it with a bar (new fields default to columns unless genuinely variable) and a measured promotion loop &mdash; a hybrid keeps the tax proportional to the flexibility you actually use. That&rsquo;s the Staff-level answer.' }
  ]
};
