/* ============ scripts/app/groups.js -- the thematic axis ============
   The six thematic groups the topics bucket into, in display order. Each topic's
   identity carries a `group` id matching one of these. The topic switcher and the
   index view read this to render grouped sections; groups with no registered topic
   are skipped by the consumer, so the control stays correct at any topic count.
   Adding a topic = tag its identity with one of these group ids; nothing else here
   changes. Offline-safe: pure data + a pure bucketing helper, no network/storage. */
var TOPIC_GROUPS = [
  { id: 'messaging-events',          label: 'Messaging &amp; Events',          color: '#0d9488', desc: 'How work moves &mdash; event buses, queues, notifications, scheduling, and config-driven behavior.' },
  { id: 'data-storage',              label: 'Data &amp; Storage',              color: '#2563eb', desc: 'Modeling, caching, and moving data &mdash; and reading it back correctly under pressure.' },
  { id: 'reliability-observability', label: 'Reliability &amp; Observability', color: '#d97706', desc: 'Failing well &mdash; error propagation, debugging, incident anti-patterns, and seeing inside the system.' },
  { id: 'platform-infra',            label: 'Platform &amp; Infra',            color: '#7c3aed', desc: 'The ground it runs on &mdash; provisioning, cloud hardening, serverless, and self-converging platforms.' },
  { id: 'architecture-apis',         label: 'Architecture &amp; APIs',         color: '#db2777', desc: 'Shape and edges &mdash; ingestion pipelines, API gateways, service boundaries, and architecture reviews.' },
  { id: 'security-tenancy',          label: 'Security &amp; Tenancy',          color: '#dc2626', desc: 'Trust and isolation &mdash; signing, authorization, and keeping tenants apart across the stack.' }
];

/* The canonical topic sequence (flat order). Group membership lives per-topic
   (identity.group); THIS array is the single place that defines display / stepping
   order. Reorder = move an id here. Ids not yet registered are skipped, so the full
   37-topic order (23 built + 14 declared-ahead) sits here and each new topic drops
   into its slot the moment it is built. Within-group order is pedagogical
   (foundational -> advanced); group order matches TOPIC_GROUPS. */
var TOPIC_ORDER = [
  /* Messaging & Events (5)    */ 'event-driven', 'notifications', 'cdc', 'kafka-internals', 'saga',
  /* Data & Storage (9)        */ 'caching', 'soft-delete', 'eav', 'shared-definition', 'replication', 'consistency-models', 'sharding-strategies', 'consistent-hashing', 'storage-engines',
  /* Reliability & Observ. (8) */ 'retries-timeouts', 'idempotency', 'circuit-breaker', 'error-propagation', 'backpressure', 'observability', 'debugging', 'slos',
  /* Platform & Infra (10)     */ 'iac', 'desired-state', 'aws-hardening', 'load-balancing', 'autoscaling', 'leader-election', 'distributed-locks', 'lambda-organization', 'devices-dispatch', 'developer-platform',
  /* Architecture & APIs (7)   */ 'state-machine', 'rules-engine', 'feature-flags', 'api-design', 'rate-limiting', 'content-pipeline', 'microfrontend',
  /* Security & Tenancy (3)    */ 'signing', 'authz', 'multi-tenant'
];
function topicOrderIndex(id) { var i = TOPIC_ORDER.indexOf(id); return i === -1 ? 1e4 : i; }

/* Bucket the registered topic ids by group, in group order then canonical TOPIC_ORDER.
   Returns [{ group, ids:[...] }] for non-empty groups only. */
function groupedTopicIds() {
  if (typeof TopicRegistry === 'undefined' || !TopicRegistry.ids) return [];
  var ids = TopicRegistry.ids();
  var out = [];
  for (var i = 0; i < TOPIC_GROUPS.length; i++) {
    var g = TOPIC_GROUPS[i], gi = [];
    for (var j = 0; j < ids.length; j++) {
      var t = TopicRegistry.get(ids[j]);
      if (t && t.identity && t.identity.group === g.id) gi.push(ids[j]);
    }
    if (gi.length) out.push({ group: g, ids: gi });
  }
  return out;
}
