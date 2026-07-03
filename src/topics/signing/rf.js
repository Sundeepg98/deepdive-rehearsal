/* topics/signing/rf.js -- topic 2 RED FLAGS. One lead + nine flags. Each flag is
   {bad, note, tell, fix}; only the last carries a note. Strings double-quoted (no
   apostrophe escaping); non-ASCII is HTML entities. Offline-safe, pure data. */
var TOPIC_SIGN_RF = {
  lead: "The moves that quietly tank a candidate on signing. Crypto is where a weak answer gets caught fastest &mdash; each of these is something a shakier candidate actually says, what the interviewer hears, and the line that flips it.",
  flags: [
    {
      bad: "&ldquo;I&rsquo;d sign the whole package file.&rdquo;",
      note: null,
      tell: "You sign a <b>32-byte digest</b>, not a 40&nbsp;MB blob. Signing the whole file reads it needlessly and adds <b>zero</b> security over signing its hash &mdash; it just says you don&rsquo;t know how signing works.",
      fix: "Hash the package (SHA&#8209;256), sign the <b>digest</b>, stamp the signature into the header. Verification hashes the bytes and checks the signature over that hash."
    },
    {
      bad: "&ldquo;The signing key lives in the app config / on the build server.&rdquo;",
      note: null,
      tell: "A key on disk means <b>one server compromise forges the entire fleet&rsquo;s firmware</b>. The interviewer hears <i>&ldquo;hasn&rsquo;t thought about where the key actually lives.&rdquo;</i>",
      fix: "Private key in an <b>HSM / KMS</b>, non-exportable. The service sends a hash and gets back a signature &mdash; the key never leaves, so a compromised signer forges only for a bounded window, never the key itself."
    },
    {
      bad: "&ldquo;The device just runs whatever package it&rsquo;s sent.&rdquo;",
      note: null,
      tell: "Then there&rsquo;s <b>no trust boundary at all</b> &mdash; anyone who can reach a device can push backdoored firmware and brick or own the fleet. The signature is pointless if nothing checks it.",
      fix: "The device <b>verifies the signature before it flashes</b>, against a burned-in public key, and <b>rejects unsigned or invalid</b> packages. Verification on the device is the entire point of signing."
    },
    {
      bad: "&ldquo;I&rsquo;ll design my own signing scheme / padding.&rdquo;",
      note: null,
      tell: "<b>Rolling your own crypto</b> is the fastest no-hire in the room. The interviewer hears <i>&ldquo;will ship a subtle, catastrophic bug&rdquo;</i> &mdash; padding oracles, weak nonces, the classics.",
      fix: "Standard primitives through a <b>vetted library</b> &mdash; RSA-PSS or ECDSA, a known padding scheme. You choose the algorithm to match the verifier; you never hand-roll the math."
    },
    {
      bad: "&ldquo;One key signs everything &mdash; simpler.&rdquo;",
      note: null,
      tell: "A single global key means <b>one leak blasts the whole fleet</b>, and rotation forces re-signing <i>everything</i> at once. Simpler today, unrecoverable the day it leaks.",
      fix: "Keys <b>per tenant, per product type</b> (the four-table model), so a leak is bounded to one company&rsquo;s one product line and rotation is scoped to that key."
    },
    {
      bad: "&ldquo;We don&rsquo;t need rotation &mdash; the key&rsquo;s secret.&rdquo;",
      note: null,
      tell: "&ldquo;Secret&rdquo; is a plan for the happy path. With no rotation story, the day a key leaks you have <b>no move</b> &mdash; the interviewer hears <i>&ldquo;no plan for the worst case.&rdquo;</i>",
      fix: "Rotation designed in from day one: provision a new key, sign new packages with it, revoke the old &mdash; the device&rsquo;s <b>trust anchor</b> bounds what a leaked key can forge before you cut over."
    },
    {
      bad: "&ldquo;An old version is still validly signed, so it&rsquo;s fine to accept it.&rdquo;",
      note: null,
      tell: "That&rsquo;s a <b>downgrade / replay</b> attack &mdash; an attacker re-pushes an <i>old, vulnerable</i> package that still passes the signature check. A signature proves <b>authenticity, not freshness</b>.",
      fix: "A <b>monotonic version</b> the device enforces &mdash; it refuses any package whose version is below what it&rsquo;s running &mdash; carried inside the signed header so the version itself can&rsquo;t be tampered with."
    },
    {
      bad: "&ldquo;I flash it, then verify the signature.&rdquo;",
      note: null,
      tell: "Verify-<i>after</i>-flash is <b>verify-never</b> &mdash; you&rsquo;ve already written and possibly booted untrusted code. The check has to gate the write, not follow it.",
      fix: "Verify <b>before</b> flashing, SHA&#8209;256 the image before writing, and use <b>A/B partitions</b> with a test-boot-and-confirm so even a signed-but-broken image rolls back."
    },
    {
      bad: "&ldquo;&hellip;so I&rsquo;d use RSA and an HSM and a header field and&mdash;&rdquo;",
      note: "(straight into mechanism)",
      tell: "No threat model stated, no trust boundary drawn &mdash; the interviewer can&rsquo;t <b>see you reason about security</b>, only that you&rsquo;ve memorized primitives.",
      fix: "<b>Name the threat first</b> (tamper, forgery, replay), draw the <b>boundary</b> (signer holds the private key, device holds the public key), <i>then</i> pick primitives. Reasoning about the attacker beats reciting algorithms."
    }
  ]
};
