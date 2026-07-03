/* topics/aws-hardening/sys.js -- topic 4 system-map data. intro = the .sm-intro copy;
   stages = the whole-system chain with AWS HARDENING as cur:true ("you are here");
   pivots = the 7 interviewer bridge points OUT of storage hardening (to signing, the
   per-tenant isolation of authz, the pipeline, desired-state, IaC, the OTA layer, and
   incident/rotation); heads = the two card headings + the pivot subhead. Chips use
   \u2192 and reference the 8 topics by index. Pure data; 7-bit ASCII. */
var TOPIC_AWSHARD_SYS = {
  intro: "AWS hardening is the <b>storage boundary</b>. The pipeline writes the signed firmware; hardening keeps it <b>private, least-privilege, and encrypted</b>, and delivers it to devices by <b>expiring presigned URL</b>. Knowing what sits on either side &mdash; and being able to walk the whole chain from stored artifact to device download &mdash; is what turns a list of AWS settings into a systems answer.",
  stages: [
    { n: 'Content pipeline', d: 'process &middot; hash &middot; PutObject the package' },
    { n: 'Package signing', d: 'sign the hash &middot; stamp the header' },
    { n: 'AWS hardening', d: 'private bucket &middot; least-priv IAM &middot; SSE-KMS &middot; presigned delivery', cur: true },
    { n: 'Desired-state', d: 'the target version selects which object to deliver' },
    { n: 'Device download + verify', d: 'presigned URL &rarr; download &rarr; verify signature &rarr; flash' },
    { n: 'Audit + detection', d: 'CloudTrail data events &middot; Config drift &middot; GuardDuty' }
  ],
  pivots: [
    { q: "The firmware I&rsquo;m hardening the storage for &mdash; how does it become trustworthy in the first place?", chip: "\u2192 Package signing (2)",
      a: "The <b>signed package</b> from the signing topic is what lands in this bucket &mdash; hardening protects the <i>storage</i> of an already-signed artifact. Signing makes the bytes <b>trustworthy</b> (the device will verify them); hardening keeps them <b>private and least-privilege</b> so they&rsquo;re never exposed or replaced. Two layers of one trust story: authenticity on the device, confidentiality and integrity in the store." },
    { q: "Per-tenant KMS keys &mdash; isn&rsquo;t that the same isolation problem as multi-tenant data access?", chip: "\u2192 Tenant authorization (3)",
      a: "Exactly the same principle, one layer down. The <b>per-tenant CMK</b> is the storage-layer expression of the isolation authz enforces on reads: a tenant&rsquo;s key gates their ciphertext just as the injected tenant predicate gates their rows, and <b>crypto-shredding a key</b> is the storage analog of the right-to-erasure authz handles. Same &lsquo;one tenant can never touch another&rsquo;s&rsquo; guarantee, expressed in keys instead of query predicates." },
    { q: "The bytes in the bucket &mdash; how did the pipeline get them there?", chip: "\u2192 Content pipeline (1)",
      a: "The <b>pipeline</b> processes the upload, computes the hash, and <code>PutObject</code>s the signed package into this bucket using a <b>least-privilege write role</b> scoped to one prefix. Hardening is the security posture <i>around</i> the pipeline&rsquo;s output store &mdash; the pipeline writes the artifact; hardening keeps the write path and the store locked down." },
    { q: "A device pulls firmware by presigned URL &mdash; how does it know WHICH object to pull?", chip: "\u2192 Desired-state (7)",
      a: "The <b>desired-state reconciler</b> computes the target version per device, and that target picks the S3 <b>object key</b> the presigned URL points at. Hardening secures the <i>delivery</i> of whichever object desired-state selected &mdash; desired-state decides <b>what</b> should be running; hardening delivers <b>that</b> object safely, credential-free and expiring." },
    { q: "The bucket, the IAM, the KMS keys, the endpoint policy &mdash; how is all that defined repeatably?", chip: "\u2192 IaC (8)",
      a: "Declaratively, as <b>infrastructure as code</b> &mdash; Block Public Access, the scoped IAM policies, the bucket-policy denies, the KMS key policy, the VPC endpoint, all versioned and reviewable instead of click-ops. Key <i>material</i> is generated in KMS (never in the template), but the whole <i>posture</i> around it is code you can diff, review, and roll back. That&rsquo;s the IaC topic &mdash; and drift from it is what the detective controls catch." },
    { q: "How does the device actually get told to download &mdash; who hands it the URL?", chip: "\u2192 Device / OTA orchestration",
      a: "The presigned URL rides <b>inside an IoT Job document</b>. The OTA orchestration layer targets device groups, rolls out by <b>canary then exponential rate</b>, and the device&rsquo;s job agent fetches the URL and downloads. Hardening produces the <b>credential-free, expiring URL</b>; the OTA layer delivers it and manages the rollout &mdash; the firmware bytes never travel in the job, only the URL does." },
    { q: "A credential or a KMS key is compromised &mdash; how do you recover and bound it?", chip: "\u2192 Incident / key rotation",
      a: "You <b>rotate</b> the credential or key and revoke the old &mdash; and lean on the layers already in place: <b>CloudTrail data events</b> to scope exactly what was accessed, <b>PrincipalOrgID</b> to confirm nothing was exfiltrated, and <b>per-tenant keys</b> so the blast radius was one tenant, not the fleet. Least privilege and defense in depth are precisely what make the recovery <b>bounded</b> instead of catastrophic." }
  ],
  heads: {
    whereHead: "Where the storage boundary sits",
    pivHead: "Interviewer pivot points",
    pivSub: "The questions that bridge out of storage hardening. Each one leads into another deep-dive &mdash; tap to see the connecting answer."
  }
};
