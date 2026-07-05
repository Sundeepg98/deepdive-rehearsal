/* ============ topics/content-pipeline/identity.js -- FOUNDATION ============
   Topic 1 identity: every scattered light-DOM string, centralized as the
   SWITCHABLE source. In Phase 0 applyIdentity() does NOT run at boot -- topic 1's
   identity stays hard-coded in index.html for a byte-identical first paint -- so
   only `cmpNotes` is read at boot (by __syncCompanion via TOPIC_CMP_NOTES). The
   other fields are the deliberate, tiny duplication that powers a clean switch in
   Phase 2. cmpNotes is lifted verbatim from shell.js's closure-local map.
   Offline-safe: no network/storage/permission. */
var TOPIC_CP_IDENTITY = {
  index: 1,
  total: 8,
  locatorTail: 'ingestion layer',
  group: 'architecture-apis',
  title: 'Content Pipeline',
  h1: 'Content Pipeline',
  sub: '<b>Mechanics</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where this sits in the whole system, and the pivots an interviewer rides into the next topic.',
  companionTopic: 'Content Pipeline',
  thesis: 'A file-processing service, taken apart the way an interviewer actually scores it &mdash; beat by beat, with the follow-ups they ask.',
  spine: [
    'A frozen strategy map keeps dispatch <b>O(1)</b> &mdash; never a switch statement.',
    'One <b>PassThrough</b> fork hashes <i>and</i> uploads on a single read of the file.',
    'At-least-once delivery <b>+</b> idempotent work <b>=</b> exactly-once effect.',
    'Name the ceiling before you hit it &mdash; Lambda gives way to <b>SQS</b> past ~1,000/s.'
  ],
  cramTitle: 'Content Pipeline',
  reportTitle: 'Content Pipeline',
  cmpNotes: {
      walk:['Walkthrough','The dispatch flow, one step at a time \u2014 the mechanics you narrate before anyone cuts in.','Say the fork out loud \u2014 \u201Cone read, two sinks.\u201D That single-read line is what they remember.'],
      drill:['Probe Drill','Twenty graded follow-ups \u2014 the ones that separate a passing SDE2 from a Staff signal.','Commit to an answer before you reveal \u2014 saying it beats reading it. That\u2019s the rep.'],
      wb:['Whiteboard','Rebuild the whole pipeline from memory \u2014 nine cues, nothing in front of you.','Draw the boxes from memory first, then check \u2014 recall is the test, not recognition.'],
      sys:['System Map','Zoom out to the six stages \u2014 and the exact points an interviewer pivots.','Lead with the flow, not the boxes \u2014 \u201Cupload lands, dispatch routes, sinks fan out.\u201D'],
      trade:['Trade-offs','The decisions they drill \u2014 each with the switch condition that picks a side.','Always say \u201Cpick when\u201D \u2014 name the condition that flips the choice, not just the options.'],
      model:['Model Answers','Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.','Steal the frame, not the words \u2014 headline first, then the one risk you\u2019d name.'],
      num:['Numbers','Back-of-envelope the load \u2014 and know which number trips which ceiling.','Lead with the peak, not the average \u2014 ~1,157/s is the number that sets the ceiling.'],
      rf:['Red Flags','What sinks the round \u2014 the anti-patterns, and what to say instead.','Name what the interviewer hears, not just the mistake \u2014 that\u2019s the senior tell.'],
      open:['30-Second','The opener and the close \u2014 matched to the altitude the question is asked at.','Match the altitude \u2014 open at the contract, not the code, and land on the one risk.']
    }
};
