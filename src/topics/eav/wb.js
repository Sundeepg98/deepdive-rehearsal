/* topics/eav/wb.js -- topic 6 whiteboard. steps[] are {c:cue, a:answer} recall prompts
   rebuilding the definition/value/resolution path from blank; diagram is a template
   literal (backticks; literal double-quotes inside) using the dgm-* class vocabulary.
   okVerdict uses a single-backslash \u2014. 7-bit ASCII. */
var TOPIC_EAV_WB = {
  steps: [
    { c:"Entry: what triggers a write, and who does it", a:"<b>Product or an operator sets a value</b> &mdash; a new setting for a device type, or an override for one device. The trigger isn&rsquo;t a schema change; it&rsquo;s a <b>write of data</b>. Draw the actor (product / operator / import) landing on the write path, and say the thesis: &lsquo;a new setting is a definition row, not a migration.&rsquo;" },
    { c:"The two tables: what&rsquo;s shared vs per-entity", a:"Draw <b>two boxes</b>. <b>Definition</b> &mdash; one row per attribute: name, type, default, JSON-Schema, flags (is_secret, is_searchable, group). <b>Value</b> &mdash; <code>(entity_id, attribute_id, value)</code>, one row per override, unique on the pair. Definition is the <b>shared contract</b>; value holds <b>only what differs</b> per device." },
    { c:"Set an override: how one device gets a non-default value", a:"An <b>upsert into value</b>: <code>ON CONFLICT (entity_id, attribute_id) DO UPDATE</code>. One override per entity-attribute, so it either inserts or replaces &mdash; never accumulates duplicates. Only devices that deviate get a row, which is what keeps the value table <b>sparse</b>." },
    { c:"Validate on write: what stops a bad value landing", a:"Before it lands: <b>coerce to the definition&rsquo;s data_type</b>, then <b>check the JSON-Schema</b> (range, enum, shape). Reject at the write path. Draw the validation gate <i>in front of</i> the value table &mdash; the store never holds an invalid value, so readers do zero validation." },
    { c:"Resolve: how you read a device&rsquo;s value", a:"<b><code>COALESCE(override, default)</code></b> &mdash; a left join from definition to the entity&rsquo;s value row. Override if present, else the default. One lookup, deterministic. Because overrides are sparse, most attributes resolve straight to the default &mdash; draw the join and the COALESCE across it." },
    { c:"Reconstruct: how you assemble a whole entity", a:"Fetch <b>all</b> the entity&rsquo;s value rows in <b>one</b> query, fill defaults from definitions, and <b>pivot into one object</b>. Draw N rows collapsing to one object &mdash; and label the trap: <b>per-attribute fetch is the N+1</b> that kills EAV. Fetch the set, pivot once." },
    { c:"Searchable: how you query across the fleet by an attribute", a:"A <b>composite partial index on (attribute_id, value)</b>, restricted to attributes flagged searchable. Draw it off the value table. &lsquo;All devices where X = Y&rsquo; becomes a <b>seek</b>; searchability is <b>opt-in</b> so the index stays small &mdash; you don&rsquo;t index every value." },
    { c:"Secrets: how a credential differs from a flag", a:"An <code>is_secret</code> attribute routes to a different path: <b>KMS-encrypted at rest</b> (per-tenant key) and <b>masked at the API</b> (write-only from outside). Draw the secret branch splitting off the write/read paths &mdash; encryption for a dump, masking for a leaking read; different threat model than a timeout." },
    { c:"Operate: the guardrails at the edge", a:"Three edges. <b>Staging</b> (<code>is_staged</code>) with an <b>atomic promote</b> so a device never runs a half-applied config; <b>bulk CSV import</b> bounded (500 rows / 5 MB) with per-cell coercion; <b>CDC</b> streaming value-change deltas to caches, search, and the device push. Flexibility at the core, guardrails at the edge." }
  ],
  diagram: `<div class="dgm">
  <div class="dgm-node dgm-src"><div class="dgm-t">product / operator / CSV import</div><div class="dgm-s">sets a value &mdash; data, not a migration</div></div>
  <div class="dgm-conn"><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-gate"><div class="dgm-t">validate on write</div><div class="dgm-s">coerce to data_type &middot; check JSON-Schema &middot; reject if bad</div></div>
  <div class="dgm-conn"><span class="dgm-lbl">well-formed value</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-fork">
    <div class="dgm-branches">
      <div class="dgm-br"><div class="dgm-node dgm-def"><div class="dgm-t">attribute_definition</div><div class="dgm-s">shared contract &middot; name, type, default, JSON-Schema, flags</div></div></div>
      <div class="dgm-br"><div class="dgm-node dgm-val"><div class="dgm-t">entity_value</div><div class="dgm-s">per-entity override &middot; (entity_id, attribute_id, value) &middot; sparse</div></div></div>
    </div>
    <div class="dgm-note">searchable attrs &rarr; composite partial index on (attribute_id, value)</div>
  </div>
  <div class="dgm-conn"><span class="dgm-lbl">left join + COALESCE</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-recon"><div class="dgm-t">resolve &middot; COALESCE(override, default)</div><div class="dgm-s">one lookup &rarr; then pivot N value rows into one object</div></div>
  <div class="dgm-conn"><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-out"><div class="dgm-t">device config &middot; API &middot; search &middot; CDC &rarr; downstream</div><div class="dgm-s">secrets: KMS-encrypted at rest + masked at API &middot; staged writes promote atomically</div></div>
  <div class="dgm-foot">a new setting is a definition row, not a migration &middot; the value resolves override-over-default</div>
</div>`,
  foot:'The one people forget: <b>the pivot</b>. Reconstructing an entity from row-per-attribute storage is the EAV tax &mdash; done per-attribute it&rsquo;s the N+1 that sinks the design. Fetch all the value rows in one query and pivot once, and know that constant whole-entity reconstruction is the signal to cache or to promote hot attributes to columns.',
  sub:'Rebuild the attribute boundary on a whiteboard &mdash; definition and value tables, validate-on-write, COALESCE resolution, the pivot, the searchable index, secrets, and the operating edges &mdash; from the cues, not from memory of a diagram.',
  okVerdict:'If you drew the definition/value split, said \u201CCOALESCE(override, default),\u201D put the validation gate in front of the write, and named the pivot as the EAV tax \u2014 that\u2019s the passing whiteboard. The rest (searchable index, secrets, staging, CDC) are the layers that turn a correct model into an operable one.'
};
