/* topics/notifications/rf.js -- topic 5 RED FLAGS. One lead + nine flags. Each flag is
   {bad, note, tell, fix}; only the last carries a note. Strings double-quoted; non-ASCII
   is HTML entities. Offline-safe, pure data. */
var TOPIC_NOTIF_RF = {
  lead: "The moves that quietly tank a notification-system round. Each is something a shakier candidate actually says, what the interviewer hears, and the line that flips it &mdash; and most of them trace back to treating &lsquo;send a message&rsquo; as the whole problem.",
  flags: [
    {
      bad: "&ldquo;When the event comes in, I just send the notification.&rdquo;",
      note: null,
      tell: "No idempotency &mdash; so <b>every retry double-sends</b>, and retries are guaranteed on an at-least-once queue. The interviewer hears <i>&ldquo;would spam users on every blip,&rdquo;</i> which is the fastest way to look like you haven&rsquo;t run one of these in production.",
      fix: "A <b>deterministic idempotency key</b> &mdash; <code>hash(user, event, channel)</code> &mdash; checked against a dedup store before every send. A retry computes the same id, collides, and sends nothing. At-least-once plus idempotency is effectively exactly-once; skipping the key is the classic miss."
    },
    {
      bad: "&ldquo;The API sends the email, then returns success to the caller.&rdquo;",
      note: null,
      tell: "Sending <b>synchronously in the request path</b> couples the producer&rsquo;s latency and availability to the email provider &mdash; a slow or down SES makes the caller slow or down. The interviewer hears <i>&ldquo;let a third party&rsquo;s outage take out my API.&rdquo;</i>",
      fix: "<b>Enqueue and return.</b> The producer fires an event and responds immediately; a worker delivers asynchronously with retries and a DLQ. Delivery latency and provider failures never block the caller &mdash; the request path owns &lsquo;accept the event,&rsquo; not &lsquo;wait for SES.&rsquo;"
    },
    {
      bad: "&ldquo;Each client polls the notifications table every couple of seconds for new items.&rdquo;",
      note: null,
      tell: "Aggressive polling against the main table is a <b>self-inflicted read storm</b> &mdash; every user, every couple seconds, mostly finding nothing, likely scanning if there&rsquo;s no partial index. The interviewer hears <i>&ldquo;would melt the database at scale.&rdquo;</i>",
      fix: "Poll a <b>partial index on unread</b> (a seek, not a scan) at a <b>sane interval</b> (~60s for a badge), and <b>cache the unread count</b> so most polls never hit Postgres. If you genuinely need seconds, that&rsquo;s <b>push</b> (WebSocket/SSE), not faster polling &mdash; fast polling <i>is</i> the wall."
    },
    {
      bad: "&ldquo;I send the batch of emails with <code>Promise.all</code>.&rdquo;",
      note: null,
      tell: "<code>Promise.all</code> <b>short-circuits on the first rejection</b> &mdash; one bad address and the batch &lsquo;fails,&rsquo; even though the other 49 already went out. Retrying the batch re-sends them. The interviewer hears <i>&ldquo;doesn&rsquo;t know how partial failure works.&rdquo;</i>",
      fix: "<code>Promise.allSettled</code> &mdash; it waits for every send and reports each independently, so one bad address doesn&rsquo;t fail the batch and you retry <b>only</b> the actual failure. The 49 that succeeded aren&rsquo;t touched, so you don&rsquo;t manufacture duplicates."
    },
    {
      bad: "&ldquo;If an address bounces, it bounces &mdash; we keep sending.&rdquo;",
      note: null,
      tell: "Continuing to send to <b>bounced addresses tanks your sender reputation</b>, and mailbox providers then filter <i>all</i> your mail &mdash; including to good addresses. The interviewer hears <i>&ldquo;would sink deliverability for everyone.&rdquo;</i>",
      fix: "Honor bounces and complaints into a <b>suppression list</b> &mdash; a hard bounce means never send to that address again. Authenticate with <b>SPF/DKIM/DMARC</b>, and split <b>transactional from promotional</b> so a marketing campaign&rsquo;s complaints can&rsquo;t bury password-reset email. Suppression protects every <i>other</i> recipient."
    },
    {
      bad: "&ldquo;We send the email and the in-app notification for every event.&rdquo;",
      note: null,
      tell: "Firing <b>every channel every time</b> is how notifications become spam &mdash; the user gets an email <i>and</i> a badge for the same thing, every time. The interviewer hears <i>&ldquo;built a for-loop over channels, not a considerate system.&rdquo;</i>",
      fix: "A <b>smart fallback</b>: in-app first, email only if the in-app goes unseen in a window, and <b>cancel the pending email</b> if they open the in-app. You reach the user once, on the channel that worked. It needs an OPENED event and a scheduled, cancelable send &mdash; that&rsquo;s the sophistication that reads as senior."
    },
    {
      bad: "&ldquo;If a send fails, we log it and move on.&rdquo;",
      note: null,
      tell: "&lsquo;Log and move on&rsquo; means a failed notification is <b>silently lost</b> &mdash; no retry, no recovery, no visibility. (The opposite mistake, retrying forever, blocks the queue.) The interviewer hears <i>&ldquo;drops transactional notifications on the floor.&rdquo;</i>",
      fix: "<b>Classify and DLQ.</b> Retryable failures (429, 5xx) get bounded backoff-with-jitter; non-retryable (400, bad address) and exhausted retries go to a <b>dead-letter queue</b> &mdash; out of the hot path, but visible, alarmed on depth, and recoverable. A failed send is parked, never silently gone."
    },
    {
      bad: "&ldquo;Everyone gets every notification &mdash; it&rsquo;s simpler.&rdquo;",
      note: null,
      tell: "No preferences means users can&rsquo;t mute anything, so a busy stream makes the whole system <b>noise they tune out</b> &mdash; and for some categories, sending without consent is a compliance problem. The interviewer hears <i>&ldquo;hasn&rsquo;t thought about the user or the regulator.&rdquo;</i>",
      fix: "<b>Preferences</b> across channel, category, frequency, and quiet hours &mdash; read on every fan-out (from a ~1ms cache) so a muted channel or opted-out category simply isn&rsquo;t delivered. Add <b>digests</b> for high-volume streams so 200 updates become one summary. The user controls the cadence; the system respects it."
    },
    {
      bad: "&ldquo;The event carries the list of users to notify.&rdquo;",
      note: "This one reads as reasonable &mdash; the event is self-contained &mdash; but it&rsquo;s the &lsquo;fine until it isn&rsquo;t&rsquo; choice: the list is a <b>snapshot</b>, so it goes stale the moment membership changes, and a new admin silently stops getting notified.",
      tell: "A stored recipient list <b>goes stale</b>: resolved once, it doesn&rsquo;t reflect a member added or removed after the event was created &mdash; so the wrong people get notified. The interviewer hears <i>&ldquo;froze a dynamic membership into a static list.&rdquo;</i>",
      fix: "Carry a <b>role or target</b>, not a list &mdash; &lsquo;the tenant&rsquo;s admins&rsquo; &mdash; and <b>resolve it at send time</b> against current membership, scoped to the tenant. A new admin gets the notification, a removed one doesn&rsquo;t, with no code change. The event names <i>who should know</i>; resolution figures out <i>who that is now</i>."
    }
  ]
};
