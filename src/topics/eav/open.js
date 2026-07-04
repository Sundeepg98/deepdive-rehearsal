/* topics/eav/open.js -- topic 6 opener + closer. cards[0] kind:"open" (one-breath +
   thirty-seconds for the attribute store, 3 hook threads); cards[1] kind:"close" (spine +
   3 risks, hooks:null). Entities only, no backslash escapes. 7-bit ASCII. */
var TOPIC_EAV_OPEN = {
  cards: [
    { kind:'open',
      k:'30-Second Version',
      t:'The attribute store, at altitude',
      lead:'Asked to design a per-device config store, open at the <b>boundary</b> &mdash; not the schema &mdash; then give the two tables and the one trade.',
      items:[
        { n:'One breath', ht:'the single sentence',
          a:'&ldquo;A schema-flexible attribute store: per-device config modeled as <b>rows, not columns</b>, so a new setting is a definition row, not a migration &mdash; typed and validated on write, resolved override-over-default.&rdquo;' },
        { n:'Thirty seconds', ht:'the shape, then the trade',
          a:'Two tables: a <b>definition</b> (the attribute&rsquo;s shared contract &mdash; name, type, default, JSON-Schema, flags) and a <b>value</b> table of sparse per-entity overrides. A device&rsquo;s value is <code>COALESCE(override, default)</code>. The trade I&rsquo;d name upfront is the <b>EAV tax</b>: reconstructing an entity is a pivot and querying across attributes needs opt-in indexing &mdash; so EAV is for the sparse, variable long tail, and hot, uniform, queried data belongs in real columns.' }
      ],
      hooks:{
        lead:'Three threads an interviewer pulls from that opener, and where each leads:',
        items:[
          { q:'&ldquo;How do you keep a schemaless value column from holding garbage?&rdquo;',
            d:'Validate on write &mdash; coerce to the definition&rsquo;s type, check the JSON-Schema, reject at the write path. The DB can&rsquo;t type a generic column, so you enforce it once, where every value passes through.',
            tab:'Typing' },
          { q:'&ldquo;Give me a device&rsquo;s whole config &mdash; how expensive is that?&rdquo;',
            d:'One query for all its value rows, then pivot once &mdash; never a query per attribute (the N+1). Constant whole-entity reconstruction is the signal to cache, or to promote to columns.',
            tab:'The pivot' },
          { q:'&ldquo;When is EAV the wrong call?&rdquo;',
            d:'For uniform, known, heavily-queried data &mdash; that wants real columns. The symptom of over-applying it is reimplementing a database on top of EAV. A hybrid, not a religion.',
            tab:'The tax' }
        ]
      },
      foot:'Open at the boundary, give the two tables and COALESCE, and name the EAV tax before they do &mdash; that framing signals you&rsquo;ve <i>run</i> an attribute store, not just read about one.' },
    { kind:'close',
      k:'The Close',
      t:'Land it, and name what bites',
      lead:'Closing the attribute store, compress to the spine &mdash; rows not columns, definition/value split, COALESCE, validate-on-write &mdash; then name the three risks that separate a real design from a naive one.',
      items:[
        { n:'The pivot / N+1', ht:'the performance risk',
          a:'Reconstructing an entity from row-per-attribute storage is the EAV tax &mdash; done per-attribute it&rsquo;s the N+1 that kills performance. Fetch all value rows in one query and pivot once; cache hot reconstructions with CDC-driven invalidation.' },
        { n:'EAV creep', ht:'the modeling risk',
          a:'The team defaulting to attributes for <i>every</i> field until structured, hot data hides in rows &mdash; paying the full tax for unused flexibility. Govern with a bar (default to columns unless genuinely variable) and a measured promotion loop.' },
        { n:'Default-change blast radius', ht:'the operational risk',
          a:'Changing a definition&rsquo;s default is a one-row edit with a fleet-wide effect &mdash; it moves the resolved value for every non-overriding device and mass-invalidates caches. Treat it like a config deploy: know the blast radius, stage, roll out, re-warm.' }
      ],
      hooks:null,
      foot:'What&rsquo;s next with more time: the searchable-index strategy for multi-attribute queries, per-tenant definition scoping, and the CDC pipeline to downstream consumers. What I&rsquo;d cut first: attribute groups and the staging UI &mdash; real, but not the core of the design.' }
  ]
};
