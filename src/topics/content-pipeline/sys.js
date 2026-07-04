/* topics/content-pipeline/sys.js -- Phase 1: REAL system-map data (lifted from the
   former SYS_STAGES / SYS_PIVOTS arrays + the baked intro and headings in
   system-map.js). intro = the .sm-intro copy; stages = the 6-stage chain (EXACTLY
   one has cur:true -- "you are here"); pivots = the 7 interviewer bridge points;
   heads = the two card headings + the pivot subhead (the schema 'heads' superset --
   card-1 heading is topic-specific). The sys intro is DATA rendered by the pane, NOT
   light-DOM identity. Pure data (no DOM APIs -- the .map renderers live in
   system-map.js); 7-bit ASCII (HTML entities + \uXXXX). */
var TOPIC_CP_SYS = {
  intro: "The content pipeline is the <b>ingestion layer</b>. Knowing the stages on either side of it &mdash; and being able to walk the whole chain &mdash; is what turns a component answer into a system answer.",
  stages: [
    { n: 'Operator upload', d: 'content / config pushed to S3' },
    { n: 'Content pipeline', d: 'process &middot; hash &middot; store &middot; bundle &middot; export', cur: true },
    { n: 'Cryptographic signing', d: 'HSM signs the package; devices reject unsigned' },
    { n: 'Desired-state reconciliation', d: 'compute per-device target, render templates, detect drift' },
    { n: 'Deployment', d: 'push to devices in maintenance windows, batched' },
    { n: 'Device fetch + report', d: 'device pulls, applies, reports reported_hash' }
  ],
  pivots: [
    { q: "The content is processed &mdash; now it must be tamper-proof on the device", chip: "\u2192 Signing (2)",
      a: "The pipeline\'s output feeds the <b>signing</b> stage: the processed package hash goes to the HSM, which returns a signature stamped into the header. Devices verify it and reject unsigned packages. The pipeline produces the artifact; signing makes it trustable." },
    { q: "Tenants see different content &mdash; how is that access isolated?", chip: "\u2192 Authz (3)",
      a: "Every pipeline read/write is <b>tenant-scoped</b>: the JWT tenant claim becomes a query predicate, so processing and exports only ever touch one tenant\'s objects. Visibility and signing keys are provisioned per company &mdash; that\'s the authz topic." },
    { q: "Per-device attributes drive what gets rendered &mdash; where do they live?", chip: "\u2192 EAV (6)",
      a: "Custom per-device values come from the <b>EAV</b> store (definition + override, resolved by COALESCE). Those values are what the desired-state templates interpolate before hashing &mdash; the pipeline and reconciler both read them." },
    { q: "How does a device know it has the right content, and that it applied it?", chip: "\u2192 Desired-state (7)",
      a: "That\'s the <b>three-hash model</b>: desired (what it should have) vs deployed (what we sent) vs reported (what the device confirms). The pipeline\'s output hash becomes part of the desired hash; the reconciler closes the loop." },
    { q: "A 10,000-row import finishes &mdash; how do operators find out?", chip: "\u2192 Notifications (5)",
      a: "Completion fans out through the <b>dual-channel notification</b> system: an in-app row (polled) plus an optional email (SES, per-tenant sender). Decoupled, so a failed email never blocks the import\'s success path." },
    { q: "All this runs on AWS &mdash; how is the infrastructure itself locked down?", chip: "\u2192 AWS hardening (4)",
      a: "The pipeline\'s blast radius is an AWS-security problem: the processor runs on a <b>least-privilege execution role</b> &mdash; read one bucket prefix, write one table, nothing else &mdash; the bucket has <b>Block Public Access</b> on with <b>SSE</b> at rest, and traffic to S3 and the DB rides <b>VPC endpoints</b> so it never touches the public internet. Uploads arrive through presigned URLs scoped to one key with a short TTL. That whole hardening posture is its own topic." },
    { q: "All this infra &mdash; S3, Lambda, the queue, the IAM roles &mdash; how is it defined and deployed repeatably?", chip: "\u2192 IaC (8)",
      a: "Declaratively, as <b>infrastructure as code</b> &mdash; Terraform or CDK &mdash; so the bucket, functions, roles, and event wiring are versioned and reproducible instead of click-ops. And there\'s a clean parallel worth naming: <b>IaC drift detection is to infrastructure what the reconciler is to data</b> &mdash; both compare a declared desired state against reality and converge it. Drawing that symmetry is a senior move." }
  ],
  heads: {
    whereHead: "Where this pipeline lives",
    pivHead: "Interviewer pivot points",
    pivSub: "The questions that bridge out of this topic. Each one leads into another deep-dive &mdash; tap to see the connecting answer."
  }
};
