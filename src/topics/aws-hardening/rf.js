/* topics/aws-hardening/rf.js -- topic 4 RED FLAGS. One lead + nine flags. Each flag is
   {bad, note, tell, fix}; only the last carries a note. Strings double-quoted (no
   apostrophe escaping); non-ASCII is HTML entities. Offline-safe, pure data. */
var TOPIC_AWSHARD_RF = {
  lead: "The moves that quietly tank a candidate on storage hardening. This is a security round, so a weak answer gets caught fast &mdash; each of these is something a shakier candidate actually says, what the interviewer hears, and the line that flips it.",
  flags: [
    {
      bad: "&ldquo;I&rsquo;d make the bucket public so the devices can just download the firmware.&rdquo;",
      note: null,
      tell: "The <b>single worst thing you can say in a security round</b> &mdash; a public firmware bucket is the whole fleet&rsquo;s code on the open internet, and it&rsquo;s exactly how every S3 breach headline happened. The interviewer hears <i>&ldquo;would ship the incident.&rdquo;</i>",
      fix: "The bucket is <b>private, always</b> &mdash; Block Public Access, all four settings. Devices download by <b>presigned URL</b>: a credential-free, single-object, expiring link the service mints. Never public; always scoped and temporary."
    },
    {
      bad: "&ldquo;The service role has s3:* &mdash; simpler than listing actions.&rdquo;",
      note: null,
      tell: "<code>s3:*</code> is the blast radius of a stolen credential set to <b>maximum</b> &mdash; read every tenant&rsquo;s firmware <i>and</i> replace it with malware. The interviewer hears <i>&ldquo;doesn&rsquo;t think about what the credential can do when it leaks.&rdquo;</i>",
      fix: "<b>Least privilege</b>: exactly the actions needed on exactly one prefix &mdash; <code>s3:GetObject</code> on <code>fw-prod/signed/*</code>, nothing more. The policy <i>is</i> the blast radius, so I scope the action <i>and</i> the resource, and generate it from observed access."
    },
    {
      bad: "&ldquo;I set the presigned URLs to expire in seven days so they don&rsquo;t break.&rdquo;",
      note: null,
      tell: "A seven-day presigned URL is a <b>week-long bearer token you can&rsquo;t revoke</b> &mdash; leak it once and it&rsquo;s an open download for a week. The interviewer hears <i>&ldquo;optimized for convenience over blast radius.&rdquo;</i>",
      fix: "Expiry as <b>short as the download needs</b> &mdash; minutes, not days &mdash; and single-object. A presigned URL can&rsquo;t be revoked early, so the defense is a small window; if I genuinely need long-lived, revocable access, that&rsquo;s CloudFront signed URLs, not a week-long S3 link."
    },
    {
      bad: "&ldquo;S3 encrypts everything by default, so encryption&rsquo;s handled.&rdquo;",
      note: null,
      tell: "Default <b>SSE-S3</b> gives you at-rest bytes, but &lsquo;handled&rsquo; skips the parts that matter for firmware &mdash; no audit trail, no key-level access control, no crypto-shred, and nothing stopping an <i>unencrypted</i> PUT. The interviewer hears <i>&ldquo;checked a box, didn&rsquo;t think about the threat model.&rdquo;</i>",
      fix: "<b>SSE-KMS</b> with a per-tenant key &mdash; for the audit trail, the key-policy second gate, and crypto-shredding &mdash; plus a bucket policy that <b>denies any PUT that isn&rsquo;t KMS-encrypted</b>, so &lsquo;encrypted&rsquo; is enforced, not assumed."
    },
    {
      bad: "&ldquo;We always use the HTTPS endpoint, so traffic&rsquo;s encrypted.&rdquo;",
      note: null,
      tell: "&lsquo;We always&rsquo; is a <b>convention, not a control</b> &mdash; S3 still <i>accepts</i> plaintext HTTP, so one misconfigured client sends firmware in the clear. The interviewer hears <i>&ldquo;confuses &lsquo;we&rsquo;re careful&rsquo; with &lsquo;it&rsquo;s impossible.&rsquo;&rdquo;</i>",
      fix: "A bucket policy that <b>denies <code>aws:SecureTransport</code> false</b> &mdash; one <code>Deny</code> statement that makes non-TLS access <i>impossible</i>, not just discouraged. It&rsquo;s the cheapest control here and the first thing an auditor checks."
    },
    {
      bad: "&ldquo;The AWS keys live in the app config / an environment variable.&rdquo;",
      note: null,
      tell: "A long-lived access key in config is a <b>static secret waiting to leak</b> &mdash; into a git history, a log, a compromised image &mdash; and it&rsquo;s valid until someone notices and rotates it. The interviewer hears <i>&ldquo;still managing static credentials in 2026.&rdquo;</i>",
      fix: "<b>No static keys.</b> The service assumes an <b>IAM role</b> &mdash; a task role, or IRSA on EKS &mdash; and gets short-lived, auto-rotated credentials from the metadata endpoint, with nothing to steal. Secrets Manager, with rotation, only for what genuinely can&rsquo;t be a role."
    },
    {
      bad: "&ldquo;CloudTrail&rsquo;s on, so we can see who read every object.&rdquo;",
      note: null,
      tell: "CloudTrail&rsquo;s default <b>management events don&rsquo;t log object reads</b> &mdash; only control-plane actions like changing a policy. <b>Data events are off by default</b>, so &lsquo;we can see who read every object&rsquo; is simply false. The interviewer hears <i>&ldquo;assumes an audit trail that isn&rsquo;t there.&rdquo;</i>",
      fix: "Explicitly enable <b>CloudTrail data events</b> for the sensitive buckets &mdash; that&rsquo;s what logs <code>GetObject</code>-level access. Management events tell you the bucket was misconfigured; data events tell you <i>which objects were actually read</i>, which is what scopes a breach."
    },
    {
      bad: "&ldquo;Admins use the root account for infrastructure changes.&rdquo;",
      note: null,
      tell: "Every use of <b>root</b> is a use of a credential with <b>irrevocable, un-restrainable powers</b> &mdash; and the more it&rsquo;s used, the more chances to leak it. The interviewer hears <i>&ldquo;doesn&rsquo;t understand why root is special.&rdquo;</i>",
      fix: "Root is <b>locked away</b>: MFA on, access keys removed, used for essentially nothing. All human and service work goes through <b>IAM roles / Identity Center</b>. You can&rsquo;t policy root safe &mdash; its powers can&rsquo;t be fully constrained &mdash; so the control is disuse plus MFA."
    },
    {
      bad: "&ldquo;It&rsquo;s all one AWS account &mdash; simpler to manage.&rdquo;",
      note: "This is the one that reads as &lsquo;fine until it isn&rsquo;t&rsquo; &mdash; one account means one blast radius and no un-overridable floor, so a single over-broad grant or a single mistake has nothing above it to catch it.",
      tell: "One account means <b>no org-wide guardrail and no blast-radius isolation</b> &mdash; nothing stops an account admin from disabling BPA or encryption, and a compromise in dev reaches prod. The interviewer hears <i>&ldquo;hasn&rsquo;t thought past a single environment.&rdquo;</i>",
      fix: "<b>Multi-account with SCPs</b>: prod, dev, and sensitive workloads in separate accounts for blast-radius isolation, and <b>Service Control Policies</b> that deny weakening BPA or encryption &mdash; un-overridable, even by an account&rsquo;s root. The org is the ceiling individual accounts can&rsquo;t punch through."
    }
  ]
};
