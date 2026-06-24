/* ============ SYSTEM MAP (web component) ============
   Pilot conversion: the sys pane is now a fully-encapsulated custom element.
   Its markup, styles, and data live inside this element's shadow root; the only
   thing in the light DOM is <deep-system-map> sitting in the #sys pane host.
   Theming crosses the shadow boundary via inherited CSS custom properties (the
   global --acc / --mut / --surf / ... plus the --sm-* tokens in styles.css for
   the few hardcoded colors that flip between light and dark). Native <details>
   provides the pivot interactivity with no script. */

var SYS_STAGES = [
  { n: 'Operator upload', d: 'content / config pushed to S3' },
  { n: 'Content pipeline', d: 'process &middot; hash &middot; store &middot; bundle &middot; export', cur: true },
  { n: 'Cryptographic signing', d: 'HSM signs the package; devices reject unsigned' },
  { n: 'Desired-state reconciliation', d: 'compute per-device target, render templates, detect drift' },
  { n: 'Deployment', d: 'push to devices in maintenance windows, batched' },
  { n: 'Device fetch + report', d: 'device pulls, applies, reports reported_hash' }
];

var SYS_PIVOTS = [
  { q: "The content is processed &mdash; now it must be tamper-proof on the device", chip: "\u2192 Signing (17)",
    a: "The pipeline\'s output feeds the <b>signing</b> stage: the processed package hash goes to the HSM, which returns a signature stamped into the header. Devices verify it and reject unsigned packages. The pipeline produces the artifact; signing makes it trustable." },
  { q: "Tenants see different content &mdash; how is that access isolated?", chip: "\u2192 Authz (18)",
    a: "Every pipeline read/write is <b>tenant-scoped</b>: the JWT tenant claim becomes a query predicate, so processing and exports only ever touch one tenant\'s objects. Visibility and signing keys are provisioned per company &mdash; that\'s the authz topic." },
  { q: "Per-device attributes drive what gets rendered &mdash; where do they live?", chip: "\u2192 EAV (21)",
    a: "Custom per-device values come from the <b>EAV</b> store (definition + override, resolved by COALESCE). Those values are what the desired-state templates interpolate before hashing &mdash; the pipeline and reconciler both read them." },
  { q: "How does a device know it has the right content, and that it applied it?", chip: "\u2192 Desired-state (22)",
    a: "That\'s the <b>three-hash model</b>: desired (what it should have) vs deployed (what we sent) vs reported (what the device confirms). The pipeline\'s output hash becomes part of the desired hash; the reconciler closes the loop." },
  { q: "A 10,000-row import finishes &mdash; how do operators find out?", chip: "\u2192 Notifications (20)",
    a: "Completion fans out through the <b>dual-channel notification</b> system: an in-app row (polled) plus an optional email (SES, per-tenant sender). Decoupled, so a failed email never blocks the import\'s success path." },
  { q: "All this runs on AWS &mdash; how is the infrastructure itself locked down?", chip: "\u2192 AWS hardening (19)",
    a: "The pipeline\'s blast radius is an AWS-security problem: the processor runs on a <b>least-privilege execution role</b> &mdash; read one bucket prefix, write one table, nothing else &mdash; the bucket has <b>Block Public Access</b> on with <b>SSE</b> at rest, and traffic to S3 and the DB rides <b>VPC endpoints</b> so it never touches the public internet. Uploads arrive through presigned URLs scoped to one key with a short TTL. That whole hardening posture is its own topic." },
  { q: "All this infra &mdash; S3, Lambda, the queue, the IAM roles &mdash; how is it defined and deployed repeatably?", chip: "\u2192 IaC (23)",
    a: "Declaratively, as <b>infrastructure as code</b> &mdash; Terraform or CDK &mdash; so the bucket, functions, roles, and event wiring are versioned and reproducible instead of click-ops. And there\'s a clean parallel worth naming: <b>IaC drift detection is to infrastructure what the reconciler is to data</b> &mdash; both compare a declared desired state against reality and converge it. Drawing that symmetry is a senior move." }
];

var SYS_STYLE = `
.card + .card{margin-top:14px}
.sm-intro{font-size:12.5px;color:var(--mut);margin-bottom:18px}
.chain{position:relative;padding-left:8px}
.stg{position:relative;display:flex;gap:14px;padding:0 0 18px 0}
.stg:last-child{padding-bottom:0}
.stg .ln{position:absolute;left:13px;top:28px;bottom:-2px;width:2px;background:var(--sm-line)}
.stg:last-child .ln{display:none}
.stg .dot{flex:none;width:28px;height:28px;border-radius:50%;background:var(--sm-dot-bg);border:2px solid #D6D0C5;display:flex;align-items:center;justify-content:center;font:700 11px ui-monospace,monospace;color:var(--mut2);z-index:1}
.stg .body{padding-top:2px}
.stg .nm{font-size:14px;font-weight:680}
.stg .ds{font-size:12px;color:var(--mut);margin-top:1px}
.stg.cur .dot{background:var(--sm-cur-dot-bg);border-color:var(--acc);color:#fff;box-shadow:0 0 0 5px var(--accbg)}
.stg.cur .nm{color:var(--accink)}
.stg.cur .here{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--sm-here-fg);background:var(--acc);border-radius:5px;padding:2px 7px;margin-left:8px;vertical-align:middle}
.piv-k{font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--acc);margin-bottom:4px}
.piv-sub{font-size:12px;color:var(--mut);margin-bottom:14px}
.piv{border:1px solid var(--bd);border-radius:11px;margin-bottom:9px;overflow:hidden;background:var(--sm-card-bg);transition:border-color .15s ease,box-shadow .15s ease}
.piv:hover{border-color:var(--acc);box-shadow:0 5px 16px -8px rgba(83,74,183,.32)}
.piv summary{list-style:none;cursor:pointer;padding:13px 15px;display:flex;align-items:flex-start;gap:11px}
.piv summary::-webkit-details-marker{display:none}
.piv .pq{font-size:13px;font-weight:600;color:var(--ink);line-height:1.4}
.piv .chip{flex:none;font-size:9.5px;font-weight:800;letter-spacing:.3px;color:var(--indigo);background:var(--indigobg);border:1px solid #cfc7f0;border-radius:6px;padding:3px 8px;white-space:nowrap;margin-top:1px;margin-left:auto}
.piv .pa{padding:0 15px 14px 41px;font-size:12px;color:var(--sm-pa-fg)}
.piv .pa b{color:var(--accink)}
.piv[open] summary .pq::after{content:" \\2014 bridge:";color:var(--mut2);font-weight:700}
`;

/* Build the shadow DOM once, the first time the element connects. */
class DeepSystemMap extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    const chain = SYS_STAGES.map(function (s, i) {
      return '<div class="stg' + (s.cur ? ' cur' : '') + '">' +
        '<div class="ln"></div><div class="dot">' + (i + 1) + '</div>' +
        '<div class="body"><div class="nm">' + s.n +
        (s.cur ? '<span class="here">you are here</span>' : '') + '</div>' +
        '<div class="ds">' + s.d + '</div></div></div>';
    }).join('');
    const pivots = SYS_PIVOTS.map(function (p) {
      return '<details class="piv"><summary><span class="pq">' + p.q +
        '</span><span class="chip">' + p.chip + '</span></summary>' +
        '<div class="pa">' + p.a + '</div></details>';
    }).join('');
    root.innerHTML = '<style>' + SYS_STYLE + '</style>' +
      '<div class="card"><div class="step-t">Where this pipeline lives</div>' +
      '<div class="sm-intro">The content pipeline is the <b>ingestion layer</b>. Knowing the stages on either side of it &mdash; and being able to walk the whole chain &mdash; is what turns a component answer into a system answer.</div>' +
      '<div class="chain">' + chain + '</div></div>' +
      '<div class="card"><div class="piv-k">Interviewer pivot points</div>' +
      '<div class="piv-sub">The questions that bridge out of this topic. Each one leads into another deep-dive &mdash; tap to see the connecting answer.</div>' +
      '<div class="pivs">' + pivots + '</div></div>';
  }
}
customElements.define('deep-system-map', DeepSystemMap);
