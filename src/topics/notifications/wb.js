/* topics/notifications/wb.js -- topic 5 whiteboard. steps:[{c,a}x9]; diagram = the .dgm
   inner (template literal, double-quotes literal inside); foot; sub + okVerdict carry
   the step-count copy as data. Rebuilds the delivery boundary from memory.
   Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_NOTIF_WB = {
  steps: [
    {c:'Entry &mdash; what hands work to the notification system, and how.', a:'A producer calls <code>notify(user, event)</code> &mdash; a <b>domain event</b>, not a channel. The producer knows nothing about email or in-app; the system owns delivery.'},
    {c:'Idempotency &mdash; why a retry doesn&rsquo;t double-notify.', a:'A <b>deterministic id</b> &mdash; <code>hash(user, event, channel)</code> &mdash; recorded with a conditional write. A retry computes the same id, collides, and sends nothing.'},
    {c:'Resolution &mdash; who actually gets it.', a:'The event names a <b>role</b>; resolution expands it against <b>current membership</b>, scoped to the tenant, into concrete users + their channel prefs. No stale list.'},
    {c:'Fan-out &mdash; one event to N channels.', a:'Read each recipient&rsquo;s <b>preferences</b>; fan the single event to their enabled channels &mdash; in-app, email, or both. The producer emitted once; here it becomes deliveries.'},
    {c:'In-app &mdash; the cheap default channel.', a:'An <b>INSERT of one row per recipient</b> (~100 bytes), with a <b>partial index on unread</b>. The badge is a seek; the client polls it every ~60s.'},
    {c:'Email &mdash; reach and backup.', a:'<b>SES</b>, batched with <code>allSettled</code> (one bad address doesn&rsquo;t fail the batch), under the <b>tenant&rsquo;s sender</b>, throttled so a burst doesn&rsquo;t spam.'},
    {c:'Failure &mdash; what a failed send does.', a:'<b>Classify</b>: retryable &rarr; backoff + jitter; non-retryable &rarr; DLQ. Per-channel policy. Every retry rides the same idempotency key, so it can&rsquo;t double-send.'},
    {c:'Fallback &mdash; not firing every channel every time.', a:'In-app first; if <b>unseen</b> in a window, cascade to email; if <b>opened</b> in time, <b>cancel the pending email</b>. Reach the user once, on the channel that worked. (The one people do backwards.)'},
    {c:'Tracking &mdash; how the fallback and metrics know.', a:'A lifecycle stream &mdash; <b>SENT, DELIVERED, OPENED, BOUNCED</b>. OPENED drives the fallback; BOUNCED drives suppression. Ground truth for both control loops and analytics.'}
  ],
  diagram: `
          <div class="dgm-node"><div class="dgm-t">producer</div><div class="dgm-s">emits notify(user, event) -- a domain event, no channels</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">idempotency key = hash(user, event, channel) &middot; SET NX</span></div>
          <div class="dgm-node"><div class="dgm-t">dedup + resolve</div><div class="dgm-s">already sent? ack &middot; else resolve role &rarr; recipients (tenant-scoped)</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">read preferences &rarr; fan out per recipient</span></div>
          <div class="dgm-node dgm-fork"><div class="dgm-t">fan-out</div><div class="dgm-branches"><span class="dgm-br">&rarr; in-app (Postgres row)</span><span class="dgm-br">&rarr; email (SES)</span></div><div class="dgm-s">one event &rarr; the channels this recipient enabled</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">in-app: INSERT row/recipient &middot; partial index on unread</span></div>
          <div class="dgm-node"><div class="dgm-t">in-app store</div><div class="dgm-s">~100 bytes/row &middot; client polls unread every ~60s (or push)</div></div>
          <div class="dgm-note">&mdash;&mdash;&mdash; fallback: in-app first &middot; unseen in window &rarr; email &middot; opened &rarr; cancel email &mdash;&mdash;&mdash;</div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">email: batch (allSettled) &middot; per-tenant sender &middot; throttle</span></div>
          <div class="dgm-node dgm-recon"><div class="dgm-t">delivery + tracking</div><div class="dgm-s">SENT &rarr; DELIVERED &rarr; OPENED / BOUNCED &middot; retry (backoff+jitter) or DLQ</div></div>
          <div class="dgm-foot">emit once &middot; deliver effectively-once (idempotent) &middot; reach the user on the channel that worked</div>
        `,
  foot: "<b>The one people forget:</b> step 8. A good system <i>doesn&rsquo;t</i> fire every channel every time &mdash; it sends the cheap in-app first and escalates to email only if unseen, canceling the pending email if the user opens the in-app. If you send both at once, the interviewer knows you&rsquo;ve built a for-loop over channels, not a considerate notification system.",
  sub: "For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run the delivery boundary on a whiteboard.",
  okVerdict: "<b>All nine cold.</b> You can rebuild the delivery path on a whiteboard from memory \u2014 the notification-system round is yours to lose, not to pass."
};
