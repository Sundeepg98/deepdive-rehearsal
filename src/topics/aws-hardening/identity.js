/* ============ topics/aws-hardening/identity.js -- topic 4 (AWS Hardening) ============
   The switchable light-DOM identity for topic 4, same contract as topic 1's
   TOPIC_CP_IDENTITY. applyIdentity() rewrites the locator / h1 / sub / thesis /
   spine / cram title / companion notes from this object on every switch. Grounded
   in the ICS storage layer that holds signed firmware for 50k+ terminals (S3 Block
   Public Access, least-privilege IAM, SSE-KMS, presigned delivery, VPC endpoints).
   Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_AWSHARD_IDENTITY = {
  index: 4,
  total: 8,
  locatorTail: 'storage boundary',
  title: 'AWS Hardening',
  h1: 'AWS Hardening',
  sub: '<b>The hardening flow</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the storage boundary sits, and the pivots an interviewer rides from a bucket into IAM, KMS, and the edge.',
  companionTopic: 'AWS Hardening',
  thesis: 'The layer that keeps 50,000 terminals&rsquo; signed firmware and every tenant&rsquo;s data off the public internet &mdash; nothing public, every credential least-privilege, encrypted, delivered by expiring presigned URLs.',
  spine: [
    '<b>Block Public Access</b> &mdash; nothing is public, at the account and the bucket; the default is deny.',
    '<b>Least-privilege IAM</b> &mdash; every role does exactly what it needs, on one prefix &mdash; never <code>s3:*</code>.',
    'Encrypted <b>at rest and in transit</b> &mdash; SSE-KMS with per-tenant keys, HTTPS-only, unencrypted PUTs denied.',
    'Devices pull by <b>expiring presigned URL</b> &mdash; time-limited, one object, no AWS credentials on the device.'
  ],
  cramTitle: 'AWS Hardening',
  reportTitle: 'AWS Hardening',
  cmpNotes: {
    walk: ['The hardening flow', 'Stored-securely to delivered-securely, one control at a time \u2014 the layers you narrate before anyone cuts in.', 'Say the posture out loud \u2014 \u201Cnothing is public, every credential is least-privilege, everything is encrypted.\u201D That line is the whole design.'],
    drill: ['Probe Drill', 'Graded follow-ups on IAM, KMS, presigned URLs, and the exfiltration surface \u2014 the ones that separate a passing answer from a Staff signal.', 'Commit to an answer before you reveal \u2014 name the blast radius you\u2019re bounding, not just the setting you toggle.'],
    wb: ['Whiteboard', 'Rebuild the hardened bucket and its delivery path from memory \u2014 the cues, nothing in front of you.', 'Draw the boundary first \u2014 the private bucket, the least-privilege role, the presigned URL crossing once to the device. Recall is the test, not recognition.'],
    sys: ['System Map', 'Zoom out: hardening wraps the storage the pipeline writes and the device reads.', 'Lead with the boundary, not the boxes \u2014 \u201Cthe pipeline writes it, hardening keeps it private, the device pulls it by presigned URL.\u201D'],
    trade: ['Trade-offs', 'The decisions they drill \u2014 SSE-S3 vs SSE-KMS, presigned URL vs CloudFront, bucket policy vs IAM \u2014 each with the switch condition.', 'Always say \u201Cpick when\u201D \u2014 name the constraint that flips the choice, never defend one control as universally right.'],
    model: ['Model Answers', 'Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.', 'Steal the frame, not the words \u2014 headline first (\u201Cnothing public, least privilege, encrypted\u201D), then the one risk you\u2019d name.'],
    num: ['Numbers', 'Back-of-envelope the blast radius of a public bucket \u2014 and know the number that makes least privilege non-negotiable.', 'Lead with the exposure \u2014 one public bucket is the whole fleet\u2019s firmware, which is why the default is deny.'],
    rf: ['Red Flags', 'What sinks the round \u2014 a public bucket, <code>s3:*</code> on a role, firmware URLs that never expire \u2014 and what to say instead.', 'Name what the interviewer hears \u2014 \u201Cleft a bucket public\u201D is the fastest no-hire in a security round.'],
    open: ['30-Second', 'The opener and the close \u2014 matched to the altitude the question is asked at.', 'Match the altitude \u2014 open at the storage boundary, not the setting list, and land on least privilege and blast radius as the real point.']
  }
};
