/* ============ scripts/app/groups.js -- the thematic axis ============
   The six thematic groups the topics bucket into, in display order. Each topic's
   identity carries a `group` id matching one of these. The topic switcher and the
   index view read this to render grouped sections; groups with no registered topic
   are skipped by the consumer, so the control stays correct at any topic count.
   Adding a topic = tag its identity with one of these group ids; nothing else here
   changes. Offline-safe: pure data + a pure bucketing helper, no network/storage. */
var TOPIC_GROUPS = [
  { id: 'messaging-events',          label: 'Messaging &amp; Events',          desc: 'How work moves &mdash; event buses, queues, notifications, scheduling, and config-driven behavior.' },
  { id: 'data-storage',              label: 'Data &amp; Storage',              desc: 'Modeling, caching, and moving data &mdash; and reading it back correctly under pressure.' },
  { id: 'reliability-observability', label: 'Reliability &amp; Observability', desc: 'Failing well &mdash; error propagation, debugging, incident anti-patterns, and seeing inside the system.' },
  { id: 'platform-infra',            label: 'Platform &amp; Infra',            desc: 'The ground it runs on &mdash; provisioning, cloud hardening, serverless, and self-converging platforms.' },
  { id: 'architecture-apis',         label: 'Architecture &amp; APIs',         desc: 'Shape and edges &mdash; ingestion pipelines, API gateways, service boundaries, and architecture reviews.' },
  { id: 'security-tenancy',          label: 'Security &amp; Tenancy',          desc: 'Trust and isolation &mdash; signing, authorization, and keeping tenants apart across the stack.' }
];

/* Bucket the registered topic ids by group, in group order then registration order.
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
