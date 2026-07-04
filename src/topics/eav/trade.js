/* topics/eav/trade.js -- topic 6 trade-offs. decisions[] each {q (X vs Y, single-quoted
   with the literal class="vs" span), opts:[{n,when}], tell}. Entities only, no backslash
   escapes. 7-bit ASCII. */
var TOPIC_EAV_TRADE = {
  lead:'The attribute-store decisions an interviewer drills &mdash; each is a place where &lsquo;flexible&rsquo; and &lsquo;correct&rsquo; pull against each other, and the answer is a switch condition, not a favorite.',
  decisions:[
    { q:'EAV table <span class="vs">vs</span> a JSON column',
      opts:[
        { n:'EAV (definition + value tables)', when:'Attributes need a shared typed contract, cross-entity querying, per-attribute metadata (secret, searchable, groups), and granular per-attribute writes.' },
        { n:'JSON / JSONB column', when:'Config is read and written whole per entity, rarely queried across, and needs no shared schema &mdash; simpler and correct for a per-device bag.' }
      ],
      tell:'Access pattern decides. Whole-aggregate read/write &rarr; JSON. Shared contract + cross-fleet query + granular writes &rarr; EAV. And JSON rewrites the whole blob on every field-write, while EAV updates one small row.' },
    { q:'EAV attributes <span class="vs">vs</span> real columns',
      opts:[
        { n:'EAV attribute', when:'The attribute is sparse, varies by device type or firmware, gets added ad hoc, and is rarely queried across entities &mdash; the flexible long tail.' },
        { n:'Real column', when:'The attribute is uniform across entities, known upfront, and frequently filtered or sorted &mdash; hot, stable, structured data.' }
      ],
      tell:'Stability &times; query-frequency. Hot-and-stable wants a column (typed, indexed, cheap to filter); sparse-and-variable wants EAV. A hybrid, not a religion &mdash; and promote attributes that graduate into columns.' },
    { q:'Typed values <span class="vs">vs</span> stringly-typed',
      opts:[
        { n:'Coerce to the type on write', when:'Effectively always &mdash; store the integer 30, the boolean, the parsed JSON, so comparison, sorting, and indexing behave correctly.' },
        { n:'Store everything as strings', when:'Almost never &mdash; only if the values are genuinely opaque blobs that are never compared, ordered, or range-filtered.' }
      ],
      tell:'Stringly-typed breaks silently: <code>&quot;9&quot; &gt; &quot;10&quot;</code> lexicographically, range filters go wrong, <code>&quot;30&quot;</code> and <code>&quot;30 &quot;</code> differ. Coerce at write so the store holds typed values; reject what can&rsquo;t coerce.' },
    { q:'Validate on write <span class="vs">vs</span> validate on read',
      opts:[
        { n:'Validate on write', when:'Default &mdash; check once at the single write path, so the store&rsquo;s invariant is &lsquo;everything in here is well-formed&rsquo; and readers do zero validation.' },
        { n:'Validate on read', when:'Effectively never &mdash; it duplicates the check across every reader, is easy to forget, and still lets garbage sit in the table.' }
      ],
      tell:'Write-once, read-many. A bad value written once breaks every future reader; validating on write centralizes correctness. The generic value column can&rsquo;t self-enforce, so the write path is the one place to enforce.' },
    { q:'Sparse overrides <span class="vs">vs</span> a row per entity',
      opts:[
        { n:'Store only overrides (sparse)', when:'Default &mdash; a device on the default has no row, so table size tracks deviation, not entities &times; attributes, and the default lives once on the definition.' },
        { n:'Materialize a row per entity-attribute', when:'Only if you genuinely need an explicit row for every value (rare) &mdash; and accept the cartesian-product row count and a mass update to change a default.' }
      ],
      tell:'Sparseness is the whole efficiency story. Materializing defaults means tens of thousands of identical rows per attribute and a mass update per default change. An attribute where <i>everyone</i> overrides is a modeling smell, not a reason to materialize.' },
    { q:'One generic value column <span class="vs">vs</span> per-type columns',
      opts:[
        { n:'One value column (text / JSONB)', when:'Simplest &mdash; a single column holds the coerced value; typing is enforced in the app via the definition&rsquo;s data_type, and JSONB can carry typed values.' },
        { n:'Per-type columns (value_int, value_str, value_json)', when:'When you want the database to type and index values natively &mdash; numeric ranges, typed indexes &mdash; at the cost of a wider, sparser value table.' }
      ],
      tell:'Trade DB-native typing/indexing against schema simplicity. One column is simpler; per-type columns give real numeric ordering and typed indexes but complicate reads and writes. Either way the definition stays the source of truth for an attribute&rsquo;s type.' },
    { q:'Staged write + promote <span class="vs">vs</span> direct write',
      opts:[
        { n:'Staged, then atomic promote', when:'When a config change must be reviewed, or applied as a consistent set, so the device never runs a half-applied configuration.' },
        { n:'Direct write (live immediately)', when:'For low-risk, single-value changes where immediate effect is fine and there&rsquo;s nothing to review or batch together.' }
      ],
      tell:'Match ceremony to risk. A reviewed, multi-value change wants staging + atomic promote (like a deploy); a one-off flag toggle doesn&rsquo;t need the workflow. Staging&rsquo;s value is the all-or-nothing cutover, not the write itself.' }
  ]
};
