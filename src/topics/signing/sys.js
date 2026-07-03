/* topics/signing/sys.js -- topic 2 system-map data. intro = the .sm-intro copy;
   stages = the whole-system chain with SIGNING as cur:true ("you are here"); pivots
   = the 7 interviewer bridge points OUT of signing (back to the pipeline, out to
   keys / HSM infra / desired-state / the device / rotation / IaC); heads = the two
   card headings + the pivot subhead. Pure data; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_SIGN_SYS = {
  intro: "Signing is the <b>trust boundary</b>. The pipeline produces the bytes; signing makes them <b>trustable</b>; the device <b>enforces</b> it. Knowing what sits on either side &mdash; and being able to walk the whole chain from artifact to device-verify &mdash; is what turns a crypto answer into a systems answer.",
  stages: [
    { n: 'Content pipeline', d: 'process &middot; hash &middot; store the package' },
    { n: 'Package signing', d: 'resolve key &middot; HSM signs the hash &middot; stamp the header', cur: true },
    { n: 'Desired-state reconciliation', d: 'the signed hash becomes part of the per-device target' },
    { n: 'Deployment', d: 'push signed packages to devices, batched, in windows' },
    { n: 'Device verify + flash', d: 'check the signature vs the burned-in key; flash or reject' },
    { n: 'Device report', d: 'device confirms its running signed version' }
  ],
  pivots: [
    { q: "The bytes I&rsquo;m signing &mdash; where do they come from?", chip: "\u2192 Content pipeline (16)",
      a: "From the <b>pipeline&rsquo;s output</b>: it processes the upload, computes the content <b>SHA&#8209;256</b>, and hands signing that hash. Signing never re-reads the whole artifact &mdash; the pipeline already produced the digest, and signing operates on the digest. The pipeline makes the bytes; signing makes them trustable." },
    { q: "Whose key signs this &mdash; and how is one tenant&rsquo;s key kept off another&rsquo;s packages?", chip: "\u2192 Authz / keys (18)",
      a: "Keys are resolved through a <b>four-table lookup</b> &mdash; <code>product_type &rarr; company_product_type &rarr; company_device_keys</code> &mdash; so the signing key is scoped to <b>one company&rsquo;s one product type</b>. That&rsquo;s the same per-tenant isolation as authz: the tenant claim picks the key, and a leaked key blasts one company, never the fleet." },
    { q: "The private key lives in an HSM &mdash; how is that infrastructure locked down?", chip: "\u2192 AWS hardening (19)",
      a: "The private key <b>never leaves the HSM</b> (CryptoHub / KMS / CloudHSM). The signing service holds a <b>least-privilege role</b> that can call exactly one operation &mdash; <code>Sign</code> on a scoped key &mdash; and nothing else: no export, no raw key access. Compromising the signer gets you signatures for a bounded window, never the key itself. That whole posture is the AWS-hardening topic." },
    { q: "The device got a signed package &mdash; how does it know it&rsquo;s the one it&rsquo;s supposed to run?", chip: "\u2192 Desired-state (22)",
      a: "The <b>signed hash</b> flows into the <b>three-hash model</b>: it becomes part of the <i>desired</i> hash the reconciler computes per device. The device reports back the hash it actually flashed (<i>reported</i>), and the loop closes. Signing proves the package is authentic; desired-state proves the <i>right</i> authentic package landed." },
    { q: "The device rejects a bad signature &mdash; how does refusing an update not brick the fleet?", chip: "\u2192 Device / OTA rollback",
      a: "Rejection is the safe path, not the dangerous one. The device verifies the signature <b>before it flashes</b>; a bad or missing signature means it keeps running the current image. Pair that with <b>A/B partitions</b> and a test-boot-then-confirm: a new image boots into the spare slot, confirms within a watchdog window, or rolls back. Refusing an untrusted update is <b>bricking prevention</b>, not a bricking risk." },
    { q: "A signing key leaks. What now?", chip: "\u2192 Key rotation",
      a: "You <b>rotate</b>: provision a new key, start signing new packages with it, and revoke the old. The bound on the damage is the device&rsquo;s <b>trust anchor</b> &mdash; devices verify against a public key (or a root that certifies signing keys), so what a leaked <i>signing</i> key can forge is limited to what that key was scoped to, for the window before rotation. Short-lived keys and a per-tenant key model are what keep rotation cheap and the blast radius small." },
    { q: "The HSM, the keys, the signing role &mdash; how is all that defined repeatably?", chip: "\u2192 IaC (23)",
      a: "Declaratively, as <b>infrastructure as code</b> &mdash; the key policy, the signing role&rsquo;s single scoped permission, the HSM/KMS wiring, all versioned and reproducible instead of click-ops. Key material is generated <i>in</i> the HSM (never in the template), but everything <i>around</i> it &mdash; who can sign, with which key, under what policy &mdash; is code you can review and roll back." }
  ],
  heads: {
    whereHead: "Where the trust boundary sits",
    pivHead: "Interviewer pivot points",
    pivSub: "The questions that bridge out of signing. Each one leads into another deep-dive &mdash; tap to see the connecting answer."
  }
};
