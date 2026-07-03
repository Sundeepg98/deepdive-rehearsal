/* topics/aws-hardening/wb.js -- topic 4 whiteboard. steps:[{c,a}x9]; diagram = the .dgm
   inner (template literal, double-quotes literal inside); foot; sub + okVerdict carry
   the step-count copy as data. Rebuilds the hardened storage boundary from memory.
   Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_AWSHARD_WB = {
  steps: [
    {c:'Entry &mdash; where the signed firmware lands, and who put it there.', a:'The pipeline <code>PutObject</code>s the signed package into a <b>private S3 bucket</b> &mdash; the store for 50,000+ terminals&rsquo; firmware. The stakes: one misconfiguration exposes the fleet.'},
    {c:'Public access &mdash; the first, non-negotiable control.', a:'<b>Block Public Access</b>, account and bucket, all four settings &mdash; so no ACL and no policy can ever make an object public. The floor, not the whole design.'},
    {c:'Access &mdash; who&rsquo;s allowed to read and write.', a:'<b>Least-privilege IAM</b>: the pipeline role <code>PutObject</code> on one prefix, the delivery role <code>GetObject</code>, nothing <code>s3:*</code>. The policy <i>is</i> the blast radius of a stolen credential.'},
    {c:'At rest &mdash; how the stored bytes are protected.', a:'<b>SSE-KMS</b> with a <b>per-tenant CMK</b>; a bucket policy denies unencrypted PUTs; the key policy is a second gate; every <code>Decrypt</code> is a CloudTrail event.'},
    {c:'In transit &mdash; how the bytes on the wire are protected.', a:'A bucket policy that <b>denies <code>aws:SecureTransport</code> false</b> &mdash; S3 still accepts HTTP unless you do, so this one <code>Deny</code> makes plaintext impossible.'},
    {c:'Delivery &mdash; how 50,000 credential-less devices get the bytes.', a:'The service mints a <b>presigned URL</b> &mdash; one object, short expiry &mdash; carried in the IoT Job document. The device downloads with just the URL, no AWS credential.'},
    {c:'The delivery limit &mdash; what a leaked URL exposes.', a:'A presigned URL is a <b>bearer token you can&rsquo;t revoke early</b>. Defense is structural: short window, one object, least-privilege signer. (The one people frame as &lsquo;just secure it&rsquo;.)'},
    {c:'Egress &mdash; stopping a stolen credential from exfiltrating.', a:'A <b>Gateway VPC endpoint</b> (no internet egress) with <code>aws:PrincipalOrgID</code> on its policy &mdash; so a compromised role can&rsquo;t copy firmware to an <i>outside</i> bucket.'},
    {c:'The backstop &mdash; assume a control still fails.', a:'<b>Versioning + Object Lock</b> (WORM, compliance mode) so firmware can&rsquo;t be tampered, <b>CloudTrail data events</b> so every read is audited, <b>SCPs</b> so no account can weaken any of it.'}
  ],
  diagram: `
          <div class="dgm-node"><div class="dgm-t">content pipeline</div><div class="dgm-s">PutObject the signed package (from the signing topic)</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">writes to a <b>private</b> bucket &middot; least-priv role, one prefix</span></div>
          <div class="dgm-node dgm-fork"><div class="dgm-t">S3 bucket &middot; <span class="dgm-em">Block Public Access: all 4 on</span></div><div class="dgm-branches"><span class="dgm-br">&rarr; SSE-KMS (per-tenant key)</span><span class="dgm-br">&rarr; deny non-TLS + unencrypted PUT</span></div><div class="dgm-s">versioning + Object Lock (WORM) &middot; CloudTrail data events on</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">internal reads via <b>Gateway VPC endpoint</b> &middot; aws:PrincipalOrgID = no exfil</span></div>
          <div class="dgm-node"><div class="dgm-t">delivery service</div><div class="dgm-s">GetObject on one prefix &rarr; mints a presigned URL (one object, short expiry)</div></div>
          <div class="dgm-note">&mdash;&mdash;&mdash; boundary: bucket is <b>private</b> &middot; device holds <b>no credential</b>, only a URL &mdash;&mdash;&mdash;</div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">presigned URL travels inside the IoT Job document</span></div>
          <div class="dgm-node dgm-recon"><div class="dgm-t">device: download by presigned URL</div><div class="dgm-s">works for ONE object for N minutes &rarr; then dead &middot; bearer token, can&rsquo;t revoke early</div></div>
          <div class="dgm-foot">nothing public &middot; least-privilege everywhere &middot; encrypted in + at rest &middot; egress org-locked &middot; no single slip breaches</div>
        `,
  foot: "<b>The one people forget:</b> step 7. A presigned URL is a <i>bearer token you can&rsquo;t revoke before it expires</i> &mdash; if you don&rsquo;t volunteer that limit and its structural mitigations (short window, one object, least-priv signer), the interviewer knows you&rsquo;ve read about presigned URLs, not shipped delivery to a fleet.",
  sub: "For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run the storage boundary on a whiteboard.",
  okVerdict: "<b>All nine cold.</b> You can rebuild the hardened storage layer on a whiteboard from memory \u2014 the security round is yours to lose, not to pass."
};
