/* topics/signing/model.js -- topic 2 model-answer data. selectors[] are the scenario
   buttons; answers[] are the spoken scripts, each {opener, sub, beats:[{l,c,t}]} where
   c is the beat class (frame/head/sub/risk/trade/close/ceil). Same contract as
   TOPIC_CP_MODEL. Pure data (renderer lives in model-answers.js). 7-bit ASCII. */
var TOPIC_SIGN_MODEL = {
  selectors: ['Make it secure', 'Key management', 'Walk a compromise', 'Device verification', 'Defend the design', 'Operate it', 'One you built', 'Test it', 'Name the limits'],
  answers: [
    { opener:"\u201CHow would you make this secure?\u201D",
      sub:"Secure signing = the key never leaks, the device can\u2019t be fooled, and an old package can\u2019t be replayed.",
      beats:[
        {l:"FRAME",c:"frame",t:"Security here is three properties: the private key <b>never leaks</b>, the device <b>can\u2019t be fooled</b> into trusting a forgery, and an <b>old package can\u2019t be replayed</b>. Let me take them in turn."},
        {l:"HEADLINE",c:"head",t:"The one non-negotiable is that the <b>private key lives in an HSM and never leaves</b> \u2014 every other guarantee builds on that."},
        {l:"KEY",c:"sub",t:"The service sends a <b>hash</b> to the HSM and gets a signature back; the key is non-exportable, so a compromised signer forges for a bounded window but can never <b>steal the key</b>. And keys are scoped <b>per tenant, per product type</b>, so a leak is contained to one company\u2019s product line."},
        {l:"DEVICE",c:"sub",t:"The device is the enforcer: it verifies the signature against a <b>burned-in public key</b> before flashing, and <b>rejects unsigned or invalid</b> packages. Trust lives on the device, not on the wire."},
        {l:"REPLAY",c:"sub",t:"A signature proves authenticity, <i>not</i> freshness \u2014 so a <b>monotonic version</b> rides inside the signed header, and the device refuses any version below what it\u2019s running. That closes downgrade and replay."},
        {l:"NAME THE RISK",c:"risk",t:"The subtle failure is <b>rolling your own crypto</b> \u2014 I don\u2019t. Standard primitives, RSA-PSS or ECDSA through a vetted library, with the algorithm chosen to match the device\u2019s verifier."},
        {l:"CLOSE",c:"close",t:"So: HSM-held key, per-tenant scoping, device-side verify before flash, and a signed monotonic version. Secure without hand-rolling anything."}
      ] },
    { opener:"\u201CHow do you manage the keys?\u201D",
      sub:"Key management is the actual hard part \u2014 where keys live, how they\u2019re scoped, how they rotate, and what the root is.",
      beats:[
        {l:"FRAME",c:"frame",t:"The signing is the easy part; <b>key management is the hard part</b>. Four questions: where the keys live, how they\u2019re scoped, how they rotate, and what the root of trust is."},
        {l:"HEADLINE",c:"head",t:"Two tiers: an <b>offline root</b> that certifies signing keys, and <b>online, per-tenant signing keys</b> held in the HSM."},
        {l:"SCOPING",c:"sub",t:"Signing keys are per-company-per-product-type through the <b>four-table model</b> \u2014 so the blast radius of any one key is one tenant\u2019s product line, and the tenant claim resolves which key signs."},
        {l:"ROTATION",c:"sub",t:"Rotation is designed in: provision a new key, sign new packages with it, revoke the old. Because devices verify against a <b>trust anchor</b> that certifies signing keys, I can rotate a signing key <b>without re-flashing every device</b>."},
        {l:"ROOT",c:"risk",t:"The root of trust \u2014 the key that certifies signing keys \u2014 lives <b>air-gapped</b>, touched almost never, behind a human ceremony. Putting the root online, or a signing key offline, is the design smell."},
        {l:"TRADE",c:"trade",t:"Per-device keys would be the ideal blast radius, but at 50k+ devices that\u2019s a key-management nightmare. Per-tenant-per-product-type is the <b>pragmatic bound</b> \u2014 and I\u2019d name it as a bound, not pretend it\u2019s per-device."},
        {l:"CLOSE",c:"close",t:"So: offline root, online HSM-backed per-tenant keys, rotation that doesn\u2019t touch devices, and a blast radius bounded by design."}
      ] },
    { opener:"\u201CWalk me through a key compromise.\u201D",
      sub:"A signing key leaks. Bound the damage, recover, and make sure it can\u2019t recur silently.",
      beats:[
        {l:"FRAME",c:"frame",t:"First I <b>bound the damage</b>, then recover, then make sure it can\u2019t recur silently. Panicking about \u2018the whole fleet\u2019 is the junior move \u2014 I scope it."},
        {l:"HEADLINE",c:"head",t:"The blast radius is <b>one tenant\u2019s product type</b> \u2014 that\u2019s exactly why keys are scoped that way \u2014 and it\u2019s bounded in <b>time</b> by how fast I rotate."},
        {l:"CONTAIN",c:"sub",t:"What a leaked signing key can forge is limited to what it was scoped to: one company\u2019s product line. It <b>cannot</b> sign for other tenants, and it <b>cannot</b> act as the root \u2014 those are separate keys."},
        {l:"RECOVER",c:"sub",t:"I rotate: provision a new key, sign new packages with it, and <b>revoke the old at the trust anchor</b>. Devices verify against the anchor, so once it stops certifying the old key, forgeries with the leaked key stop being trusted \u2014 no re-flash needed."},
        {l:"DOWNGRADE",c:"risk",t:"The nasty part is replay: an attacker with the old key re-pushes old, validly-signed packages. The <b>monotonic-version</b> defense holds \u2014 devices refuse downgrades \u2014 but I\u2019d audit for any device that accepted a suspicious version during the exposure window."},
        {l:"THE FIREWALL",c:"trade",t:"If the compromise reached the <b>root</b>, that\u2019s a different, far worse incident \u2014 which is precisely why the root is offline and air-gapped. The two-tier key model is the firewall that keeps a signing-key leak from being fleet-wide."},
        {l:"CLOSE",c:"close",t:"So: bounded to one tenant, rotate and revoke at the anchor, lean on the downgrade defense, and the offline root contains the worst case."}
      ] },
    { opener:"\u201CHow does the device verify a package?\u201D",
      sub:"The device is the enforcer \u2014 walk what it actually checks, and why the order matters.",
      beats:[
        {l:"FRAME",c:"frame",t:"The device does three checks before it writes anything, and rejects on any failure. Verification <b>gates</b> the flash \u2014 it never follows it."},
        {l:"HEADLINE",c:"head",t:"Hash the payload, verify the signature against the <b>burned-in public key</b>, and check the version isn\u2019t a downgrade."},
        {l:"AUTHENTICITY",c:"sub",t:"It recomputes the payload\u2019s <b>SHA&#8209;256</b> and verifies the header signature over that hash against its embedded public key. Match = authentic and untampered; mismatch = reject."},
        {l:"FRESHNESS",c:"sub",t:"It reads the <b>monotonic version</b> from the <i>signed</i> header and refuses anything below what it\u2019s running \u2014 the replay defense, and because the version is under the signature it can\u2019t be forged."},
        {l:"SAFETY",c:"sub",t:"A verified package lands in the <b>spare A/B partition</b>, boots into a test state, and must <b>confirm</b> within a watchdog window or roll back \u2014 covering a package that\u2019s validly signed but boots badly."},
        {l:"NAME THE RISK",c:"risk",t:"Verify-<i>after</i>-flash would be verify-never \u2014 you\u2019d have already written untrusted code. The check has to gate the write, which is why it all happens before the spare slot is touched."},
        {l:"CLOSE",c:"close",t:"So: authenticity, freshness, integrity \u2014 all before the write \u2014 then A/B and confirm. That\u2019s why rejecting an update is the <b>safe</b> path, not a brick."}
      ] },
    { opener:"\u201CDefend the design.\u201D",
      sub:"Why these choices \u2014 and the one axis you\u2019d actually flex on.",
      beats:[
        {l:"FRAME",c:"frame",t:"Let me defend the load-bearing choices and name the axis I\u2019d flex each on \u2014 because in signing the <b>verifier usually decides</b>, not me."},
        {l:"HEADLINE",c:"head",t:"HSM-held key, sign the hash, per-tenant scoping, device-side verify \u2014 each is the boundary that makes the next one meaningful."},
        {l:"HSM",c:"sub",t:"Key in an HSM, not on disk: a disk key means one server compromise forges the fleet. The only real alternative is managed <b>KMS</b>, which is fine \u2014 software keys is the red flag, not a third option."},
        {l:"HASH",c:"sub",t:"Sign the <b>digest</b>, not the file: signing is size-independent, so I sign 32 bytes regardless of a 40&nbsp;MB package. Signing the whole file adds zero security and just reads bytes needlessly."},
        {l:"ALGORITHM",c:"trade",t:"RSA vs ECDSA isn\u2019t my call \u2014 it\u2019s the device\u2019s <b>trust anchor</b>. G6 verifies v1.5, G7 verifies PSS; I sign what the fleet can check. <b>That\u2019s the axis I flex on</b>, and I\u2019d say so before they ask."},
        {l:"KEYS",c:"sub",t:"Per-tenant keys over per-device: per-device is the ideal blast radius but a key-management nightmare at fleet scale; the four-table model is the pragmatic bound."},
        {l:"CLOSE",c:"close",t:"So every choice is a boundary, and the one I\u2019d genuinely flex is the algorithm \u2014 dictated by the verifier, not by what\u2019s newest."}
      ] },
    { opener:"\u201CHow would you operate this in production?\u201D",
      sub:"Operating signing = catch a compromised signer early, keep the HSM healthy, and be ready to rotate under pressure.",
      beats:[
        {l:"FRAME",c:"frame",t:"Operating a signing service is three jobs: detect a compromised signer early, keep the HSM healthy and available, and be able to rotate a key under pressure. It's <b>low volume but high blast radius</b>, so the ops bar is unusual."},
        {l:"HEADLINE",c:"head",t:"The one metric I'd alarm on is <b>signing volume per key</b> &mdash; an anomaly there is the earliest signal of a compromised signer, the failure that matters most."},
        {l:"MONITOR",c:"sub",t:"Beyond volume: HSM latency and error rate (a failing HSM stalls releases), each key's <b>age</b> (rotation due), and every Sign call <b>audited</b> to a trail &mdash; who signed what, when. Signing is rare enough that <i>every</i> call is worth logging."},
        {l:"AVAILABILITY",c:"sub",t:"The HSM is a dependency that can go down &mdash; I'd run it HA (multiple partitions, or a managed pool). Because signing is on the <b>release path, not the request path</b>, the latency budget is generous: a brief HSM blip becomes a backlog that clears, not a failed release."},
        {l:"ROTATE",c:"risk",t:"Rotation is a runbook I've <b>rehearsed</b>, not a doc I've written &mdash; provision new key, sign new packages, revoke old at the anchor &mdash; because a rotation you've never run is one that fails during an incident."},
        {l:"NAME THE RISK",c:"trade",t:"The silent failure is a key quietly nearing end-of-life or an HSM degrading. I'd alarm on both <b>proactively</b> rather than discover them at the next release."},
        {l:"CLOSE",c:"close",t:"So: alarm on signing-volume anomaly, keep the HSM HA with a queue as shock absorber, audit every Sign, and rehearse rotation. Low volume, high stakes."}
      ] },
    { opener:"\u201CTell me about a signing system you've built.\u201D",
      sub:"The real one: multi-tenant device signing, a four-table key model, and the gap that bit us.",
      beats:[
        {l:"FRAME",c:"frame",t:"I'll take the signing pipeline for a fleet of payment terminals &mdash; multi-tenant, several device families, HSM-backed. The interesting parts weren't the crypto; they were the <b>key architecture</b> and one gap that bit us."},
        {l:"HEADLINE",c:"head",t:"Keys resolved through a <b>four-table lookup</b> &mdash; product_type &rarr; company_product_type &rarr; company_device_keys &mdash; so a signing key was scoped to one company's one product type."},
        {l:"ARCHITECTURE",c:"sub",t:"The flow was API &rarr; packager &rarr; HSM: resolve the tenant's key, send the package <b>hash</b> to the HSM (CryptoHub), get a signature, stamp it into the header. Different device families needed different schemes &mdash; older ones verified PKCS#1 v1.5, newer ones PSS &mdash; so the service branched on family."},
        {l:"THE GAP",c:"risk",t:"The subtle bug was a <b>visibility-vs-keys</b> gap: a tenant could be provisioned to <i>see</i> a product type before a signing <i>key</i> existed for it &mdash; so signing failed at request time with a confusing error. We made validation explicit &mdash; a ladder of key-exists (404), well-formed (409, e.g. &lsquo;must be 6 characters&rsquo;), HSM-accepts (500) &mdash; and surfaced the mismatch at <b>provisioning</b>, not sign time."},
        {l:"THE DETAIL I'M PROUD OF",c:"sub",t:"<b>Error sanitization.</b> Signing errors are dangerous &mdash; a stack trace echoing a key or key id leaks into logs. So every error was <b>redacted before it was logged</b>, not just before the response. Security on the error path, not politeness."},
        {l:"WHAT I'D CHANGE",c:"trade",t:"If I did it again, I'd invest earlier in <b>rotation automation</b> &mdash; we had the key model right, but rotation was more manual than I'd want when an incident is live."},
        {l:"CLOSE",c:"close",t:"So the value was the tenant-scoped key model and closing the visibility-vs-keys gap, not the signing math. The crypto is a library call; the systems work is <b>keys and failure modes</b>."}
      ] },
    { opener:"\u201CHow do you test a signing system?\u201D",
      sub:"Test the negatives &mdash; a signing system is defined by what it <i>rejects</i>.",
      beats:[
        {l:"FRAME",c:"frame",t:"A signing system is defined by what it <b>rejects</b>, so the tests aim there. The happy path &mdash; a valid signature verifies &mdash; is the easy 10%; the bugs live in the rejection paths."},
        {l:"HEADLINE",c:"head",t:"The load-bearing tests are <b>negative</b>: a tampered package, an unsigned package, a downgraded version, and a wrong-key signature must <b>all fail verification</b>."},
        {l:"NEGATIVES",c:"sub",t:"Concretely: flip one payload byte &rarr; verify fails. Strip the signature &rarr; reject. Re-stamp an old version &rarr; the monotonic-version check refuses it. Sign with tenant A's key, verify on B's device &rarr; fails. Each is a security property, and each gets a test asserting <i>rejection</i>."},
        {l:"ROUND-TRIP",c:"sub",t:"The positive test is a full <b>round-trip</b>: sign a real package, verify with the <b>real device-side verifier</b> (not a mock), across each family's scheme &mdash; because a v1.5-vs-PSS mismatch only shows up end-to-end."},
        {l:"FAILURE INJECTION",c:"sub",t:"Then the operational tests: <b>HSM unavailable</b> (does the request queue and retry, or fail cleanly?), a malformed key (right code from the ladder?), and a <b>rotation drill</b> &mdash; sign with the new key, confirm devices trust it via the anchor without re-flash."},
        {l:"NAME THE RISK",c:"risk",t:"The test people skip is the <b>downgrade</b> one &mdash; easy to prove a valid signature verifies and forget to prove an old-but-valid one is refused. That gap <i>is</i> the replay attack."},
        {l:"CLOSE",c:"close",t:"So: assert the rejections, round-trip through the real verifier per family, inject HSM failures, rehearse rotation. You can't unit-test crypto correctness into a library &mdash; you test that <i>your</i> rejection logic and failure handling hold."}
      ] },
    { opener:"\u201CWhere does this fall short?\u201D",
      sub:"The limits I shipped on purpose \u2014 said as knowing trades, not confessions.",
      beats:[
        {l:"FRAME",c:"frame",t:"A flawless-sounding design reads as junior. So I name the limits I shipped <i>on purpose</i> \u2014 each with its principled fix and the trigger that makes me reach for it."},
        {l:"THE BIGGEST GAP",c:"head",t:"<b>Per-tenant keys, not per-device</b>: a leaked key blasts one tenant\u2019s product line, not one device. The fix is per-device keys or per-device certs; the trigger is a threat model that can\u2019t tolerate a product-line-wide radius. At 50k+ devices, the key-management cost is why I didn\u2019t start there \u2014 stated as a bound, not hidden."},
        {l:"THE KNOWING TRADE",c:"trade",t:"<b>Online HSM signing</b> in the pipeline is convenient and high-throughput, but it means a live service can request signatures. I bound it with a least-privilege Sign and a scoped key; the airtight version adds a <b>human-in-the-loop</b> approval for high-risk releases. The trigger is the release\u2019s blast radius."},
        {l:"THE SMALLER SMELLS",c:"sub",t:"Two more I\u2019d raise before they do. The algorithm is dictated by <b>legacy device families</b> (v1.5 on G6) \u2014 a compatibility debt I\u2019d retire as the fleet ages onto PSS. And rotation, while designed in, is still an operational drill \u2014 I\u2019d <b>automate and rehearse</b> it, because a rotation you\u2019ve never run is one that fails under pressure."},
        {l:"THE TELL",c:"close",t:"The level signal is naming these as <i>knowing trades</i>: \u201CI shipped per-tenant keys aware of the per-device seam, and here\u2019s what triggers the cutover.\u201D A signing design\u2019s maturity is how precisely you can state its own <b>blast radius</b> \u2014 vague hand-waving right there is the tell the interviewer is listening for."}
      ] }
  ]
};
