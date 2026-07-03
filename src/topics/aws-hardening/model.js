/* topics/aws-hardening/model.js -- topic 4 model-answer data. selectors[] are the
   scenario buttons; answers[] are the spoken scripts, each {opener, sub, beats:[{l,c,t}]}
   where c is the beat class (frame/head/sub/risk/trade/close). answers[6] is the
   Invenco "one you built" story; 'Name the limits' is LAST. Openers/beats use \uXXXX.
   Pure data (renderer lives in model-answers.js). 7-bit ASCII. */
var TOPIC_AWSHARD_MODEL = {
  selectors: ['Make it secure', 'The encryption model', 'Walk a breach', 'Delivery to devices', 'Defend the design', 'Operate it', 'One you built', 'Test it', 'Name the limits'],
  answers: [
    { opener:"\u201CHow would you harden this storage layer?\u201D",
      sub:"Hardening = nothing public, every credential least-privilege, everything encrypted, delivery credential-free \u2014 arranged so no single slip breaches.",
      beats:[
        {l:"FRAME",c:"frame",t:"The bucket holds signed firmware for 50,000 terminals and tenant data, so the goal is that <b>no single misconfiguration can expose it</b>. That means layers: nothing public, least privilege, encryption, scoped delivery. Let me take them in order."},
        {l:"NOTHING PUBLIC",c:"head",t:"The non-negotiable first control is <b>Block Public Access</b> \u2014 account and bucket, all four settings \u2014 so no ACL or policy can ever make an object public. It&rsquo;s the floor every other guarantee sits on."},
        {l:"LEAST PRIVILEGE",c:"sub",t:"Then IAM: the pipeline role can <b>PutObject on one prefix</b>, the delivery role <b>GetObject</b>, nothing gets <code>s3:*</code>. The policy <i>is</i> the blast radius of a stolen credential, so I scope the action <i>and</i> the resource."},
        {l:"ENCRYPT",c:"sub",t:"<b>SSE-KMS</b> with a per-tenant key at rest \u2014 which buys audit and crypto-shred \u2014 and a bucket policy that <b>denies unencrypted PUTs and any non-TLS request</b>. Plaintext firmware, at rest or on the wire, is impossible."},
        {l:"DELIVER",c:"sub",t:"Devices can&rsquo;t hold credentials, so the service mints a <b>presigned URL</b> \u2014 one object, short expiry \u2014 carried in the Job document. The device downloads with just the URL, and the URL can only do what the least-privilege signer can."},
        {l:"NAME THE RISK",c:"risk",t:"The subtle one is the presigned URL: it&rsquo;s a <b>bearer token you can&rsquo;t revoke early</b>. I bound it structurally \u2014 short window, one object \u2014 and reach for CloudFront signed URLs when I actually need revocation."},
        {l:"CLOSE",c:"close",t:"So: nothing public, least-privilege IAM, encrypted in and at rest, credential-free expiring delivery, egress org-locked. Defense in depth \u2014 no single slip breaches."}
      ] },
    { opener:"\u201CWalk me through the encryption \u2014 at rest and in transit.\u201D",
      sub:"SSE-KMS with per-tenant keys at rest for audit and crypto-shred; a deny-non-TLS policy in transit; the key policy as a second gate.",
      beats:[
        {l:"AT REST",c:"frame",t:"At rest, <b>SSE-KMS with a customer-managed, per-tenant key</b> \u2014 not SSE-S3. SSE-S3 encrypts, but KMS buys three things it can&rsquo;t: an audit trail, key-level access control, and crypto-shredding."},
        {l:"AUDIT",c:"sub",t:"Every <code>Decrypt</code> is a <b>CloudTrail event</b>, so I can see who read which object \u2014 the same audit trail a breach investigation needs, at the crypto layer."},
        {l:"SECOND GATE",c:"sub",t:"The <b>key policy</b> is an independent second lock: a principal with <code>s3:GetObject</code> gets ciphertext unless the key policy <i>also</i> grants <code>kms:Decrypt</code>. Two locks, so a stolen S3 credential without KMS access reads nothing usable."},
        {l:"CRYPTO-SHRED",c:"sub",t:"Per-tenant keys mean <b>right-to-erasure works across immutable backups</b>: destroy the tenant&rsquo;s key and every copy \u2014 backups included \u2014 becomes unreadable, because ciphertext without the key is noise."},
        {l:"IN TRANSIT",c:"head",t:"In transit, a bucket policy that <b>denies <code>aws:SecureTransport</code> false</b>. S3 still <i>accepts</i> HTTP unless you deny it, so that one statement turns &lsquo;we use HTTPS&rsquo; into &lsquo;plaintext is impossible.&rsquo;"},
        {l:"TRADE",c:"trade",t:"The cost of KMS is a <b>request per operation and a per-key throughput ceiling</b> \u2014 real at 50k devices pulling at once. I handle it with <b>S3 Bucket Keys</b>, which slash the per-object KMS calls."},
        {l:"CLOSE",c:"close",t:"So: SSE-KMS per tenant for audit, a key-policy gate, and crypto-shred; deny-non-TLS in transit; Bucket Keys to keep KMS throughput off the critical path."}
      ] },
    { opener:"\u201CA credential leaks and the attacker has S3 access. Walk the incident.\u201D",
      sub:"Scope from CloudTrail, contain by rotating and revoking, then close the class \u2014 and lean on the layers that bounded it.",
      beats:[
        {l:"FRAME",c:"frame",t:"First question: <b>what could that credential do?</b> \u2014 because the answer is whatever the role was granted. If it was <code>GetObject</code> on one prefix, the exposure is one path; the least-privilege policy I wrote is the blast radius."},
        {l:"SCOPE IT",c:"head",t:"I scope the actual access from <b>CloudTrail data events</b> \u2014 which objects were read, when, from where. That&rsquo;s why data events are on for sensitive buckets: without them I&rsquo;d know the credential leaked but not what it touched."},
        {l:"CONTAIN",c:"sub",t:"<b>Rotate the credential and revoke the old</b> immediately. If it&rsquo;s a role with short-lived creds, the window is already small; if it was a long-lived key, this is exactly why I&rsquo;d have moved to roles."},
        {l:"CHECK EXFIL",c:"sub",t:"Confirm nothing left the org: the <b>VPC endpoint policy with <code>aws:PrincipalOrgID</code></b> means the credential <i>couldn&rsquo;t</i> copy firmware to an outside bucket, and I verify that in the logs rather than assume it."},
        {l:"BOUND BY KEYS",c:"sub",t:"Because encryption is <b>per-tenant SSE-KMS</b>, even read access is bounded \u2014 the credential could only decrypt what its KMS grants allowed, and a single tenant&rsquo;s key is the ceiling, not the fleet."},
        {l:"CLOSE THE CLASS",c:"risk",t:"Then I close the <b>class</b>, not the instance: tighten the role on Access Analyzer&rsquo;s evidence, add a Config rule alarming on the drift that let it happen, and confirm the SCP that should have capped it."},
        {l:"CLOSE",c:"close",t:"The point: the breach was <b>bounded at every layer</b> \u2014 least privilege, per-tenant keys, org-locked egress, audit \u2014 so recovery was &lsquo;rotate and scope,&rsquo; not &lsquo;the fleet is compromised.&rsquo;"}
      ] },
    { opener:"\u201CHow do 50,000 devices download firmware without AWS credentials?\u201D",
      sub:"A presigned URL \u2014 one object, short expiry, credential-free \u2014 in the Job document; a bearer token you bound structurally.",
      beats:[
        {l:"FRAME",c:"frame",t:"Devices can&rsquo;t hold AWS credentials, so I don&rsquo;t give them any. The delivery service mints a <b>presigned URL</b> \u2014 a Signature V4 URL scoped to one object with a short expiry \u2014 and the device downloads with just that."},
        {l:"IN THE JOB",c:"head",t:"The URL rides <b>inside the IoT Job document</b>, never the firmware bytes. The device&rsquo;s job agent fetches the URL and pulls the object \u2014 the bucket stays private, the device stays credential-free."},
        {l:"BOUNDED",c:"sub",t:"The URL is signed with the <b>delivery role&rsquo;s least-privilege permissions</b>, so it can do exactly what that role can \u2014 <code>GetObject</code> on one prefix \u2014 and nothing more. The signer&rsquo;s scope is the URL&rsquo;s scope."},
        {l:"THE LIMIT",c:"sub",t:"The honest catch: a presigned URL is a <b>bearer token you can&rsquo;t revoke before it expires</b>. So I make the window small \u2014 five minutes \u2014 and single-object, so a leaked URL is useless fast and exposes one file."},
        {l:"WHEN TO UPGRADE",c:"sub",t:"If I need to <b>cut access mid-flight</b> or cache the file for 50k pulls, I front S3 with <b>CloudFront + OAC and signed URLs</b> \u2014 revocable, edge-cached, WAF-frontable, bucket still private."},
        {l:"TRADE",c:"trade",t:"Presigned wins on <b>simplicity</b>; CloudFront wins on <b>revocation and caching</b>. I default to presigned and reach for CloudFront when the constraint \u2014 revocability, cache, WAF \u2014 actually appears."},
        {l:"CLOSE",c:"close",t:"So: credential-free, single-object, expiring URLs in the Job document, bounded by the signer&rsquo;s least privilege \u2014 and CloudFront when I need to revoke or cache."}
      ] },
    { opener:"\u201CWhy this posture and not something simpler?\u201D",
      sub:"Because the blast radius of the storage layer is the whole fleet \u2014 so every control is chosen to bound a specific failure.",
      beats:[
        {l:"FRAME",c:"frame",t:"&lsquo;Simpler&rsquo; here means &lsquo;a single mistake breaches the fleet.&rsquo; The storage layer holds every tenant&rsquo;s firmware, so I design for the failure, not the happy path \u2014 each control bounds a specific way it goes wrong."},
        {l:"WHY BPA",c:"head",t:"<b>Block Public Access</b> exists because &lsquo;we&rsquo;ll be careful with ACLs&rsquo; is exactly how every public-S3 breach happened. The four switches make &lsquo;public&rsquo; structurally impossible \u2014 a property, not a discipline."},
        {l:"WHY LEAST PRIV",c:"sub",t:"<b>Least-privilege IAM</b> exists because a stolen credential is a <i>when</i>, not an <i>if</i> \u2014 and the policy is the damage. <code>s3:*</code> hands over the fleet; <code>GetObject</code> on one prefix hands over one path."},
        {l:"WHY KMS",c:"sub",t:"<b>SSE-KMS</b> over free SSE-S3 because I need the audit trail, the key-policy second gate, and crypto-shred for erasure \u2014 three things worth paying for on firmware and customer data."},
        {l:"WHY THE PERIMETER",c:"sub",t:"The <b>VPC endpoint with <code>PrincipalOrgID</code></b> exists because I can&rsquo;t trust a compromised role \u2014 so the choke point the role can&rsquo;t modify refuses exfiltration to outside buckets. Defense in depth means the second layer holds when the first fails."},
        {l:"TRADE",c:"trade",t:"The cost is <b>operational complexity</b> \u2014 more policies, keys, endpoints to manage. I&rsquo;d cut sophistication (silos, ABAC) before I&rsquo;d cut any control that bounds a breach, because a leaked-firmware MVP is an incident, not an MVP."},
        {l:"CLOSE",c:"close",t:"So every control maps to a specific failure it bounds \u2014 that&rsquo;s the defense: not paranoia, but knowing the blast radius and refusing to let one slip reach it."}
      ] },
    { opener:"\u201CHow do you keep it hardened over time, not just at launch?\u201D",
      sub:"Continuous detection \u2014 Config for drift, Access Analyzer for reachability, GuardDuty for behavior \u2014 plus SCP guardrails no account can weaken.",
      beats:[
        {l:"FRAME",c:"frame",t:"Hardening rots \u2014 a role accretes permissions, someone toggles a setting &lsquo;temporarily.&rsquo; So the operational answer is <b>continuous detection</b> plus <b>guardrails that can&rsquo;t be weakened</b>, not a one-time setup."},
        {l:"DRIFT",c:"head",t:"<b>AWS Config</b> rules alarm the moment a bucket loses encryption, BPA drifts, or a policy goes public. Config watches the desired state of the controls and tells me when reality diverges."},
        {l:"REACHABILITY",c:"sub",t:"<b>IAM Access Analyzer</b> mathematically proves whether <i>any</i> principal outside my org can reach a bucket \u2014 far more reliable than reading policies by hand \u2014 and flags unused permissions so I tighten roles on evidence."},
        {l:"BEHAVIOR",c:"sub",t:"<b>GuardDuty</b> catches the anomaly a static check can&rsquo;t \u2014 a credential suddenly listing every object, an access pattern that doesn&rsquo;t fit \u2014 and <b>Security Hub</b> scores it all against a benchmark."},
        {l:"GUARDRAILS",c:"sub",t:"Underneath, <b>SCPs</b> at the org level deny weakening BPA or encryption \u2014 un-overridable, even by an account&rsquo;s root. Detection tells me when something&rsquo;s wrong; the SCP makes the worst things <i>impossible</i>."},
        {l:"AUDIT",c:"trade",t:"And <b>CloudTrail data events</b> on the sensitive prefixes so if anything does happen, I can scope it to exact objects. I target them at the high-blast-radius buckets to keep the cost proportional."},
        {l:"CLOSE",c:"close",t:"So: Config for drift, Access Analyzer for external reach, GuardDuty for behavior, SCPs for un-overridable floors, data events for forensics. Hardening as a running system, not a launch checklist."}
      ] },
    { opener:"\u201CTell me about a storage-hardening problem you've actually solved.\u201D",
      sub:"The ICS firmware store: signed packages for 50k+ terminals, presigned delivery to 30k+ FlexPay devices, per-tenant keys.",
      beats:[
        {l:"CONTEXT",c:"frame",t:"At Invenco we shipped OTA firmware to a fleet of <b>50,000+ payment terminals</b> \u2014 signed packages that landed in S3, then went to <b>30,000+ FlexPay devices</b>. That bucket was the crown jewels: every tenant&rsquo;s firmware, and the payment context around it."},
        {l:"THE STAKES",c:"head",t:"A public bucket or an over-broad role wouldn&rsquo;t have been a bug \u2014 it would have been the whole fleet&rsquo;s firmware, on a payment platform. So the hardening wasn&rsquo;t optional; it was the product."},
        {l:"WHAT I DID",c:"sub",t:"<b>Block Public Access</b> at the account, so no bucket could be public by construction. <b>Least-privilege roles</b> \u2014 the pipeline wrote to one prefix, the delivery service read one prefix, nothing had <code>s3:*</code>. <b>SSE-KMS</b> so at-rest was audited and per-tenant."},
        {l:"DELIVERY",c:"sub",t:"Devices got firmware by <b>presigned URL</b> in the IoT Job document \u2014 credential-free, single-object, short expiry \u2014 so 30,000 devices downloaded without ever holding an AWS credential, and a leaked URL exposed one file for minutes."},
        {l:"THE HARD PART",c:"sub",t:"The subtle bit was the <b>presigned-URL trade-off</b> \u2014 you can&rsquo;t revoke one early \u2014 so we bounded it with tight expiry and scope, and monitored delivery. And per-tenant keys meant a compromise was one tenant&rsquo;s blast radius, never the fleet."},
        {l:"RESULT",c:"trade",t:"The result was a store where <b>no single misconfiguration could breach the fleet</b> \u2014 public access impossible, credentials scoped, encryption audited, delivery credential-free, egress locked to the org. Defense in depth on a payment-grade artifact."},
        {l:"CLOSE",c:"close",t:"What I&rsquo;d carry forward: the discipline of asking, for every control, &lsquo;what failure does this bound?&rsquo; \u2014 because on a fleet that size, the blast radius of a slip is the whole point."}
      ] },
    { opener:"\u201CHow do you verify the hardening actually holds?\u201D",
      sub:"Prove it adversarially and continuously \u2014 external-reachability analysis, negative tests, and drift alarms gated in CI.",
      beats:[
        {l:"FRAME",c:"frame",t:"&lsquo;We configured it&rsquo; isn&rsquo;t proof \u2014 the bug shows only when you try to cross the boundary. So I test the hardening the way I&rsquo;d attack it, and I make the checks continuous."},
        {l:"REACHABILITY",c:"head",t:"<b>IAM Access Analyzer</b> is the first test: it proves whether any principal outside the account or org can reach a bucket. That&rsquo;s a mathematical guarantee, not a policy review \u2014 exactly what I want for &lsquo;is anything exposed.&rsquo;"},
        {l:"NEGATIVE TESTS",c:"sub",t:"Then <b>negative tests in CI</b>: attempt a plaintext (non-TLS) GET and assert it&rsquo;s denied, an unencrypted PUT and assert it&rsquo;s rejected, a public-ACL PUT and assert BPA blocks it. I test the exact failures I fear, mechanically."},
        {l:"DRIFT",c:"sub",t:"<b>Config rules</b> as continuous tests: encryption on, BPA on, no public policy \u2014 alarmed the moment they drift. The test doesn&rsquo;t run once; it runs forever."},
        {l:"PRESIGNED",c:"sub",t:"For delivery, I verify a presigned URL <b>expires when it should</b> and is <b>scoped to one object</b> \u2014 that a URL for object A can&rsquo;t fetch object B, and that it&rsquo;s dead after the window."},
        {l:"EXFIL",c:"trade",t:"And I test the <b>data perimeter</b>: from inside the VPC, attempt to write to a bucket outside the org and assert the endpoint policy denies it \u2014 the exfiltration path I designed against, actually exercised."},
        {l:"CLOSE",c:"close",t:"So: Access Analyzer for reachability, negative tests for each denied path, Config for drift, presigned-scope tests, and an exfil test \u2014 the hardening proven by trying to break it, not by trusting the config."}
      ] },
    { opener:"\u201CWhere does this design fall short?\u201D",
      sub:"The presigned-URL revocation gap, the KMS throughput ceiling, the audit-cost trade, and that hardening is a moving target.",
      beats:[
        {l:"FRAME",c:"frame",t:"Naming the limits is the senior move \u2014 here are the four I&rsquo;d watch, each with why it&rsquo;s a limit and what it costs to close."},
        {l:"REVOCATION",c:"head",t:"<b>Presigned URLs can&rsquo;t be revoked early.</b> A leaked URL works until it expires, full stop. I bound it with a short window and single-object scope, but true revocability needs CloudFront signed URLs \u2014 more moving parts for the ability to cut access mid-flight."},
        {l:"KMS CEILING",c:"sub",t:"<b>SSE-KMS has a per-key throughput ceiling.</b> At full-fleet fan-out, per-object KMS calls can throttle. S3 Bucket Keys mostly solve it, but it&rsquo;s a real ceiling you engineer around, not a free lunch."},
        {l:"AUDIT COST",c:"sub",t:"<b>CloudTrail data events cost money and volume.</b> Logging every object access everywhere is expensive, so I scope them to sensitive prefixes \u2014 which means a bucket I <i>didn&rsquo;t</i> flag has thinner forensics if it&rsquo;s ever involved."},
        {l:"MOVING TARGET",c:"sub",t:"<b>Hardening drifts.</b> A role accretes permissions, a new service reads the bucket raw, an AWS default changes. Config and Access Analyzer catch most of it, but &lsquo;secure today&rsquo; is not &lsquo;secure forever&rsquo; \u2014 it&rsquo;s a running commitment."},
        {l:"HONEST CLOSE",c:"trade",t:"None of these is a reason not to ship \u2014 they&rsquo;re the things I&rsquo;d monitor and the follow-ups I&rsquo;d sequence. Naming them is how I show I know where the design bends before it breaks."},
        {l:"CLOSE",c:"close",t:"So the limits are revocation, KMS throughput, audit cost, and drift \u2014 each bounded, each watched, none a surprise. That&rsquo;s the difference between &lsquo;hardened&rsquo; and &lsquo;hardened and I know its edges.&rsquo;"}
      ] }
  ]
};
