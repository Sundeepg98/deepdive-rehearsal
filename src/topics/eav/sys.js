/* topics/eav/sys.js -- topic 6 system map. intro + stages[] (exactly one cur:true, the
   attribute store) + pivots[] (7; chips carry the 8-topic INDEX in parens for topic-refs,
   plain names for non-topic pivots) + heads. Chip arrows use single-backslash \u2192.
   7-bit ASCII. */
var TOPIC_EAV_SYS = {
  intro:'Zoom out: the attribute store is the <b>boundary between a fixed schema and the per-device config that changes faster than migrations can keep up</b>. Upstream, product needs new settings constantly; downstream, 50,000 devices each resolve their own config. The store absorbs that variability as <b>data</b> &mdash; definitions and overrides &mdash; so the schema stays stable while config stays flexible.',
  stages:[
    { n:'Fixed schema', d:'Config as columns on the entity table &mdash; typed, constrained, trivially queryable, but every new setting is an <code>ALTER TABLE</code> and a deploy, and type-specific settings become sparse nullable columns on every device.' },
    { n:'Attribute store', d:'Definitions (the shared contract: name, type, default, JSON-Schema, flags) + per-entity value overrides. A new setting is a <b>row, not a migration</b>; the value table is sparse because it holds only deviations.', cur:true },
    { n:'Typed resolution', d:'Validate-on-write keeps every value well-formed (coerce to type, check JSON-Schema); reads resolve <code>COALESCE(override, default)</code>. Schemaless in shape, <b>typed in substance</b> &mdash; the store enforces what the column type used to.' },
    { n:'Query &amp; search', d:'Reconstruct a whole entity by pivoting its value rows (one query, never N+1); query across the fleet via a <b>composite partial index</b> on the attributes flagged searchable. The EAV tax, paid deliberately.' },
    { n:'Operate', d:'Staging + atomic promote (no half-applied config), bounded CSV import (coerced per definition), and CDC streaming value-change deltas &mdash; the guardrails that make a flexible store safe at fleet scale.' },
    { n:'Consumers', d:'Devices resolve their running config, APIs read reconstructed objects, and downstream caches and search indexes stay in sync via CDC &mdash; the store is the source of truth, everything else a derived copy.' }
  ],
  pivots:[
    { q:'The platform is multi-tenant. Where does a tenant boundary belong in the attribute store, and how is it enforced?',
      chip:'\u2192 Tenant Authorization (3)',
      a:'Value rows are <b>tenant-scoped</b> &mdash; the same per-tenant boundary the authorization topic enforces, applied to entity_value so one tenant can never read or write another&rsquo;s device attributes. Definitions can be global or per-tenant; resolution respects the scope. It&rsquo;s the same class as a missing <code>WHERE tenant_id</code>: the scope is part of every query, not an afterthought.' },
    { q:'Secret attributes &mdash; API keys, certs &mdash; are in the store. How are they protected at rest, and how is the blast radius bounded?',
      chip:'\u2192 AWS Hardening (4)',
      a:'<code>is_secret</code> values are <b>KMS-encrypted at rest with a per-tenant key</b> &mdash; so they inherit the crypto-shred and blast-radius story from the hardening topic: a dump doesn&rsquo;t leak plaintext, and a compromised key is scoped to one tenant. At the API they&rsquo;re masked. Same store, a different (encrypted, masked) path driven by one flag.' },
    { q:'Caches, search indexes, and devices all need to know when a value changes. How, without everyone polling the table?',
      chip:'\u2192 Notifications (5)',
      a:'<b>CDC</b> emits value-change deltas and downstream consumers subscribe &mdash; the same push-not-poll reasoning as the notification topic&rsquo;s poll-vs-realtime trade. Nobody scans the table; they react to deltas. Derived copies are eventually consistent; the store stays the strongly-consistent source of truth.' },
    { q:'These attributes describe what a device <i>should</i> be. How do they become the device&rsquo;s actual running configuration?',
      chip:'\u2192 Desired-State (7)',
      a:'The resolved attributes are an input to the device&rsquo;s <b>desired state</b> &mdash; the reconciler renders desired config from them, diffs against reported, and deploys. The attribute store answers &lsquo;what value&rsquo;; the desired-state topic answers &lsquo;how it gets there and stays there.&rsquo; A default change is a fleet-wide config change, which is why it&rsquo;s staged and rolled out, not flipped.' },
    { q:'Where&rsquo;s the line between a per-device attribute and platform infrastructure config that belongs in Terraform?',
      chip:'\u2192 IaC (8)',
      a:'The attribute store is <b>application-level, per-entity, runtime-mutable</b> config &mdash; values that change often and vary per device, set by operators without a deploy. Infrastructure config (what the IaC topic manages) is <b>platform-level, declarative, deploy-time</b> &mdash; the resources and their shape. The tell: if operators change it at runtime per device, it&rsquo;s an attribute; if it defines the platform and changes via a reviewed deploy, it&rsquo;s IaC. Putting runtime config in Terraform (or infra in the attribute store) is the anti-pattern.' },
    { q:'You said JSON column is an alternative. When would you actually skip EAV for a JSONB column?',
      chip:'\u2192 JSON column',
      a:'When config is <b>read and written whole per entity and rarely queried across entities</b>, and you don&rsquo;t need a shared per-attribute contract or per-attribute metadata (is_secret, searchable, groups). Then a JSONB column is simpler and correct. EAV earns its complexity when attributes need shared typed definitions, cross-fleet querying, and granular per-attribute writes; absent those, the blob wins.' },
    { q:'An attribute turns out to be queried and sorted constantly across the fleet. What do you do with it?',
      chip:'\u2192 Real columns',
      a:'<b>Promote it out of EAV into a real column.</b> A hot, stable, frequently-queried attribute has outgrown the long tail EAV serves &mdash; give it a typed column where filtering and sorting are normal indexed queries, not self-joins. Migrate: add the column, backfill from value rows, cut readers over, retire the attribute. EAV for the variable tail, columns for the hot core &mdash; a hybrid, governed by measured usage.' }
  ],
  heads:{
    whereHead:'Where the attribute boundary sits',
    pivHead:'Pivots an interviewer rides',
    pivSub:'From a flexible attribute into typing, resolution, tenancy, secrets, and the systems next door &mdash; each chip is a door a strong answer opens on purpose.'
  }
};
