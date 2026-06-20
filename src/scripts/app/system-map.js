/* ============ SYSTEM MAP ============ */
var stages=[
  { n:'Operator upload', d:'content / config pushed to S3' },
  { n:'Content pipeline', d:'process &middot; hash &middot; store &middot; bundle &middot; export', cur:true },
  { n:'Cryptographic signing', d:'HSM signs the package; devices reject unsigned' },
  { n:'Desired-state reconciliation', d:'compute per-device target, render templates, detect drift' },
  { n:'Deployment', d:'push to devices in maintenance windows, batched' },
  { n:'Device fetch + report', d:'device pulls, applies, reports reported_hash' }
];
var chain=document.getElementById('chain');
for(var c2=0;c2<stages.length;c2++){
  var st=stages[c2];
  var el=document.createElement('div');
  el.className='stg'+(st.cur?' cur':'');
  el.innerHTML='<div class="ln"></div><div class="dot">'+(c2+1)+'</div>'+
    '<div class="body"><div class="nm">'+st.n+(st.cur?'<span class="here">you are here</span>':'')+'</div>'+
    '<div class="ds">'+st.d+'</div></div>';
  chain.appendChild(el);
}
var pivots=[
  { q:"The content is processed — now it must be tamper-proof on the device", chip:"\u2192 Signing (17)",
    a:"The pipeline\'s output feeds the <b>signing</b> stage: the processed package hash goes to the HSM, which returns a signature stamped into the header. Devices verify it and reject unsigned packages. The pipeline produces the artifact; signing makes it trustable." },
  { q:"Tenants see different content — how is that access isolated?", chip:"\u2192 Authz (18)",
    a:"Every pipeline read/write is <b>tenant-scoped</b>: the JWT tenant claim becomes a query predicate, so processing and exports only ever touch one tenant\'s objects. Visibility and signing keys are provisioned per company — that\'s the authz topic." },
  { q:"Per-device attributes drive what gets rendered — where do they live?", chip:"\u2192 EAV (21)",
    a:"Custom per-device values come from the <b>EAV</b> store (definition + override, resolved by COALESCE). Those values are what the desired-state templates interpolate before hashing — the pipeline and reconciler both read them." },
  { q:"How does a device know it has the right content, and that it applied it?", chip:"\u2192 Desired-state (22)",
    a:"That\'s the <b>three-hash model</b>: desired (what it should have) vs deployed (what we sent) vs reported (what the device confirms). The pipeline\'s output hash becomes part of the desired hash; the reconciler closes the loop." },
  { q:"A 10,000-row import finishes — how do operators find out?", chip:"\u2192 Notifications (20)",
    a:"Completion fans out through the <b>dual-channel notification</b> system: an in-app row (polled) plus an optional email (SES, per-tenant sender). Decoupled, so a failed email never blocks the import\'s success path." },
  { q:"All this runs on AWS — how is the infrastructure itself locked down?", chip:"\u2192 AWS hardening (19)",
    a:"The pipeline\'s blast radius is an AWS-security problem: the processor runs on a <b>least-privilege execution role</b> — read one bucket prefix, write one table, nothing else — the bucket has <b>Block Public Access</b> on with <b>SSE</b> at rest, and traffic to S3 and the DB rides <b>VPC endpoints</b> so it never touches the public internet. Uploads arrive through presigned URLs scoped to one key with a short TTL. That whole hardening posture is its own topic." },
  { q:"All this infra — S3, Lambda, the queue, the IAM roles — how is it defined and deployed repeatably?", chip:"\u2192 IaC (23)",
    a:"Declaratively, as <b>infrastructure as code</b> — Terraform or CDK — so the bucket, functions, roles, and event wiring are versioned and reproducible instead of click-ops. And there\'s a clean parallel worth naming: <b>IaC drift detection is to infrastructure what the reconciler is to data</b> — both compare a declared desired state against reality and converge it. Drawing that symmetry is a senior move." }
];
var pivEl=document.getElementById('pivots');
for(var p2=0;p2<pivots.length;p2++){
  var pv=pivots[p2];
  var d=document.createElement('details');
  d.className='piv';
  d.innerHTML='<summary><span class="pq">'+pv.q+'</span><span class="chip">'+pv.chip+'</span></summary>'+
    '<div class="pa">'+pv.a+'</div>';
  pivEl.appendChild(d);
}
