/* topics/signing/drill.js -- topic 2 drill data. UNLIKE topic 1 (the foundation,
   which seeds the cross-pane globals cards/speakLines directly), topic 2 uses LOCAL
   arrays SIGN_CARDS / SIGN_SPEAK -- so loading this bundle does NOT clobber topic 1's
   working set. publishBanks() reseeds the globals from TOPIC_SIGN_BANK on switch.
   SIGN_SPEAK[i] pairs SIGN_CARDS[i] (order is load-bearing). 7-bit ASCII. */
var SIGN_CARDS = [
  { tier:'SDE2', signal:'What signing actually operates on',
    q:"Why sign the hash of the package instead of the whole file?",
    a:"You sign a <b>32-byte SHA&#8209;256 digest</b>, not the bytes. A signature over the hash is cryptographically equivalent to signing the content (the hash is collision-resistant), <b>size-independent</b>, and lets the device verify by re-hashing and checking one signature. Signing the whole file reads it needlessly and buys nothing.",
    f:[
      { q:"So does the signature guarantee the package hasn\u2019t changed?",
        a:"Yes \u2014 change one byte of the payload and its SHA&#8209;256 changes, so the signature no longer verifies against the recomputed hash. Integrity comes from the <b>hash</b>; authenticity comes from the <b>signature over that hash</b>. Together: tamper-evident and origin-proven." },
      { q:"The package is many files, not one blob. Now what do you sign?",
        a:"A <b>manifest</b> \u2014 a list of each file\u2019s hash \u2014 and you sign the manifest. The device verifies the manifest signature, then checks each file against its listed hash. That also enables <b>delta updates</b>: ship and verify only the changed files." }
    ],
    senior:"Saying &lsquo;the hash is collision-resistant, so signing it is equivalent to signing the content&rsquo; \u2014 not just &lsquo;I&rsquo;d sign it&rsquo; \u2014 is the tell that you understand <i>why</i> hash-then-sign is the standard." },
  { tier:'SDE2', signal:'Where the private key lives',
    q:"Where does the private signing key live, and why there?",
    a:"In an <b>HSM</b> (CloudHSM / CryptoHub / KMS), <b>non-exportable</b>. The signing service sends a hash and receives a signature \u2014 the key never enters the process. So a compromised signer can request signatures for a bounded window but can <b>never exfiltrate the key</b> itself.",
    f:[
      { q:"What\u2019s the difference between that and just encrypting the key at rest on the server?",
        a:"An encrypted-at-rest key is still <b>decrypted into process memory</b> to use \u2014 a memory dump or a code exploit leaks it. An HSM key is never decrypted outside the hardware boundary; you can only ask it to <i>sign</i>, never to <i>reveal</i>. That boundary is the whole point." },
      { q:"A compromised signer can still get things signed while you haven\u2019t noticed. How do you limit that?",
        a:"A <b>least-privilege Sign</b> scoped to one key, rate limits and anomaly alerts on signing volume, and short-lived credentials so the window is bounded. The key survives the incident; you rotate what the signer <i>could</i> reach, not the key." }
    ],
    senior:"Naming that the key is &lsquo;never decrypted outside the hardware&rsquo; \u2014 distinguishing HSM from encrypted-at-rest \u2014 is what separates a real answer from &lsquo;store it securely.&rsquo;" },
  { tier:'SDE3', signal:'Key scoping &amp; blast radius',
    q:"One signing key for everything, or many? How do you scope them?",
    a:"<b>Per tenant, per product type</b> \u2014 resolved through the four-table lookup (<code>product_type &rarr; company_product_type &rarr; company_device_keys</code>). A single global key means one leak forges the <b>whole fleet</b> and rotation re-signs everything at once. Scoped keys bound a leak to one company\u2019s product line.",
    f:[
      { q:"Why not go all the way to per-device keys \u2014 isn\u2019t that the ideal?",
        a:"It is the ideal <b>blast radius</b>, but a key-management nightmare at 50k+ devices \u2014 provisioning, storage, and rotation for millions of keys. Per-tenant-per-product-type is the pragmatic bound: small enough radius, tractable key count. I&rsquo;d name it as a bound, not pretend it&rsquo;s per-device." },
      { q:"A key leaks. Exactly what can the attacker do, and what can\u2019t they?",
        a:"They can forge packages for <b>that one tenant\u2019s product type</b>, for the window before rotation. They <b>cannot</b> sign for other tenants (different keys), and they <b>cannot</b> forge a new signing key (that\u2019s the offline root). The scoping <i>is</i> the containment." }
    ],
    senior:"Answering &lsquo;what can the attacker do <i>and</i> not do&rsquo; in terms of the exact scope \u2014 rather than &lsquo;we\u2019d rotate&rsquo; \u2014 shows you think in blast radius, the Staff-level frame." },
  { tier:'SDE2', signal:'Device-side verification',
    q:"The device receives a signed package. Walk what it checks before flashing.",
    a:"Three checks, all <b>before</b> writing: (1) recompute the payload SHA&#8209;256 and <b>verify the header signature</b> against the burned-in public key; (2) check the <b>version</b> isn&rsquo;t a downgrade; (3) write to the <b>spare A/B slot</b>, test-boot, and confirm-or-rollback. Any failure &rarr; reject and keep the current image.",
    f:[
      { q:"Where does the device\u2019s public key come from \u2014 can an attacker swap it?",
        a:"It\u2019s <b>burned in at manufacture</b> (or in secure/immutable storage, ideally hardware-backed). If an attacker can rewrite the trust anchor, signing is moot \u2014 which is why the anchor lives in write-protected storage or a secure element, established by <b>secure boot</b>. The chain of trust has to start in hardware." },
      { q:"Verification passes but the image boots into a crash loop. Signing said it was fine \u2014 now what?",
        a:"Signing proves <b>authentic</b>, not <b>functional</b>. That gap is exactly what <b>A/B + confirm</b> covers: the new image is in the spare slot, and if it doesn\u2019t confirm within the watchdog window the bootloader reverts to the known-good slot. Trust and correctness are different guarantees." }
    ],
    senior:"Volunteering that &lsquo;signed&rsquo; and &lsquo;boots correctly&rsquo; are different guarantees \u2014 and that A/B covers the second \u2014 is the operational tell of someone who\u2019s shipped OTA." },
  { tier:'SDE3', signal:'Downgrade / replay defense',
    q:"An attacker re-pushes an old, validly-signed package to exploit a fixed bug. What stops it?",
    a:"A <b>monotonic version</b> carried <i>inside the signed header</i>. The device refuses any version below what it&rsquo;s currently running. Because the version is under the signature, an attacker can&rsquo;t re-stamp an old package as &lsquo;newer&rsquo; without breaking the signature. A signature proves <b>authenticity, not freshness</b> \u2014 the version restores freshness.",
    f:[
      { q:"Why does the version have to be inside the signed region \u2014 why not just a header field?",
        a:"An unsigned header field is <b>attacker-controlled</b> \u2014 they\u2019d bump the number on an old package and it would look current. Putting the version under the signature binds freshness to authenticity: tamper with the version and the signature fails. That&rsquo;s the whole trick." },
      { q:"How does the device know its &lsquo;current version&rsquo; hasn\u2019t itself been rolled back?",
        a:"You anchor the counter in <b>tamper-resistant storage</b> (a secure element or a monotonic counter / anti-rollback fuse), so it only ever moves forward. Without a trustworthy floor, downgrade protection is only as strong as where you store &lsquo;current.&rsquo;" }
    ],
    senior:"&lsquo;A signature proves authenticity, not freshness&rsquo; is the one-line frame that unlocks this whole answer \u2014 lead with it and the fix follows." },
  { tier:'Staff', signal:'Key compromise recovery',
    q:"A signing key leaks. Walk the response.",
    a:"<b>Bound, recover, verify.</b> The radius is <b>one tenant\u2019s product type</b> (that\u2019s why keys are scoped). Recover by <b>rotating</b>: provision a new key, sign new packages with it, and <b>revoke the old at the trust anchor</b> \u2014 devices verify against the anchor, so once it stops certifying the old key, forgeries stop being trusted, no re-flash. Then audit for anything the leaked key signed during the window.",
    f:[
      { q:"During the window before rotation completes, the attacker signs a malicious package. How do devices not accept it?",
        a:"That&rsquo;s the hard part, and it\u2019s where the <b>downgrade defense and monitoring</b> earn their keep \u2014 a forged package still has to beat the monotonic version, and I\u2019d watch signing volume for the anomaly. Full airtight recovery may mean pushing a new legit version that supersedes anything the attacker could forge, then revoking. Rotation isn\u2019t instant; the scoping is what keeps &lsquo;not instant&rsquo; from being &lsquo;catastrophic.&rsquo;" },
      { q:"What if the leaked key was the <b>root</b>?",
        a:"Different, far worse incident \u2014 the root certifies signing keys, so a root leak undermines the anchor itself and can require re-establishing trust on devices. Which is <b>exactly why the root is offline and air-gapped</b>, used almost never. The two-tier model is the firewall that keeps a signing-key leak from escalating to this." }
    ],
    senior:"Scoping the damage and naming the offline root as the firewall \u2014 instead of catastrophizing &lsquo;the fleet is owned&rsquo; \u2014 is the Staff-level move." },
  { tier:'SDE3', signal:'Algorithm selection',
    q:"RSA or ECDSA? PKCS#1 v1.5 or PSS? How do you decide?",
    a:"The <b>device\u2019s verifier decides</b>, not your preference. You sign with what the fleet can already verify against its trust anchor: <b>G6</b> devices verify PKCS#1 v1.5, <b>G7</b> verify RSA-PSS. ECDSA/Ed25519 wins when you control both ends and want smaller, faster verify \u2014 but you can\u2019t unilaterally switch a fleet that only knows RSA.",
    f:[
      { q:"So if PSS is more modern and secure, why are you still signing v1.5 for some devices?",
        a:"Because a <b>G6 device only knows how to verify v1.5</b> \u2014 hand it a PSS signature and it rejects a perfectly valid package. It\u2019s a <b>compatibility surface</b>, not a preference. I\u2019d sign the scheme each family verifies and retire v1.5 as the fleet ages onto PSS." },
      { q:"What\u2019s the one thing you\u2019d never do here?",
        a:"<b>Roll my own</b> \u2014 custom padding, a homemade scheme, reusing nonces. That\u2019s the fastest no-hire in a crypto question. Standard primitives through a vetted library, always; the only choice I make is <i>which</i> standard, driven by the verifier." }
    ],
    senior:"&lsquo;The verifier decides, not me&rsquo; plus &lsquo;I\u2019d never roll my own&rsquo; are the two lines that signal you\u2019ve thought about crypto in production, not just in theory." },
  { tier:'SDE2', signal:'Reject is the safe path',
    q:"The device rejects an update. Doesn\u2019t refusing an update risk bricking the fleet?",
    a:"It\u2019s the <b>opposite</b> \u2014 rejecting an untrusted package is bricking <b>prevention</b>. A rejected package changes <b>nothing</b>: the device keeps running its current, working image. The brick risk is the other failure \u2014 flashing an <b>unverified or corrupt</b> image over your only partition. Verify-before-flash plus A/B is exactly what removes it.",
    f:[
      { q:"When is there a real bricking risk, then?",
        a:"An <b>interrupted or corrupt flash</b> on a device with a single partition \u2014 power loss mid-write leaves no bootable image. That\u2019s the entire reason for <b>A/B partitions</b>: write the spare slot, keep the active one intact, and only switch after the new image confirms a good boot." },
      { q:"A device is stuck \u2014 it keeps rejecting every update you push. How do you recover it?",
        a:"An <b>out-of-band recovery path</b>: a signed recovery image, a maintenance/recovery mode, or secure remote access. You never bypass verification to &lsquo;force&rsquo; an update \u2014 that reopens the whole hole. You fix why it\u2019s rejecting (wrong key, bad version, corrupt download) and push a correctly-signed package." }
    ],
    senior:"Reframing &lsquo;reject = danger&rsquo; into &lsquo;reject = the safe path, the brick risk is flashing unverified bytes&rsquo; flips the interviewer\u2019s premise \u2014 that\u2019s the senior move." },
  { tier:'Staff', signal:'Root of trust',
    q:"What certifies the signing keys, and where does that key live?",
    a:"A <b>root of trust</b> \u2014 the key (or CA) that certifies signing keys \u2014 which lives <b>offline / air-gapped</b>, used almost never, behind a human ceremony. Devices anchor trust to the root (or to public keys the root certifies), which is what lets you <b>rotate signing keys without re-flashing devices</b>: the anchor stays put, the leaf keys rotate under it.",
    f:[
      { q:"If devices trust the root, why not just sign packages with the root directly \u2014 fewer keys?",
        a:"Because then the <b>root is online</b>, in the signing path, exposed on every release \u2014 and a root compromise is unrecoverable without touching devices. You keep the root cold and delegate to <b>per-tenant signing keys</b> so day-to-day exposure is on cheap, rotatable, scoped keys, never the anchor." },
      { q:"How do devices get the root/anchor in the first place, trustworthily?",
        a:"<b>Provisioned at manufacture</b> into write-protected or secure-element storage, established by <b>secure boot</b> so the chain of trust starts in hardware. If the anchor can be rewritten in the field, none of the signing above it means anything \u2014 the anchor is the foundation the whole tower stands on." }
    ],
    senior:"Distinguishing the <b>offline root</b> from the <b>online signing keys</b> \u2014 and why the delegation exists \u2014 is a Staff-level distinction most candidates collapse into &lsquo;the key.&rsquo;" },
  { tier:'SDE3', signal:'HSM throughput ceiling',
    q:"A big release drops and the HSM is saturated with sign requests. What\u2019s the ceiling, and the fix?",
    a:"The ceiling is <b>HSM sign-ops per second</b> \u2014 not CPU or bandwidth, because signing is size-independent (you sign a 32-byte digest). When peak signing rate exceeds one partition\u2019s throughput, you <b>queue the hashes and drain at a controlled rate</b>, or <b>add HSM partitions</b> and shard signing across them.",
    f:[
      { q:"Why doesn\u2019t a bigger instance or more bandwidth help?",
        a:"Because the work isn\u2019t in <i>your</i> process \u2014 it\u2019s the HSM performing the private-key operation, and you\u2019re rate-limited by <b>its</b> throughput. Scaling your app doesn\u2019t make the HSM sign faster. You either parallelize across HSM partitions or smooth the burst with a queue." },
      { q:"Releases are bursty. Do you actually need to sign all of them in real time?",
        a:"Usually no \u2014 signing tolerates a short queue. Buffer the sign requests, drain against the HSM\u2019s rate, and let a release complete <i>eventually</i>. A queue turns a burst that would throttle into a backlog that clears \u2014 the same shock-absorber logic as the pipeline\u2019s SQS." }
    ],
    senior:"Naming that the ceiling is the HSM (a resource you don\u2019t scale by resizing your box) \u2014 and that signing is size-independent \u2014 is the numerate tell here." },
  { tier:'Staff', signal:'Error hygiene',
    q:"Your signing service throws on a bad request. What must the error NOT contain \u2014 and why does it matter?",
    a:"<b>No key material, no key id, no HSM internals.</b> Errors are <b>sanitized</b> before they\u2019re logged or returned. A stack trace that echoes a key, a key id, or an HSM handle is a <b>leak</b> \u2014 into logs, into an aggregator, into an attacker\u2019s hands. Redaction happens on the error path as a security control, not politeness.",
    f:[
      { q:"But you still need useful errors. How do you validate without leaking?",
        a:"A tiered ladder with <b>safe, specific</b> messages: <b>404</b> (no key for this product), <b>409</b> (malformed input, e.g. &lsquo;must be 6 characters&rsquo;), <b>500</b> (HSM rejected). Each tells the caller what to fix without exposing <i>what the key is</i>. Specific about the <b>request</b>, silent about the <b>secret</b>." },
      { q:"Where do these leaks usually actually happen?",
        a:"In <b>logs</b> \u2014 an unhandled exception logged verbatim, then shipped to a third-party aggregator. So redaction has to run <i>before</i> the log call, not just before the HTTP response. The response is the obvious surface; the log pipeline is the one people forget." }
    ],
    senior:"Knowing the leak vector is usually the <b>log pipeline</b> \u2014 not just the API response \u2014 and redacting before the log call is the operational detail that reads as real experience." },
  { tier:'SDE3', signal:'Rotation without re-flash',
    q:"You rotate a signing key. How do 50,000 devices trust the new key without a re-flash?",
    a:"Because devices anchor trust to a <b>root / trust anchor</b>, not to individual signing keys. Signing keys are <b>leaf</b> keys the root certifies. Rotate = issue a new leaf under the same anchor, sign new packages with it, revoke the old. Devices already trust anything the anchor certifies, so the new key is trusted <b>without touching the device</b>.",
    f:[
      { q:"What if you had made devices trust the signing key <b>directly</b> instead?",
        a:"Then rotation <b>would</b> require re-flashing every device with the new public key \u2014 exactly the trap. Direct trust in a leaf key couples key rotation to a fleet-wide update. The <b>anchor + delegation</b> layer exists precisely to decouple them." },
      { q:"How does a device learn the old key is revoked?",
        a:"Revocation is enforced at the <b>anchor</b> \u2014 the root stops certifying the old leaf, and/or new packages carry a key id the device checks against what the anchor currently certifies. In constrained fleets you often lean on <b>rotation + monotonic version</b> (supersede the old) rather than online revocation lists, since devices can\u2019t always reach a CRL." }
    ],
    senior:"Explaining <i>why</i> anchoring to a root (not the leaf key) is what decouples rotation from re-flashing \u2014 the design reason, not just the mechanism \u2014 is the tell." }
];
var SIGN_SPEAK = [
  "Lead with the equivalence: <b>'the hash is collision-resistant, so a signature over the 32-byte digest is equivalent to signing the content'</b> \u2014 then that it's size-independent and the device verifies by re-hashing. Signing the whole file is the tell you've only read about it.",
  "Say the boundary out loud: <b>'the key never leaves the HSM \u2014 I send a hash, I get a signature.'</b> Then the distinction that scores: an encrypted-at-rest key is still decrypted into memory to use; an HSM key never is. That's the whole difference.",
  "Answer in blast radius, not mechanism: <b>'per tenant, per product type, so a leak hits one company's product line, not the fleet.'</b> Then why not per-device \u2014 ideal radius, unmanageable at 50k keys \u2014 named as a bound, not hidden.",
  "Walk the three checks in order and stress <b>'all before the write.'</b> Then the line that separates you: signed and boots-correctly are different guarantees, and A/B-plus-confirm covers the second. That's the operational tell.",
  "Open with the frame that unlocks it: <b>'a signature proves authenticity, not freshness.'</b> Then the fix \u2014 a monotonic version <i>inside</i> the signed header \u2014 and why unsigned wouldn't work: an attacker just bumps the number.",
  "Refuse to catastrophize: <b>'bound, recover, verify.'</b> The radius is one tenant's product type by design; rotate and revoke at the anchor, no re-flash; the offline root is the firewall. Scoping the damage is the Staff move, not 'the fleet is owned.'",
  "Say the thing that reframes the whole question: <b>'the verifier decides, not me.'</b> G6 verifies v1.5, G7 verifies PSS \u2014 it's a compatibility surface. Then the one absolute: never roll your own.",
  "Flip the premise: <b>'rejecting an update is the safe path \u2014 the brick risk is flashing unverified bytes over your only partition.'</b> A rejected package changes nothing; A/B is what makes even a bad accepted image recoverable.",
  "Separate the tiers cleanly: <b>'the offline root certifies the online signing keys.'</b> Then why you don't sign with the root directly \u2014 it'd be exposed on every release \u2014 and that the anchor is provisioned in hardware via secure boot.",
  "Name the ceiling precisely: <b>'HSM sign-ops per second \u2014 and signing is size-independent, so a bigger box doesn't help.'</b> Fix is queue-and-drain or add partitions. The point that scores: the work is in the HSM, not your process.",
  "State it as a security control: <b>'no key material, no key id, no HSM internals \u2014 ever, and redacted before the log call, not just the response.'</b> Then the safe tiered ladder (404/409/500) that's specific about the request, silent about the secret.",
  "Give the design reason, not just the mechanism: <b>'devices anchor to the root, not the leaf key \u2014 that's what lets a signing key rotate without a fleet-wide re-flash.'</b> Direct trust in the leaf would couple rotation to a device update; the delegation layer exists to decouple them."
];
var TOPIC_SIGN_DRILL = {
  cards: SIGN_CARDS,
  speak: SIGN_SPEAK,
  tierNotes: {
    all:'<b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.',
    SDE2:'<b>Fundamentals under pressure</b> &mdash; sign the hash, key in an HSM, the device verifies. The bar is &ldquo;this is real signing, not hand-waving&rdquo;: show the mechanics cleanly.',
    SDE3:'<b>Depth &amp; trade-offs</b> &mdash; key scoping, algorithm choice, the downgrade defense. The bar is &ldquo;it depends, here&rsquo;s the switch&rdquo;: the verifier decides, so name the axis.',
    Staff:'<b>Systems judgment</b> &mdash; blast radius, compromise recovery, the root of trust. The bar is &ldquo;I see the failure mode before it ships&rdquo;: name what a leaked key can forge, and the firewall that bounds it.'
  }
};
