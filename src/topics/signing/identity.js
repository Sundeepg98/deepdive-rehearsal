/* ============ topics/signing/identity.js -- topic 2 (Package Signing) ============
   The switchable light-DOM identity for topic 2, same contract as topic 1's
   TOPIC_CP_IDENTITY. applyIdentity() rewrites the locator / h1 / sub / thesis /
   spine / cram title / companion notes from this object on every switch. Grounded
   in the ICS / CryptoHub signing pipeline (four-table key architecture, HSM sign,
   header stamp, device verify). Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_SIGN_IDENTITY = {
  index: 2,
  total: 8,
  locatorTail: 'trust boundary',
  group: 'security-tenancy',
  title: 'Package Signing',
  h1: 'Package Signing',
  sub: '<b>The signing flow</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the trust boundary sits, and the pivots an interviewer rides from a signature into keys, HSMs, and the device.',
  companionTopic: 'Package Signing',
  thesis: 'The stage that makes a package tamper-proof on the device &mdash; HSM-signed, header-stamped, and verified before it ever flashes.',
  spine: [
    'The private key <b>never leaves the HSM</b> &mdash; you send it a hash, it hands back a signature.',
    'Sign the <b>hash, not the package</b> &mdash; one SHA&#8209;256, stamped into the header.',
    'Trust lives <b>on the device</b> &mdash; it verifies against a burned-in public key and <b>rejects unsigned</b>.',
    'Keys are <b>per-tenant, per-product-type</b> &mdash; a leaked key blasts one company, not the fleet.'
  ],
  cramTitle: 'Package Signing',
  reportTitle: 'Package Signing',
  cmpNotes: {
    walk: ['The signing flow', 'Request to device-verify, one step at a time \u2014 the mechanics you narrate before anyone cuts in.', 'Say the split out loud \u2014 \u201Cthe private key never leaves the HSM; we send a hash, we get a signature.\u201D That line is the whole design.'],
    drill: ['Probe Drill', 'Graded follow-ups on keys, algorithms, and the device boundary \u2014 the ones that separate a passing answer from a Staff signal.', 'Commit to an answer before you reveal \u2014 name the threat you\u2019re defending against, not just the mechanism.'],
    wb: ['Whiteboard', 'Rebuild the whole trust chain from memory \u2014 the cues, nothing in front of you.', 'Draw the boundary first \u2014 signer on one side, device on the other, the public key crossing once. Recall is the test, not recognition.'],
    sys: ['System Map', 'Zoom out: signing sits between the pipeline that produces the artifact and the device that trusts it.', 'Lead with the boundary, not the boxes \u2014 \u201Cthe pipeline makes the bytes, signing makes them trustable, the device enforces it.\u201D'],
    trade: ['Trade-offs', 'The decisions they drill \u2014 RSA vs ECDSA, HSM vs KMS, sign the package vs the manifest \u2014 each with the switch condition.', 'Always say \u201Cpick when\u201D \u2014 name the constraint that flips the choice, never defend one algorithm as universally right.'],
    model: ['Model Answers', 'Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.', 'Steal the frame, not the words \u2014 headline first (\u201Csign the hash, verify on device\u201D), then the one risk you\u2019d name.'],
    num: ['Numbers', 'Back-of-envelope the signing load \u2014 and know which number trips the HSM ceiling.', 'Lead with the peak \u2014 HSM ops/sec is the wall, and batching the hash is how you stay under it.'],
    rf: ['Red Flags', 'What sinks the round \u2014 signing the whole file, keys on disk, verifying nothing on the device \u2014 and what to say instead.', 'Name what the interviewer hears \u2014 \u201Crolled their own crypto\u201D is the fastest no-hire in the room.'],
    open: ['30-Second', 'The opener and the close \u2014 matched to the altitude the question is asked at.', 'Match the altitude \u2014 open at the trust boundary, not the padding scheme, and land on key management as the real hard part.']
  }
};
