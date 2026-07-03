/* ============ topics/notifications/identity.js -- topic 5 (Notifications) ============
   The switchable light-DOM identity for topic 5, same contract as topic 1's
   TOPIC_CP_IDENTITY. applyIdentity() rewrites the locator / h1 / sub / thesis /
   spine / cram title / companion notes from this object on every switch. Grounded
   in the ICS dual-channel notification system (in-app Postgres polling + SES email,
   per-recipient rows, idempotent fan-out, role-based recipient resolution).
   Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_NOTIF_IDENTITY = {
  index: 5,
  total: 8,
  locatorTail: 'delivery boundary',
  title: 'Notifications',
  h1: 'Notifications',
  sub: '<b>The delivery flow</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the delivery boundary sits, and the pivots an interviewer rides from a notification into channels, idempotency, and fallback.',
  companionTopic: 'Notifications',
  thesis: 'The stage that turns an event into a notification the right user actually sees &mdash; dual-channel in-app and email, idempotent so a retry never double-sends, with a fallback when a channel is missed.',
  spine: [
    'Fan-out <b>at the boundary</b> &mdash; producers emit <code>notify(user, event)</code>; the system picks the channels, so a producer never knows about email or in-app.',
    'Exactly-once by <b>idempotency</b> &mdash; a deterministic id plus a dedup store, because at-least-once delivery and retries <i>will</i> duplicate.',
    'Two channels, one <b>fallback</b> &mdash; in-app is the cheap default, email is reach and backup; if the in-app isn&rsquo;t seen, cascade to email.',
    'A <b>row per recipient</b> &mdash; each notification is a ~100-byte row with a partial index for unread, so a million notifications is ~100 MB and a read is a seek.'
  ],
  cramTitle: 'Notifications',
  reportTitle: 'Notifications',
  cmpNotes: {
    walk: ['The delivery flow', 'Event to seen-by-the-user, one step at a time \u2014 the mechanics you narrate before anyone cuts in.', 'Say the split out loud \u2014 \u201Cproducers emit an event; the system decides the channels and guarantees delivery once.\u201D That line is the whole design.'],
    drill: ['Probe Drill', 'Graded follow-ups on idempotency, fan-out, fallback, and delivery guarantees \u2014 the ones that separate a passing answer from a Staff signal.', 'Commit to an answer before you reveal \u2014 name the delivery guarantee you\u2019re making, not just the queue you\u2019re using.'],
    wb: ['Whiteboard', 'Rebuild the whole delivery path from memory \u2014 the cues, nothing in front of you.', 'Draw the boundary first \u2014 the producer on one side, the two channels on the other, the idempotency key crossing once. Recall is the test, not recognition.'],
    sys: ['System Map', 'Zoom out: notifications sit between the events the system produces and the channels a user watches.', 'Lead with the boundary, not the boxes \u2014 \u201Cthe system emits events, notifications fan them out, the user sees one on the right channel.\u201D'],
    trade: ['Trade-offs', 'The decisions they drill \u2014 polling vs push, one topic vs per-channel, at-least-once vs exactly-once \u2014 each with the switch condition.', 'Always say \u201Cpick when\u201D \u2014 name the constraint that flips the choice, never defend one channel as universally right.'],
    model: ['Model Answers', 'Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.', 'Steal the frame, not the words \u2014 headline first (\u201Cfan out, deliver once, fall back\u201D), then the one risk you\u2019d name.'],
    num: ['Numbers', 'Back-of-envelope the notification load \u2014 and know which number makes polling or fan-out the ceiling.', 'Lead with the read load \u2014 polling every user every minute is the wall, and that\u2019s what pushes you to push.'],
    rf: ['Red Flags', 'What sinks the round \u2014 no idempotency, blocking on send, polling that melts the database \u2014 and what to say instead.', 'Name what the interviewer hears \u2014 \u201Cwould double-send on every retry\u201D is the fastest no-hire in the room.'],
    open: ['30-Second', 'The opener and the close \u2014 matched to the altitude the question is asked at.', 'Match the altitude \u2014 open at the delivery boundary, not the queue, and land on idempotency and fallback as the real hard parts.']
  }
};
