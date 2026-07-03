/* topics/signing/trade.js -- topic 2 trade data. decisions[].{q, opts:[{n,when}],
   tell}; the "pick when" pill is in the renderer. Grounded in the device-family
   reality (G6 PKCS#1 v1.5, G7 RSA-PSS) and the four-table key model. 7-bit ASCII. */
var TOPIC_SIGN_TRADE = {
  lead: "The signing decisions an interviewer drills &mdash; each with the <b>axis</b> that picks a side. The senior move is naming what forces the choice; the tell that sinks you is defending one algorithm as universally right, because in signing the <b>verifier usually decides, not you</b>.",
  decisions: [
    { q: "RSA <span class=\"vs\">vs</span> ECDSA / Ed25519",
      opts: [{ n: "RSA", when: "the device already trusts an <b>RSA root</b>, verify libraries are everywhere, and you don&rsquo;t control the device crypto stack. Bigger keys and signatures, but universal." }, { n: "ECDSA / Ed25519", when: "you control <b>both ends</b> and want smaller signatures, smaller keys, and faster verify on constrained hardware." }],
      tell: "The device&rsquo;s existing <b>trust anchor</b> usually decides this, not your preference &mdash; you sign with what the fleet can already verify." },
    { q: "HSM <span class=\"vs\">vs</span> managed KMS <span class=\"vs\">vs</span> keys on disk",
      opts: [{ n: "HSM (CloudHSM / CryptoHub)", when: "keys must be <b>non-exportable</b>, you need FIPS-level assurance, and you run your own key ceremony." }, { n: "Managed KMS", when: "you want managed rotation, an <b>IAM-scoped Sign</b> call, and audit logging &mdash; and cloud HSM-backed keys are enough." }, { n: "Keys on disk", when: "<b>never</b> for production &mdash; a leaked file forges anything, forever." }],
      tell: "The real question is HSM <b>vs</b> managed KMS. Software keys on disk is the <b>red flag</b>, not a third option." },
    { q: "Sign the package <span class=\"vs\">vs</span> sign a manifest",
      opts: [{ n: "Sign the package hash", when: "it&rsquo;s a <b>single monolithic image</b> &mdash; one signature over one digest, simplest to verify." }, { n: "Sign a manifest", when: "the package is <b>many files</b> and you want per-file integrity or partial / delta updates &mdash; sign a manifest of file hashes, verify each file against it." }],
      tell: "The manifest buys <b>independent per-file verify and delta updates</b>; the single-blob signature is simpler when the image is one unit." },
    { q: "PKCS#1 v1.5 <span class=\"vs\">vs</span> RSA-PSS",
      opts: [{ n: "PKCS#1 v1.5", when: "you must interop with an <b>older device stack</b> that only implements it &mdash; the G6-family verifier, for instance." }, { n: "RSA-PSS", when: "you control the verifier and want the modern, <b>randomized, provably-secure</b> padding &mdash; the G7 family." }],
      tell: "PSS is the modern default, but the <b>fleet&rsquo;s verifier decides</b> &mdash; a device that only knows v1.5 doesn&rsquo;t care what&rsquo;s newer. Rolling your own padding is the instant no-hire." },
    { q: "Per-device keys <span class=\"vs\">vs</span> per-tenant / per-family keys",
      opts: [{ n: "Per-device", when: "the threat model demands a compromise contained to <b>one device</b> &mdash; and you can actually manage millions of keys." }, { n: "Per-tenant, per-product-type", when: "per-device is operationally impossible at fleet scale &mdash; a leaked key blasting <b>one company&rsquo;s one product line</b> is an acceptable, bounded radius, and rotation stays tractable." }],
      tell: "Per-device is the ideal blast radius but a key-management nightmare at 50k devices. The <b>four-table model</b> (product_type &rarr; company_product_type &rarr; company_device_keys) is the pragmatic bound." },
    { q: "Online HSM signing <span class=\"vs\">vs</span> offline root ceremony",
      opts: [{ n: "Online (HSM-backed)", when: "it&rsquo;s a <b>per-tenant signing key</b> and throughput / automation matter &mdash; the pipeline calls the HSM with a least-privilege Sign, keys never leave." }, { n: "Offline / air-gapped", when: "it&rsquo;s the <b>root of trust</b> that certifies signing keys &mdash; used rarely, behind a human ceremony, never on a network." }],
      tell: "Two tiers: the <b>root key is offline</b> and touched almost never; the <b>signing keys are online</b> and HSM-backed for throughput. Conflating them &mdash; putting the root online, or the signing key offline &mdash; is the design smell." },
    { q: "Explicit revocation <span class=\"vs\">vs</span> rotate + supersede",
      opts: [{ n: "CRL / OCSP", when: "devices are <b>online</b> and can reach a revocation endpoint &mdash; immediate, explicit revocation of a specific key or cert." }, { n: "Rotate + supersede", when: "devices are <b>offline or constrained</b> and can&rsquo;t fetch a list &mdash; rotate at the anchor and let the newest <b>monotonic version</b> win, so the compromised key&rsquo;s packages are outranked." }],
      tell: "A connected fleet gets <b>explicit revocation</b> (CRL/OCSP); an offline fleet can only be reached by <b>rotation-plus-supersession</b>. Design for the connectivity you actually have, not the one the textbook assumes." }
  ]
};
