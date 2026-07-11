---
id: notifications
prefix: NOTIF
group: messaging-events
title: Notifications
locatorTail: delivery boundary
index: 5
total: 8
---

## Thesis

The stage that turns an event into a notification the right user actually sees &mdash; dual-channel in-app and email, idempotent so a retry never double-sends, with a fallback when a channel is missed.

## Sub

<b>The delivery flow</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the delivery boundary sits, and the pivots an interviewer rides from a notification into channels, idempotency, and fallback.

## Spine

- Fan-out <b>at the boundary</b> &mdash; producers emit <code>notify(user, event)</code>; the system picks the channels, so a producer never knows about email or in-app.
- Exactly-once by <b>idempotency</b> &mdash; a deterministic id plus a dedup store, because at-least-once delivery and retries <i>will</i> duplicate.
- Two channels, one <b>fallback</b> &mdash; in-app is the cheap default, email is reach and backup; if the in-app isn&rsquo;t seen, cascade to email.
- A <b>row per recipient</b> &mdash; each notification is a ~100-byte row with a partial index for unread, so a million notifications is ~100 MB and a read is a seek.

## Companion Notes

### walk

The delivery flow

Event to seen-by-the-user, one step at a time — the mechanics you narrate before anyone cuts in.

Say the split out loud — “producers emit an event; the system decides the channels and guarantees delivery once.” That line is the whole design.

### drill

Probe Drill

Graded follow-ups on idempotency, fan-out, fallback, and delivery guarantees — the ones that separate a passing answer from a Staff signal.

Commit to an answer before you reveal — name the delivery guarantee you’re making, not just the queue you’re using.

### wb

Whiteboard

Rebuild the whole delivery path from memory — the cues, nothing in front of you.

Draw the boundary first — the producer on one side, the two channels on the other, the idempotency key crossing once. Recall is the test, not recognition.

### sys

System Map

Zoom out: notifications sit between the events the system produces and the channels a user watches.

Lead with the boundary, not the boxes — “the system emits events, notifications fan them out, the user sees one on the right channel.”

### trade

Trade-offs

The decisions they drill — polling vs push, one topic vs per-channel, at-least-once vs exactly-once — each with the switch condition.

Always say “pick when” — name the constraint that flips the choice, never defend one channel as universally right.

### model

Model Answers

Full spoken scripts — the beats, in order, the way you’d actually say them.

Steal the frame, not the words — headline first (“fan out, deliver once, fall back”), then the one risk you’d name.

### num

Numbers

Back-of-envelope the notification load — and know which number makes polling or fan-out the ceiling.

Lead with the read load — polling every user every minute is the wall, and that’s what pushes you to push.

### rf

Red Flags

What sinks the round — no idempotency, blocking on send, polling that melts the database — and what to say instead.

Name what the interviewer hears — “would double-send on every retry” is the fastest no-hire in the room.

### open

30-Second

The opener and the close — matched to the altitude the question is asked at.

Match the altitude — open at the delivery boundary, not the queue, and land on idempotency and fallback as the real hard parts.

## Walk

### The producer emits an event

```flow
n[service] -> p[notify(user, event)] -> t[notification request] . a[producer knows no channels]
```

A producer calls <code>notify(user, event)</code> &mdash; it emits &lsquo;this user should know about this event,&rsquo; and stops there. It never names email or in-app; the notification system owns channel selection, so adding a channel is <b>zero producer change</b>.

This is the boundary that makes the whole thing maintainable. A producer &mdash; an order service, a firmware-rollout job &mdash; shouldn&rsquo;t know or care whether the user gets an email, an in-app badge, or both; it emits a <b>domain event</b> and the notification system decides delivery. So preferences, channel routing, batching, and fallback all live on <i>one</i> side of the boundary, and producers stay ignorant. The alternative &mdash; each producer calling SES directly &mdash; scatters channel logic across every service and makes &lsquo;add a channel&rsquo; a fleet-wide change instead of one.

### Make it idempotent

```flow
n[request] -> p[id = hash(user, event, channel)] -> t[dedup store (SET NX)] / r[already sent -> skip]
```

Before anything sends, compute a <b>deterministic id</b> &mdash; <code>hash(user_id, event_id, channel)</code> &mdash; and record it in a dedup store with a conditional write. If the id is already there, this is a <b>retry</b>: acknowledge and <b>don&rsquo;t re-send</b>. Non-negotiable, because at-least-once delivery and retries both duplicate.

```js
// deterministic id -- same event + user + channel always collides
const id = sha256(`${userId}:${eventId}:${channel}`);
const fresh = await dedup.==setNX==(id, ==1==, { ttl: ==7== * DAY });  // SET if Not eXists
if (!fresh) return ack();          // already sent -- ack the retry, send nothing
```

The id is <i>content-derived</i>, not random &mdash; so a retry of the exact same notification computes the exact same id and collides. That collision is what turns at-least-once machinery into <b>effectively exactly-once</b> delivery, without the producer thinking about it.

### Resolve the recipients

```flow
n[event target] -> p[role-based resolution] -> t[concrete users + channels] . a[per-tenant sender]
```

The event names a <b>target</b> &mdash; often a role (&lsquo;all admins of tenant T&rsquo;), not a person. Resolution expands that to concrete recipients, each with their channel preferences, scoped to the tenant. A <b>role, not a hard-coded list</b>, so membership changes need no code change.

Role-based resolution keeps the notification target <b>stable as the org changes</b>. &lsquo;Notify the tenant&rsquo;s billing admins&rsquo; resolves against <i>current</i> membership at send time, so a new admin gets it and a removed one doesn&rsquo;t &mdash; the producer never maintains a recipient list. It&rsquo;s also where <b>tenant isolation</b> lands: resolution is scoped to the tenant (the same per-tenant boundary the authz topic enforces), and the email goes out under the <b>tenant&rsquo;s own sender identity</b>, so one tenant&rsquo;s notifications can never address or impersonate another&rsquo;s.

### Fan out to channels

```flow
n[recipient + prefs] -> p[{in-app, email}] -> t[one deliver per channel] . a[producer emitted once]
```

For each recipient, the system reads their <b>preferences</b> and fans the single event out to the channels they&rsquo;ve enabled &mdash; in-app, email, or both. The producer emitted <i>once</i>; fan-out is where one event becomes N channel deliveries.

```js
// one event -> the channels this recipient actually wants
const prefs = await getPrefs(userId);       // cached, ~1ms
const channels = resolveChannels(prefs, event.category); // e.g. [in-app, email]
for (const ch of channels)
  await deliver(ch, userId, event);      // each deliver() is independently idempotent
```

Fan-out reads <b>preferences</b>, not a fixed channel list &mdash; so a user who muted email still gets the in-app, and a category they opted out of gets nothing. The producer stays one call; the <i>routing</i> is a property of the recipient, computed here.

### The in-app channel &mdash; a row per recipient

```flow
n[in-app deliver] -> p[INSERT row (per recipient)] -> t[partial index (unread)] . a[~100 bytes]
```

In-app delivery is an <b>INSERT of one row per recipient</b> into Postgres &mdash; roughly 100 bytes each, with a <b>partial index on unread</b> so the badge query is a tiny seek. A million notifications is ~100 MB; the read path is the unread index, never a scan.

```js
// one row per recipient -- the read is the partial index, not a scan
INSERT INTO notifications (user_id, event_id, body, read_at, created_at)
VALUES ($1, $2, $3, NULL, now());
-- CREATE INDEX ... ON notifications (user_id) WHERE read_at IS NULL;
-- badge: SELECT count(*) ... WHERE user_id=$1 AND read_at IS NULL; -- seek
```

The <b>partial index on <code>read_at IS NULL</code></b> is the trick &mdash; it indexes only unread rows, so it stays small even as read history grows unbounded. The expensive query (unread count, shown on every page) is a seek into a tiny index, not a scan of a million-row table.

### Delivery to the client &mdash; poll or push

```flow
n[client] -> t[poll unread every 60s] / p[WebSocket push] . a[the trade-off]
```

The client gets the in-app notification by <b>polling the unread index every ~60 seconds</b> &mdash; simple, stateless, good enough for a badge. For sub-second delivery you&rsquo;d switch to <b>push</b> (WebSocket/SSE), trading polling&rsquo;s simplicity for a connection to maintain.

Polling is the honest default: a lightweight query against the partial index every 60s costs almost nothing and needs no persistent connection, which is why it&rsquo;s right for a badge where a minute of latency is fine. It <i>doesn&rsquo;t</i> scale to &lsquo;instant&rsquo; &mdash; every user polling every minute is a fixed read load, and driving the interval toward real-time multiplies it. When the product genuinely needs sub-second (a chat, a live feed), you move to <b>push</b>: a WebSocket or SSE connection the server writes to on delivery. The tell is matching the mechanism to the latency the feature <i>actually</i> needs, not defaulting to whichever is fancier.

### The email channel &mdash; batched through SES

```flow
n[email deliver] -> p[batch (allSettled, 50)] -> t[SES, per-tenant sender] . a[throttle 1/20s]
```

Email goes through <b>SES</b>, sent in <b>batches</b> with <code>Promise.allSettled</code> so one bad address doesn&rsquo;t fail the batch, under the <b>tenant&rsquo;s own sender identity</b>, and <b>throttled</b> (roughly one per 20s per recipient) so a burst of events doesn&rsquo;t spam a user or trip SES limits.

```js
// batch, tolerate partial failure, stay under the sender's rate
const results = await Promise.==allSettled==(       // one bad address != failed batch
  batch.map(r => ses.send(buildEmail(r, tenantSender)))
);                                          // MAX_BATCH_SIZE 50, SES BCC up to 50
results.filter(isRejected).forEach(scheduleRetry);  // only the failures retry
```

<code>allSettled</code> over <code>all</code> is deliberate &mdash; with <code>Promise.all</code>, one rejected send aborts the whole batch and you&rsquo;d retry the good ones too, risking duplicates. Settling each independently means <b>only the actual failures retry</b>, which pairs with the idempotency key to keep exactly-once intact.

### Retry, classify, DLQ

```flow
r[send fails] -> t[retryable? backoff+jitter] / r[non-retryable? DLQ] . a[per-channel policy]
```

A failed send is <b>classified</b>: retryable (429, 5xx, timeout) gets <b>exponential backoff with jitter</b>; non-retryable (400, bad address) goes <b>straight to a DLQ</b> &mdash; no point retrying a malformed request. And the policy is <b>per channel</b>: email retries a few times, SMS once then DLQ, push is fire-and-forget.

Classification is what stops a retry storm from a permanent failure. A <b>429 or 5xx</b> is transient &mdash; back off with jitter (so retries don&rsquo;t align into a thundering herd) and try again. A <b>400 or invalid address</b> is permanent &mdash; retrying just burns quota and delays the DLQ, where a human or a cleanup job handles it. Per-channel policy reflects the cost asymmetry: a missed in-app is cheap (it&rsquo;s still in the table), a missed transactional email matters, and a duplicate SMS has real regulatory cost &mdash; so SMS retries conservatively and dead-letters fast. Every retry rides the <b>same idempotency key</b>, so it can never double-send.

### Fallback + delivery tracking

```flow
n[in-app unseen in window] -> p[cascade to email] / t[seen -> cancel pending email] . a[track SENT/OPENED]
```

The channels aren&rsquo;t independent &mdash; there&rsquo;s a <b>smart fallback</b>: if the user doesn&rsquo;t <b>open the in-app</b> within a window, cascade to email; if they <i>do</i> see it in time, <b>cancel the pending email</b>. Underneath, every delivery is <b>tracked</b> (SENT, DELIVERED, OPENED) so the fallback and the analytics both have ground truth.

This is the LinkedIn &lsquo;air traffic controller&rsquo; pattern, and it&rsquo;s what makes multi-channel feel considerate instead of spammy. You <b>don&rsquo;t</b> fire email and in-app simultaneously; you send the cheap in-app first, wait a window, and escalate to email only if it went unseen &mdash; and if the user opens the in-app during the window, you <b>cancel</b> the queued email so they don&rsquo;t get both. It needs the <b>delivery tracking</b> (an OPENED event on the in-app) to drive the decision, and a <b>scheduled, cancelable</b> email send. Getting this right is the difference between &lsquo;we notify on every channel every time&rsquo; (annoying) and &lsquo;we reach you once, on the channel that worked&rsquo; (good).

### Model Script

- Frame the boundary | "A producer emits an event &mdash; notify this user of this thing &mdash; and the notification system owns everything after: which channels, deliver-once, fall back if a channel is missed. So producers stay channel-ignorant and all the delivery logic lives in one place."
- Idempotency first | "The first thing I add is a deterministic id &mdash; hash of user, event, and channel &mdash; recorded in a dedup store with a conditional write. Because delivery is at-least-once and retries happen, that id is what stops a double-send. It&rsquo;s not optional."
- Fan out on preferences | "Then I resolve recipients &mdash; usually a role, so membership changes need no code &mdash; and fan the event out to each recipient&rsquo;s enabled channels: in-app, email, or both. The producer emitted once; fan-out turns that into the deliveries the user actually wants."
- The cheap default | "In-app is a row per recipient in Postgres &mdash; about a hundred bytes, with a partial index on unread so the badge query is a seek. A million notifications is a hundred megabytes. The client polls that index every minute, which is plenty for a badge."
- Email as reach and backup | "Email goes through SES, batched with allSettled so one bad address doesn&rsquo;t fail the batch, under the tenant&rsquo;s sender, throttled so a burst doesn&rsquo;t spam anyone. And it&rsquo;s the fallback: if the in-app goes unseen in a window, cascade to email; if they open the in-app in time, cancel the pending email."
- Interviewer: "A retry fires and the user gets the same notification twice. How?"
- Trace it to the missing key | "That&rsquo;s the idempotency key not applied on the send path &mdash; or being random instead of content-derived. The fix is the deterministic id checked before every deliver, so a retry of the same event computes the same id and collides. And allSettled, not all, so a batch retry re-sends only the actual failures, not the whole batch."
- Land on the guarantees | "So the shape is: producers emit events, the system fans out on preferences, delivers effectively-once via a content-derived idempotency key, uses in-app as the cheap default and email as reach-and-fallback, and retries with per-channel policies and a DLQ. The hard parts aren&rsquo;t the channels &mdash; they&rsquo;re idempotency and the smart fallback."

## Drill

all | <b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.
SDE2 | <b>Fundamentals under pressure</b> &mdash; idempotency, the fan-out boundary, the in-app row model, delivery guarantees. The bar is &ldquo;this is a real delivery system, not a for-loop over SES&rdquo;: name the guarantee and the mechanism that enforces it.
SDE3 | <b>Depth &amp; trade-offs</b> &mdash; poll vs push, preferences caching, retry classification, topic design, batching. The bar is &ldquo;it depends, here&rsquo;s the switch&rdquo;: name the constraint and the failure each choice bounds.
Staff | <b>Systems judgment</b> &mdash; smart fallback, per-user ordering, sender reputation, cost at scale. The bar is &ldquo;reach the user once, correctly, cheaply&rdquo;: name the hard part (idempotency, fallback) and why the channels are the easy part.

### SDE2 | Idempotency

You send notifications through an at-least-once queue. What&rsquo;s the first thing you build so a retry doesn&rsquo;t double-notify?

A <b>deterministic idempotency key</b> &mdash; <code>hash(user_id, event_id, channel)</code> &mdash; checked against a dedup store with a conditional write before every send. A retry of the same notification computes the <i>same</i> id, finds it already recorded, and acknowledges without re-sending. It&rsquo;s the mechanism that turns at-least-once machinery into effectively exactly-once delivery.

Follow: Why must the id be content-derived rather than a random UUID?
Because a random id is <i>different</i> on the retry &mdash; so the dedup store sees a new key and sends again, which is exactly the double-send you were trying to prevent. The id has to be a deterministic function of the notification&rsquo;s identity (user + event + channel) so that the retry of the <i>same</i> logical notification collides with the original. Random ids deduplicate nothing; content-derived ids deduplicate the retry.

Follow: How long do you keep the idempotency keys, and why does that matter?
Long enough to cover the <b>maximum retry and replay window</b> &mdash; a TTL of a few days to a week is typical. Too short and a late retry (a message stuck in a queue, a delayed redrive) arrives after the key expired and re-sends. Too long and the store grows unbounded. You size the TTL to the longest plausible delay between the original and a retry, then let it expire &mdash; the key only needs to outlive the duplicate, not live forever.

Senior: Naming a <b>content-derived idempotency key plus a conditional-write dedup store</b> as the <i>first</i> thing &mdash; and knowing why random ids fail and how to size the TTL &mdash; is the reflex that separates someone who&rsquo;s run at-least-once delivery from someone who&rsquo;s only drawn the happy path.
Speak: Lead with the non-negotiable: <b>'a content-derived idempotency key &mdash; hash of user, event, channel &mdash; checked before every send.'</b> Then why random ids fail (they don&rsquo;t collide on the retry) and how you size the TTL (to the longest retry delay). That&rsquo;s the &lsquo;I&rsquo;ve run at-least-once delivery&rsquo; tell.

### SDE2 | Fan-out pattern

An order service, a billing service, and a rollout job all need to notify users. How do you structure it so each one isn&rsquo;t calling SES directly?

A <b>fan-out boundary</b>: each producer emits a domain event &mdash; <code>notify(user, event)</code> &mdash; and the notification system owns everything after: channel selection, preferences, batching, fallback. Producers stay <b>channel-ignorant</b>. The single event fans out to the channels each recipient has enabled, so &lsquo;add SMS&rsquo; is one change in the notification system, not a change in every producer.

Follow: What specifically goes wrong if each producer calls SES itself?
Channel logic <b>scatters across every service</b>: preferences, retry, throttling, and fallback get reimplemented (inconsistently) in the order service, the billing service, the rollout job. Adding a channel means touching all of them; changing a throttle means finding all of them. And there&rsquo;s no single place to enforce &lsquo;don&rsquo;t send this user both an email and an in-app for the same event.&rsquo; Centralizing at a fan-out boundary makes all of that one system&rsquo;s job.

Follow: If every producer now depends on the notification system, haven&rsquo;t you just created a single point of failure?
You&rsquo;ve centralized, but you decouple with a <b>queue at the boundary</b>, not a synchronous call. Producers emit the event to a durable queue/topic and return immediately &mdash; they don&rsquo;t block on the notification system being up or fast. If it&rsquo;s down, events buffer in the queue and drain when it recovers, so a notification outage never becomes an order-service outage. The boundary is a place events <i>land</i>, not a service the producer waits on &mdash; which is exactly what keeps a central notification system from being a synchronous SPOF for every producer.

Senior: Framing it as a <b>producer/notification boundary where producers emit events and stay channel-ignorant</b> &mdash; so channel logic lives in one place and new channels are additive &mdash; is the architectural instinct an interviewer is checking for.
Speak: Frame the boundary: <b>'producers emit notify(user, event) and stay channel-ignorant; the notification system owns channels, preferences, fallback.'</b> The alternative &mdash; every service calling SES &mdash; scatters channel logic everywhere and makes &lsquo;add a channel&rsquo; a fleet-wide change.

### SDE2 | In-app storage model

How do you store in-app notifications so a user&rsquo;s unread badge is cheap to compute even with millions of notifications in the table?

<b>One row per recipient</b> (~100 bytes: user_id, event_id, body, <code>read_at</code>, created_at), with a <b>partial index on unread</b> &mdash; <code>WHERE read_at IS NULL</code>. The badge query is a seek into that small index, not a scan of the full table. A million notifications is ~100 MB, and read history can grow unbounded without slowing the unread count.

Follow: Why a partial index rather than a plain index on read_at?
Because a <b>partial index only contains the unread rows</b> &mdash; the ones the badge query actually needs &mdash; so it stays tiny even as the table fills with millions of <i>read</i> rows you never query on. A full index on <code>read_at</code> would index every row, read and unread, and grow with total history. The partial index is sized to the working set (unread), which is small per user, so the hot query stays a cheap seek forever.

Follow: That table grows forever as read history piles up. Does that ever become a problem?
The <b>unread badge</b> never degrades &mdash; the partial index is sized to unread, not total &mdash; but the <i>table</i> and the full-history queries (the notification <i>list</i>, not the count) do grow. You handle it the usual way for append-heavy history: <b>partition or archive by age</b>, since users rarely scroll back far, so notifications older than N months move to a partitioned older table or cold storage. The hot path (badge + recent list) stays on a small, indexed working set, and old read rows age out of the primary table rather than accumulating forever. Growth is bounded by retention policy, not left unbounded.

Senior: Reaching for a <b>row-per-recipient model with a partial index on <code>read_at IS NULL</code></b> &mdash; and articulating that it indexes only the working set so the badge query never degrades &mdash; is a concrete storage-design signal.
Speak: State the storage shape: <b>'one row per recipient, ~100 bytes, with a partial index on read_at IS NULL.'</b> The badge query is a seek into a tiny index, not a scan; a million notifications is ~100 MB. The partial index only holds the working set (unread), so it never degrades.

### SDE2 | The read-heavy badge

The unread-count query runs on every page load for every user. It&rsquo;s becoming your hottest query. What do you do?

First, make sure it&rsquo;s already a <b>seek into the partial unread index</b>, not a scan &mdash; that alone keeps it cheap. If the read <i>volume</i> is the problem (every page, every user), <b>cache the count</b> in Redis with invalidation on read/new-notification, so most page loads never touch Postgres. The count is derived data with a clear invalidation trigger, which makes it a good cache candidate.

Follow: How do you keep the cached count correct when a notification is read or arrives?
Invalidate or adjust on the events that change it: a <b>new notification</b> increments (or busts) the cached count for that user; <b>marking read</b> decrements (or busts) it. Because both are explicit events, the cache has precise invalidation triggers rather than a blind TTL &mdash; though a short TTL as a backstop catches any missed event. The count is eventually consistent by at most that TTL, which is fine for a badge &mdash; a slightly stale unread number for a few seconds is acceptable, unlike, say, a balance.

Follow: What happens on the first page load after the cache is cold, or if Redis is down entirely?
You <b>fall back to the source of truth</b> &mdash; the partial-index seek on Postgres &mdash; which is <i>already</i> cheap, so a cache miss or a Redis outage degrades to &lsquo;a fast query,&rsquo; not an error. That&rsquo;s the key property: the cache is an <b>optimization for read volume, not a correctness dependency</b>. On a cold cache you compute the count once from the index and populate it; if Redis is unavailable, every request just hits the index directly (higher DB load, still correct). Because the fallback is a seek and not a scan, losing the cache is a performance event, not an outage &mdash; which is exactly why the partial index still has to exist even <i>with</i> the cache in front of it.

Senior: Distinguishing the two failure modes &mdash; <b>a slow query (fix with the partial index) vs high read volume (fix with a cached, event-invalidated count)</b> &mdash; rather than jumping straight to a cache, is the diagnostic instinct that reads as senior.
Speak: Diagnose before caching: <b>'first make sure the badge query is a seek into the partial unread index; if the read <i>volume</i> is the problem, cache the count in Redis with event invalidation.'</b> A slow query and high read volume are different problems with different fixes.

### SDE2 | Delivery guarantees

What delivery guarantee does your notification system provide &mdash; at-most-once, at-least-once, or exactly-once?

<b>At-least-once delivery plus idempotent processing</b>, which together give <b>effectively exactly-once</b>. True exactly-once end-to-end is a distributed-systems unicorn; what you actually build is at-least-once (retry until acked, so nothing is lost) and dedupe on a content-derived key (so the inevitable duplicates don&rsquo;t reach the user twice). At-most-once (send and pray) risks losing a notification, which for a transactional one is unacceptable.

Follow: Why not just aim for exactly-once delivery directly?
Because <b>exactly-once <i>delivery</i> across a network is effectively impossible</b> &mdash; you can&rsquo;t distinguish &lsquo;the send succeeded but the ack was lost&rsquo; from &lsquo;the send failed,&rsquo; so any system that guarantees no loss must risk a duplicate. The honest, achievable target is exactly-once <i>effect</i>: at-least-once delivery (never lose) combined with idempotent handling (dedupe the duplicate). Claiming exactly-once delivery is a red flag; claiming at-least-once-plus-idempotency is the correct, buildable guarantee.

Follow: &lsquo;Never lose a notification&rsquo; assumes the event reliably gets from the producer into the queue. How do you guarantee that hand-off?
That&rsquo;s the <b>dual-write problem</b> &mdash; a producer that commits its business transaction and <i>then</i> publishes the event can crash in between, silently losing the notification. The fix is the <b>transactional outbox</b>: the producer writes the event to an outbox table <i>in the same database transaction</i> as its business change, so they commit atomically, and a separate relay reliably publishes outbox rows to the queue. Now the event can&rsquo;t be lost even if the producer dies right after commit &mdash; it&rsquo;s durably recorded with the change that caused it. At-least-once is only truly no-loss if the <i>entry</i> into the pipeline is atomic with the triggering event; the outbox is how you get that.

Senior: Answering &lsquo;at-least-once plus idempotency equals effectively exactly-once&rsquo; &mdash; and knowing that exactly-once <i>delivery</i> is unachievable while exactly-once <i>effect</i> is &mdash; is the distributed-systems literacy that separates a real answer from a buzzword.
Speak: Get the guarantee right: <b>'at-least-once delivery plus idempotent processing equals effectively exactly-once.'</b> Exactly-once <i>delivery</i> across a network is impossible; exactly-once <i>effect</i> is what you build. Claiming exactly-once delivery is a red flag.

### SDE3 | Polling vs push

In-app notifications: do you poll or push? Defend the choice.

For a <b>notification badge</b>, <b>poll</b> &mdash; the client queries the unread index every ~60 seconds. It&rsquo;s simple, stateless, needs no persistent connection, and a minute of latency is fine for a badge. You switch to <b>push</b> (WebSocket/SSE) only when the product needs <b>sub-second</b> delivery &mdash; a chat, a live feed &mdash; and you accept the cost of maintaining a connection per active user and the server-side delivery-on-write plumbing.

Follow: What&rsquo;s the scaling cost of driving the poll interval toward real-time?
Polling load is <b>users &times; (1 / interval)</b> &mdash; a fixed read rate that grows as you shorten the interval. At 60s it&rsquo;s trivial; at 1s it&rsquo;s 60&times; the query load, most of it returning &lsquo;nothing new.&rsquo; That&rsquo;s the wall: polling wastes work proportional to how &lsquo;instant&rsquo; you make it, because most polls find no change. Push inverts that &mdash; the server does work only when there&rsquo;s <i>actually</i> something to deliver &mdash; which is why real-time features move to push rather than fast polling.

Follow: With push, how do you handle a user who&rsquo;s offline when the notification fires?
You <b>persist first, deliver second</b>: the notification is written to the store (the row-per-recipient) regardless of connection state, and the WebSocket/SSE push is a <i>best-effort accelerator</i> on top. If the user is connected, they get it instantly; if not, it&rsquo;s waiting in the unread index when they reconnect and the client fetches on connect. Push is never the source of truth &mdash; the store is &mdash; so a dropped connection loses latency, not the notification.

Senior: Defending <b>poll for a badge, push for sub-second</b> &mdash; with the scaling math (polling load grows as you shorten the interval) and &lsquo;persist first, push as accelerator&rsquo; for offline &mdash; is the trade-off fluency a senior round wants.
Speak: Defend the default: <b>'poll the unread index every 60s for a badge; push (WebSocket/SSE) only for sub-second.'</b> Polling load grows as you shorten the interval, most polls finding nothing &mdash; that&rsquo;s the wall. With push, persist first and treat the push as an accelerator, so an offline user still gets it.

### SDE3 | Preferences

Users want control over what notifications they get. How do you model and store preferences?

Multi-dimensional: <b>global on/off</b>, <b>per-channel</b> (email yes, push no), <b>per-category</b> (transactional vs promotional vs system), <b>frequency</b> (instant vs hourly/daily digest), and <b>quiet hours</b> with timezone. Store them in a durable backing store (DynamoDB/Postgres) but <b>cache in Redis for ~1ms reads</b>, because fan-out reads preferences on every notification &mdash; and invalidate the cache on preference update.

Follow: Fan-out hits preferences on every single notification. How do you keep that from becoming a bottleneck?
Cache them: preferences change rarely and are read constantly, which is the ideal cache profile. A <b>Redis read (~1ms) per fan-out</b> with the durable store behind it means the hot path never waits on the primary database, and you <b>invalidate on update</b> so a preference change takes effect promptly. Without the cache, every notification does a preference lookup against the primary store, which at fan-out volume is exactly the read amplification you want to avoid. Read-heavy, write-rare data belongs in a cache with event-based invalidation.

Follow: A user turns off email notifications. How fast does that take effect, and what if fan-out reads a stale cached preference?
You <b>invalidate the cache entry on the preference write</b>, so the next fan-out reads the new value &mdash; effect is near-immediate, bounded by the invalidation. The stale-read window is the only risk: a notification fanning out at the exact moment the preference flips might use the old value and send one more email. For preferences that&rsquo;s <b>acceptable</b> &mdash; one extra email just after opting out is an annoyance, not a correctness violation &mdash; so you invalidate promptly and tolerate a sub-second stale window rather than pay for strong consistency on every read. The one place you&rsquo;d tighten it is a legally-significant unsubscribe, where you might read through to the source of truth on the send path to be certain.

Senior: Modeling preferences across <b>channel / category / frequency / quiet-hours</b> and putting them in a <b>Redis cache with invalidation</b> because fan-out reads them constantly &mdash; is the completeness and performance-awareness a senior answer shows.
Speak: Model preferences across <b>'channel, category, frequency, and quiet hours'</b> &mdash; and put them in a <b>Redis cache with invalidation</b>, because fan-out reads them on every notification. Read-heavy, write-rare data belongs in a cache, or the primary store gets hammered.

### SDE3 | Retry and DLQ

A send fails. Walk me through your retry strategy.

<b>Classify first.</b> Retryable errors (429, 5xx, network timeout) get <b>exponential backoff with full jitter</b> &mdash; a few attempts &mdash; then, if still failing, a <b>dead-letter queue</b>. Non-retryable errors (400, invalid address, 403) go <b>straight to the DLQ</b>; retrying a malformed request just burns quota. And the policy is <b>per channel</b>: email a few retries, SMS once then DLQ (duplicates cost money), push fire-and-forget. Every retry rides the same idempotency key, so it can&rsquo;t double-send.

Follow: Why full jitter on the backoff rather than plain exponential?
To break up <b>synchronized retries</b>. If a downstream (SES, a provider) has a blip and a thousand sends fail at once, plain exponential backoff has them <i>all</i> retry at exactly the same later moments &mdash; a thundering herd that re-hammers the recovering service. <b>Full jitter</b> randomizes each retry within the backoff window, spreading them out so the load is smooth. It&rsquo;s the difference between a thousand retries landing in the same millisecond and a thousand retries spread across the window &mdash; the recovering service gets a ramp, not a spike.

Follow: What happens to a message once it&rsquo;s in the DLQ?
It&rsquo;s <b>out of the hot path but not lost</b>: the DLQ is a holding area with its own retention and alarming (DLQ depth &gt; N pages someone). From there it&rsquo;s either <b>auto-redriven</b> after a cool-off (for transient-looking failures), or <b>manually reviewed</b> (for the ones that need a human &mdash; a persistently bad address, a bug). The point is that a failed send never silently vanishes and never blocks the queue behind it &mdash; it&rsquo;s parked, visible, and recoverable, which is exactly what you want for the small fraction that exhausts retries.

Senior: Splitting <b>retryable (backoff + jitter) from non-retryable (straight to DLQ)</b>, using <b>full jitter</b> to avoid thundering herds, and setting <b>per-channel policies</b> by cost &mdash; is the reliability depth that marks a strong answer.
Speak: Classify the failure: <b>'retryable (429, 5xx, timeout) gets exponential backoff with full jitter; non-retryable (400, bad address) goes straight to the DLQ.'</b> Full jitter breaks the thundering herd; per-channel policy reflects cost &mdash; SMS retries conservatively because a duplicate has regulatory cost.

### SDE3 | Recipient resolution

An event says &lsquo;notify the tenant&rsquo;s admins.&rsquo; How do you turn that into actual sends, and why not just store a recipient list?

<b>Role-based resolution at send time</b>: the event carries a target (&lsquo;admins of tenant T&rsquo;), and resolution expands it against <b>current membership</b> to concrete users, each with their channel preferences, scoped to the tenant. A stored list would go stale &mdash; a new admin wouldn&rsquo;t get notified, a removed one still would. Resolving against live membership means the target stays correct as the org changes, with no code change.

Follow: Where does tenant isolation come into recipient resolution?
Resolution is <b>scoped to the tenant</b> &mdash; the same per-tenant boundary the authorization layer enforces &mdash; so &lsquo;admins of tenant T&rsquo; can only ever resolve to users <i>within</i> T, never leak across tenants. And the email goes out under the <b>tenant&rsquo;s own sender identity</b>, so one tenant&rsquo;s notifications can&rsquo;t address or appear to come from another&rsquo;s. A bug that resolved cross-tenant would be the same class of leak as a missing authorization filter, so resolution inherits the tenant scope rather than trusting the event to be well-formed.

Follow: &lsquo;Notify all members of a 50,000-person tenant&rsquo; &mdash; do you resolve that to 50,000 sends up front, and when?
You resolve at <b>send-time but fan the expansion out asynchronously</b>, not as one synchronous blast. The event carries the <i>target</i> (&lsquo;all members of T&rsquo;); a resolution step expands it against current membership and enqueues per-recipient send tasks, which fan-out workers drain in parallel under the per-channel rate limits. You don&rsquo;t block the producer while 50,000 rows materialize, and you don&rsquo;t pre-store the list (it&rsquo;d go stale). For very large targets you expand in <b>batches</b>, paging through membership, so a huge tenant doesn&rsquo;t become one massive unit of work. So resolution is late (against live membership) and streamed (batched into the queue), keeping a big broadcast from being either a stale list or a synchronous stall.

Senior: Resolving recipients from a <b>role against current membership at send time</b> (not a stale stored list) &mdash; and scoping resolution to the tenant with a per-tenant sender &mdash; is the correctness-and-isolation thinking a senior round rewards.
Speak: Resolve at send time: <b>'the event carries a role; resolution expands it against current membership, scoped to the tenant.'</b> A stored recipient list goes stale &mdash; a new admin wouldn&rsquo;t get notified. And resolution is tenant-scoped, so it can&rsquo;t leak across tenants.

### SDE3 | Topic design

Building fan-out on a pub/sub system: one topic per channel, or one topic with routing? Which and why?

<b>One topic per event domain, with channel selection at the subscriber via filter policies</b> &mdash; not one topic per channel. Publishers emit &lsquo;notification N for user U&rsquo; with attributes, and each channel worker&rsquo;s subscription filters for the channel it handles. This keeps <b>publishers ignorant of channels</b>: a new channel is a new subscription with zero publisher change. Per-channel topics would push routing knowledge back to publishers, which is exactly the coupling you&rsquo;re trying to avoid.

Follow: When would you switch from filter policies to actually separate topics or queues?
When you need <b>per-channel SLA or scaling differentiation</b> &mdash; transactional SMS at p99 under 5s vs marketing email at p99 under 5 minutes &mdash; you give each channel its own <b>queue</b> with different visibility timeouts and worker concurrency, fed from the one topic. And you split <i>topics</i> when filter policies get unmaintainable or you exceed the routing-dimension limits (e.g. the 5-key filter-policy cap on SNS). The heuristic: filter policies while routing is simple; separate queues for SLA isolation; separate topics only when the policy layer stops scaling.

Follow: A channel worker (a subscriber) is down for an hour. Do those notifications just disappear?
No &mdash; that&rsquo;s why each channel worker consumes from its <b>own durable queue subscribed to the topic</b>, not directly off a fire-and-forget fan-out. The topic delivers into each subscription&rsquo;s queue, so if the email worker is down, its messages <b>accumulate in its queue</b> and process on recovery, while the SMS and push workers on their own queues are unaffected. This is the SNS-to-SQS fan-out pattern: the topic is the fan-out, but a queue per subscriber gives each channel independent durability, retry, and back-pressure. Without the per-subscriber queue a down consumer would drop its notifications; with it, a channel outage is a <i>delay</i> for that channel only, isolated from the rest.

Senior: Choosing <b>one topic per event domain with subscriber-side filter policies</b> (publishers stay channel-ignorant) &mdash; and knowing the switch points to per-channel queues (SLA) and separate topics (policy limits) &mdash; is the pub/sub design maturity an interviewer probes.
Speak: Choose the topology: <b>'one topic per event domain, channel selection at the subscriber via filter policies.'</b> Publishers stay channel-ignorant; a new channel is a new subscription. Split to per-channel queues for SLA isolation, separate topics only when filter policies stop scaling.

### SDE3 | Rate limiting

How do you stop a burst of events from spamming a user &mdash; or blowing past your email provider&rsquo;s limits?

Two layers. <b>Per-user throttling</b> &mdash; a sliding window (e.g. one email per 20s per recipient, max N per hour) so a storm of events collapses into a bounded number of notifications. And <b>per-channel rate limiting</b> &mdash; a token bucket against the provider&rsquo;s ceiling (SES ~14 emails/sec, SMS per-number limits) so you burst up to the limit without tripping it. The per-user limit protects the human; the per-channel limit protects the integration.

Follow: Why sliding window for the per-user limit but token bucket for the per-channel one?
Different goals. <b>Per-user</b>, you want an <i>accurate</i> &lsquo;no more than N in the last hour&rsquo; with no burst allowance &mdash; a sliding window gives precise boundary behavior so a user never gets a flood. <b>Per-channel</b>, you <i>want</i> to allow controlled bursts up to the provider&rsquo;s ceiling &mdash; a token bucket refills at the sustainable rate but lets you spend accumulated tokens on a spike, maximizing throughput without exceeding the limit. Sliding window = accurate suppression for the human; token bucket = burst-friendly pacing for the provider.

Follow: You have ten fan-out workers. How do they share one per-channel limit without each thinking it has the full budget?
The limiter state has to be <b>shared and atomic</b>, not per-worker &mdash; ten workers each enforcing &lsquo;14/sec&rsquo; locally would allow 140/sec and trip SES. You keep the token bucket (or window counter) in a <b>shared store like Redis</b> and decrement it <b>atomically</b> (a Lua script or atomic op), so every worker draws from one global budget. When the bucket is empty a worker doesn&rsquo;t drop the send &mdash; it <b>re-queues with a small delay</b>, so the notification is paced, not lost. The two requirements are one shared, atomically-updated limiter across all workers, and delay-and-retry rather than drop when throttled &mdash; which turns a fleet of workers into a single coordinated rate against the provider.

Senior: Separating <b>per-user throttling (sliding window, suppress the flood) from per-channel rate limiting (token bucket, pace to the provider)</b> &mdash; and knowing why each algorithm fits its job &mdash; is the rate-limiting depth that reads as senior.
Speak: Two rate-limit layers: <b>'per-user sliding window to suppress the flood, per-channel token bucket to pace to the provider.'</b> Sliding window is accurate suppression for the human; token bucket allows controlled bursts up to SES or the SMS ceiling without tripping it.

### SDE3 | Batching and partial failure

You send a batch of 50 emails through SES and one address is malformed. What happens to the other 49?

They should all send. Use <code>Promise.allSettled</code>, not <code>Promise.all</code> &mdash; <code>allSettled</code> waits for every send and reports each independently, so one rejected send doesn&rsquo;t abort the batch. You then retry <b>only the failures</b>. With <code>Promise.all</code>, the first rejection short-circuits and you&rsquo;d lose (or blindly retry) the whole batch, risking duplicates on the 49 that already succeeded.

Follow: Why does using Promise.all here specifically create a duplicate-send risk?
Because <code>Promise.all</code> rejects as soon as <i>one</i> promise rejects, but the other 49 sends may have <b>already gone out</b> &mdash; they&rsquo;re in flight or complete. If your error handling then retries &lsquo;the batch,&rsquo; you re-send those 49, duplicating them. <code>allSettled</code> gives you a per-send result, so you retry exactly the one that failed and leave the 49 alone. The idempotency key would still catch the duplicates, but relying on it to clean up a batch you needlessly re-sent is sloppy &mdash; <code>allSettled</code> avoids creating the duplicates in the first place.

Follow: After allSettled you retry the one failed address. Doesn&rsquo;t the idempotency key make the whole batch-vs-individual distinction moot anyway?
The idempotency key is the <b>safety net, not the plan</b> &mdash; it guarantees a duplicate <i>attempt</i> won&rsquo;t reach the user twice, but you still shouldn&rsquo;t <i>generate</i> needless duplicates and lean on dedup to clean up. <code>allSettled</code> + retry-only-the-failure means you make exactly the sends you need; the key then protects the <i>separate</i> case where the retry of that one failure itself gets retried. So they work at different layers: <code>allSettled</code> keeps the batch from re-sending the 49 that succeeded, and the key protects any individual send from its own retries. Relying on the key alone would work but wastes provider quota and muddies delivery metrics with duplicates &mdash; correct plumbing plus the key is belt <i>and</i> suspenders.

Senior: Knowing <b><code>Promise.allSettled</code> tolerates partial failure so only the bad send retries</b> &mdash; and that <code>Promise.all</code>&rsquo;s short-circuit creates a duplicate-send risk on the already-sent members &mdash; is a concrete correctness detail that signals real batch-processing experience.
Speak: Name the batch primitive: <b>'Promise.allSettled, not Promise.all &mdash; one bad address doesn&rsquo;t fail the batch, and you retry only the failure.'</b> Promise.all short-circuits on the first rejection, so you&rsquo;d re-send the 49 that already went out &mdash; a duplicate-send risk.

### SDE3 | Push channel specifics

You add mobile push. What do APNs and FCM force you to handle that email doesn&rsquo;t?

<b>Token lifecycle and payload caps.</b> Push targets a <b>device token</b> that goes stale &mdash; you must clean up on <code>410 Gone</code> (APNs) or <code>NotRegistered</code> (FCM), or you keep sending to dead devices. Payloads are <b>tiny</b> (APNs ~4 KB, FCM 4 KB data / 2 KB notification), so you send a summary and a deep link, not content. And the platforms differ: APNs stores only 1 notification per app when offline; FCM stores up to 100.

Follow: Why is cleaning up invalid tokens on 410/NotRegistered important, not just tidy?
Because <b>dead tokens accumulate and degrade the channel</b>: you waste sends on devices that will never receive them, your delivery metrics rot (a rising &lsquo;failed&rsquo; rate that&rsquo;s really just stale tokens), and some providers penalize senders who repeatedly push to invalid tokens. The <code>410</code>/<code>NotRegistered</code> response <i>is</i> the provider telling you &lsquo;this token is gone, stop&rsquo; &mdash; so you remove it from the user&rsquo;s device set. Ignoring it means an ever-growing fraction of your push volume is aimed at nothing, and your reputation and metrics both suffer.

Follow: The same user has your app on a phone and a tablet. How does &lsquo;notify the user&rsquo; map to devices?
&lsquo;User&rsquo; maps to a <b>set of device tokens</b>, not one &mdash; you keep a device registry per user (each token with its platform, APNs vs FCM, and last-seen), and a push fans out to all <i>active</i> tokens for that user. So one logical notification becomes N device pushes, deduped at the human level by the in-app/badge state, not by the push layer. Two consequences: token cleanup (from <code>410</code>/<code>NotRegistered</code>) prunes that per-user set so you don&rsquo;t push to an uninstalled device, and &lsquo;mark read on one device clears the badge everywhere&rsquo; is driven by the server-side read state (the row-per-recipient), not the push. Push is per-device; &lsquo;the user has seen it&rsquo; lives in the store above the devices.

Senior: Knowing push forces <b>token cleanup on 410/NotRegistered and tiny payloads (summary + deep link, not content)</b> &mdash; plus the APNs/FCM offline-storage difference &mdash; is the channel-specific depth that shows you&rsquo;ve shipped mobile push, not just read about it.
Speak: Handle the push realities: <b>'clean up tokens on 410 Gone / NotRegistered, and keep payloads tiny &mdash; a summary and a deep link.'</b> Dead tokens waste sends and rot your metrics and reputation; APNs and FCM cap payloads at a few KB, so content lives behind the link.

### SDE3 | Digest and aggregation

A user follows a busy project and gets 200 notifications an hour. How do you keep that from being unusable?

<b>Frequency preferences with digest aggregation.</b> Instead of 200 instant notifications, the user opts into an <b>hourly or daily digest</b>: the system buffers their notifications and, on the schedule, collapses them into <i>one</i> summary (&lsquo;42 updates on Project X&rsquo;) with the details linked. Instant stays the default for transactional/urgent categories; digest is for high-volume, low-urgency streams. It&rsquo;s a preference (per category), so the user chooses the cadence.

Follow: How do you implement the buffering &mdash; where do the pending digest items live?
You <b>still write each in-app notification immediately</b> (so the badge and the list are current), but you <b>suppress the per-item email/push</b> and instead accumulate the items for that user+category in a pending-digest bucket keyed by the digest window. A scheduled job fires per window, reads the bucket, renders one summary email, sends it, and clears the bucket. So the in-app channel is always instant and complete; only the <i>push/email</i> side is batched into the digest. The buffer is just &lsquo;the unsent items since the last digest,&rsquo; which the schedule drains.

Follow: A digest is hourly, but a security alert fires mid-window. Does it wait for the digest?
No &mdash; <b>urgency overrides frequency</b>. Digest is a per-<i>category</i> preference, so transactional/urgent categories (a security alert, a password reset) are <b>always instant regardless of the digest setting</b>; only the high-volume, low-urgency categories the user chose to digest get buffered. So the security alert skips the bucket and sends immediately, while &lsquo;42 project updates&rsquo; wait for the hourly summary. This is why frequency is scoped per category rather than global &mdash; a single &lsquo;digest everything&rsquo; switch would dangerously delay the notifications that must be instant. The category&rsquo;s urgency, not the schedule, decides whether something waits; the digest only ever holds things it&rsquo;s safe to delay.

Senior: Offering <b>per-category digest frequency (instant for transactional, hourly/daily for high-volume)</b> &mdash; and keeping in-app instant while only batching email/push into the summary &mdash; is the product-and-systems judgment a senior answer brings.
Speak: Offer digest: <b>'per-category frequency &mdash; instant for transactional, hourly or daily digest for high-volume streams.'</b> Keep in-app instant and complete; only batch the email/push into one summary. The buffer is just the unsent items since the last digest, drained on schedule.

### SDE3 | Delivery tracking

How do you know whether a notification was actually delivered and seen &mdash; and what do you do with that?

Track a <b>lifecycle of events</b> per notification: SENT, DELIVERED, OPENED, CLICKED, BOUNCED, FAILED. Model it as an <b>observer/event stream</b> &mdash; each delivery emits events that subscribers consume (analytics, a delivery-rate monitor, and the fallback trigger). Use <code>Promise.allSettled</code> across observers so one failing consumer doesn&rsquo;t block the others. This gives you ground truth for the smart fallback and for deliverability metrics.

Follow: Which of those lifecycle events actually drives system behavior, versus just analytics?
<b>OPENED</b> (on the in-app) drives the <b>fallback</b> &mdash; it&rsquo;s what tells you whether to cancel the pending email or cascade to it. <b>BOUNCED</b> and <b>FAILED</b> drive <b>suppression and retry</b> &mdash; a hard bounce adds the address to a suppression list, a soft failure schedules a retry. The rest (DELIVERED, CLICKED) are mostly <b>analytics and deliverability monitoring</b>. So the events aren&rsquo;t just a dashboard: OPENED and BOUNCED close real control loops (fallback, suppression), which is why you capture them as first-class events rather than just logging.

Follow: How do you actually capture OPENED and BOUNCED &mdash; and can you trust those signals?
They come from <b>different sources with different reliability</b>. <b>BOUNCED</b> and DELIVERED come from the <b>provider&rsquo;s webhooks</b> (SES publishes bounce and delivery events to an SNS topic you consume) &mdash; authoritative, which is why they can safely drive suppression. <b>OPENED</b> for email is a <b>tracking pixel</b>, which is <i>lossy</i> &mdash; image-proxying clients block it, and Apple Mail Privacy Protection pre-fetches and inflates opens &mdash; so email-open is a soft signal. That&rsquo;s why the fallback keys on the <b>in-app OPENED</b> (a real, server-observed read) rather than the email pixel: the in-app read is trustworthy, the email open isn&rsquo;t. So you trust provider webhooks for delivery/bounce and treat email-open as best-effort analytics, driving control loops only off signals you can believe.

Senior: Modeling delivery as a <b>lifecycle event stream (SENT/DELIVERED/OPENED/BOUNCED) with allSettled observers</b> &mdash; and knowing which events drive behavior (OPENED &rarr; fallback, BOUNCED &rarr; suppression) vs analytics &mdash; is the observability-and-control depth a senior round wants.
Speak: Track the lifecycle: <b>'SENT, DELIVERED, OPENED, BOUNCED &mdash; as an event stream with allSettled observers.'</b> OPENED drives the fallback (cancel or cascade), BOUNCED drives suppression; the rest is analytics. Capture the control-loop events as first-class, not just logs.

### SDE3 | Multi-tenant isolation

Your platform is multi-tenant. What has to be tenant-scoped in the notification system?

Nearly everything on the send path: <b>recipient resolution</b> (a role resolves only within the tenant), the <b>sender identity</b> (email goes out under the tenant&rsquo;s own verified domain/sender, so it can&rsquo;t impersonate another), <b>templates and branding</b>, <b>preferences</b>, and <b>rate limits</b> (one tenant&rsquo;s burst can&rsquo;t consume another&rsquo;s send capacity). A cross-tenant leak here &mdash; notifying the wrong tenant&rsquo;s users, or sending under the wrong sender &mdash; is the same severity as an authorization leak.

Follow: Why is the per-tenant <i>sender</i> identity a security concern, not just cosmetics?
Because sending under a shared or wrong sender lets one tenant&rsquo;s notifications <b>appear to come from another tenant</b> &mdash; or from your platform generically &mdash; which is an impersonation and a phishing vector, and it also <b>pools deliverability reputation</b> so one tenant&rsquo;s spam complaints tank everyone&rsquo;s inbox placement. A per-tenant verified sender means each tenant&rsquo;s mail is authenticated as theirs (SPF/DKIM/DMARC on their domain), reputation is isolated, and a recipient can trust the from-address. It&rsquo;s the email-layer expression of the same tenant boundary the authz topic enforces on data.

Follow: One tenant fires a million-recipient campaign. How do you keep that from delaying every other tenant&rsquo;s notifications?
You <b>isolate send capacity per tenant</b> so one tenant&rsquo;s burst can&rsquo;t monopolize the shared pipeline &mdash; the noisy-neighbor problem. Concretely: per-tenant rate limits (a tenant draws from its own budget, not the global one), and ideally <b>fair scheduling</b> across tenants at fan-out (round-robin or weighted queues) so a huge tenant&rsquo;s million sends interleave with a small tenant&rsquo;s two rather than the small tenant waiting behind the whole campaign. Transactional traffic should also outrank bulk, so a password-reset never queues behind a marketing blast. Without this the system is technically multi-tenant but operationally single-tenant &mdash; the biggest sender sets everyone&rsquo;s latency &mdash; the same fairness concern the platform enforces wherever a resource is shared.

Senior: Recognizing that <b>resolution, sender identity, templates, preferences, and rate limits all need tenant scoping</b> &mdash; and that a per-tenant sender is a security and deliverability control, not branding &mdash; is the multi-tenant awareness a senior interviewer checks.
Speak: Scope to the tenant: <b>'resolution, sender identity, templates, preferences, and rate limits all per-tenant.'</b> A per-tenant verified sender isn&rsquo;t branding &mdash; it stops impersonation and isolates deliverability reputation, the email-layer version of the authz tenant boundary.

### Staff | Smart fallback

You have in-app and email. A naive system sends both, every time. Design something better.

A <b>smart fallback / cascade</b> (LinkedIn&rsquo;s &lsquo;air traffic controller&rsquo; pattern): send the cheap <b>in-app first</b>, wait a window, and escalate to <b>email only if the in-app went unseen</b>. If the user <b>opens the in-app within the window, cancel the pending email</b>. You reach the user once, on the channel that worked, instead of double-notifying on every channel. It needs delivery tracking (an OPENED event) and a scheduled, cancelable email send.

Follow: What does the cancel-the-pending-email step actually require in the implementation?
A <b>scheduled send you can revoke</b>: when the in-app goes out, you enqueue the email with a <i>delay</i> equal to the fallback window (a delayed queue message, a scheduled job, or a &lsquo;send_after&rsquo; timestamp). If an OPENED event for the in-app arrives before the delay elapses, you <b>cancel that scheduled send</b> (delete the delayed message / mark the job canceled). So it&rsquo;s two pieces: delivery tracking that emits OPENED, and a delayed-send mechanism that&rsquo;s cancelable. If your email path is fire-immediately with no delay, you can&rsquo;t implement cancel &mdash; the escalation has to be <i>scheduled</i>, not instant, for the cancel to have a window to act in.

Follow: How do you choose the fallback window &mdash; too short spams, too long delays the email?
By the <b>notification&rsquo;s urgency and the channel&rsquo;s realistic check cadence</b>. For something time-sensitive (a security alert), a short window (minutes) &mdash; you&rsquo;d rather send both than delay the email. For routine updates, a longer window (a few hours, like ATC&rsquo;s default) because most active users will see the in-app soon and the email is pure backup. You can make it <b>per-category</b>: urgent categories skip or shorten the fallback, low-urgency ones use a long window. The window is a tuning knob trading &lsquo;risk of a redundant email&rsquo; against &lsquo;risk of a delayed one,&rsquo; set by how much the specific notification&rsquo;s latency matters.

Senior: Designing the <b>cascade (in-app first, email on unseen, cancel-on-open) with a scheduled cancelable send and a per-category window</b> &mdash; rather than firing every channel &mdash; is exactly the multi-channel sophistication that lands a Staff signal.
Speak: Design the cascade: <b>'in-app first, wait a window, email only if unseen &mdash; and cancel the pending email if they open the in-app.'</b> It needs an OPENED event and a scheduled, cancelable send. You reach the user once, on the channel that worked, instead of firing every channel.

### Staff | Ordering

Do notifications need to be delivered in order? A user gets &lsquo;order shipped&rsquo; before &lsquo;order confirmed.&rsquo; Is that a bug?

<b>Usually you don&rsquo;t need global ordering, but per-user causal ordering can matter</b> &mdash; and &lsquo;shipped before confirmed&rsquo; is the case where it does. The answer is to order <b>per recipient</b>, not globally: partition the notification stream by <code>user_id</code> so one user&rsquo;s notifications are processed in sequence, while different users stay parallel. Global ordering across all users is unnecessary and would kill throughput; per-user ordering is cheap and fixes the visible anomaly.

Follow: How does partitioning by user_id give you per-user ordering without serializing everything?
Because a <b>partitioned consumer</b> (the Kafka model) guarantees ordering <i>within</i> a partition but processes partitions in parallel. If you partition by <code>user_id</code>, every notification for a given user lands in the same partition and is consumed in order, so that user never sees &lsquo;shipped before confirmed.&rsquo; But user A&rsquo;s partition and user B&rsquo;s partition are handled by different consumers concurrently, so total throughput scales with partition count. You get ordering exactly where it&rsquo;s observable (one user&rsquo;s timeline) and parallelism everywhere else &mdash; the standard way to buy causal order without a global serialization bottleneck.

Follow: Partitioning by user_id means one slow message blocks that user&rsquo;s whole partition. Is ordering always worth that?
No &mdash; ordering has a real cost (head-of-line blocking within the partition), so you impose it <b>only where the anomaly is observable and harmful</b>. &lsquo;Shipped before confirmed&rsquo; matters; &lsquo;two unrelated updates arrived out of order&rsquo; doesn&rsquo;t. So often the better answer is <b>not</b> to serialize at all and instead make notifications <b>order-independent</b> &mdash; each carries enough context to stand alone (&lsquo;Order #123 shipped&rsquo; is meaningful even if &lsquo;confirmed&rsquo; is late), or the <i>display</i> orders by the event&rsquo;s business timestamp rather than delivery order. Reserve per-user partitioning for genuine causal chains and let everything else be unordered and parallel. The senior move is recognizing most notifications don&rsquo;t need ordering, so you pay the blocking cost surgically, not everywhere.

Senior: Scoping ordering to <b>per-user (partition by user_id) rather than global</b> &mdash; recognizing that &lsquo;shipped before confirmed&rsquo; is a per-user causal-order bug, not a call for global ordering &mdash; is the distributed-systems judgment that separates Staff from &lsquo;add a queue.&rsquo;
Speak: Order per user, not globally: <b>'partition the stream by user_id so one user&rsquo;s notifications are sequenced, while users stay parallel.'</b> &lsquo;Shipped before confirmed&rsquo; is a per-user causal-order bug; global ordering is unnecessary and kills throughput.

### Staff | Bounces and sender reputation

Emails are landing in spam and your bounce rate is climbing. What&rsquo;s happening and how do you protect deliverability?

You&rsquo;re damaging <b>sender reputation</b>. Fixes: <b>authenticate</b> (SPF, DKIM, DMARC on the sending domain), <b>honor bounces and complaints</b> &mdash; a hard bounce or spam complaint must add the address to a <b>suppression list</b> so you never send to it again (repeated sends to bad addresses are what tank reputation), <b>warm up</b> new sending domains gradually, and <b>separate transactional from promotional</b> streams (ideally different domains/IPs) so marketing complaints don&rsquo;t sink transactional deliverability.

Follow: Why does continuing to send to bounced addresses hurt <i>other</i> users&rsquo; deliverability?
Because mailbox providers judge you by your <b>aggregate sender reputation</b>, and a high bounce/complaint rate signals &lsquo;this sender doesn&rsquo;t manage their list&rsquo; &mdash; so they start filtering <i>all</i> your mail, including to perfectly good addresses. One sender, one reputation: the bad addresses drag down the good. That&rsquo;s why honoring bounces (suppression) isn&rsquo;t optional hygiene &mdash; it&rsquo;s protecting the deliverability of every <i>other</i> recipient. And separating transactional from promotional onto different domains isolates the reputations, so a promotional campaign&rsquo;s complaints don&rsquo;t bury a password-reset email.

Follow: Do you treat every bounce the same &mdash; suppress on the first one?
No &mdash; you distinguish <b>hard from soft bounces</b>. A <b>hard bounce</b> (invalid address, domain doesn&rsquo;t exist) is permanent, so you <b>suppress immediately</b> &mdash; retrying only damages reputation. A <b>soft bounce</b> (mailbox full, temporary server issue, greylisting) is transient, so you <b>retry a few times with backoff</b> before giving up and suppressing. Collapsing them would either wrongly stop mailing a valid recipient whose inbox was briefly full, or keep hammering a dead address and tank reputation. Complaints (the spam button) are their own category: treat as a hard suppression <i>and</i> a signal to review why that mail was unwanted. So bounce handling is a small classifier &mdash; permanent to suppression, transient to bounded retry, complaint to suppression-plus-review &mdash; not one blanket rule.

Senior: Connecting <b>bounce/complaint handling and suppression lists to aggregate sender reputation</b> &mdash; and isolating transactional from promotional streams so one can&rsquo;t sink the other &mdash; is deliverability depth most candidates don&rsquo;t have, which reads as Staff.
Speak: Protect the reputation: <b>'authenticate with SPF/DKIM/DMARC, honor bounces into a suppression list, warm up domains, split transactional from promotional.'</b> Sending to bounced addresses tanks aggregate reputation, filtering <i>all</i> your mail &mdash; so suppression protects every other recipient.

### Staff | Cost at scale

At a billion notifications a month, where does the money actually go &mdash; and what do you optimize?

The <b>fan-out infrastructure is nearly free relative to channel delivery</b>. The pub/sub layer, the queues, the in-app writes &mdash; rounding error. The cost is <b>per-message channel delivery</b>, and <b>SMS dominates</b> (cents per message plus carrier fees), then push/email are cheap, and in-app is essentially free (a DB row). So the cost conversation at scale is <b>which channels you enable and how you throttle them</b> &mdash; SMS provider arbitrage, 10DLC carrier-fee management, and pushing users toward in-app/push over SMS &mdash; not the messaging backbone.

Follow: So what&rsquo;s the highest-leverage cost lever &mdash; optimizing the infrastructure or the channel mix?
The <b>channel mix</b>, decisively. Halving your queue costs saves rounding error; moving 20% of SMS volume to push saves real money, because SMS is orders of magnitude more expensive per message than push or in-app. So the levers are: <b>default to the cheap channels</b> (in-app/push) and reserve SMS for genuinely SMS-worthy notifications (a login code), <b>use fallback</b> so you don&rsquo;t send SMS <i>and</i> push for the same event, and <b>manage SMS provider/carrier costs</b> directly. The engineering instinct to optimize the code path is misapplied here &mdash; at notification scale, the architecture decision <i>is</i> the channel-enablement policy, and that&rsquo;s where the spend lives.

Follow: At a billion a month, is it cheaper to keep buying SES/Twilio, or build your own delivery?
You almost always <b>keep buying delivery</b> and build only the <i>orchestration</i>. The expensive, hard part of email/SMS is <b>deliverability and carrier relationships</b> &mdash; IP reputation, SPF/DKIM/DMARC at scale, ISP feedback loops, SMS carrier registration (10DLC), global routing &mdash; which providers have spent years and infrastructure on. Reproducing that to run your own SMTP or connect to carriers directly rarely beats their per-message price until truly enormous, specialized volume, and it hands you reputation and compliance risk you&rsquo;re now managing alone. So the build-vs-buy line sits between <b>orchestration and transport</b>: you build fan-out, preferences, idempotency, fallback, and channel policy (your differentiation), and you buy the actual send (their scale, reputation, carrier plumbing). The cost lever stays the channel mix, not vertically integrating transport.

Senior: Knowing that at scale <b>SMS delivery dominates cost while the fan-out backbone is rounding error</b> &mdash; so the real lever is channel mix and fallback, not infrastructure micro-optimization &mdash; is the cost-modeling judgment that marks a Staff answer.
Speak: Follow the money: <b>'the fan-out backbone is rounding error; SMS delivery dominates.'</b> The lever is the channel mix &mdash; default to in-app and push, reserve SMS for login codes, use fallback so you don&rsquo;t send SMS and push for one event. The architecture decision is the channel-enablement policy.

### Staff | The whole design

Tie it together: one sentence for how you&rsquo;d design a multi-channel notification system.

<b>Producers emit events at a fan-out boundary; the system resolves recipients by role, fans out on their preferences, delivers effectively-once via a content-derived idempotency key, uses in-app as the cheap polled default and email/push as reach with a smart fallback, retries per-channel with a DLQ, and tracks the delivery lifecycle</b> &mdash; so a user reliably gets each notification once, on the channel that works, and no producer ever knows a channel exists. The hard parts are idempotency and the fallback, not the channels.

Follow: If you could only ship three of those, which three?
<b>The fan-out boundary</b> (producers emit events, stay channel-ignorant &mdash; without it, channel logic scatters and never recovers), <b>idempotency</b> (a content-derived key + dedup store &mdash; without it, every retry double-notifies, which is the fastest way to look broken), and <b>the in-app row-per-recipient model with a partial unread index</b> (the cheap, always-correct default channel). Those three are the skeleton: a boundary so it&rsquo;s maintainable, idempotency so it&rsquo;s correct under retries, and a working default channel. Preferences, fallback, digests, and multi-channel are depth layered on that spine &mdash; addable without a rewrite.

Follow: You&rsquo;ve shipped the spine. What&rsquo;s the first thing that breaks as you scale, and what do you add?
The first things to bite are <b>channel cost and user overload</b>. As volume climbs, <b>SMS spend</b> and double-notifying (email <i>and</i> push for one event) start to hurt, so the first additions are the <b>smart fallback</b> (reach the user once, on the channel that worked) and <b>digest/frequency preferences</b> (so a busy user isn&rsquo;t buried) &mdash; both directly attack the two pains a naive multi-channel system creates. Close behind is <b>deliverability</b>: as email volume grows, bounce/complaint handling and sender-reputation management become load-bearing, because ignoring them silently sinks inbox placement. So the evolution is spine &rarr; fallback + digests (cost and overload) &rarr; deliverability hygiene &mdash; each added when the scale that makes it matter actually arrives, not all up front.

Senior: Compressing the whole system into <b>&lsquo;fan-out boundary + idempotent delivery + polled in-app default + smart fallback&rsquo;</b> &mdash; and being able to name the irreducible three under pressure &mdash; is the systems-level framing that lands a Staff signal.
Speak: Land the whole thing: <b>'fan-out boundary, idempotent delivery, polled in-app default, smart fallback.'</b> Under pressure, name the irreducible three: the boundary (maintainable), idempotency (correct under retries), the in-app row model (a working default). The rest is depth on that spine.

## Whiteboard

For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run the delivery boundary on a whiteboard.

### Entry &mdash; what hands work to the notification system, and how.

A producer calls <code>notify(user, event)</code> &mdash; a <b>domain event</b>, not a channel. The producer knows nothing about email or in-app; the system owns delivery.

### Idempotency &mdash; why a retry doesn&rsquo;t double-notify.

A <b>deterministic id</b> &mdash; <code>hash(user, event, channel)</code> &mdash; recorded with a conditional write. A retry computes the same id, collides, and sends nothing.

### Resolution &mdash; who actually gets it.

The event names a <b>role</b>; resolution expands it against <b>current membership</b>, scoped to the tenant, into concrete users + their channel prefs. No stale list.

### Fan-out &mdash; one event to N channels.

Read each recipient&rsquo;s <b>preferences</b>; fan the single event to their enabled channels &mdash; in-app, email, or both. The producer emitted once; here it becomes deliveries.

### In-app &mdash; the cheap default channel.

An <b>INSERT of one row per recipient</b> (~100 bytes), with a <b>partial index on unread</b>. The badge is a seek; the client polls it every ~60s.

### Email &mdash; reach and backup.

<b>SES</b>, batched with <code>allSettled</code> (one bad address doesn&rsquo;t fail the batch), under the <b>tenant&rsquo;s sender</b>, throttled so a burst doesn&rsquo;t spam.

### Failure &mdash; what a failed send does.

<b>Classify</b>: retryable &rarr; backoff + jitter; non-retryable &rarr; DLQ. Per-channel policy. Every retry rides the same idempotency key, so it can&rsquo;t double-send.

### Fallback &mdash; not firing every channel every time.

In-app first; if <b>unseen</b> in a window, cascade to email; if <b>opened</b> in time, <b>cancel the pending email</b>. Reach the user once, on the channel that worked. (The one people do backwards.)

### Tracking &mdash; how the fallback and metrics know.

A lifecycle stream &mdash; <b>SENT, DELIVERED, OPENED, BOUNCED</b>. OPENED drives the fallback; BOUNCED drives suppression. Ground truth for both control loops and analytics.

```html

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
        
```

Foot: <b>The one people forget:</b> step 8. A good system <i>doesn&rsquo;t</i> fire every channel every time &mdash; it sends the cheap in-app first and escalates to email only if unseen, canceling the pending email if the user opens the in-app. If you send both at once, the interviewer knows you&rsquo;ve built a for-loop over channels, not a considerate notification system.

Verdict: <b>All nine cold.</b> You can rebuild the delivery path on a whiteboard from memory — the notification-system round is yours to lose, not to pass.

## System

Notifications are the <b>delivery boundary</b>. The systems around it <b>produce events</b>; notifications <b>fan them out</b> to the channels a user watches, once; the user <b>sees</b> one. Knowing what sits on either side &mdash; and being able to walk the whole chain from an emitted event to a seen notification &mdash; is what turns a &lsquo;send an email&rsquo; answer into a systems answer.

### Where the delivery boundary sits

Event producers: services emit domain events (order shipped, rollout done)
Notification fan-out: dedupe &middot; resolve recipients &middot; route on preferences [*]
In-app + email channels: Postgres row (polled) + SES (batched, per-tenant sender)
Delivery + fallback: in-app first &rarr; email if unseen &middot; retry / DLQ
Delivery tracking: SENT / DELIVERED / OPENED / BOUNCED lifecycle
The user: sees one notification, on the channel that worked

### Interviewer pivot points

The questions that bridge out of the notification system. Each one leads into another deep-dive &mdash; tap to see the connecting answer.

#### Who can this notification address &mdash; how do I keep one tenant&rsquo;s notifications off another&rsquo;s users?

-> Tenant authorization (3)
Recipient resolution is <b>tenant-scoped</b> &mdash; the same per-tenant boundary the authorization layer enforces on data. &lsquo;Notify the admins of tenant T&rsquo; can only resolve to users <i>within</i> T, and a bug that resolved cross-tenant would be the same class of leak as a missing authorization filter. The email also goes out under the <b>tenant&rsquo;s own verified sender</b>, so one tenant can never address or impersonate another&rsquo;s users. Notifications <b>inherit</b> the tenant boundary; they don&rsquo;t re-invent it.

#### A firmware rollout finishing &mdash; or drifting &mdash; is one of the events I notify on. Where does that event come from?

-> Desired-state (7)
From the <b>reconciler</b>. When the desired-state loop detects that a device reached its target (or drifted from it), that&rsquo;s a domain event &mdash; &lsquo;fleet reconciled,&rsquo; &lsquo;drift detected&rsquo; &mdash; and it flows to the notification system exactly like any producer&rsquo;s event: <code>notify(operator, event)</code>. The reconciler owns <i>deciding</i> the state changed; notifications own <i>telling the right people</i>, once, on the right channel. Clean boundary: the producer detects, the notifier delivers.

#### The pipeline finishing an upload could notify the user. How does that hook in?

-> Content pipeline (1)
The same way: the pipeline, on completion (or failure), <b>emits an event</b> &mdash; &lsquo;your upload is processed,&rsquo; &lsquo;processing failed&rsquo; &mdash; and hands it to the notification boundary. It doesn&rsquo;t call SES or write an in-app row itself; it stays <b>channel-ignorant</b> and emits a domain event. That&rsquo;s the whole point of the fan-out boundary: <i>any</i> producer &mdash; pipeline, rollout, billing &mdash; notifies the same way, and the notification system decides channels, preferences, and fallback.

#### Where do per-user notification preferences live &mdash; isn&rsquo;t that just another per-entity attribute store?

-> EAV (6)
It rhymes with it. Preferences are <b>per-user attributes</b> with <b>defaults and overrides</b> &mdash; a global default, overridden per category and per channel &mdash; which is exactly the <code>COALESCE(override, default)</code> resolution the EAV topic uses for device attributes. The difference is the read pattern: preferences are read on <i>every</i> fan-out, so they live behind a <b>~1ms cache</b>, whereas a general attribute store optimizes for flexibility. Same override/default modeling, tuned for a hot read path.

#### The SES sender, the topics, the dedup store &mdash; how is that infrastructure locked down?

-> AWS hardening (4)
With the same posture as any AWS layer: the notification service holds a <b>least-privilege role</b> (send as <i>this</i> tenant&rsquo;s verified sender, publish to <i>these</i> topics, nothing broad), the <b>per-tenant sender identities</b> are verified (SPF/DKIM/DMARC) so mail is authenticated and reputations isolated, and the dedup store and queues are private and encrypted. A compromised notification credential should send bounded, authenticated mail &mdash; not spam the world as anyone. That lockdown is the AWS-hardening topic.

#### I need sub-second in-app delivery, not 60-second polling. How does push actually work?

-> Push channel (WebSocket / APNs / FCM)
You move from <b>pull to push</b>. For web/in-app, a <b>WebSocket or SSE</b> connection the server writes to the moment a notification is delivered &mdash; you track per-user connection state with heartbeats, and you <b>persist first, push second</b> so an offline user still finds it in the unread index on reconnect. For mobile, <b>APNs/FCM</b> with device tokens (cleaned up on 410/NotRegistered) and tiny payloads (a summary + deep link). Push is the accelerator on top of the durable store, never the source of truth.

#### How do I know delivery is actually healthy &mdash; that mail isn&rsquo;t silently going to spam?

-> Observability / deliverability
From the <b>delivery lifecycle</b> and provider feedback. You track SENT/DELIVERED/OPENED/BOUNCED per notification and watch the aggregates: a rising <b>bounce or complaint rate</b> is the early signal of a reputation problem, a falling <b>open rate</b> hints at spam-foldering. You honor bounces into a <b>suppression list</b>, authenticate with SPF/DKIM/DMARC, and split transactional from promotional so one can&rsquo;t sink the other. Deliverability isn&rsquo;t &lsquo;did SES accept it&rsquo; &mdash; it&rsquo;s &lsquo;did it reach the inbox,&rsquo; which only the feedback loop tells you.

## Trade-offs

The notification decisions an interviewer drills &mdash; each with the <b>axis</b> that picks a side. The senior move is naming what forces the choice; the tell that sinks you is defending one channel or one guarantee as universally right, because here the honest answer is almost always about the <b>latency and criticality the notification actually needs</b>.

### Poll vs push (in-app delivery)

- Poll: it&rsquo;s a <b>notification badge</b> and a minute of latency is fine &mdash; a stateless query against the unread index every ~60s, no connection to maintain. The right default.
- Push (WebSocket/SSE): the product needs <b>sub-second</b> delivery &mdash; a chat, a live feed &mdash; and you accept a connection per active user and delivery-on-write plumbing.

Polling load grows as you shorten the interval (most polls find nothing), so poll for a badge and push only when the latency requirement is genuinely real-time. With push, <b>persist first</b> &mdash; it&rsquo;s an accelerator, not the source of truth.

### One topic per domain vs per-channel topics

- One topic per event domain: you want <b>publishers channel-ignorant</b> &mdash; they emit an event, subscriber filter policies route to channels, and a new channel is a new subscription with zero publisher change.
- Per-channel topics/queues: you need <b>per-channel SLA isolation</b> (transactional SMS vs marketing email) &mdash; give each a queue with its own timeout and concurrency, fed from the one topic.

Default to one topic with subscriber-side filter policies (publishers stay ignorant of channels); split to per-channel <i>queues</i> for SLA, and separate <i>topics</i> only when filter policies stop scaling or hit the key limit.

### At-least-once + idempotent vs exactly-once

- At-least-once + idempotency: <b>always</b> &mdash; retry until acked so nothing is lost, dedupe on a content-derived key so duplicates don&rsquo;t reach the user. The achievable, correct guarantee.
- Exactly-once delivery: <b>never claim it end-to-end</b> &mdash; it&rsquo;s impossible across a network; you can&rsquo;t tell a lost ack from a failed send. Exactly-once <i>effect</i> is what you build.

There&rsquo;s really one answer: at-least-once delivery plus idempotent processing equals effectively exactly-once. Claiming exactly-once <i>delivery</i> is the red flag; naming exactly-once <i>effect</i> is the senior move.

### In-app in the main Postgres vs a dedicated store

- The main Postgres (row per recipient): volume is moderate and a <b>partial index on unread</b> keeps the badge query cheap &mdash; simplest, transactional with the rest of your data, ~100 bytes/row.
- A dedicated store (Cassandra/DynamoDB): notification volume dwarfs the rest of the app and would <b>bloat the primary</b> &mdash; a write-optimized store with per-user partitioning and TTL for old notifications scales the fan-in independently.

Start in Postgres with a partial unread index &mdash; it&rsquo;s enough for a long time and keeps things simple. Move to a dedicated write-optimized store when notification writes become a meaningful fraction of your primary&rsquo;s load, not before.

### Instant vs digest

- Instant: the notification is <b>transactional or urgent</b> &mdash; a login code, a payment, a security alert &mdash; where latency matters and one-at-a-time is correct.
- Digest (hourly/daily): it&rsquo;s a <b>high-volume, low-urgency</b> stream &mdash; activity on a busy project &mdash; where 200/hour is unusable and one summary is kind. A per-category preference.

Make it a per-category preference: instant for transactional, digest for high-volume feeds. Keep the in-app instant and complete either way; only batch the email/push into the summary.

### Fire every channel vs smart fallback

- Fire every enabled channel: the notification is <b>critical</b> and redundancy beats politeness &mdash; a security alert where you&rsquo;d rather over-notify than risk it being missed.
- Smart fallback (cascade): the default &mdash; in-app first, email only if unseen in a window, cancel the pending email if opened. Reach the user <b>once</b>, on the channel that worked.

Cascade is the considerate default; firing all channels is reserved for genuinely critical notifications. The cascade needs an OPENED event and a <b>scheduled, cancelable</b> send &mdash; if your email path is fire-immediately, you can&rsquo;t cancel.

### Send synchronously vs enqueue

- Enqueue (async): <b>almost always</b> &mdash; the producer&rsquo;s request returns immediately, and a worker sends with retries and DLQ. Delivery latency and provider failures never block the producer.
- Synchronous send: <b>rarely</b> &mdash; only if the producer genuinely must confirm delivery inline (and even then, prefer enqueue-and-await-status). Blocking on SES in a request path is a smell.

Enqueue and let a worker deliver &mdash; sending in the producer&rsquo;s request path couples its latency and availability to the email provider&rsquo;s. Fire the event, return, deliver asynchronously with retries.

## Model Answers

### Design it | “Design a multi-channel notification system.”

A fan-out boundary: producers emit events, the system delivers once on the right channel, with a fallback when a channel is missed.

- FRAME | frame | I&rsquo;d frame it as a <b>fan-out boundary</b>: producers emit a domain event &mdash; notify this user of this thing &mdash; and the notification system owns everything after: channels, preferences, delivery-once, fallback. Producers stay channel-ignorant. Let me build it up.
- HEADLINE | head | The first thing, before any channel, is <b>idempotency</b> &mdash; a deterministic id, hash of user, event, channel, checked before every send. Delivery is at-least-once and retries happen, so that key is what stops a double-notify. It&rsquo;s not optional.
- RESOLVE + FAN OUT | sub | Then I <b>resolve recipients</b> &mdash; usually a role, resolved against current membership, tenant-scoped &mdash; and <b>fan out</b> the event to each recipient&rsquo;s enabled channels, reading their preferences. One event becomes the deliveries the user actually wants.
- IN-APP | sub | In-app is the <b>cheap default</b>: a row per recipient in Postgres, ~100 bytes, with a partial index on unread so the badge is a seek. The client polls that index every minute &mdash; plenty for a badge.
- EMAIL + FALLBACK | sub | Email is <b>reach and backup</b>: SES, batched with allSettled, per-tenant sender, throttled. And it&rsquo;s the fallback &mdash; in-app first, email only if unseen in a window, cancel the pending email if they open the in-app. Reach the user once.
- NAME THE RISK | risk | The risk I&rsquo;d name is the <b>double-send</b> &mdash; which is why idempotency is first, not an afterthought &mdash; and the <b>spammy multi-channel</b>, which the smart fallback solves. The channels are easy; those two are the hard part.
- CLOSE | close | So: emit at a boundary, dedupe on a content key, resolve and fan out on preferences, in-app as the polled default, email as reach-and-fallback, retries with per-channel policy and a DLQ. A user gets each notification once, on the channel that worked.

### Guarantee delivery | “What delivery guarantee do you provide, and how?”

At-least-once delivery plus idempotent processing equals effectively exactly-once &mdash; the achievable target, not exactly-once delivery.

- FRAME | frame | The honest guarantee is <b>at-least-once delivery plus idempotent processing</b>, which together give effectively exactly-once. I want to be precise, because the common wrong answer is &lsquo;exactly-once,&rsquo; and that&rsquo;s a distributed-systems unicorn.
- WHY NOT EXACTLY-ONCE | head | Exactly-once <i>delivery</i> across a network is impossible: you can&rsquo;t distinguish &lsquo;the send succeeded but the ack was lost&rsquo; from &lsquo;the send failed,&rsquo; so any system that guarantees no loss <i>must</i> risk a duplicate. So I aim for exactly-once <b>effect</b>, not delivery.
- AT-LEAST-ONCE | sub | At-least-once is the <b>don&rsquo;t-lose half</b>: retry until the send is acknowledged, commit the offset only after a successful send, DLQ what exhausts retries. Nothing is silently dropped.
- IDEMPOTENT | sub | Idempotency is the <b>don&rsquo;t-duplicate half</b>: a content-derived id &mdash; hash of user, event, channel &mdash; recorded with a conditional write, so a retry of the same notification collides and sends nothing. The duplicate at-least-once <i>will</i> produce never reaches the user.
- THE PAIR | sub | Neither alone is enough. At-least-once without idempotency double-sends; idempotency without at-least-once can lose. Together they give the user the experience of exactly-once.
- NAME THE RISK | risk | The subtle failure is a <b>random idempotency id</b> &mdash; it doesn&rsquo;t collide on the retry, so you think you&rsquo;re deduping but you&rsquo;re not. The id must be a deterministic function of the notification&rsquo;s identity.
- CLOSE | close | So: at-least-once so nothing&rsquo;s lost, idempotent on a content key so nothing&rsquo;s doubled, and I&rsquo;d call that effectively exactly-once &mdash; and never claim exactly-once delivery, because that&rsquo;s the tell you haven&rsquo;t thought about lost acks.

### Walk a double-send | “Users report getting the same notification twice. Walk the debugging.”

Trace it to the idempotency key &mdash; missing on a path, random instead of deterministic, or a batch retried whole.

- FRAME | frame | A double-send is almost always the <b>idempotency key failing</b>, in one of three ways. I&rsquo;d figure out which from the logs before touching anything, because each has a different fix.
- SUSPECT ONE | head | One: the key <b>isn&rsquo;t applied on that send path</b> &mdash; a new channel, or code that calls the provider directly, bypassing the dedup check. The fix is routing <i>every</i> send through the same check: make the dedup unavoidable, not remembered per call site.
- SUSPECT TWO | sub | Two: the key is <b>random, not content-derived</b>. It looks like idempotency, but the retry generates a new id, so nothing collides. The fix is a deterministic id &mdash; hash of user, event, channel &mdash; so the retry of the same notification computes the same id.
- SUSPECT THREE | sub | Three: a <b>batch retried whole</b>. Promise.all short-circuited on one failure and the handler re-sent the batch, duplicating the members that already went out. The fix is allSettled, retrying only the actual failure.
- DIAGNOSE | sub | The logs tell me which: the same id sent twice means the check isn&rsquo;t running on that path; two <i>different</i> ids for one logical notification means the id isn&rsquo;t deterministic; a batch pattern means the all-vs-allSettled bug.
- NAME THE RISK | risk | The fix I&rsquo;d resist is &lsquo;add a check to that one endpoint&rsquo; &mdash; that&rsquo;s whack-a-mole. Idempotency has to be <b>structural</b>: one dedup gate every send goes through, so a new path can&rsquo;t forget it.
- CLOSE | close | So: classify from the logs &mdash; missing check, random id, or batch retry &mdash; fix the specific cause, then make the check structural so the class can&rsquo;t recur. The double-send is the fastest way to look broken, so it&rsquo;s worth closing at the class level.

### In-app at scale | “The notifications table has a hundred million rows. The unread badge is slow. Fix it.”

A partial index on unread keeps the badge a seek; cache the count if read volume, not query speed, is the wall.

- FRAME | frame | Two different problems hide in &lsquo;the badge is slow,&rsquo; and I&rsquo;d separate them: is the <b>query</b> slow, or is the <b>read volume</b> too high? Different fixes.
- QUERY | head | If the query is slow, the culprit is a <b>scan</b>. The fix is a <b>partial index on <code>read_at IS NULL</code></b> &mdash; it indexes only unread rows, so it stays tiny even with a hundred million <i>read</i> rows in the table. The unread count becomes a seek into a small index.
- WHY PARTIAL | sub | A partial index over a full one matters because read history grows unbounded &mdash; you accumulate read rows forever &mdash; but the <b>working set (unread) stays small per user</b>. Indexing only the working set keeps the hot query cheap permanently.
- VOLUME | sub | If instead the <i>volume</i> is the problem &mdash; the badge runs on every page load for every user &mdash; I <b>cache the count</b> in Redis, invalidated on new-notification and on mark-read. Most page loads never touch Postgres.
- ARCHIVE | sub | And I&rsquo;d <b>age out old read notifications</b> &mdash; TTL or archive to cold storage &mdash; so the hot table doesn&rsquo;t grow without bound. Old notifications are rarely read; they don&rsquo;t belong in the hot path.
- TRADE | trade | The cache trades a little staleness for a lot of read relief &mdash; a badge count a few seconds stale is fine, unlike a balance. So a short TTL plus event invalidation is the right consistency for this data.
- CLOSE | close | So: partial unread index for query speed, cached count for read volume, archive old rows for table size. Three levers for three versions of &lsquo;slow,&rsquo; and I&rsquo;d confirm which one it actually is first.

### Defend the design | “Why the fan-out boundary and idempotency &mdash; isn&rsquo;t that over-engineered for &lsquo;send an email&rsquo;?”

Because without the boundary channel logic scatters, and without idempotency every retry double-notifies &mdash; both cheap now, expensive to retrofit.

- FRAME | frame | &lsquo;Send an email&rsquo; is the demo; the system is what happens when there are ten producers, three channels, retries, and preferences. The two things I&rsquo;d defend hardest &mdash; the boundary and idempotency &mdash; are cheap now and painful to retrofit.
- WHY THE BOUNDARY | head | Without the <b>fan-out boundary</b>, channel logic scatters: every producer reimplements preferences, retry, throttling, fallback, inconsistently. Adding a channel touches all of them. The boundary makes &lsquo;add SMS&rsquo; one change and keeps producers ignorant &mdash; that&rsquo;s not over-engineering, it&rsquo;s what lets the system grow.
- WHY IDEMPOTENCY | sub | Without <b>idempotency</b>, every retry double-notifies &mdash; and retries are guaranteed, because delivery is at-least-once. A content-derived key and a dedup store is a few lines, and it&rsquo;s the difference between &lsquo;reliable&rsquo; and &lsquo;spams users on every blip.&rsquo;
- WHY FALLBACK | sub | The <b>smart fallback</b> looks optional until you&rsquo;ve annoyed users by firing email and in-app for the same event. In-app first, email if unseen, cancel on open &mdash; that&rsquo;s the difference between considerate and spammy, and users notice.
- WHAT I&rsquo;D CUT | sub | What I <i>would</i> cut to ship faster: digests, push, per-category preferences, a dedicated store &mdash; all addable later without a rewrite because the boundary is there. I&rsquo;d never cut the boundary or idempotency, because those <i>are</i> the rewrite if you skip them.
- TRADE | trade | So the cost is a bit more upfront structure; the payoff is a system that adds channels additively and never double-sends. A notification MVP that spams users isn&rsquo;t an MVP, it&rsquo;s an incident.
- CLOSE | close | The defense: every piece maps to a failure it prevents &mdash; scattered channel logic, double-sends, spammy multi-channel &mdash; and the two non-negotiables are the cheapest to add now and the most expensive to add later.

### Operate it | “It&rsquo;s live. How do you keep notifications actually reaching people?”

Watch the delivery lifecycle and provider feedback &mdash; bounces, opens, DLQ depth &mdash; and protect sender reputation.

- FRAME | frame | &lsquo;Sent&rsquo; isn&rsquo;t &lsquo;delivered,&rsquo; and &lsquo;delivered&rsquo; isn&rsquo;t &lsquo;seen.&rsquo; Operating a notification system is watching the <b>whole lifecycle</b> and the provider feedback, because the failures are mostly silent.
- LIFECYCLE | head | I track <b>SENT, DELIVERED, OPENED, BOUNCED</b> per notification as an event stream. A rising <b>bounce or complaint rate</b> is the earliest signal of a reputation problem; a falling <b>open rate</b> hints at spam-foldering. These aren&rsquo;t vanity metrics &mdash; they&rsquo;re the smoke alarm.
- REPUTATION | sub | Deliverability is <b>sender reputation</b>: I authenticate with SPF/DKIM/DMARC, honor bounces into a <b>suppression list</b> so I never re-send to a dead address, and split <b>transactional from promotional</b> so a marketing campaign&rsquo;s complaints can&rsquo;t sink password-reset emails.
- DLQ | sub | I watch <b>DLQ depth</b> &mdash; a spike means a channel or provider is failing &mdash; and alarm on it. The DLQ is where the failures that exhausted retries land, so it&rsquo;s the first place a systemic problem shows.
- FALLBACK HEALTH | sub | And I watch the <b>fallback</b>: if the in-app open rate drops, more traffic cascades to email, so a broken in-app path shows up as an email-volume spike. The channels are coupled, so the metrics are too.
- TRADE | trade | The cost is instrumentation and a feedback pipeline; the payoff is knowing about a deliverability problem from the bounce rate before users tell you they stopped getting emails. Silent failure is the enemy.
- CLOSE | close | So: track the lifecycle, alarm on bounce rate and DLQ depth, protect reputation with authentication and suppression, split transactional from promotional. Operating notifications is mostly about catching the <i>silent</i> failures.

### One you built | “Tell me about a notification system you&rsquo;ve actually built.”

The ICS dual-channel system: in-app via Postgres polling plus SES email, per-recipient rows, role-based resolution, per-tenant sender.

- CONTEXT | frame | At Invenco I built the <b>dual-channel notification system</b> for the platform &mdash; in-app plus email &mdash; serving operators managing a fleet of tens of thousands of payment terminals. Events like a firmware rollout completing or a device going offline needed to reach the right operators.
- IN-APP | head | In-app was a <b>row per recipient in Postgres</b> &mdash; about a hundred bytes each, with a <b>partial index on unread</b> so the badge query stayed a cheap seek. I sized it out: a million notifications is roughly a hundred megabytes, and read history could grow without slowing the unread count. The client <b>polled</b> the unread index every sixty seconds &mdash; plenty for a badge, far simpler than a socket.
- EMAIL | sub | Email went through <b>SES</b>, and this is where the interesting parts were. <b>Role-based recipient resolution</b> &mdash; &lsquo;notify the tenant&rsquo;s admins&rsquo; resolved against current membership &mdash; batched with <b>Promise.allSettled</b> so one bad address didn&rsquo;t fail the batch, capped at fifty per batch to match SES&rsquo;s BCC limit, under the <b>tenant&rsquo;s own sender identity</b>, and <b>throttled</b> to about one send per twenty seconds so a burst of events couldn&rsquo;t spam a user.
- THE TRADE-OFF | sub | I made the <b>polling-vs-realtime</b> call deliberately &mdash; I wrote out the trade-off table &mdash; and chose polling because a minute of latency was fine for these notifications and it saved maintaining a connection per operator. That&rsquo;s the decision I&rsquo;d defend: match the mechanism to the latency the feature needs.
- MULTI-TENANT | sub | The whole thing was <b>multi-tenant</b>: resolution scoped to the tenant, the per-tenant sender so one tenant&rsquo;s mail couldn&rsquo;t impersonate another&rsquo;s, and per-tenant throttling. The tenant boundary from the authorization layer carried straight into notifications.
- RESULT | trade | The result was a system where operators reliably got what they needed &mdash; in-app for the routine, email for reach &mdash; without duplicate spam, and where adding a notification type was emitting an event, not touching a channel. Simple where it could be, careful where it mattered.
- CLOSE | close | What I&rsquo;d carry forward: the <b>partial-index storage model</b> and the <b>allSettled batching</b> were the details that made it robust, and the <b>explicit polling-vs-push decision</b> is the one I&rsquo;m proudest of &mdash; choosing the simpler mechanism because the requirement genuinely allowed it.

### Test it | “How do you test a notification system?”

Test the guarantees directly &mdash; the retry doesn&rsquo;t double-send, the routing matches preferences, the fallback cancels &mdash; not just &lsquo;an email went out.&rsquo;

- FRAME | frame | The bugs here are in the <b>guarantees</b>, not the happy path, so I test the guarantees directly &mdash; idempotency, routing, fallback &mdash; the way they actually fail.
- IDEMPOTENCY | head | The critical test: <b>send the same notification twice and assert one delivery</b>. Simulate a retry &mdash; same event, same user &mdash; and verify the dedup store catches the second. Plus a variant: a batch where one send fails, retried, asserting the successful members aren&rsquo;t re-sent.
- ROUTING | sub | <b>Routing tests</b>: given a user with email-on, push-off, and a muted category, assert the fan-out produces exactly the right deliveries &mdash; the in-app but not the email, nothing for the muted category. Preferences are logic, so they get unit tests.
- FALLBACK | sub | The <b>fallback</b> is a timing test: deliver in-app, don&rsquo;t open it, advance the clock past the window, assert the email fires. Then the cancel path: open the in-app within the window, assert the pending email is <i>canceled</i>. That&rsquo;s the subtle one, and where the cascade breaks.
- RETRY | sub | <b>Retry classification</b>: inject a 500 and assert it retries with backoff; inject a 400 and assert it goes straight to the DLQ. The classification is a decision, so I test both branches.
- TRADE | trade | I&rsquo;d lean on <b>integration tests against a fake provider</b> for the send path and unit tests for the routing and classification logic &mdash; the provider itself I don&rsquo;t need to test, just my handling of its responses.
- CLOSE | close | So: double-send yields one, routing matches preferences, fallback fires and cancels correctly, retries classify. I test the guarantees I&rsquo;m making, not that a single email happened to send.

### Name the limits | “Where does this design fall short?”

Polling latency, the single-Postgres ceiling, exactly-once being only effective, and deliverability being partly out of your hands.

- FRAME | frame | Four limits I&rsquo;d name, each with why it&rsquo;s a limit and when it bites.
- POLLING | head | <b>Polling has a latency floor.</b> A 60-second poll means up to a minute of delay &mdash; fine for a badge, wrong for anything real-time. The moment the product needs sub-second, polling is the wrong tool and I&rsquo;d move that surface to push, with the connection cost that brings.
- SINGLE STORE | sub | <b>In-app in the main Postgres has a ceiling.</b> The partial index keeps it cheap for a long time, but if notification writes come to dwarf the rest of the app&rsquo;s load, they&rsquo;ll bloat the primary and I&rsquo;d need a dedicated write-optimized store &mdash; a migration I&rsquo;d rather do deliberately than under fire.
- EXACTLY-ONCE | sub | <b>It&rsquo;s exactly-once <i>effect</i>, not delivery.</b> The idempotency key makes duplicates invisible <i>if</i> it&rsquo;s applied everywhere &mdash; a new send path that skips it reintroduces double-sends. The guarantee is only as good as its coverage, which is why I make the check structural.
- DELIVERABILITY | sub | <b>Deliverability is partly out of my hands.</b> I can authenticate, honor bounces, and warm up domains, but whether an email lands in the inbox or spam is ultimately the mailbox provider&rsquo;s call. I can move the odds; I can&rsquo;t guarantee the inbox.
- HONEST CLOSE | trade | None of these is a reason not to ship &mdash; they&rsquo;re the things I&rsquo;d monitor and the follow-ups I&rsquo;d sequence: push where latency demands it, a dedicated store when volume demands it, structural idempotency enforcement, and a deliverability feedback loop.
- CLOSE | close | So the limits are polling latency, the single-store ceiling, effective-not-actual exactly-once, and deliverability I can only influence &mdash; each bounded, each watched, none a surprise. Naming them is how I show I know where the design bends.

## Numbers

The estimation for notifications isn&rsquo;t the send rate &mdash; it&rsquo;s the <b>read load of polling</b>. The number that decides your architecture is how much work every user&rsquo;s poll costs, and how fast that grows when you chase &lsquo;real-time.&rsquo;

The headline is that <b>polling is a fixed read load</b> &mdash; every active user hitting the unread index on every interval, mostly finding nothing. It&rsquo;s cheap at a minute and a wall at a second, and that curve is exactly what pushes you from poll to push.

- n_users | Active users | 1000000 | 0 | 1000
- n_notifs | Notifications/day | 5000000 | 0 | 1000
- n_poll | Poll interval (sec) | 60 | 1
- n_fanout | Avg channels per notification | 2 | 1

```js
function (vals, fmt) {
    var users = vals.n_users, notifs = vals.n_notifs, poll = vals.n_poll, fanout = vals.n_fanout;
    return [
      { k: 'Poll read load', v: fmt.n(Math.round(users / poll)), u: 'reads/s', n: 'every active user hitting the unread index every ' + poll + 's \u2014 a fixed load, mostly finding nothing new', over: true },
      { k: 'If you go real-time (1s)', v: fmt.n(users), u: 'reads/s', n: 'the same users at a 1-second interval \u2014 ' + poll + '\u00D7 the poll load, still mostly empty. The wall that pushes poll toward push.', over: users > 100000 },
      { k: 'Fan-out deliveries/day', v: fmt.n(notifs * fanout), u: '/day', n: 'one event becomes ' + fanout + ' channel deliveries \u2014 the fan-out multiplier on every downstream cost and retry', over: false },
      { k: 'Peak channel-send rate', v: fmt.n(Math.round(notifs * fanout / 86400 * 10)), u: 'sends/s', n: 'assuming a 10\u00D7 burst over average \u2014 what workers and providers must absorb during a rollout', over: false },
      { k: 'In-app storage / month', v: fmt.n(Math.round(notifs * 30 * 100 / 1e9)), u: 'GB', n: 'at ~100 bytes/row \u2014 a million notifications is ~100 MB; the partial index keeps the badge a seek regardless', over: false },
      { k: 'Push connections if you switch', v: fmt.n(users), u: 'conns', n: 'a WebSocket per active user to maintain \u2014 the cost polling avoids, and why poll is the default for a badge', over: false }
    ];
  }
```

## Red Flags

The moves that quietly tank a notification-system round. Each is something a shakier candidate actually says, what the interviewer hears, and the line that flips it &mdash; and most of them trace back to treating &lsquo;send a message&rsquo; as the whole problem.

### &ldquo;When the event comes in, I just send the notification.&rdquo;

No idempotency &mdash; so <b>every retry double-sends</b>, and retries are guaranteed on an at-least-once queue. The interviewer hears <i>&ldquo;would spam users on every blip,&rdquo;</i> which is the fastest way to look like you haven&rsquo;t run one of these in production.

A <b>deterministic idempotency key</b> &mdash; <code>hash(user, event, channel)</code> &mdash; checked against a dedup store before every send. A retry computes the same id, collides, and sends nothing. At-least-once plus idempotency is effectively exactly-once; skipping the key is the classic miss.

### &ldquo;The API sends the email, then returns success to the caller.&rdquo;

Sending <b>synchronously in the request path</b> couples the producer&rsquo;s latency and availability to the email provider &mdash; a slow or down SES makes the caller slow or down. The interviewer hears <i>&ldquo;let a third party&rsquo;s outage take out my API.&rdquo;</i>

<b>Enqueue and return.</b> The producer fires an event and responds immediately; a worker delivers asynchronously with retries and a DLQ. Delivery latency and provider failures never block the caller &mdash; the request path owns &lsquo;accept the event,&rsquo; not &lsquo;wait for SES.&rsquo;

### &ldquo;Each client polls the notifications table every couple of seconds for new items.&rdquo;

Aggressive polling against the main table is a <b>self-inflicted read storm</b> &mdash; every user, every couple seconds, mostly finding nothing, likely scanning if there&rsquo;s no partial index. The interviewer hears <i>&ldquo;would melt the database at scale.&rdquo;</i>

Poll a <b>partial index on unread</b> (a seek, not a scan) at a <b>sane interval</b> (~60s for a badge), and <b>cache the unread count</b> so most polls never hit Postgres. If you genuinely need seconds, that&rsquo;s <b>push</b> (WebSocket/SSE), not faster polling &mdash; fast polling <i>is</i> the wall.

### &ldquo;I send the batch of emails with <code>Promise.all</code>.&rdquo;

<code>Promise.all</code> <b>short-circuits on the first rejection</b> &mdash; one bad address and the batch &lsquo;fails,&rsquo; even though the other 49 already went out. Retrying the batch re-sends them. The interviewer hears <i>&ldquo;doesn&rsquo;t know how partial failure works.&rdquo;</i>

<code>Promise.allSettled</code> &mdash; it waits for every send and reports each independently, so one bad address doesn&rsquo;t fail the batch and you retry <b>only</b> the actual failure. The 49 that succeeded aren&rsquo;t touched, so you don&rsquo;t manufacture duplicates.

### &ldquo;If an address bounces, it bounces &mdash; we keep sending.&rdquo;

Continuing to send to <b>bounced addresses tanks your sender reputation</b>, and mailbox providers then filter <i>all</i> your mail &mdash; including to good addresses. The interviewer hears <i>&ldquo;would sink deliverability for everyone.&rdquo;</i>

Honor bounces and complaints into a <b>suppression list</b> &mdash; a hard bounce means never send to that address again. Authenticate with <b>SPF/DKIM/DMARC</b>, and split <b>transactional from promotional</b> so a marketing campaign&rsquo;s complaints can&rsquo;t bury password-reset email. Suppression protects every <i>other</i> recipient.

### &ldquo;We send the email and the in-app notification for every event.&rdquo;

Firing <b>every channel every time</b> is how notifications become spam &mdash; the user gets an email <i>and</i> a badge for the same thing, every time. The interviewer hears <i>&ldquo;built a for-loop over channels, not a considerate system.&rdquo;</i>

A <b>smart fallback</b>: in-app first, email only if the in-app goes unseen in a window, and <b>cancel the pending email</b> if they open the in-app. You reach the user once, on the channel that worked. It needs an OPENED event and a scheduled, cancelable send &mdash; that&rsquo;s the sophistication that reads as senior.

### &ldquo;If a send fails, we log it and move on.&rdquo;

&lsquo;Log and move on&rsquo; means a failed notification is <b>silently lost</b> &mdash; no retry, no recovery, no visibility. (The opposite mistake, retrying forever, blocks the queue.) The interviewer hears <i>&ldquo;drops transactional notifications on the floor.&rdquo;</i>

<b>Classify and DLQ.</b> Retryable failures (429, 5xx) get bounded backoff-with-jitter; non-retryable (400, bad address) and exhausted retries go to a <b>dead-letter queue</b> &mdash; out of the hot path, but visible, alarmed on depth, and recoverable. A failed send is parked, never silently gone.

### &ldquo;Everyone gets every notification &mdash; it&rsquo;s simpler.&rdquo;

No preferences means users can&rsquo;t mute anything, so a busy stream makes the whole system <b>noise they tune out</b> &mdash; and for some categories, sending without consent is a compliance problem. The interviewer hears <i>&ldquo;hasn&rsquo;t thought about the user or the regulator.&rdquo;</i>

<b>Preferences</b> across channel, category, frequency, and quiet hours &mdash; read on every fan-out (from a ~1ms cache) so a muted channel or opted-out category simply isn&rsquo;t delivered. Add <b>digests</b> for high-volume streams so 200 updates become one summary. The user controls the cadence; the system respects it.

### &ldquo;The event carries the list of users to notify.&rdquo;

A stored recipient list <b>goes stale</b>: resolved once, it doesn&rsquo;t reflect a member added or removed after the event was created &mdash; so the wrong people get notified. The interviewer hears <i>&ldquo;froze a dynamic membership into a static list.&rdquo;</i>

Carry a <b>role or target</b>, not a list &mdash; &lsquo;the tenant&rsquo;s admins&rsquo; &mdash; and <b>resolve it at send time</b> against current membership, scoped to the tenant. A new admin gets the notification, a removed one doesn&rsquo;t, with no code change. The event names <i>who should know</i>; resolution figures out <i>who that is now</i>.

Note: This one reads as reasonable &mdash; the event is self-contained &mdash; but it&rsquo;s the &lsquo;fine until it isn&rsquo;t&rsquo; choice: the list is a <b>snapshot</b>, so it goes stale the moment membership changes, and a new admin silently stops getting notified.

## Opener

### Match the altitude | The same delivery boundary, said three ways

Interviewers open with <i>&ldquo;quickly, how would you build notifications?&rdquo;</i> as often as <i>&ldquo;design a notification system.&rdquo;</i> Give the altitude they asked for &mdash; the boundary when they want the boundary, the mechanism when they want mechanism &mdash; then expand only when they pull. Say each out loud before you reveal mine.

#### <b>One breath.</b> The whole delivery boundary in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i>

A fan-out boundary where producers emit an event and the system <b>delivers it once</b>, on the channel the user prefers &mdash; idempotent so retries don&rsquo;t double-send, in-app as the cheap polled default, email as reach with a fallback when the in-app goes unseen.

#### <b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no service name-drops.

Producers emit a <b>domain event</b> &mdash; notify this user of this thing &mdash; and stay channel-ignorant; the notification system owns channels, preferences, and fallback. The first thing I add, before any channel, is <b>idempotency</b>: a content-derived key checked before every send, because delivery is at-least-once and retries <i>will</i> duplicate &mdash; at-least-once plus idempotency is effectively exactly-once. I <b>resolve recipients</b> from a role against current membership, tenant-scoped, and <b>fan out</b> on their preferences. In-app is a <b>row per recipient</b> with a partial index on unread, polled every minute &mdash; cheap and always correct. Email is reach and the <b>fallback</b>: in-app first, email only if unseen, cancel the pending email if they open it. The genuinely hard parts aren&rsquo;t the channels &mdash; they&rsquo;re <b>idempotency and the smart fallback</b>.

##### Hooks

The 30-second version leaves three threads loose <i>on purpose</i> &mdash; you&rsquo;re steering. Each is a tab you go deep on the moment they pull it:

- &ldquo;idempotency&rdquo; | the content-derived key, the dedup store, and why at-least-once needs it | Walkthrough &middot; Probe Drill
- &ldquo;smart fallback&rdquo; | in-app first, cascade to email, cancel on open &mdash; and the scheduled cancelable send | Whiteboard &middot; Trade-offs
- &ldquo;polled default&rdquo; | the partial unread index, poll vs push, and the read-load ceiling | System Map &middot; Numbers

Foot: <b>The skill isn&rsquo;t knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude &mdash; the nine-step flow from emitted event to seen notification &mdash; and <b>idempotency and fallback</b> are the deepest zoom, where the real seniority shows. It&rsquo;s having all of them, and reading which one they want.

### Land it | How to close &mdash; name the hard part

When time&rsquo;s nearly up &mdash; or they ask <i>&ldquo;anything else?&rdquo;</i> &mdash; <b>don&rsquo;t just stop.</b> A proactive close is a seniority signal: summarize the boundary, name what you&rsquo;d watch, hand the wheel back. Thirty seconds, unprompted. Say each out loud before you reveal mine.

#### <b>Summarize in one line.</b> Re-state the boundary so they remember the shape, not the detours.

&ldquo;So &mdash; producers emit events, the system fans out on preferences, delivers effectively-once via a content-derived idempotency key, uses in-app as the polled default and email as reach-and-fallback, with per-channel retries and a DLQ. That&rsquo;s the delivery boundary &mdash; a user gets each notification once, on the channel that worked.&rdquo;

#### <b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.

&ldquo;In production I&rsquo;d watch three things: the <b>double-send</b> &mdash; anything that bypasses the idempotency check reintroduces it, so I keep the check structural; <b>deliverability</b> &mdash; a rising bounce rate tanks sender reputation and filters <i>all</i> my mail, so I honor bounces into a suppression list; and the <b>poll-load ceiling</b> &mdash; if a surface needs real-time, fast polling is the wall, and that&rsquo;s where I&rsquo;d move to push.&rdquo;

#### <b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.

&ldquo;With more time I&rsquo;d add <b>digests</b> for high-volume streams and a <b>dedicated store</b> if notification writes outgrow the primary. I left out SMS and push channel specifics, and the analytics pipeline &mdash; out of scope for the core delivery path. Where would you like to go deeper?&rdquo;

Foot: <b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs. The tell: juniors stop at &ldquo;and we send the email&rdquo;; seniors name <b>idempotency and the smart fallback as the hard parts</b> and close on a <i>summary, a risk list, and an invitation.</i>

## Bank

### FRAME | &ldquo;Design a multi-channel notification system &mdash; email, in-app, maybe push. Start wherever you like.&rdquo;

Task: Frame the scope in one line, then give your one-sentence version.
Model: <b>Frame:</b> producers across the system need to reach users when something happens, across channels, once, honoring preferences &mdash; and the notification system is the boundary that owns all of that so producers don&rsquo;t. <b>One-liner:</b> producers emit a domain event, the system resolves recipients and fans out on their preferences, delivers effectively-once via a content-derived idempotency key, uses in-app as the polled default and email as reach-with-fallback.
Int: Why a separate notification system &mdash; why not have each service send its own emails?
Because channel logic <b>scatters</b> if every service does it: preferences, retry, throttling, and fallback get reimplemented, inconsistently, in every producer, and &lsquo;add a channel&rsquo; becomes a change to all of them. A notification boundary centralizes it &mdash; producers emit an event and stay <b>channel-ignorant</b>, and everything about <i>how</i> and <i>where</i> to deliver lives in one place. It&rsquo;s the same reason you don&rsquo;t scatter auth checks across every endpoint: cross-cutting concerns belong at a boundary, not copy-pasted.
Int2: What&rsquo;s the very first thing you&rsquo;d build, before any channel?
<b>Idempotency.</b> Before I write a single channel, I&rsquo;d establish that every send goes through a deterministic id &mdash; hash of user, event, channel &mdash; checked against a dedup store. It&rsquo;s first, not last, because delivery is at-least-once and retries are guaranteed, so without the key <i>every</i> channel I add will double-send on the first blip. Idempotency isn&rsquo;t a channel feature; it&rsquo;s the property that makes the whole thing correct, so it&rsquo;s the foundation, not a patch. At-least-once plus idempotency is effectively exactly-once.

### STRUCTURE | &ldquo;Walk me through it &mdash; event to the user seeing it.&rdquo;

Task: Talk the whole flow, producer to seen &mdash; no code, just the spine.
Model: A producer <b>emits an event</b> &mdash; <code>notify(user, event)</code> &rarr; the system computes a <b>content-derived idempotency key</b> and checks a dedup store, so a retry sends nothing &rarr; it <b>resolves recipients</b> from the event&rsquo;s role against current membership, tenant-scoped &rarr; reads each recipient&rsquo;s <b>preferences</b> and <b>fans out</b> to their enabled channels &rarr; in-app is a <b>row per recipient</b> in Postgres with a partial index on unread, which the client <b>polls</b> every ~60s &rarr; email goes through <b>SES</b>, batched with allSettled under the tenant&rsquo;s sender, throttled &rarr; a failed send is <b>classified and retried</b> (backoff/jitter) or dead-lettered &rarr; and a <b>smart fallback</b> escalates in-app to email only if unseen, canceling the pending email if opened.
Int: A producer three services deep needs to notify someone. Does it call your system directly, synchronously?
It <b>emits an event</b>, asynchronously &mdash; it doesn&rsquo;t call the notification system inline and wait. The producer fires &lsquo;notify this user of this thing&rsquo; and returns immediately; the notification system consumes the event and does the work on its own path. Sending synchronously would couple the producer&rsquo;s latency and availability to the email provider &mdash; a slow SES would slow the producer&rsquo;s request. So the boundary is an <b>event</b>, not a synchronous call: the producer&rsquo;s job ends at &lsquo;something happened,&rsquo; and delivery is the notification system&rsquo;s job, with its own retries and DLQ.

### SCALE | &ldquo;A rollout fires and 50,000 devices report in within minutes &mdash; a burst of &lsquo;rollout done&rsquo; and &lsquo;device offline&rsquo; events, each notifying operators. What breaks?&rdquo;

Task: Name the first ceiling, then the fix &mdash; don&rsquo;t hand-wave &lsquo;it scales.&rsquo;
Model: The burst hits two places. First, if operators are notified per-device, that&rsquo;s a <b>notification storm</b> &mdash; one operator gets 50,000 notifications, which is unusable; the fix is <b>aggregation/digest</b> (&lsquo;50,000 devices completed&rsquo; as one summary) and <b>per-user rate limiting</b>. Second, the <b>send throughput</b> &mdash; a spike of emails against SES&rsquo;s rate limit; the fix is a <b>token-bucket per channel</b> pacing to the provider&rsquo;s ceiling, with the queue absorbing the burst. The in-app writes are cheap (a row each); the storm is about <b>not drowning the human</b> and <b>not tripping the provider</b>, not about the database.
Int: The per-user digest helps the human. What protects SES from the raw send burst?
A <b>token-bucket rate limiter per channel</b>, sized to SES&rsquo;s sending rate &mdash; it lets you burst up to the limit and then paces the rest, so you never exceed the provider&rsquo;s ceiling and trip throttling or reputation penalties. The <b>queue</b> is what makes that safe: the burst of events lands in the queue instantly, and the worker drains it at the rate-limited pace, so the spike becomes a smooth send stream rather than a wall of simultaneous API calls. You decouple &lsquo;events arrived&rsquo; from &lsquo;emails sent&rsquo; &mdash; the queue holds the burst, the rate limiter meters the drain.
Int2: When does aggregation stop being enough and you need to rethink the notification itself?
When the <b>aggregate itself is still noise</b> &mdash; if an operator gets a &lsquo;50,000 devices completed&rsquo; digest every rollout and there are rollouts hourly, even the summaries pile up. At that point the fix isn&rsquo;t more batching, it&rsquo;s <b>rethinking what deserves a notification</b>: maybe individual completions aren&rsquo;t notification-worthy at all, and only <i>exceptions</i> (devices that <b>failed</b>) should notify, with the successes visible in a dashboard on demand. The senior move is recognizing when the answer is &lsquo;notify less,&rsquo; not &lsquo;batch more&rsquo; &mdash; the best notification for a routine success is often none, with the information available when the operator wants it.

### FAILURE | &ldquo;Users report getting the same notification twice. Walk the incident.&rdquo;

Task: Walk the incident &mdash; contain, diagnose, close the class.
Model: <b>Diagnose, fix, close the class.</b> A double-send is the <b>idempotency key failing</b>, in one of three ways, and the logs tell me which: the <b>same id sent twice</b> means the dedup check isn&rsquo;t running on that path (a new channel, a direct provider call); <b>two different ids for one notification</b> means the id is random, not content-derived, so the retry didn&rsquo;t collide; a <b>batch pattern</b> means Promise.all short-circuited and the handler re-sent the whole batch. I fix the specific cause, then <b>close the class</b>: route every send through one dedup gate so a new path can&rsquo;t skip it, make the id a deterministic hash of user/event/channel, and use allSettled so a batch retries only its failures.
Int: You added the dedup check to the path that was double-sending. Why isn&rsquo;t that the end of it?
Because the double-send is a <b>class</b>, not one path &mdash; the same gap exists anywhere a send bypasses the check, and patching one path is whack-a-mole. The durable fix is <b>structural</b>: make the idempotency check something <i>every</i> send goes through unavoidably &mdash; a single deliver function that owns the dedup, so a new channel or a new call site physically can&rsquo;t send without it &mdash; plus a test that fires a duplicate on every path. You close the class by making the mistake <b>unwritable</b>, not by remembering the check each time, the same principle as enforcing a query filter at the data layer rather than per-query.
Int2: A channel is fully down &mdash; say SES is having an outage. What should users experience?
<b>Degraded, not broken.</b> The in-app channel is independent of SES, so notifications still land in the unread index and the badge still works &mdash; users see their notifications in-app even with email down. The email sends <b>fail, get classified as retryable (5xx), and back off</b>, accumulating in the retry path / DLQ rather than being lost; when SES recovers, they drain. And the <b>fallback</b> shouldn&rsquo;t cascade <i>to</i> a dead channel &mdash; ideally a circuit-breaker on SES pauses email attempts so you&rsquo;re not hammering a downed provider. So: in-app keeps working, email is delayed not dropped, and nothing double-sends on recovery because every retry rides the idempotency key. A channel outage degrades one channel, not the system.

### CURVEBALL | Double-send / retry | &ldquo;Your queue guarantees at-least-once delivery. A consumer sends the email, then crashes before acking. The message redelivers. The user gets two emails. Your queue is &lsquo;working.&rsquo; Fix it.&rdquo;

Task: Reframe the premise out loud, then give the real mechanism.
Model: The premise to say aloud: the queue <b>is</b> working &mdash; at-least-once <i>means</i> &lsquo;redeliver if not acked,&rsquo; and a crash between send and ack is exactly the case it&rsquo;s designed for. What&rsquo;s missing is <b>idempotent processing</b> on my side. The fix: a <b>content-derived idempotency key</b> &mdash; hash of user, event, channel &mdash; recorded in a dedup store with a conditional write as part of sending, so the redelivery finds the key already there and sends nothing. At-least-once delivery plus idempotent handling is effectively exactly-once; the queue guarantees no <i>loss</i>, and the key guarantees no <i>duplicate</i>.
Int: There&rsquo;s a race: the crash is between sending the email and recording the key. Now the redelivery doesn&rsquo;t see the key and sends again. How do you close that window?
That&rsquo;s the crux &mdash; you want the &lsquo;have I sent this&rsquo; record as close to atomic with the send as possible. The standard approach: <b>record the key first</b> with a conditional write, and only send if that write won; on redelivery the conditional write fails and you skip. That closes the common window &mdash; a crash <i>after</i> the send but before an ack now finds the key already recorded and doesn&rsquo;t resend. The residual edge is a crash <i>between</i> recording and sending, which yields a rare <b>missed</b> send rather than a duplicate &mdash; and you&rsquo;d rather occasionally miss-and-reconcile than double-send. The honest framing is that exactly-once is impossible; you order the key-write ahead of the side effect to make duplicates rare, and accept a tiny reconcilable edge. At-least-once plus this idempotency is effectively exactly-once.

### CLOSE | &ldquo;Sum it up &mdash; and what would you watch in prod?&rdquo;

Task: Two-sentence close, then the one thing you&rsquo;d alarm on.
Model: It&rsquo;s a delivery boundary: producers emit events, the system fans out on preferences, delivers effectively-once via a content-derived idempotency key, uses in-app as the polled default and email as reach-with-fallback, and retries per-channel with a DLQ &mdash; so a user gets each notification once, on the channel that worked. In prod I&rsquo;d alarm on the <b>bounce/complaint rate</b> and <b>DLQ depth</b> &mdash; a rising bounce rate is the earliest sign of a deliverability problem that will filter <i>all</i> my mail, and a DLQ spike is the earliest sign a channel or provider is failing &mdash; both catch silent failures before users report them.
Int: You&rsquo;ve got a week, not a month. Cut one thing you described to ship &mdash; what goes?
The <b>sophistication</b> goes, never the correctness. I&rsquo;d ship <b>in-app only</b> (skip email until the polled default works), or in-app plus <b>fire-both</b> email (skip the smart fallback and cancel logic &mdash; addable later), <b>no digests</b>, <b>preferences as on/off only</b>, and the <b>main Postgres</b> (no dedicated store). All of that layers on later without a rewrite. What I would <b>not</b> cut is <b>idempotency</b> and the <b>fan-out boundary</b> &mdash; those are the correctness and the maintainability, and a notification MVP that double-sends or scatters channel logic is an incident, not an MVP. Knowing which parts are the boundary and which are the polish is the answer.

### Extra Curveballs

### CURVEBALL | Polling meltdown | &ldquo;Your in-app notifications work great in the demo. In prod, the database falls over every afternoon at peak &mdash; the notifications table is the hottest thing in the system. Fix it without dropping in-app notifications.&rdquo;

Task: Find why polling scales badly, then fix it without abandoning the feature.
Model: It&rsquo;s the <b>poll read load</b>: every active user polling the notifications table on an interval is a fixed read rate that scales with your user count &mdash; and at peak, that&rsquo;s the hottest query, especially if it&rsquo;s <b>scanning</b> rather than seeking. Fixes, without dropping in-app: <b>a partial index on unread</b> so the badge query is a tiny seek not a scan; <b>cache the unread count</b> in Redis (invalidated on new-notification and mark-read) so most polls never touch Postgres; and a <b>sane interval</b> (60s, not 2s). If a surface genuinely needs faster, that&rsquo;s <b>push</b>, because faster polling is the wall, not the fix.
Int: The partial index and cache help, but the poll traffic still grows linearly with users. Is polling just fundamentally doomed at scale?
Not doomed, but <b>bounded</b> &mdash; and knowing the bound is the point. Polling load is users-over-interval, a fixed cost you can drive way down (a cached count is a Redis GET, not a Postgres query) but can&rsquo;t eliminate: it&rsquo;s work proportional to users whether or not anything changed. That&rsquo;s <i>fine</i> up to a large scale when each poll is a ~1ms cache hit &mdash; millions of cheap polls are cheap. It stops being fine when you need <b>low latency</b>, because shortening the interval multiplies the load. So the honest framing: polling is the right, simple default for a badge and scales further than people think <i>if</i> each poll is cheap; you switch to push when the <b>latency requirement</b>, not the user count, demands it &mdash; push does work only on actual change, which is what real-time needs.

### CURVEBALL | Offline user | &ldquo;You add WebSocket push for instant in-app delivery. A user is offline when the notification fires, and comes back an hour later. Walk me through what they see &mdash; and what a naive push-only design gets wrong.&rdquo;

Task: Name the persist-first principle, then the reconnect flow.
Model: The naive mistake is treating <b>push as the source of truth</b> &mdash; if you only push over the socket and the user&rsquo;s offline, the notification is <b>lost</b>, because there was no connection to receive it. The fix is <b>persist first, push second</b>: every notification is written to the durable store (the row-per-recipient) <i>regardless</i> of connection state, and the WebSocket push is a best-effort <b>accelerator</b> on top. So the offline user&rsquo;s notification is sitting in their unread index the whole time; when they reconnect, the client <b>fetches unread on connect</b> and shows it. Push gains latency when they&rsquo;re online; it never owns delivery. A dropped connection loses <i>speed</i>, not the notification.
Int: On reconnect the client fetches unread &mdash; but what about a notification that fires <i>during</i> the reconnect, after the fetch but before the socket is live? Does it fall through?
It can, if you get the <b>order of subscribe-then-fetch</b> wrong. The safe pattern is to <b>subscribe to the push stream first, then fetch the backlog</b>: establish the socket (so any notification from now on is delivered live), and <i>then</i> query unread for everything before that point. A notification firing mid-reconnect is either caught by the now-live subscription or included in the backlog fetch &mdash; and if it&rsquo;s caught by both, the client dedupes by notification id. The bug is fetch-then-subscribe, which leaves a gap between the fetch and the subscription where a notification lands nowhere. Subscribe-first, fetch-second, dedupe on id, closes it &mdash; the same at-least-once-plus-idempotent thinking, now on the client.

### CURVEBALL | Notification storm | &ldquo;A bug upstream emits the same event 10,000 times in a minute. Your system faithfully tries to send 10,000 notifications to one user. The idempotency key is per-event, and these are 10,000 <i>different</i> events. Now what?&rdquo;

Task: Distinguish dedup from rate-limiting, then defend the user.
Model: The key insight: <b>idempotency and rate-limiting solve different problems</b>, and this is the rate-limiting one. Idempotency stops the <i>same</i> notification twice; it can&rsquo;t help here because these are 10,000 <i>distinct</i> events, so 10,000 distinct keys, all &lsquo;first-time.&rsquo; What protects the user is a <b>per-user rate limit</b> &mdash; a sliding window (say, max N per user per hour) that collapses the storm into a bounded number, aggregating or dropping the rest. Ideally a <b>digest</b> catches the overflow (&lsquo;10,000 updates&rsquo; as one summary) rather than silently dropping. The user is defended by the rate limit, not the idempotency key &mdash; two different mechanisms for two different failures.
Int: Rate-limiting the user stops the spam, but the upstream bug is still emitting 10,000 events. Is throttling at the notification layer really the right place to fix this?
It&rsquo;s the right place to <b>protect the user</b>, but not the root cause &mdash; and I&rsquo;d be clear about the distinction. The per-user rate limit is a <b>defensive backstop</b>: the notification system shouldn&rsquo;t trust its inputs to be sane, so it caps what any single user can receive regardless of how buggy the producer is &mdash; defense in depth, and it stays even after the bug is fixed. But the <b>actual fix</b> is upstream: the producer shouldn&rsquo;t emit the same logical event 10,000 times, which points at <i>its</i> idempotency or a retry loop gone wrong. So two things: the rate limit protects users now and permanently (never rely on upstream sanity), and the incident follow-up fixes the emitting service. The senior move is doing both &mdash; the backstop <i>and</i> the root cause &mdash; not only throttling (user protected, bug festering) or only fixing upstream (this bug fixed, the next still floods users).

### CURVEBALL | Ordering anomaly | &ldquo;A user gets &lsquo;Your order has shipped&rsquo; &mdash; and thirty seconds later, &lsquo;Your order is confirmed.&rsquo; Both are correct events. The user is confused. Is this a bug, and how do you fix it?&rdquo;

Task: Diagnose it as a per-user ordering problem, then the scoped fix.
Model: It&rsquo;s a real bug, but a <b>per-user causal-ordering</b> one, not a call for global ordering. The events were produced in order (confirmed, then shipped) but delivered out of order &mdash; because they were processed in <b>parallel</b> with no per-user sequencing, and &lsquo;shipped&rsquo; happened to win. The fix is to order <b>per recipient</b>: partition the notification stream by <code>user_id</code> so one user&rsquo;s notifications are processed in sequence, while different users stay parallel. You get the causal order exactly where it&rsquo;s observable &mdash; one user&rsquo;s timeline &mdash; without a global bottleneck. Global ordering across all users would be unnecessary and would kill throughput.
Int: Partitioning by user_id orders them &mdash; but what if &lsquo;shipped&rsquo; and &lsquo;confirmed&rsquo; genuinely arrive at your system out of order from two different upstream services?
Right &mdash; if the <b>events themselves arrive out of causal order</b>, sequencing the delivery queue can&rsquo;t reconstruct an order that wasn&rsquo;t there on input. Then you need ordering information <i>in the events</i>: a <b>timestamp or sequence number</b> from the source, so the system (or the client) orders by the event&rsquo;s logical time rather than arrival time &mdash; or briefly holds a notification if a causally-earlier one is expected. In practice, for order state, the cleaner fix is often <b>upstream</b>: the order service owns the state machine and should emit changes in order, or the notification should reflect <i>current state</i> (&lsquo;shipped&rsquo; implies confirmed) rather than a raw event stream. So: partition-by-user handles same-source reordering; genuine cross-source causality needs event timestamps or a rethink of what the notification represents. Knowing which case you&rsquo;re in is the answer.

### CURVEBALL | Bounce / reputation | &ldquo;Your transactional emails &mdash; password resets, receipts &mdash; suddenly start landing in spam. Nothing changed in that code. Marketing just launched a big campaign from the same domain. Connect the dots.&rdquo;

Task: Explain shared reputation, then the isolation fix.
Model: The dots: <b>sender reputation is per-domain (and per-IP), and it&rsquo;s shared</b>. Marketing&rsquo;s campaign generated <b>spam complaints and bounces</b> &mdash; people marking it spam, dead addresses bouncing &mdash; which tanked the <i>domain&rsquo;s</i> reputation, and mailbox providers then started filtering <b>everything</b> from that domain, including your untouched transactional mail. Your code didn&rsquo;t change; the domain&rsquo;s standing did. The fix is <b>isolation</b>: send transactional and promotional from <b>separate domains/subdomains (and separate IPs)</b>, so marketing&rsquo;s reputation can&rsquo;t sink password resets. Plus the hygiene that protects both: authenticate with SPF/DKIM/DMARC, and honor bounces/complaints into a suppression list so you stop mailing dead or hostile addresses.
Int: So separating the domains protects transactional. But how do you keep the <i>marketing</i> domain from just repeatedly destroying its own reputation?
With <b>list hygiene and engagement discipline</b>, because promotional reputation is earned by not annoying people. Concretely: <b>honor unsubscribes and complaints immediately</b> (re-mailing someone who complained is the fastest way to get flagged), <b>remove bouncing addresses</b> (a dead-address-heavy list signals poor management), <b>warm up the domain gradually</b> rather than blasting from zero, and ideally <b>send to engaged users</b> &mdash; stop mailing people who never open, because low engagement itself hurts placement. Mailbox providers are scoring whether recipients <i>want</i> your mail; you protect the marketing domain by only sending wanted mail and pruning the rest. Separating domains stops marketing from hurting transactional; disciplined list management stops marketing from hurting <i>itself</i> &mdash; and you need both, because one domain&rsquo;s bad practices shouldn&rsquo;t take down mail people actually asked for.

### CURVEBALL | Fallback race | &ldquo;Your smart fallback sends in-app first, then email if unseen after 5 minutes. A user opens the in-app at 4 minutes 59 seconds &mdash; and gets the email anyway. Both fired. Explain the race and close it.&rdquo;

Task: Name the check-then-act race, then make the cancel reliable.
Model: It&rsquo;s a <b>check-then-act race</b> between the &lsquo;open&rsquo; event and the scheduled email firing. At ~5 minutes the email job wakes, checks &lsquo;was it opened?&rsquo;, and sends &mdash; but the open at 4:59 and the email&rsquo;s check are concurrent, so the job can read &lsquo;not opened&rsquo; (stale) and send just as the open lands. Closing it: make the <b>decision atomic</b>. The open and the send must agree on one source of truth &mdash; the open <b>atomically cancels the scheduled job</b> (deletes the delayed message / flips a status with a conditional write), and the email job, before sending, does an atomic <b>check-and-claim</b> on that same status. Only one of &lsquo;opened&rsquo; and &lsquo;email-sent&rsquo; can win the compare-and-set; the loser no-ops. The race is real; you close it by funneling both through one atomic state transition, not two independent reads.
Int: Even with an atomic check-and-claim, the email might have <i>already</i> been handed to SES when the open arrives. You can&rsquo;t un-send an email. Is a small double-notify rate just unavoidable?
Honestly, yes &mdash; and saying so is the mature answer. Once an email is handed to SES it&rsquo;s <b>gone</b>; there&rsquo;s no recall. So the atomic check-and-claim shrinks the window to &lsquo;the few milliseconds between claiming the send and actually calling SES,&rsquo; but it can&rsquo;t make it zero &mdash; an open landing in that sliver still gets a redundant email. The judgment is that this is a <b>rare, low-harm</b> outcome: the cost of a duplicate here is one extra email, not a correctness or security violation, so you drive the probability down with the atomic transition and <b>accept the residual</b> rather than over-engineering (a distributed lock on every send) for a harmless edge. Contrast the double-<i>charge</i> case, where you&rsquo;d pay real complexity to close it fully. Matching the rigor to the blast radius &mdash; tight where a duplicate hurts, &lsquo;good enough&rsquo; where it&rsquo;s a stray email &mdash; is the senior call.

### CURVEBALL | Cross-tenant leak | &ldquo;A multi-tenant SaaS. An admin at tenant A receives a notification meant for an admin at tenant B &mdash; with B&rsquo;s data in it. Your auth is fine; users log into the right tenant. Where did the notification system leak?&rdquo;

Task: Locate the leak in resolution or fan-out, then the boundary fix.
Model: The leak is in <b>recipient resolution</b>, not authentication &mdash; auth confirms who&rsquo;s logged in, but the notification system independently decided <i>who to send to</i>, and that decision crossed the tenant boundary. Usual suspects: a resolution query that <b>wasn&rsquo;t tenant-scoped</b> (&lsquo;all admins&rsquo; instead of &lsquo;admins <i>of tenant B</i>&rsquo;), a <b>cached recipient list</b> keyed without the tenant, or an event carrying a raw user list resolved in the wrong tenant context. The fix is the same boundary the authorization layer uses: <b>every resolution is tenant-scoped</b> &mdash; the tenant is part of the query, not an afterthought &mdash; and it&rsquo;s the same class of bug as a missing <code>WHERE tenant_id</code> filter. Plus the <b>per-tenant sender</b> so even the from-address can&rsquo;t impersonate B.
Int: How would you have caught this <i>before</i> it shipped &mdash; what test makes a cross-tenant notification leak impossible to introduce?
The same way you&rsquo;d guard any tenant boundary: an <b>adversarial test that fires a notification and asserts every recipient is within the intended tenant</b>, run on every resolution path. Concretely, set up two tenants, trigger a notification for tenant B, and assert <b>zero</b> tenant-A users receive it &mdash; for each event type and each resolution route, including the cached path. Better, make the leak <b>structurally hard</b>: resolution goes through one helper that <i>requires</i> a tenant context and scopes every query to it, so a developer can&rsquo;t write an unscoped recipient query &mdash; the tenant filter is injected, not remembered, exactly like the authz topic&rsquo;s data layer. Then the test is a backstop confirming the structure holds. Cross-tenant isolation can&rsquo;t rely on every resolution query being written correctly by hand; you make the scoped path the <i>only</i> path and gate CI with an adversarial cross-tenant assertion.

### Frames

- &ldquo;Design the system that sends a million notifications a day to email, SMS, and push, with per-user preferences, idempotency, and retries.&rdquo;
- &ldquo;A user should get notified when something happens &mdash; but only once, on the right channel, even if they&rsquo;re offline. Build it.&rdquo;
- &ldquo;Fan an event out to millions of users across channels, honoring their preferences and guaranteeing you don&rsquo;t double-send. Walk me through it.&rdquo;
