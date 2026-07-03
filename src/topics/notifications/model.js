/* topics/notifications/model.js -- topic 5 model-answer data. selectors[] scenario
   buttons; answers[] spoken scripts, each {opener, sub, beats:[{l,c,t}]} where c is the
   beat class (frame/head/sub/risk/trade/close). answers[6] is the Invenco "one you
   built" story; 'Name the limits' is LAST. Openers/beats use \uXXXX. 7-bit ASCII. */
var TOPIC_NOTIF_MODEL = {
  selectors: ['Design it', 'Guarantee delivery', 'Walk a double-send', 'In-app at scale', 'Defend the design', 'Operate it', 'One you built', 'Test it', 'Name the limits'],
  answers: [
    { opener:"\u201CDesign a multi-channel notification system.\u201D",
      sub:"A fan-out boundary: producers emit events, the system delivers once on the right channel, with a fallback when a channel is missed.",
      beats:[
        {l:"FRAME",c:"frame",t:"I&rsquo;d frame it as a <b>fan-out boundary</b>: producers emit a domain event &mdash; notify this user of this thing &mdash; and the notification system owns everything after: channels, preferences, delivery-once, fallback. Producers stay channel-ignorant. Let me build it up."},
        {l:"HEADLINE",c:"head",t:"The first thing, before any channel, is <b>idempotency</b> &mdash; a deterministic id, hash of user, event, channel, checked before every send. Delivery is at-least-once and retries happen, so that key is what stops a double-notify. It&rsquo;s not optional."},
        {l:"RESOLVE + FAN OUT",c:"sub",t:"Then I <b>resolve recipients</b> &mdash; usually a role, resolved against current membership, tenant-scoped &mdash; and <b>fan out</b> the event to each recipient&rsquo;s enabled channels, reading their preferences. One event becomes the deliveries the user actually wants."},
        {l:"IN-APP",c:"sub",t:"In-app is the <b>cheap default</b>: a row per recipient in Postgres, ~100 bytes, with a partial index on unread so the badge is a seek. The client polls that index every minute &mdash; plenty for a badge."},
        {l:"EMAIL + FALLBACK",c:"sub",t:"Email is <b>reach and backup</b>: SES, batched with allSettled, per-tenant sender, throttled. And it&rsquo;s the fallback &mdash; in-app first, email only if unseen in a window, cancel the pending email if they open the in-app. Reach the user once."},
        {l:"NAME THE RISK",c:"risk",t:"The risk I&rsquo;d name is the <b>double-send</b> &mdash; which is why idempotency is first, not an afterthought &mdash; and the <b>spammy multi-channel</b>, which the smart fallback solves. The channels are easy; those two are the hard part."},
        {l:"CLOSE",c:"close",t:"So: emit at a boundary, dedupe on a content key, resolve and fan out on preferences, in-app as the polled default, email as reach-and-fallback, retries with per-channel policy and a DLQ. A user gets each notification once, on the channel that worked."}
      ] },
    { opener:"\u201CWhat delivery guarantee do you provide, and how?\u201D",
      sub:"At-least-once delivery plus idempotent processing equals effectively exactly-once &mdash; the achievable target, not exactly-once delivery.",
      beats:[
        {l:"FRAME",c:"frame",t:"The honest guarantee is <b>at-least-once delivery plus idempotent processing</b>, which together give effectively exactly-once. I want to be precise, because the common wrong answer is &lsquo;exactly-once,&rsquo; and that&rsquo;s a distributed-systems unicorn."},
        {l:"WHY NOT EXACTLY-ONCE",c:"head",t:"Exactly-once <i>delivery</i> across a network is impossible: you can&rsquo;t distinguish &lsquo;the send succeeded but the ack was lost&rsquo; from &lsquo;the send failed,&rsquo; so any system that guarantees no loss <i>must</i> risk a duplicate. So I aim for exactly-once <b>effect</b>, not delivery."},
        {l:"AT-LEAST-ONCE",c:"sub",t:"At-least-once is the <b>don&rsquo;t-lose half</b>: retry until the send is acknowledged, commit the offset only after a successful send, DLQ what exhausts retries. Nothing is silently dropped."},
        {l:"IDEMPOTENT",c:"sub",t:"Idempotency is the <b>don&rsquo;t-duplicate half</b>: a content-derived id &mdash; hash of user, event, channel &mdash; recorded with a conditional write, so a retry of the same notification collides and sends nothing. The duplicate at-least-once <i>will</i> produce never reaches the user."},
        {l:"THE PAIR",c:"sub",t:"Neither alone is enough. At-least-once without idempotency double-sends; idempotency without at-least-once can lose. Together they give the user the experience of exactly-once."},
        {l:"NAME THE RISK",c:"risk",t:"The subtle failure is a <b>random idempotency id</b> &mdash; it doesn&rsquo;t collide on the retry, so you think you&rsquo;re deduping but you&rsquo;re not. The id must be a deterministic function of the notification&rsquo;s identity."},
        {l:"CLOSE",c:"close",t:"So: at-least-once so nothing&rsquo;s lost, idempotent on a content key so nothing&rsquo;s doubled, and I&rsquo;d call that effectively exactly-once &mdash; and never claim exactly-once delivery, because that&rsquo;s the tell you haven&rsquo;t thought about lost acks."}
      ] },
    { opener:"\u201CUsers report getting the same notification twice. Walk the debugging.\u201D",
      sub:"Trace it to the idempotency key &mdash; missing on a path, random instead of deterministic, or a batch retried whole.",
      beats:[
        {l:"FRAME",c:"frame",t:"A double-send is almost always the <b>idempotency key failing</b>, in one of three ways. I&rsquo;d figure out which from the logs before touching anything, because each has a different fix."},
        {l:"SUSPECT ONE",c:"head",t:"One: the key <b>isn&rsquo;t applied on that send path</b> &mdash; a new channel, or code that calls the provider directly, bypassing the dedup check. The fix is routing <i>every</i> send through the same check: make the dedup unavoidable, not remembered per call site."},
        {l:"SUSPECT TWO",c:"sub",t:"Two: the key is <b>random, not content-derived</b>. It looks like idempotency, but the retry generates a new id, so nothing collides. The fix is a deterministic id &mdash; hash of user, event, channel &mdash; so the retry of the same notification computes the same id."},
        {l:"SUSPECT THREE",c:"sub",t:"Three: a <b>batch retried whole</b>. Promise.all short-circuited on one failure and the handler re-sent the batch, duplicating the members that already went out. The fix is allSettled, retrying only the actual failure."},
        {l:"DIAGNOSE",c:"sub",t:"The logs tell me which: the same id sent twice means the check isn&rsquo;t running on that path; two <i>different</i> ids for one logical notification means the id isn&rsquo;t deterministic; a batch pattern means the all-vs-allSettled bug."},
        {l:"NAME THE RISK",c:"risk",t:"The fix I&rsquo;d resist is &lsquo;add a check to that one endpoint&rsquo; &mdash; that&rsquo;s whack-a-mole. Idempotency has to be <b>structural</b>: one dedup gate every send goes through, so a new path can&rsquo;t forget it."},
        {l:"CLOSE",c:"close",t:"So: classify from the logs &mdash; missing check, random id, or batch retry &mdash; fix the specific cause, then make the check structural so the class can&rsquo;t recur. The double-send is the fastest way to look broken, so it&rsquo;s worth closing at the class level."}
      ] },
    { opener:"\u201CThe notifications table has a hundred million rows. The unread badge is slow. Fix it.\u201D",
      sub:"A partial index on unread keeps the badge a seek; cache the count if read volume, not query speed, is the wall.",
      beats:[
        {l:"FRAME",c:"frame",t:"Two different problems hide in &lsquo;the badge is slow,&rsquo; and I&rsquo;d separate them: is the <b>query</b> slow, or is the <b>read volume</b> too high? Different fixes."},
        {l:"QUERY",c:"head",t:"If the query is slow, the culprit is a <b>scan</b>. The fix is a <b>partial index on <code>read_at IS NULL</code></b> &mdash; it indexes only unread rows, so it stays tiny even with a hundred million <i>read</i> rows in the table. The unread count becomes a seek into a small index."},
        {l:"WHY PARTIAL",c:"sub",t:"A partial index over a full one matters because read history grows unbounded &mdash; you accumulate read rows forever &mdash; but the <b>working set (unread) stays small per user</b>. Indexing only the working set keeps the hot query cheap permanently."},
        {l:"VOLUME",c:"sub",t:"If instead the <i>volume</i> is the problem &mdash; the badge runs on every page load for every user &mdash; I <b>cache the count</b> in Redis, invalidated on new-notification and on mark-read. Most page loads never touch Postgres."},
        {l:"ARCHIVE",c:"sub",t:"And I&rsquo;d <b>age out old read notifications</b> &mdash; TTL or archive to cold storage &mdash; so the hot table doesn&rsquo;t grow without bound. Old notifications are rarely read; they don&rsquo;t belong in the hot path."},
        {l:"TRADE",c:"trade",t:"The cache trades a little staleness for a lot of read relief &mdash; a badge count a few seconds stale is fine, unlike a balance. So a short TTL plus event invalidation is the right consistency for this data."},
        {l:"CLOSE",c:"close",t:"So: partial unread index for query speed, cached count for read volume, archive old rows for table size. Three levers for three versions of &lsquo;slow,&rsquo; and I&rsquo;d confirm which one it actually is first."}
      ] },
    { opener:"\u201CWhy the fan-out boundary and idempotency &mdash; isn&rsquo;t that over-engineered for &lsquo;send an email&rsquo;?\u201D",
      sub:"Because without the boundary channel logic scatters, and without idempotency every retry double-notifies &mdash; both cheap now, expensive to retrofit.",
      beats:[
        {l:"FRAME",c:"frame",t:"&lsquo;Send an email&rsquo; is the demo; the system is what happens when there are ten producers, three channels, retries, and preferences. The two things I&rsquo;d defend hardest &mdash; the boundary and idempotency &mdash; are cheap now and painful to retrofit."},
        {l:"WHY THE BOUNDARY",c:"head",t:"Without the <b>fan-out boundary</b>, channel logic scatters: every producer reimplements preferences, retry, throttling, fallback, inconsistently. Adding a channel touches all of them. The boundary makes &lsquo;add SMS&rsquo; one change and keeps producers ignorant &mdash; that&rsquo;s not over-engineering, it&rsquo;s what lets the system grow."},
        {l:"WHY IDEMPOTENCY",c:"sub",t:"Without <b>idempotency</b>, every retry double-notifies &mdash; and retries are guaranteed, because delivery is at-least-once. A content-derived key and a dedup store is a few lines, and it&rsquo;s the difference between &lsquo;reliable&rsquo; and &lsquo;spams users on every blip.&rsquo;"},
        {l:"WHY FALLBACK",c:"sub",t:"The <b>smart fallback</b> looks optional until you&rsquo;ve annoyed users by firing email and in-app for the same event. In-app first, email if unseen, cancel on open &mdash; that&rsquo;s the difference between considerate and spammy, and users notice."},
        {l:"WHAT I&rsquo;D CUT",c:"sub",t:"What I <i>would</i> cut to ship faster: digests, push, per-category preferences, a dedicated store &mdash; all addable later without a rewrite because the boundary is there. I&rsquo;d never cut the boundary or idempotency, because those <i>are</i> the rewrite if you skip them."},
        {l:"TRADE",c:"trade",t:"So the cost is a bit more upfront structure; the payoff is a system that adds channels additively and never double-sends. A notification MVP that spams users isn&rsquo;t an MVP, it&rsquo;s an incident."},
        {l:"CLOSE",c:"close",t:"The defense: every piece maps to a failure it prevents &mdash; scattered channel logic, double-sends, spammy multi-channel &mdash; and the two non-negotiables are the cheapest to add now and the most expensive to add later."}
      ] },
    { opener:"\u201CIt&rsquo;s live. How do you keep notifications actually reaching people?\u201D",
      sub:"Watch the delivery lifecycle and provider feedback &mdash; bounces, opens, DLQ depth &mdash; and protect sender reputation.",
      beats:[
        {l:"FRAME",c:"frame",t:"&lsquo;Sent&rsquo; isn&rsquo;t &lsquo;delivered,&rsquo; and &lsquo;delivered&rsquo; isn&rsquo;t &lsquo;seen.&rsquo; Operating a notification system is watching the <b>whole lifecycle</b> and the provider feedback, because the failures are mostly silent."},
        {l:"LIFECYCLE",c:"head",t:"I track <b>SENT, DELIVERED, OPENED, BOUNCED</b> per notification as an event stream. A rising <b>bounce or complaint rate</b> is the earliest signal of a reputation problem; a falling <b>open rate</b> hints at spam-foldering. These aren&rsquo;t vanity metrics &mdash; they&rsquo;re the smoke alarm."},
        {l:"REPUTATION",c:"sub",t:"Deliverability is <b>sender reputation</b>: I authenticate with SPF/DKIM/DMARC, honor bounces into a <b>suppression list</b> so I never re-send to a dead address, and split <b>transactional from promotional</b> so a marketing campaign&rsquo;s complaints can&rsquo;t sink password-reset emails."},
        {l:"DLQ",c:"sub",t:"I watch <b>DLQ depth</b> &mdash; a spike means a channel or provider is failing &mdash; and alarm on it. The DLQ is where the failures that exhausted retries land, so it&rsquo;s the first place a systemic problem shows."},
        {l:"FALLBACK HEALTH",c:"sub",t:"And I watch the <b>fallback</b>: if the in-app open rate drops, more traffic cascades to email, so a broken in-app path shows up as an email-volume spike. The channels are coupled, so the metrics are too."},
        {l:"TRADE",c:"trade",t:"The cost is instrumentation and a feedback pipeline; the payoff is knowing about a deliverability problem from the bounce rate before users tell you they stopped getting emails. Silent failure is the enemy."},
        {l:"CLOSE",c:"close",t:"So: track the lifecycle, alarm on bounce rate and DLQ depth, protect reputation with authentication and suppression, split transactional from promotional. Operating notifications is mostly about catching the <i>silent</i> failures."}
      ] },
    { opener:"\u201CTell me about a notification system you&rsquo;ve actually built.\u201D",
      sub:"The ICS dual-channel system: in-app via Postgres polling plus SES email, per-recipient rows, role-based resolution, per-tenant sender.",
      beats:[
        {l:"CONTEXT",c:"frame",t:"At Invenco I built the <b>dual-channel notification system</b> for the platform &mdash; in-app plus email &mdash; serving operators managing a fleet of tens of thousands of payment terminals. Events like a firmware rollout completing or a device going offline needed to reach the right operators."},
        {l:"IN-APP",c:"head",t:"In-app was a <b>row per recipient in Postgres</b> &mdash; about a hundred bytes each, with a <b>partial index on unread</b> so the badge query stayed a cheap seek. I sized it out: a million notifications is roughly a hundred megabytes, and read history could grow without slowing the unread count. The client <b>polled</b> the unread index every sixty seconds &mdash; plenty for a badge, far simpler than a socket."},
        {l:"EMAIL",c:"sub",t:"Email went through <b>SES</b>, and this is where the interesting parts were. <b>Role-based recipient resolution</b> &mdash; &lsquo;notify the tenant&rsquo;s admins&rsquo; resolved against current membership &mdash; batched with <b>Promise.allSettled</b> so one bad address didn&rsquo;t fail the batch, capped at fifty per batch to match SES&rsquo;s BCC limit, under the <b>tenant&rsquo;s own sender identity</b>, and <b>throttled</b> to about one send per twenty seconds so a burst of events couldn&rsquo;t spam a user."},
        {l:"THE TRADE-OFF",c:"sub",t:"I made the <b>polling-vs-realtime</b> call deliberately &mdash; I wrote out the trade-off table &mdash; and chose polling because a minute of latency was fine for these notifications and it saved maintaining a connection per operator. That&rsquo;s the decision I&rsquo;d defend: match the mechanism to the latency the feature needs."},
        {l:"MULTI-TENANT",c:"sub",t:"The whole thing was <b>multi-tenant</b>: resolution scoped to the tenant, the per-tenant sender so one tenant&rsquo;s mail couldn&rsquo;t impersonate another&rsquo;s, and per-tenant throttling. The tenant boundary from the authorization layer carried straight into notifications."},
        {l:"RESULT",c:"trade",t:"The result was a system where operators reliably got what they needed &mdash; in-app for the routine, email for reach &mdash; without duplicate spam, and where adding a notification type was emitting an event, not touching a channel. Simple where it could be, careful where it mattered."},
        {l:"CLOSE",c:"close",t:"What I&rsquo;d carry forward: the <b>partial-index storage model</b> and the <b>allSettled batching</b> were the details that made it robust, and the <b>explicit polling-vs-push decision</b> is the one I&rsquo;m proudest of &mdash; choosing the simpler mechanism because the requirement genuinely allowed it."}
      ] },
    { opener:"\u201CHow do you test a notification system?\u201D",
      sub:"Test the guarantees directly &mdash; the retry doesn&rsquo;t double-send, the routing matches preferences, the fallback cancels &mdash; not just &lsquo;an email went out.&rsquo;",
      beats:[
        {l:"FRAME",c:"frame",t:"The bugs here are in the <b>guarantees</b>, not the happy path, so I test the guarantees directly &mdash; idempotency, routing, fallback &mdash; the way they actually fail."},
        {l:"IDEMPOTENCY",c:"head",t:"The critical test: <b>send the same notification twice and assert one delivery</b>. Simulate a retry &mdash; same event, same user &mdash; and verify the dedup store catches the second. Plus a variant: a batch where one send fails, retried, asserting the successful members aren&rsquo;t re-sent."},
        {l:"ROUTING",c:"sub",t:"<b>Routing tests</b>: given a user with email-on, push-off, and a muted category, assert the fan-out produces exactly the right deliveries &mdash; the in-app but not the email, nothing for the muted category. Preferences are logic, so they get unit tests."},
        {l:"FALLBACK",c:"sub",t:"The <b>fallback</b> is a timing test: deliver in-app, don&rsquo;t open it, advance the clock past the window, assert the email fires. Then the cancel path: open the in-app within the window, assert the pending email is <i>canceled</i>. That&rsquo;s the subtle one, and where the cascade breaks."},
        {l:"RETRY",c:"sub",t:"<b>Retry classification</b>: inject a 500 and assert it retries with backoff; inject a 400 and assert it goes straight to the DLQ. The classification is a decision, so I test both branches."},
        {l:"TRADE",c:"trade",t:"I&rsquo;d lean on <b>integration tests against a fake provider</b> for the send path and unit tests for the routing and classification logic &mdash; the provider itself I don&rsquo;t need to test, just my handling of its responses."},
        {l:"CLOSE",c:"close",t:"So: double-send yields one, routing matches preferences, fallback fires and cancels correctly, retries classify. I test the guarantees I&rsquo;m making, not that a single email happened to send."}
      ] },
    { opener:"\u201CWhere does this design fall short?\u201D",
      sub:"Polling latency, the single-Postgres ceiling, exactly-once being only effective, and deliverability being partly out of your hands.",
      beats:[
        {l:"FRAME",c:"frame",t:"Four limits I&rsquo;d name, each with why it&rsquo;s a limit and when it bites."},
        {l:"POLLING",c:"head",t:"<b>Polling has a latency floor.</b> A 60-second poll means up to a minute of delay &mdash; fine for a badge, wrong for anything real-time. The moment the product needs sub-second, polling is the wrong tool and I&rsquo;d move that surface to push, with the connection cost that brings."},
        {l:"SINGLE STORE",c:"sub",t:"<b>In-app in the main Postgres has a ceiling.</b> The partial index keeps it cheap for a long time, but if notification writes come to dwarf the rest of the app&rsquo;s load, they&rsquo;ll bloat the primary and I&rsquo;d need a dedicated write-optimized store &mdash; a migration I&rsquo;d rather do deliberately than under fire."},
        {l:"EXACTLY-ONCE",c:"sub",t:"<b>It&rsquo;s exactly-once <i>effect</i>, not delivery.</b> The idempotency key makes duplicates invisible <i>if</i> it&rsquo;s applied everywhere &mdash; a new send path that skips it reintroduces double-sends. The guarantee is only as good as its coverage, which is why I make the check structural."},
        {l:"DELIVERABILITY",c:"sub",t:"<b>Deliverability is partly out of my hands.</b> I can authenticate, honor bounces, and warm up domains, but whether an email lands in the inbox or spam is ultimately the mailbox provider&rsquo;s call. I can move the odds; I can&rsquo;t guarantee the inbox."},
        {l:"HONEST CLOSE",c:"trade",t:"None of these is a reason not to ship &mdash; they&rsquo;re the things I&rsquo;d monitor and the follow-ups I&rsquo;d sequence: push where latency demands it, a dedicated store when volume demands it, structural idempotency enforcement, and a deliverability feedback loop."},
        {l:"CLOSE",c:"close",t:"So the limits are polling latency, the single-store ceiling, effective-not-actual exactly-once, and deliverability I can only influence &mdash; each bounded, each watched, none a surprise. Naming them is how I show I know where the design bends."}
      ] }
  ]
};
