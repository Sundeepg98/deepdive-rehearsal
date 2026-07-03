/* topics/notifications/sys.js -- topic 5 system-map data. intro = the .sm-intro copy;
   stages = the whole-system chain with NOTIFICATIONS as cur:true; pivots = the 7
   interviewer bridge points OUT of the delivery boundary (to authz, desired-state, the
   pipeline, EAV, hardening, push, deliverability); heads = the card headings + pivot
   subhead. Chips use \u2192 and reference the 8 topics by index. Pure data; 7-bit ASCII. */
var TOPIC_NOTIF_SYS = {
  intro: "Notifications are the <b>delivery boundary</b>. The systems around it <b>produce events</b>; notifications <b>fan them out</b> to the channels a user watches, once; the user <b>sees</b> one. Knowing what sits on either side &mdash; and being able to walk the whole chain from an emitted event to a seen notification &mdash; is what turns a &lsquo;send an email&rsquo; answer into a systems answer.",
  stages: [
    { n: 'Event producers', d: 'services emit domain events (order shipped, rollout done)' },
    { n: 'Notification fan-out', d: 'dedupe &middot; resolve recipients &middot; route on preferences', cur: true },
    { n: 'In-app + email channels', d: 'Postgres row (polled) + SES (batched, per-tenant sender)' },
    { n: 'Delivery + fallback', d: 'in-app first &rarr; email if unseen &middot; retry / DLQ' },
    { n: 'Delivery tracking', d: 'SENT / DELIVERED / OPENED / BOUNCED lifecycle' },
    { n: 'The user', d: 'sees one notification, on the channel that worked' }
  ],
  pivots: [
    { q: "Who can this notification address &mdash; how do I keep one tenant&rsquo;s notifications off another&rsquo;s users?", chip: "\u2192 Tenant authorization (3)",
      a: "Recipient resolution is <b>tenant-scoped</b> &mdash; the same per-tenant boundary the authorization layer enforces on data. &lsquo;Notify the admins of tenant T&rsquo; can only resolve to users <i>within</i> T, and a bug that resolved cross-tenant would be the same class of leak as a missing authorization filter. The email also goes out under the <b>tenant&rsquo;s own verified sender</b>, so one tenant can never address or impersonate another&rsquo;s users. Notifications <b>inherit</b> the tenant boundary; they don&rsquo;t re-invent it." },
    { q: "A firmware rollout finishing &mdash; or drifting &mdash; is one of the events I notify on. Where does that event come from?", chip: "\u2192 Desired-state (7)",
      a: "From the <b>reconciler</b>. When the desired-state loop detects that a device reached its target (or drifted from it), that&rsquo;s a domain event &mdash; &lsquo;fleet reconciled,&rsquo; &lsquo;drift detected&rsquo; &mdash; and it flows to the notification system exactly like any producer&rsquo;s event: <code>notify(operator, event)</code>. The reconciler owns <i>deciding</i> the state changed; notifications own <i>telling the right people</i>, once, on the right channel. Clean boundary: the producer detects, the notifier delivers." },
    { q: "The pipeline finishing an upload could notify the user. How does that hook in?", chip: "\u2192 Content pipeline (1)",
      a: "The same way: the pipeline, on completion (or failure), <b>emits an event</b> &mdash; &lsquo;your upload is processed,&rsquo; &lsquo;processing failed&rsquo; &mdash; and hands it to the notification boundary. It doesn&rsquo;t call SES or write an in-app row itself; it stays <b>channel-ignorant</b> and emits a domain event. That&rsquo;s the whole point of the fan-out boundary: <i>any</i> producer &mdash; pipeline, rollout, billing &mdash; notifies the same way, and the notification system decides channels, preferences, and fallback." },
    { q: "Where do per-user notification preferences live &mdash; isn&rsquo;t that just another per-entity attribute store?", chip: "\u2192 EAV (6)",
      a: "It rhymes with it. Preferences are <b>per-user attributes</b> with <b>defaults and overrides</b> &mdash; a global default, overridden per category and per channel &mdash; which is exactly the <code>COALESCE(override, default)</code> resolution the EAV topic uses for device attributes. The difference is the read pattern: preferences are read on <i>every</i> fan-out, so they live behind a <b>~1ms cache</b>, whereas a general attribute store optimizes for flexibility. Same override/default modeling, tuned for a hot read path." },
    { q: "The SES sender, the topics, the dedup store &mdash; how is that infrastructure locked down?", chip: "\u2192 AWS hardening (4)",
      a: "With the same posture as any AWS layer: the notification service holds a <b>least-privilege role</b> (send as <i>this</i> tenant&rsquo;s verified sender, publish to <i>these</i> topics, nothing broad), the <b>per-tenant sender identities</b> are verified (SPF/DKIM/DMARC) so mail is authenticated and reputations isolated, and the dedup store and queues are private and encrypted. A compromised notification credential should send bounded, authenticated mail &mdash; not spam the world as anyone. That lockdown is the AWS-hardening topic." },
    { q: "I need sub-second in-app delivery, not 60-second polling. How does push actually work?", chip: "\u2192 Push channel (WebSocket / APNs / FCM)",
      a: "You move from <b>pull to push</b>. For web/in-app, a <b>WebSocket or SSE</b> connection the server writes to the moment a notification is delivered &mdash; you track per-user connection state with heartbeats, and you <b>persist first, push second</b> so an offline user still finds it in the unread index on reconnect. For mobile, <b>APNs/FCM</b> with device tokens (cleaned up on 410/NotRegistered) and tiny payloads (a summary + deep link). Push is the accelerator on top of the durable store, never the source of truth." },
    { q: "How do I know delivery is actually healthy &mdash; that mail isn&rsquo;t silently going to spam?", chip: "\u2192 Observability / deliverability",
      a: "From the <b>delivery lifecycle</b> and provider feedback. You track SENT/DELIVERED/OPENED/BOUNCED per notification and watch the aggregates: a rising <b>bounce or complaint rate</b> is the early signal of a reputation problem, a falling <b>open rate</b> hints at spam-foldering. You honor bounces into a <b>suppression list</b>, authenticate with SPF/DKIM/DMARC, and split transactional from promotional so one can&rsquo;t sink the other. Deliverability isn&rsquo;t &lsquo;did SES accept it&rsquo; &mdash; it&rsquo;s &lsquo;did it reach the inbox,&rsquo; which only the feedback loop tells you." }
  ],
  heads: {
    whereHead: "Where the delivery boundary sits",
    pivHead: "Interviewer pivot points",
    pivSub: "The questions that bridge out of the notification system. Each one leads into another deep-dive &mdash; tap to see the connecting answer."
  }
};
